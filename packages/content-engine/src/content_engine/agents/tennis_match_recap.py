"""Tennis match recap writer (Sonnet 4.6).

Phase 2 ship #17e. Sister to nba_recap, f1_recap.
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


def _load_match_recap_system() -> str:
    return (_PROMPTS_DIR / "tennis-match-recap-system.md").read_text(encoding="utf-8")


def format_tennis_match_recap_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis recap untuk pertandingan tennis berikut:

LIGA: {fld("league_name")}
TURNAMEN: {fld("tournament_name")}
ROUND: {fld("round")}
TANGGAL: {fld("match_date_local")}
VENUE: {fld("venue")}
FORMAT: {fld("match_format")}

PLAYERS:
{fld("players_block")}

SET SCORES:
{fld("set_scores_block")}

WINNER: {fld("winner_name")}
"""


async def write_tennis_match_recap(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_match_recap_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_tennis_match_recap_user_message(ctx)

    log.info(
        "tennis_match_recap.start",
        tournament=ctx.get("tournament_name"),
        winner=ctx.get("winner_name"),
    )

    result = await run_messages(
        agent="tennis-match-recap-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1500,
    )

    log.info(
        "tennis_match_recap.done",
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
