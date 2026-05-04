"""Standings explainer — weekly Haiku 4.5 templated agent.

Phase 1 ship #8. Produces a 400-500 word Bahasa standings analysis
from the full league table after a gameweek finishes. Templated
content per CLAUDE.md agent table:

  | Standings Explainer | Weekly tables analysis | Haiku 4.5 |

Why Haiku not Sonnet: standings copy is data → prose with deliberate
voice constraints. The numerical anchors carry the story; the writer's
job is reading the table cleanly, not inventing flair. Haiku 4.5 is
12× cheaper than Sonnet 4.6 and equal to the task when the prompt
gives it tight rules + structured input.

Cost: ~$0.001-0.003 per article (vs $0.012-0.020 for Sonnet preview/
recap). One article per league per week — pennies of total spend.
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


def _load_standings_system() -> str:
    return (_PROMPTS_DIR / "standings-system.md").read_text(encoding="utf-8")


def format_standings_user_message(ctx: dict[str, Any]) -> str:
    """Render the standings context dict into the user-message block.

    ``ctx`` shape (built by ``data.standings_context.build_context``):

        {
            "league_name":    "Liga Inggris 2025-26",
            "gameweek":       34,
            "matches_left":   4,
            "table_block":    "...rendered standings table...",
            "movers_block":   "...notable mover lines (optional)..."
        }

    The table_block is pre-rendered in standings_context as a
    fixed-width text table — easier for the model to read than raw
    JSON, and citation-stable so we can fact-check claims back
    against this exact text.
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis analisis klasemen mingguan untuk pertandingan berikut:

LIGA: {fld("league_name")}
PEKAN KE: {fld("gameweek")}
SISA PEKAN: {fld("matches_left")}

KLASEMEN LENGKAP:
{fld("table_block")}

CATATAN PERGERAKAN (opsional):
{fld("movers_block")}
"""


async def write_standings(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate a weekly standings explainer.

    Returns::

        {
            "body_md": str,
            "model": str,            # claude-haiku-4-5-... (templated agent)
            "usage": dict,
            "stop_reason": str,
        }

    Raises ``BudgetExceededError`` if the standings-explainer agent's
    daily spend cap was hit (per ``settings.daily_token_budget_usd``).
    Cap is shared across the templated-agent pool (standings + voice
    lint + fact-check).
    """
    voice = _load_voice_rules()
    agent_sys = _load_standings_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_standings_user_message(ctx)

    log.info(
        "standings.start",
        league=ctx.get("league_name"),
        gameweek=ctx.get("gameweek"),
    )

    result = await run_messages(
        agent="standings-explainer",
        model=settings.model_templated,  # Haiku 4.5
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 500-word target ≈ ~750 output tokens with Bahasa expansion.
        max_tokens=1500,
    )

    log.info(
        "standings.done",
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
