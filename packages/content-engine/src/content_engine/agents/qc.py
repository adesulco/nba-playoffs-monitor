"""QC Reviewer (Opus 4.7).

Phase 2 ship #19. Most expensive model in the stack — runs on 10%
sample of generated articles per CLAUDE.md policy. Senior editorial
critique that catches what regex gates + Haiku voice-lint miss:
structural balance, lead weakness, narrative flow, headline
strength, AI-tells.

Cost: ~$0.10-0.20 per call (Opus 4.7 = $15/$75 per 1M tokens). At
10% sampling rate, amortized cost is ~$0.01-0.02 per article
generated.

Output is ADVISORY — it doesn't gate publish. Surfaced to editor
via frontmatter.qc_review for sortable display in /editor.
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
class QcSuggestion:
    priority: str
    snippet: str
    issue: str
    fix: str


@dataclass
class QcReport:
    """Result of a QC pass.

    `verdict` is one of: "ship" | "edit" | "regenerate". This is
    advisory — the publishing pipeline doesn't gate on it. Editor
    sees it in the dashboard.
    """

    verdict: str
    overall_score: int
    headline_score: int
    headline_comment: str
    lead_score: int
    lead_comment: str
    structure_score: int
    structure_comment: str
    voice_score: int
    voice_comment: str
    suggestions: list[QcSuggestion] = field(default_factory=list)
    summary: str = ""
    raw_response: str = ""
    usage: dict[str, Any] = field(default_factory=dict)

    def to_frontmatter(self) -> dict[str, Any]:
        """Compact version stored in article frontmatter for /editor surfacing.

        v0.47.0 — Phase 2 ship #28. Now includes the per-section
        comments (headline_comment etc) AND the full suggestions
        array (priority + snippet + fix). Editor sees all of Opus's
        actionable feedback inline instead of a count + summary.
        Snippets capped at 300 chars to bound JSON size.
        """
        return {
            "verdict": self.verdict,
            "overall_score": self.overall_score,
            "headline_score": self.headline_score,
            "headline_comment": self.headline_comment,
            "lead_score": self.lead_score,
            "lead_comment": self.lead_comment,
            "structure_score": self.structure_score,
            "structure_comment": self.structure_comment,
            "voice_score": self.voice_score,
            "voice_comment": self.voice_comment,
            "suggestion_count": len(self.suggestions),
            "summary": self.summary,
            "suggestions": [
                {
                    "priority": s.priority,
                    "snippet": s.snippet[:300],
                    "issue": s.issue[:300],
                    "fix": s.fix[:300],
                }
                for s in self.suggestions
            ],
        }


def _load_voice_rules() -> str:
    return (_PROMPTS_DIR / "voice-rules.md").read_text(encoding="utf-8")


def _load_qc_system() -> str:
    return (_PROMPTS_DIR / "qc-system.md").read_text(encoding="utf-8")


def _extract_json(text: str) -> dict[str, Any] | None:
    """Pull the JSON object out of Opus's response. Same logic as
    voice_lint._extract_json — handles ``` fences + raw JSON."""
    fence_re = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
    m = fence_re.search(text)
    if m:
        candidate = m.group(1)
    else:
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
        log.warning("qc.bad_json", error=str(exc), candidate=candidate[:200])
        return None


async def review(
    body_md: str,
    *,
    article_type: str,
    source_context: str | None = None,
    title: str | None = None,
) -> QcReport:
    """Run the QC reviewer.

    Returns a QcReport. Caller persists the compact `to_frontmatter()`
    output into the article's frontmatter so /editor can sort by QC
    score / verdict.
    """
    voice = _load_voice_rules()
    qc_sys = _load_qc_system()
    system = cached_system(voice + "\n\n---\n\n" + qc_sys)

    user_msg = (
        f"Review this {article_type} article. Return ONLY the JSON "
        "specified in the system prompt — no code fences, no preamble.\n\n"
    )
    if title:
        user_msg += f"HEADLINE / TITLE:\n{title}\n\n"
    if source_context:
        user_msg += (
            "INPUT DATA BLOCK (the writer agent had this — use it to assess "
            "groundedness + missed-opportunity claims):\n\n"
            f"{source_context}\n\n---\n\n"
        )
    user_msg += f"ARTICLE BODY:\n\n{body_md}"

    log.info("qc.start", article_type=article_type, chars=len(body_md))

    result = await run_messages(
        agent="qc-reviewer",
        model=settings.model_qc,  # claude-opus-4-7
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2500,
    )

    raw = result["text"]
    parsed = _extract_json(raw) or {}

    verdict = (parsed.get("verdict") or "").lower().strip()
    if verdict not in {"ship", "edit", "regenerate"}:
        verdict = "edit"  # safest fallback if Opus produces unexpected output

    def _section(key: str) -> tuple[int, str]:
        sec = parsed.get(key) or {}
        if not isinstance(sec, dict):
            return 0, ""
        try:
            score = int(sec.get("score") or 0)
        except (TypeError, ValueError):
            score = 0
        comment = str(sec.get("comment") or "")
        return score, comment

    headline_score, headline_comment = _section("headline")
    lead_score, lead_comment = _section("lead")
    structure_score, structure_comment = _section("structure")
    voice_score, voice_comment = _section("voice")

    suggestions: list[QcSuggestion] = []
    for s in (parsed.get("suggestions") or []):
        try:
            suggestions.append(QcSuggestion(
                priority=str(s.get("priority") or "medium").lower(),
                snippet=str(s.get("snippet") or "")[:300],
                issue=str(s.get("issue") or ""),
                fix=str(s.get("fix") or ""),
            ))
        except Exception as exc:  # noqa: BLE001
            log.warning("qc.bad_suggestion_row", error=str(exc), row=s)

    try:
        overall = int(parsed.get("overall_score") or 0)
    except (TypeError, ValueError):
        overall = 0

    report = QcReport(
        verdict=verdict,
        overall_score=overall,
        headline_score=headline_score,
        headline_comment=headline_comment,
        lead_score=lead_score,
        lead_comment=lead_comment,
        structure_score=structure_score,
        structure_comment=structure_comment,
        voice_score=voice_score,
        voice_comment=voice_comment,
        suggestions=suggestions,
        summary=str(parsed.get("summary") or ""),
        raw_response=raw,
        usage=result["usage"],
    )

    log.info(
        "qc.done",
        verdict=verdict,
        overall_score=overall,
        suggestion_count=len(suggestions),
        cost_usd=result["usage"]["cost_usd"],
        cache_read=result["usage"]["cache_read_input_tokens"],
    )

    return report
