"""F1 race recap writer (Sonnet 4.6).

Phase 1 ship #12. Mirrors nba_recap.py shape — different system prompt
+ different context block, same gate pipeline.
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


def _load_f1_recap_system() -> str:
    return (_PROMPTS_DIR / "f1-recap-system.md").read_text(encoding="utf-8")


def format_f1_recap_user_message(ctx: dict[str, Any]) -> str:
    """Render the post-race context dict.

    ``ctx`` shape:

        {
            "league_name":  "Formula 1 2026",
            "race_name":    "Japanese Grand Prix",
            "round":        3,
            "circuit":      "Suzuka Circuit",
            "country":      "Japan",
            "race_date_local": "Minggu, 29 Maret 2026, 21.00 WIB",
            "results_block": "...rendered finish order with grid + points...",
            "qualifying_block": "...optional pole/Q3 summary...",
            "driver_standings_block": "...top 10 + points + wins...",
            "constructor_standings_block": "...top 5 constructors..."
        }
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis recap untuk balapan F1 berikut:

LIGA: {fld("league_name")}
RACE: {fld("race_name")} — Round {fld("round")}
CIRCUIT: {fld("circuit")}, {fld("country")}
TANGGAL: {fld("race_date_local")}

RACE RESULTS (P1-P15):
{fld("results_block")}

QUALIFYING (top 5):
{fld("qualifying_block")}

DRIVER STANDINGS (after this round):
{fld("driver_standings_block")}

CONSTRUCTOR STANDINGS (after this round):
{fld("constructor_standings_block")}
"""


async def write_f1_recap(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate an F1 race recap article."""
    voice = _load_voice_rules()
    agent_sys = _load_f1_recap_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_f1_recap_user_message(ctx)

    log.info(
        "f1_recap.start",
        race=ctx.get("race_name"),
        round=ctx.get("round"),
    )

    result = await run_messages(
        agent="f1-recap-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2000,
    )

    log.info(
        "f1_recap.done",
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
