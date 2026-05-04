"""Quality write loop — orchestrates writer → lint → fix → regenerate.

v0.59.4 — single shared helper that all CLI pipelines call instead of
inlining the lint+publish logic. Implements the full quality cascade:

    1. writer.generate(input)        → draft_v1
    2. voice_lint.check(draft_v1)    → lint_v1
    3. if lint_v1.verdict == "fail":
         voice_fixer.fix(draft_v1, lint_v1)  → draft_v1_fixed
         voice_lint.check(draft_v1_fixed)    → lint_v2
         if lint_v2.verdict still "fail" AND retries_left:
             writer.generate(input, hint=lint_v2)  → draft_v2
             ... (recurse, max retries)
    4. return final (article, lint, attempt_count, total_cost)

The "fix-then-relint" step is cheap (~$0.005 Haiku) and often turns
a fail into review or pass without burning a fresh Sonnet call. Only
if the fixer can't save it do we regenerate.

Per CLAUDE.md rule #11 (cost cap): the loop respects per-article
ceiling via env var QUALITY_LOOP_MAX_USD (default $0.30). If total
cost across attempts exceeds, returns the last draft as-is with a
warning logged.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

import structlog

from content_engine.quality import voice_fixer, voice_lint
from content_engine.quality.voice_lint import VoiceLintReport

log = structlog.get_logger()

# Per-article cost ceiling. Default $0.30 = ~6× Sonnet recap cost,
# enough headroom for 2 retries + 2 fix passes.
_MAX_USD = float(os.environ.get("QUALITY_LOOP_MAX_USD", "0.30"))


@dataclass
class WriteLoopResult:
    """Final state after the quality loop completes."""

    body_md: str
    lint: VoiceLintReport
    attempts: int                                 # writer regenerations
    fix_passes: int                               # fixer calls
    total_cost_usd: float
    cost_breakdown: dict[str, float] = field(default_factory=dict)
    capped_by_budget: bool = False                # True if loop bailed early


async def run_with_quality_loop(
    *,
    generate: Callable[..., Awaitable[tuple[str, dict[str, Any]]]],
    source_context: str,
    initial_writer_args: dict[str, Any] | None = None,
    max_writer_retries: int = 1,
    enable_fixer: bool = True,
) -> WriteLoopResult:
    """Run the full writer → lint → fix → regenerate loop.

    Parameters
    ----------
    generate
        Awaitable that produces ``(body_md, usage_dict)``. Called with
        ``initial_writer_args`` plus optional ``regen_hint`` kwarg on
        retries (the lint summary from the previous attempt).
    source_context
        The grounding data block — passed to lint + fixer for
        ground-checking.
    initial_writer_args
        Kwargs passed to ``generate`` on the first call. The retry
        path adds ``regen_hint`` containing the previous lint summary.
    max_writer_retries
        How many times to call ``generate`` again after fixer fails.
        Default 1 (= total of 2 writer calls max). Set to 0 to disable
        regeneration entirely (lint-and-fix only).
    enable_fixer
        If False, skips the Haiku fixer pass and only regenerates.

    Returns
    -------
    WriteLoopResult
        Final body + final lint + attempt count + cost breakdown.
    """
    args = dict(initial_writer_args or {})
    cost_breakdown: dict[str, float] = {}
    total_cost = 0.0
    attempts = 0
    fix_passes = 0
    capped = False

    body_md = ""
    lint_report: VoiceLintReport | None = None

    for attempt in range(max_writer_retries + 1):
        attempts = attempt + 1
        # Pass regen_hint on retries
        if attempt > 0 and lint_report:
            args["regen_hint"] = (
                f"Previous attempt scored {lint_report.score} ({lint_report.verdict}). "
                f"Lint summary: {lint_report.summary}. "
                f"High-severity issues to AVOID this time:\n"
                + "\n".join(
                    f"  - [{iss.type}] {iss.snippet[:120]}"
                    for iss in lint_report.issues
                    if iss.severity == "high"
                )[:1500]
            )

        log.info("write_loop.writer_attempt", attempt=attempts)
        body_md, usage = await generate(**args)
        writer_cost = float(usage.get("cost_usd", 0))
        cost_breakdown[f"writer_attempt_{attempts}"] = writer_cost
        total_cost += writer_cost

        if total_cost > _MAX_USD:
            log.warning(
                "write_loop.budget_exceeded_post_writer",
                attempt=attempts,
                total_cost=total_cost,
                cap=_MAX_USD,
            )
            capped = True
            # Run lint one final time so frontmatter has a record
            lint_report = await voice_lint.check(body_md, source_context=source_context)
            cost_breakdown[f"lint_final"] = float(lint_report.usage.get("cost_usd", 0))
            total_cost += cost_breakdown[f"lint_final"]
            break

        # Lint pass 1
        lint_report = await voice_lint.check(body_md, source_context=source_context)
        lint_cost = float(lint_report.usage.get("cost_usd", 0))
        cost_breakdown[f"lint_attempt_{attempts}"] = lint_cost
        total_cost += lint_cost

        log.info(
            "write_loop.lint_result",
            attempt=attempts,
            verdict=lint_report.verdict,
            score=lint_report.score,
            issue_count=len(lint_report.issues),
        )

        # Fast path: pass or review verdict — done
        if lint_report.verdict in ("pass", "review"):
            break

        # Fail verdict — try fixer first (cheaper than regenerate)
        if enable_fixer and total_cost + 0.01 < _MAX_USD:
            cleaned, fix_usage = await voice_fixer.fix(
                body_md, lint_report, source_context=source_context
            )
            fix_cost = float(fix_usage.get("cost_usd", 0))
            if cleaned != body_md:
                fix_passes += 1
                cost_breakdown[f"fix_attempt_{attempts}"] = fix_cost
                total_cost += fix_cost
                body_md = cleaned

                # Re-lint the fixed version
                lint_report = await voice_lint.check(body_md, source_context=source_context)
                relint_cost = float(lint_report.usage.get("cost_usd", 0))
                cost_breakdown[f"relint_attempt_{attempts}"] = relint_cost
                total_cost += relint_cost

                log.info(
                    "write_loop.post_fix_lint",
                    attempt=attempts,
                    verdict=lint_report.verdict,
                    score=lint_report.score,
                    issue_count=len(lint_report.issues),
                )

                # If fixer recovered to pass/review, done
                if lint_report.verdict in ("pass", "review"):
                    break

        # Still fail — try regenerate if budget allows AND retries left
        if attempts > max_writer_retries:
            log.info("write_loop.no_retries_left", final_verdict=lint_report.verdict)
            break
        if total_cost > _MAX_USD:
            log.warning("write_loop.budget_exceeded_pre_regen", total_cost=total_cost)
            capped = True
            break

    assert lint_report is not None
    log.info(
        "write_loop.done",
        final_verdict=lint_report.verdict,
        final_score=lint_report.score,
        attempts=attempts,
        fix_passes=fix_passes,
        total_cost_usd=round(total_cost, 4),
        capped=capped,
    )

    return WriteLoopResult(
        body_md=body_md,
        lint=lint_report,
        attempts=attempts,
        fix_passes=fix_passes,
        total_cost_usd=total_cost,
        cost_breakdown=cost_breakdown,
        capped_by_budget=capped,
    )
