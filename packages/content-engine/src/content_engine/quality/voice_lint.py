"""Voice linter — Haiku 4.5 pass for subtle voice drift.

Phase 1 ship #3. Runs AFTER polish + banned-phrase regex, BEFORE the
JSON write. Catches what regex can't:

  - Tense over-marking (telah / sudah / akan stuffed where Bahasa drops them)
  - Soft-discouraged phrases used >1× per article
  - Pronoun violations (Anda / kamu / lo / gue in body copy)
  - Academic register drift ("patut dicatat bahwa", "berdasarkan analisis")
  - AI-translated-English smell ("yang mana" misuse, calqued idioms)
  - Training-data inference creep (coach names, transfers not in input)
  - Numbered list in prose ("1) ... 2) ...")
  - Repeated "Selain itu" paragraph openers

Why Haiku 4.5: voice judgement is a templated task — the rules are
deterministic, the output is structured JSON, and Haiku is 12× cheaper
than Sonnet. Per CLAUDE.md the templated agents (standings, voice
lint, fact-check rule-runner) all use Haiku 4.5.

Doctrine compliance per CLAUDE.md non-negotiable rule #9 ("Never
publish if any quality gate fails. Fact validator + banned-phrase
regex + length check + dedup hash + schema validity + voice lint
hard fail. No bypass flags."): a `fail` verdict from this linter is a
publish-blocker. The CLI surfaces the issues to the operator and
exits non-zero; orchestration regenerates with the issues called
out in the prompt.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog

from content_engine.anthropic_client import cached_system, run_messages
from content_engine.config import settings

log = structlog.get_logger()


_PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


@dataclass
class VoiceLintIssue:
    """Single voice issue flagged by the linter."""

    type: str
    severity: str  # "high" | "medium" | "low"
    snippet: str
    issue: str
    fix: str


@dataclass
class VoiceLintReport:
    """Result of a voice-lint pass.

    `passed` is True iff verdict == "pass". The CLI checks this before
    writing JSON; orchestration uses it to drive regeneration.
    """

    verdict: str  # "pass" | "fail"
    score: int  # 0-100
    issues: list[VoiceLintIssue] = field(default_factory=list)
    summary: str = ""
    raw_response: str = ""  # for debugging — the literal model output
    usage: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.verdict == "pass"

    def summary_text(self) -> str:
        """Human-readable compact summary for the CLI."""
        head = f"voice-lint: {self.verdict.upper()} (score={self.score})"
        if not self.issues:
            return head + " — no issues flagged"
        lines = [head, f"  {len(self.issues)} issue(s):"]
        for i, iss in enumerate(self.issues, 1):
            lines.append(f"    {i}. [{iss.severity.upper()}] {iss.type}")
            lines.append(f'       snippet: "{iss.snippet[:80]}{"..." if len(iss.snippet) > 80 else ""}"')
            lines.append(f"       fix:     {iss.fix}")
        return "\n".join(lines)

    def to_frontmatter(self) -> dict[str, Any]:
        """Compact frontmatter dict — saved into the article JSON for
        the editor dashboard to read.

        v0.47.0 — Phase 2 ship #28. Now includes the per-issue list
        with snippet + severity + fix so /editor can surface them
        inline. Snippets are clipped to 240 chars (the model rarely
        produces longer; the cap protects index.json size).
        """
        return {
            "verdict": self.verdict,
            "score": self.score,
            "issue_count": len(self.issues),
            "summary": self.summary,
            "issues": [
                {
                    "type": iss.type,
                    "severity": iss.severity,
                    "snippet": iss.snippet[:240],
                    "fix": iss.fix[:240],
                }
                for iss in self.issues
            ],
        }


def _load_voice_rules() -> str:
    return (_PROMPTS_DIR / "voice-rules.md").read_text(encoding="utf-8")


def _load_lint_system() -> str:
    return (_PROMPTS_DIR / "voice-lint-system.md").read_text(encoding="utf-8")


def _extract_json(text: str) -> dict[str, Any] | None:
    """Pull the JSON object out of a model response.

    Haiku usually emits clean JSON, but occasionally wraps it in ```json
    fences or adds a leading 'Here is the lint report:' line. We're
    permissive about both.
    """
    # Strip code fences first (```json ... ``` or ``` ... ```)
    fence_re = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
    m = fence_re.search(text)
    if m:
        candidate = m.group(1)
    else:
        # Find the first { ... } block in the response. Greedy on outermost
        # braces — JSON objects with nested arrays/objects work fine because
        # we balance braces below.
        start = text.find("{")
        if start < 0:
            return None
        depth = 0
        end = -1
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end < 0:
            return None
        candidate = text[start:end]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        log.warning("voice_lint.bad_json", error=str(exc), candidate=candidate[:200])
        return None


async def check(body_md: str, source_context: str | None = None) -> VoiceLintReport:
    """Run the voice linter on a polished article body.

    ``source_context`` is the user-message the writer agent saw —
    the data block with positions, form, top-scorers, H2H, etc. When
    provided, the linter uses it to ground-check claims (a player +
    goal count that matches the context is grounded, not training-data
    inference). Without it, the linter has to guess and tends to over-
    flag legit input data as training inference.

    Returns a `VoiceLintReport` with verdict + per-issue list. Raises
    `BudgetExceededError` if the voice-linter agent's daily spend cap
    was hit.

    Caller pattern (see CLI):

        report = await voice_lint.check(body, source_context=user_msg)
        typer.echo(report.summary_text())
        if not report.passed:
            raise typer.Exit(4)  # blocked by voice gate
    """
    voice = _load_voice_rules()
    lint_sys = _load_lint_system()
    # Pack voice-rules + lint-system into ONE cached block — same
    # pattern as preview agent. ~3.5K tokens, 90% cache hit after first call.
    system = cached_system(voice + "\n\n---\n\n" + lint_sys)

    user_msg = (
        "Berikut artikel yang perlu di-review. "
        "Kembalikan ONLY JSON object per format di sistem prompt, "
        "raw, tanpa code fence, tanpa teks pembuka.\n\n"
    )
    if source_context:
        user_msg += (
            "INPUT DATA BLOCK (the writer agent had this — facts here "
            "are grounded, NOT training-data inference):\n\n"
            f"{source_context}\n\n"
            "---\n\n"
        )
    user_msg += f"ARTICLE TO REVIEW:\n\n{body_md}"

    log.info("voice_lint.start", chars=len(body_md))

    result = await run_messages(
        agent="voice-linter",
        model=settings.model_templated,  # Haiku 4.5
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 3000 tokens covers up to 8 issues with 20-word snippets +
        # padding. The prompt caps issues at 8; truncated JSON was
        # the leading failure mode in the v1 calibration run.
        max_tokens=3000,
    )

    raw = result["text"]
    parsed = _extract_json(raw) or {}

    # Defensive parsing — every field has a fallback so a malformed
    # response surfaces as a fail (high severity), not a crash.
    verdict_raw = (parsed.get("verdict") or "").lower().strip()
    if verdict_raw not in {"pass", "fail"}:
        # Unknown verdict — treat as fail (safer); log so we can tune.
        log.warning("voice_lint.unknown_verdict", verdict=parsed.get("verdict"), raw=raw[:200])
        verdict_raw = "fail"

    score = int(parsed.get("score") or 0)
    summary = str(parsed.get("summary") or "")

    issues: list[VoiceLintIssue] = []
    for iss in parsed.get("issues") or []:
        try:
            issues.append(VoiceLintIssue(
                type=str(iss.get("type") or "other"),
                severity=str(iss.get("severity") or "medium").lower(),
                snippet=str(iss.get("snippet") or "")[:300],
                issue=str(iss.get("issue") or ""),
                fix=str(iss.get("fix") or ""),
            ))
        except Exception as exc:  # noqa: BLE001
            log.warning("voice_lint.bad_issue_row", error=str(exc), iss=iss)

    # Phase 2 ship #25 — merge regex-detected training-inference hits
    # into the issue list. The Haiku linter catches the long tail; this
    # deterministic pass catches the recurring patterns observed across
    # the Profile Writer rollout (Verstappen world-championship slip,
    # Sinner debut-year slip, etc).
    from content_engine.quality import inference_guard
    regex_hits = inference_guard.scan(body_md, source_context=source_context)
    haiku_snippets = {iss.snippet[:60] for iss in issues}
    for hit in regex_hits:
        # De-dupe against Haiku — if Haiku already flagged a similar
        # snippet, don't double-report.
        if any(hit.snippet[:30] in s or s[:30] in hit.snippet for s in haiku_snippets):
            continue
        issues.append(VoiceLintIssue(
            type="training_inference",
            severity=hit.severity,
            snippet=hit.snippet[:300],
            issue=hit.pattern_description,
            fix=hit.fix,
        ))

    # If the regex pass added high-severity hits AND Haiku passed,
    # downgrade the verdict — score gets a penalty proportional to
    # the number of high-severity regex hits.
    high_count = sum(1 for h in regex_hits if h.severity == "high")
    if high_count > 0 and verdict_raw == "pass":
        # Each high-severity regex hit drops the score 8 points and
        # if 2+, force verdict to fail.
        score = max(0, score - 8 * high_count)
        if high_count >= 2 or score < 70:
            verdict_raw = "fail"
            log.info(
                "voice_lint.regex_overrode_pass",
                high_severity_hits=high_count,
                new_score=score,
            )

    report = VoiceLintReport(
        verdict=verdict_raw,
        score=score,
        issues=issues,
        summary=summary,
        raw_response=raw,
        usage=result["usage"],
    )

    log.info(
        "voice_lint.done",
        verdict=verdict_raw,
        score=score,
        issue_count=len(issues),
        cost_usd=result["usage"]["cost_usd"],
        cache_read=result["usage"]["cache_read_input_tokens"],
    )

    return report
