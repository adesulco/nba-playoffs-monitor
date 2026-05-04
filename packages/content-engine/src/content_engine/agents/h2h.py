"""Football H2H writer (Sonnet 4.6)."""

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
    return (_PROMPTS_DIR / "h2h-system.md").read_text(encoding="utf-8")


def format_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis artikel head-to-head untuk dua klub berikut:

LIGA: {fld("league_label")}
DATA PER: {fld("as_of_id")}

IDENTITAS KLUB A:
  Nama: {fld("team_a_name")}
  Negara: {fld("team_a_country")}
  Kandang: {fld("team_a_venue")}

IDENTITAS KLUB B:
  Nama: {fld("team_b_name")}
  Negara: {fld("team_b_country")}
  Kandang: {fld("team_b_venue")}

RINGKASAN H2H:
{fld("summary_block")}

PERTEMUAN TERAKHIR:
{fld("meetings_block")}
"""


async def write_h2h(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_system_prompt()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_user_message(ctx)

    log.info(
        "h2h.start",
        team_a=ctx.get("team_a_name"),
        team_b=ctx.get("team_b_name"),
        league_id=ctx.get("league_id"),
    )

    result = await run_messages(
        agent="h2h-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2000,
    )

    log.info("h2h.done", chars=len(result["text"]), cost_usd=result["usage"]["cost_usd"])

    return {
        "body_md": result["text"],
        "model": settings.model_narrative,
        "usage": result["usage"],
        "stop_reason": result["stop_reason"],
    }
