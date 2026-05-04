"""Tennis rankings explainer (Haiku 4.5 templated agent).

Phase 1 ship #13. Same architectural shape as standings explainer
(football). Weekly cadence, one article per tour (ATP/WTA).
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


def _load_tennis_rankings_system() -> str:
    return (_PROMPTS_DIR / "tennis-rankings-system.md").read_text(encoding="utf-8")


def format_tennis_rankings_user_message(ctx: dict[str, Any]) -> str:
    """Render the rankings context dict.

    ``ctx`` shape (from data.tennis_rankings_context.build_context):

        {
            "league_name":      "ATP Tour 2026" | "WTA Tour 2026",
            "tour":             "atp" | "wta",
            "updated_local":    "16 April 2026 (mingguan)",
            "rankings_block":   "...rendered top 20 table...",
            "active_tournament_block": "...optional active tournament...",
        }
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis analisis ranking mingguan untuk tour berikut:

LIGA: {fld("league_name")}
TOUR: {fld("tour")}
UPDATE TERAKHIR: {fld("updated_local")}

RANKINGS (top 20, dengan movement):
{fld("rankings_block")}

ACTIVE TOURNAMENT (opsional, mungkin kosong):
{fld("active_tournament_block")}
"""


async def write_tennis_rankings(ctx: dict[str, Any]) -> dict[str, Any]:
    voice = _load_voice_rules()
    agent_sys = _load_tennis_rankings_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_tennis_rankings_user_message(ctx)

    log.info("tennis_rankings.start", tour=ctx.get("tour"))

    result = await run_messages(
        agent="tennis-rankings-explainer",
        model=settings.model_templated,  # Haiku 4.5
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 500-word target ≈ ~750 output tokens with Bahasa expansion
        max_tokens=1500,
    )

    log.info(
        "tennis_rankings.done",
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
