"""Voice fixer — Haiku 4.5 post-pass that cleans up linter flags.

v0.59.4 — companion to voice_lint. Runs AFTER voice_lint but BEFORE
the JSON write, when the lint verdict is `review` or `fail`. Takes
the draft + the lint issue list and returns a cleaned article that
addresses the flags without changing facts.

Design constraints (per CLAUDE.md):
- Uses Haiku 4.5 (templated task — surgical edits per flag)
- Cost ~$0.005 per call (small input + small output)
- Prompt cached on system block (90% off)
- Never adds facts; only deletes / rewrites flagged spans
- Never changes voice character (the voice rules don't change here;
  the fixer is a deterministic application of them)

Wired into the writer pipeline by:
    quality.write_loop.run_with_quality_loop(...)

which orchestrates writer → lint → fix → re-lint → (regenerate if
still fail) up to N retries. See write_loop.py.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog

from content_engine.anthropic_client import cached_system, run_messages
from content_engine.config import settings
from content_engine.quality.voice_lint import VoiceLintReport

log = structlog.get_logger()

_PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


def _load_fixer_system() -> str:
    return (_PROMPTS_DIR / "voice-fixer-system.md").read_text(encoding="utf-8")


async def fix(
    body_md: str,
    lint_report: VoiceLintReport,
    source_context: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Run the voice fixer on a draft body using its lint report.

    Returns (cleaned_body, usage). If there are no actionable issues
    (empty list, or all `low` severity that aren't worth a Haiku call)
    returns (body_md, {}) without an API call.
    """
    if not lint_report.issues:
        return body_md, {}

    # Skip if all issues are low-severity — fixer overhead not worth it
    actionable = [iss for iss in lint_report.issues if iss.severity in ("high", "medium")]
    if not actionable:
        log.info("voice_fixer.skipped", reason="all_issues_low_severity")
        return body_md, {}

    # Pack the issue list compactly for the model
    issues_json = json.dumps(
        [
            {
                "type": iss.type,
                "severity": iss.severity,
                "snippet": iss.snippet,
                "fix": iss.fix,
            }
            for iss in actionable
        ],
        ensure_ascii=False,
        indent=2,
    )

    # Cached system block (90% off after first call per session)
    system_block = cached_system(_load_fixer_system())

    user_msg_parts: list[str] = []
    if source_context:
        user_msg_parts.append(
            "INPUT DATA THE WRITER SAW (for grounding — do not invent beyond this):\n\n"
            f"{source_context}\n"
        )
    user_msg_parts.append(f"LINT ISSUES TO ADDRESS:\n\n{issues_json}\n")
    user_msg_parts.append(f"DRAFT ARTICLE:\n\n{body_md}\n")
    user_msg_parts.append(
        "\nRETURN THE CLEANED ARTICLE BODY ONLY. No preamble, no explanation, "
        "no JSON wrapper. Begin with the original heading; end with the last paragraph."
    )
    user_msg = "\n---\n\n".join(user_msg_parts)

    log.info(
        "voice_fixer.start",
        issue_count=len(actionable),
        chars_in=len(body_md),
        high_count=sum(1 for i in actionable if i.severity == "high"),
    )

    result = await run_messages(
        agent="voice-fixer",
        model=settings.model_templated,  # Haiku 4.5
        system=system_block,
        messages=[{"role": "user", "content": user_msg}],
        # Output is approximately the same size as input + minor
        # deletions; 4000 tokens covers up to ~3000-word articles.
        max_tokens=4000,
    )

    cleaned = result["text"].strip()

    # Defensive: if Haiku returns empty or wrapped output, fall back to original
    if len(cleaned) < 100:
        log.warning(
            "voice_fixer.suspicious_output",
            chars_out=len(cleaned),
            preview=cleaned[:120],
        )
        return body_md, result["usage"]

    # Strip any leading/trailing code fences Haiku occasionally adds
    if cleaned.startswith("```"):
        # Drop first line and last ``` line if present
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    log.info(
        "voice_fixer.done",
        chars_in=len(body_md),
        chars_out=len(cleaned),
        delta=len(cleaned) - len(body_md),
        cost_usd=result["usage"]["cost_usd"],
        cache_read=result["usage"]["cache_read_input_tokens"],
    )

    return cleaned, result["usage"]
