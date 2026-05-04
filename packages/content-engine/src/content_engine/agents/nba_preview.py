"""NBA Playoffs preview writer (Sonnet 4.6).

Phase 1 ship #11. Pre-game preview, mirror of nba_recap.py.
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
    return (_PROMPTS_DIR / "voice-rules.md").read_text(encoding="utf-8")


def _load_nba_preview_system() -> str:
    return (_PROMPTS_DIR / "nba-preview-system.md").read_text(encoding="utf-8")


def format_nba_preview_user_message(ctx: dict[str, Any]) -> str:
    """Render the pre-game context dict into the user-message template.

    ``ctx`` shape (built by ``data.nba_preview_context.build_context``):

        {
            "league_name":  "NBA Playoffs 2026",
            "tipoff_local": "28 April 2026, 06.00 WIB",
            "venue":        "TD Garden, Boston",
            "home_team":    "Boston Celtics",
            "home_abbr":    "BOS",
            "away_team":    "Philadelphia 76ers",
            "away_abbr":    "PHI",
            "series_block": "...rendered series state + prior games...",
            "form_block":   "...recent results / records...",
            "broadcast":    "Vidio, NBA League Pass",
        }
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis preview untuk pertandingan NBA berikut:

LIGA: {fld("league_name")}
JADWAL: {fld("tipoff_local")}
VENUE: {fld("venue")}

MATCHUP: {fld("away_team")} ({fld("away_abbr")}) @ {fld("home_team")} ({fld("home_abbr")})

SERIES STATE:
{fld("series_block")}

RECENT FORM (optional):
{fld("form_block")}

KANAL TAYANG: {fld("broadcast")}
"""


async def write_nba_preview(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate an NBA preview article."""
    voice = _load_voice_rules()
    agent_sys = _load_nba_preview_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_nba_preview_user_message(ctx)

    log.info(
        "nba_preview.start",
        home=ctx.get("home_abbr"),
        away=ctx.get("away_abbr"),
        tipoff=ctx.get("tipoff_local"),
    )

    result = await run_messages(
        agent="nba-preview-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1800,
    )

    log.info(
        "nba_preview.done",
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
