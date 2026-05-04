"""NBA series-state explainer (Haiku 4.5 templated agent).

Phase 2 ship #18a. Sister to the football standings explainer +
the tennis rankings explainer — same shape: templated content,
tight grounding rules, weekly-ish cadence (per series transition).

Cost: ~$0.001-0.003 per article warm-cache.
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


def _load_series_system() -> str:
    return (_PROMPTS_DIR / "nba-series-system.md").read_text(encoding="utf-8")


def format_nba_series_user_message(ctx: dict[str, Any]) -> str:
    """Render the series-state context dict.

    ``ctx`` shape (built by ``data.nba_series_context.build_context``):

        {
            "league_name":  "NBA Playoffs 2026",
            "round":        "Round 1 East",
            "series_summary": "BOS leads series 3-1",
            "home_team":    "Boston Celtics",
            "home_abbr":    "BOS",
            "away_team":    "Philadelphia 76ers",
            "away_abbr":    "PHI",
            "games_block":  "...rendered per-game score list...",
            "next_game_block": "...optional Game N+1 tipoff info..."
        }
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis artikel series-state untuk seri NBA berikut:

LIGA: {fld("league_name")}
ROUND: {fld("round")}
TEAMS: {fld("away_team")} ({fld("away_abbr")}) @ {fld("home_team")} ({fld("home_abbr")})

SERIES SCORE: {fld("series_summary")}

GAMES (chronological):
{fld("games_block")}

NEXT GAME (optional, may be empty):
{fld("next_game_block")}
"""


async def write_nba_series(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_series_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_nba_series_user_message(ctx)

    log.info(
        "nba_series.start",
        round=ctx.get("round"),
        summary=ctx.get("series_summary"),
    )

    result = await run_messages(
        agent="nba-series-explainer",
        model=settings.model_templated,  # Haiku 4.5
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1500,
    )

    log.info(
        "nba_series.done",
        chars=len(result["text"]),
        cost_usd=result["usage"]["cost_usd"],
        cache_read=result["usage"]["cache_read_input_tokens"],
    )

    return {
        "body_md": result["text"],
        "model": settings.model_templated,
        "usage": result["usage"],
        "stop_reason": result["stop_reason"],
    }
