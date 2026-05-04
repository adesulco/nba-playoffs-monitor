"""Football team profile writer (Sonnet 4.6).

Phase 2 ship #22. Single agent for both EPL + Liga 1 (same data
shape from API-Football, same prompt structure). The league_id
in the input determines a few framing details (league name,
country default) but the writing structure is identical.
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


def _load_system_prompt() -> str:
    return (_PROMPTS_DIR / "football-team-profile-system.md").read_text(encoding="utf-8")


def format_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis profil klub sepak bola berikut:

LIGA: {fld("league_label")} ({fld("competition_short")})
MUSIM: {fld("season_label")}
DATA PER: {fld("as_of_id")}

IDENTITAS:
{fld("identity_block")}

PERFORMA:
{fld("performa_block")}

KLASEMEN:
{fld("standings_block")}
"""


async def write_football_team_profile(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_system_prompt()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_user_message(ctx)

    log.info(
        "football_team_profile.start",
        team=ctx.get("team_name"),
        league_id=ctx.get("league_id"),
    )

    result = await run_messages(
        agent="football-team-profile-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2200,
    )

    log.info(
        "football_team_profile.done",
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
