"""F1 championship-state explainer (Haiku 4.5 templated agent).

Phase 2 ship #18b. Fires after every race per the auto-creation
rule signoff. Uses driver + constructor standings already ingested
by the F1 recap context.
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


def _load_championship_system() -> str:
    return (_PROMPTS_DIR / "f1-championship-system.md").read_text(encoding="utf-8")


def format_f1_championship_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis artikel championship-state F1 berikut:

LIGA: {fld("league_name")}
SETELAH ROUND: {fld("round")} ({fld("race_name")})
ROUND TERSISA: {fld("rounds_remaining")}

DRIVER STANDINGS (top 10):
{fld("driver_standings_block")}

CONSTRUCTOR STANDINGS (top 8):
{fld("constructor_standings_block")}
"""


async def write_f1_championship(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_championship_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_f1_championship_user_message(ctx)

    log.info(
        "f1_championship.start",
        round=ctx.get("round"),
        leader=ctx.get("leader_driver"),
    )

    result = await run_messages(
        agent="f1-championship-explainer",
        model=settings.model_templated,  # Haiku 4.5
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1500,
    )

    log.info(
        "f1_championship.done",
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
