"""Pre-match preview writer.

Takes a fixture context dict, runs Sonnet 4.6 with the cached voice rules
+ preview system prompt, returns the generated body markdown plus token-
spend metadata.

Phase 1 — manual review queue. Auto-publish stays OFF; the orchestrator
hands the result to the publisher only after a human signs off (Phase 2
flips the flag for non-flagship matches).

The voice-rules.md + preview-system.md combo is ~3K tokens of stable
context — exactly what prompt caching is for. We pass them as a single
cached system block so every preview call after the first hits the
90%-off cache-read tier.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import structlog

from content_engine.anthropic_client import cached_system, run_messages
from content_engine.config import settings

log = structlog.get_logger()


_PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


def _load_voice_rules() -> str:
    """Read voice-rules.md verbatim. Stable across all writer calls — this
    is the load-bearing part of the cached system block."""
    return (_PROMPTS_DIR / "voice-rules.md").read_text(encoding="utf-8")


def _load_preview_system() -> str:
    """Read preview-system.md — agent-specific instructions that compose
    with voice-rules.md to form the cached system prompt."""
    return (_PROMPTS_DIR / "preview-system.md").read_text(encoding="utf-8")


def format_fixture_user_message(ctx: dict[str, Any]) -> str:
    """Public alias for the user-message renderer.

    Other modules (notably the voice linter) need access to the same
    rendered context block the writer agent saw, so they can ground-
    check fact claims. Underscore-prefixed for backwards compat with
    callers in this module.
    """
    return _format_fixture_user_message(ctx)


def _format_fixture_user_message(ctx: dict[str, Any]) -> str:
    """Render the fixture context dict into the user-message template
    from spec § 5.2.

    ``ctx`` shape (all string-or-None fields tolerated; missing items
    print as "—" so the model knows the data wasn't available rather
    than fabricating):

        {
            "league_name":      "Liga Inggris 2025-26",
            "kickoff_local":    "27 April 2026, 22.00 WIB",
            "venue":            "Anfield, Liverpool",
            "home_team":        "Liverpool",
            "home_position":    3,
            "home_form":        "WWLDW",
            "home_top_scorer":  "Mohamed Salah",
            "home_top_goals":   18,
            "home_injuries":    "Trent Alexander-Arnold (hamstring)",
            "away_team":        "Arsenal",
            "away_position":    2,
            "away_form":        "WWWDW",
            "away_top_scorer":  "Bukayo Saka",
            "away_top_goals":   14,
            "away_injuries":    "none",
            "h2h_summary":      "L 1-2, D 2-2, W 4-3, L 0-1, D 1-1",
            "context_notes":    "Liverpool butuh tiga poin demi top 4...",
            "broadcast":        "Vidio, beIN Sports 2",
        }
    """
    def fld(key: str, default: str = "—") -> str:
        v = ctx.get(key)
        if v is None or v == "":
            return default
        return str(v)

    return f"""Tulis preview untuk pertandingan berikut:

LIGA: {fld("league_name")}
TANGGAL & WAKTU: {fld("kickoff_local")}
VENUE: {fld("venue")}

TIM A (Home): {fld("home_team")}
- Posisi klasemen: {fld("home_position")}
- Form 5 laga: {fld("home_form")}
- Pencetak gol terbanyak musim: {fld("home_top_scorer")} ({fld("home_top_goals")} gol)
- Berita cedera/skorsing: {fld("home_injuries")}

TIM B (Away): {fld("away_team")}
- Posisi klasemen: {fld("away_position")}
- Form 5 laga: {fld("away_form")}
- Pencetak gol terbanyak musim: {fld("away_top_scorer")} ({fld("away_top_goals")} gol)
- Berita cedera/skorsing: {fld("away_injuries")}

H2H 5 PERTEMUAN TERAKHIR:
{fld("h2h_summary")}

KONTEKS TAMBAHAN:
{fld("context_notes")}

KANAL TAYANG: {fld("broadcast")}
"""


async def write_preview(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate a preview article for the given fixture context.

    Returns::

        {
            "body_md": str,           # the article markdown
            "model": str,             # which Sonnet variant ran
            "usage": dict,            # input/output/cached tokens + cost
            "stop_reason": str,
        }

    Raises ``BudgetExceededError`` if the preview-writer agent's daily
    spend cap was hit (per settings.daily_token_budget_usd). The caller
    is expected to halt + alert; do not silently downgrade.
    """
    voice = _load_voice_rules()
    agent_sys = _load_preview_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = _format_fixture_user_message(ctx)

    log.info(
        "preview.start",
        league=ctx.get("league_name"),
        home=ctx.get("home_team"),
        away=ctx.get("away_team"),
        kickoff=ctx.get("kickoff_local"),
    )

    result = await run_messages(
        agent="preview-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1500,  # 500-word target ≈ ~750 output tokens with Bahasa
    )

    log.info(
        "preview.done",
        chars=len(result["text"]),
        cost_usd=result["usage"]["cost_usd"],
        cache_read=result["usage"]["cache_read_input_tokens"],
    )

    return {
        "body_md": result["text"],
        "model": settings.model_narrative,
        "usage": result["usage"],
        "stop_reason": result["stop_reason"],
    }
