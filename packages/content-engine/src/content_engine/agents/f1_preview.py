"""F1 race weekend preview writer (Sonnet 4.6).

Phase 1 ship #12. Mirror of f1_recap.py for upcoming races.
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


def _load_f1_preview_system() -> str:
    return (_PROMPTS_DIR / "f1-preview-system.md").read_text(encoding="utf-8")


def format_f1_preview_user_message(ctx: dict[str, Any]) -> str:
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis preview untuk balapan F1 berikut:

LIGA: {fld("league_name")}
RACE: {fld("race_name")} — Round {fld("round")}
CIRCUIT: {fld("circuit")}, {fld("country")}
TANGGAL: {fld("race_date_local")}

DRIVER STANDINGS (current):
{fld("driver_standings_block")}

CONSTRUCTOR STANDINGS (current):
{fld("constructor_standings_block")}

PRIOR ROUND RESULTS (last race finish):
{fld("prior_results_block")}
"""


async def write_f1_preview(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_f1_preview_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_f1_preview_user_message(ctx)

    log.info("f1_preview.start", race=ctx.get("race_name"), round=ctx.get("round"))

    result = await run_messages(
        agent="f1-preview-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=1800,
    )

    log.info(
        "f1_preview.done",
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
