"""F1 driver profile writer (Sonnet 4.6)."""

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
    return (_PROMPTS_DIR / "f1-driver-profile-system.md").read_text(encoding="utf-8")


def format_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis profil pembalap F1 berikut:

LIGA: Formula 1
MUSIM: {fld("season_label")}
DATA PER: {fld("as_of_id")}

IDENTITAS:
{fld("identity_block")}

MUSIM INI:
{fld("season_block")}

HASIL PER BALAPAN:
{fld("results_block")}
"""


async def write_f1_driver_profile(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_system_prompt()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_user_message(ctx)

    log.info("f1_driver_profile.start", driver=ctx.get("driver_name"), season=ctx.get("season"))

    result = await run_messages(
        agent="f1-driver-profile-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2200,
    )

    log.info(
        "f1_driver_profile.done",
        chars=len(result["text"]),
        cost_usd=result["usage"]["cost_usd"],
    )

    return {
        "body_md": result["text"],
        "model": settings.model_narrative,
        "usage": result["usage"],
        "stop_reason": result["stop_reason"],
    }
