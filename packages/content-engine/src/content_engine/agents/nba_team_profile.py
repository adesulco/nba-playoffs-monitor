"""NBA team profile writer (Sonnet 4.6).

Phase 2 ship #21. The Profile Writer from CLAUDE.md's agent table —
evergreen team/player content. NBA teams first since the playoffs
are live and "profil [Team Name]" is high-intent SEO right now.

Same architecture as nba_recap / nba_preview / f1_championship:
voice-rules.md cached + a per-content-type system prompt cached on
top, then a user message rendered from the context dict. One Sonnet
4.6 call per profile.

Why a separate agent (instead of reusing recap/preview): different
system prompt = different cached system block = different cache key
anyway, and the prompt structure for evergreen profile differs
materially from match-driven recap/preview.
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


def _load_team_profile_system() -> str:
    return (_PROMPTS_DIR / "nba-team-profile-system.md").read_text(encoding="utf-8")


def format_user_message(ctx: dict[str, Any]) -> str:
    """Render the team profile context dict into the user-message
    template the writer agent expects.

    ``ctx`` is built by ``data.nba_team_profile_context.build_context``.
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis profil tim NBA berikut:

IDENTITAS:
  Nama: {fld("team_name")}
  Lokasi: {fld("team_location")}
  Singkatan: {fld("team_abbr")}
  Conference: {fld("conference")}
  Division: {fld("division")}
  Standing: {fld("standing_summary")}
  Head coach: {fld("head_coach", default="(tidak tersedia)")}
  Musim: {fld("season_label")}
  Data per: {fld("as_of_id")}

RECORD:
{fld("record_block")}

ROSTER:
{fld("roster_block")}

NEXT EVENT (optional, may be empty):
{fld("next_event_block")}
"""


async def write_nba_team_profile(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate an NBA team profile article.

    Returns ``{body_md, model, usage, stop_reason}``.
    """
    voice = _load_voice_rules()
    agent_sys = _load_team_profile_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_user_message(ctx)

    log.info(
        "nba_team_profile.start",
        team_id=ctx.get("team_id"),
        team=ctx.get("team_name"),
        season=ctx.get("season_label"),
    )

    result = await run_messages(
        agent="nba-team-profile-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 700-word target ≈ ~1100 output tokens with Bahasa expansion;
        # cap at 2200 to give the agent some headroom.
        max_tokens=2200,
    )

    log.info(
        "nba_team_profile.done",
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
