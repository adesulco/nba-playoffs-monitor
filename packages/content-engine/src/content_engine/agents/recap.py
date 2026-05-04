"""Post-match recap writer.

Phase 1 ship #3. Mirrors the preview writer's shape — load voice
rules + recap system prompt, cache them as a single system block, run
Sonnet 4.6 with a fixture-context user message, return body + usage.

Why a separate agent module instead of folding it into preview.py:
recaps and previews use DIFFERENT system prompts (post-match goal
narrative vs pre-match stakes-framing) AND different context shapes
(events/lineups/stats vs standings/H2H/topscorers). Sharing the cache
key would force them to share a system block, which they shouldn't.

The two agents share `_load_voice_rules()` because the voice rules
are universal — that's the load-bearing 90%-cache-hit content.
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


def _load_recap_system() -> str:
    return (_PROMPTS_DIR / "recap-system.md").read_text(encoding="utf-8")


def format_recap_user_message(ctx: dict[str, Any]) -> str:
    """Render the post-match context dict into the user-message block.

    ``ctx`` shape (built by ``data.recap_context.build_context``):

        {
            "league_name":   "Liga Inggris 2025-26",
            "kickoff_local": "25 April 2026, 21.00 WIB",
            "venue":         "Anfield, Liverpool",
            "home_team":     "Liverpool",
            "away_team":     "Crystal Palace",
            "home_score":    3,
            "away_score":    1,
            "home_formation":"4-2-3-1",
            "home_coach":    "Arne Slot",
            "away_formation":"3-4-2-1",
            "away_coach":    "Oliver Glasner",
            "events_block":  "...rendered timeline string...",
            "stats_block":   "...rendered stat comparison...",
            "lineups_block": "...rendered start XIs...",
            "broadcast":     "Vidio, beIN Sports",
        }

    All blocks are pre-formatted strings — recap_context does the
    rendering so the agent code stays focused.
    """
    # Note: don't use `or default` here — for 0-0 matches the integer
    # 0 is falsy and would render as "—", which the writer correctly
    # interprets as missing-data and refuses to generate. Treat None
    # and empty string as missing; preserve all other values verbatim.
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)
    return f"""Tulis recap untuk pertandingan berikut:

LIGA: {fld("league_name")}
TANGGAL & WAKTU: {fld("kickoff_local")}
VENUE: {fld("venue")}

SCORE AKHIR: {fld("home_team")} {fld("home_score")} - {fld("away_score")} {fld("away_team")}

LINEUPS:
{fld("lineups_block")}

TIMELINE EVENTS:
{fld("events_block")}

TEAM STATS:
{fld("stats_block")}

KANAL TAYANG: {fld("broadcast")}
"""


async def write_recap(ctx: dict[str, Any]) -> dict[str, Any]:
    """Generate a recap article for a finished match.

    Returns::

        {
            "body_md": str,
            "model": str,
            "usage": dict,
            "stop_reason": str,
        }

    Raises ``BudgetExceededError`` if the recap-writer agent's daily
    spend cap was hit (per ``settings.daily_token_budget_usd``).
    """
    voice = _load_voice_rules()
    agent_sys = _load_recap_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_recap_user_message(ctx)

    log.info(
        "recap.start",
        league=ctx.get("league_name"),
        home=ctx.get("home_team"),
        away=ctx.get("away_team"),
        score=f"{ctx.get('home_score')}-{ctx.get('away_score')}",
    )

    result = await run_messages(
        agent="recap-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 700-word target ≈ ~1050 output tokens with Bahasa expansion.
        # Add safety margin for the timeline narrative which can run
        # long when there are 4+ goals + cards + subs.
        max_tokens=2000,
    )

    log.info(
        "recap.done",
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
