"""NBA Playoffs recap writer (Sonnet 4.6).

Phase 1 ship #11. Sister agent to ``recap.py`` (football); they share
voice rules but use different system prompts because basketball
recaps need different structure (top scorers, FG%/3P%, series state)
than football recaps (goals + minutes + xG).

Why a separate module: same reasoning as the football preview/recap
split. Different prompts → different cached system blocks → don't
share a cache key.
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


def _load_nba_recap_system() -> str:
    return (_PROMPTS_DIR / "nba-recap-system.md").read_text(encoding="utf-8")


def format_nba_recap_user_message(ctx: dict[str, Any]) -> str:
    """Render the post-game context dict into the user-message template.

    ``ctx`` shape (built by ``data.nba_recap_context.build_context``):

        {
            "league_name":  "NBA Playoffs 2026",
            "tipoff_local": "27 April 2026, 09.30 WIB",
            "venue":        "TD Garden, Boston",
            "home_team":    "Boston Celtics",
            "home_abbr":    "BOS",
            "away_team":    "Philadelphia 76ers",
            "away_abbr":    "PHI",
            "home_score":   128,
            "away_score":   96,
            "series_block": "...rendered series state...",
            "scorers_block": "...rendered top scorers per team...",
            "stats_block":  "...rendered team box score comparison...",
            "plays_block":  "...optional clutch-play timeline...",
            "broadcast":    "Vidio, NBA League Pass",
        }
    """
    def fld(k: str, default: str = "—") -> str:
        v = ctx.get(k)
        if v is None or v == "":
            return default
        return str(v)

    # v0.59.6 — Numeric anchor block at the very top. Lists every
    # cite-able number from the input as a flat NUMBER → VALUE map,
    # making it trivial for the writer to copy-paste exact digits.
    # Sonnet's stat-misread errors (e.g. Bane "11 poin" when input said
    # 16) usually come from re-deriving numbers from prose-formatted
    # blocks. The flat anchor block reduces that.
    anchor_lines: list[str] = []
    away_abbr = fld("away_abbr")
    home_abbr = fld("home_abbr")
    away_score = fld("away_score")
    home_score = fld("home_score")
    anchor_lines.append(f"  FINAL_SCORE = {away_abbr} {away_score} - {home_score} {home_abbr}")

    # Surface every player's stat line as a separate anchor row.
    # _scorers shape: [{"team_abbr": "BOS", "scorers": [{"name", "pts", "reb", "ast"}, ...]}, ...]
    scorers_data = ctx.get("_scorers") or []
    if isinstance(scorers_data, list):
        for team_block in scorers_data:
            if not isinstance(team_block, dict):
                continue
            team_abbr_local = team_block.get("team_abbr") or "?"
            for entry in (team_block.get("scorers") or [])[:5]:
                if not isinstance(entry, dict):
                    continue
                name = entry.get("name") or ""
                pts = entry.get("pts")
                reb = entry.get("reb")
                ast = entry.get("ast")
                if name and pts is not None:
                    parts = [f"PTS={pts}"]
                    if reb is not None:
                        parts.append(f"REB={reb}")
                    if ast is not None:
                        parts.append(f"AST={ast}")
                    anchor_lines.append(
                        f"  [{team_abbr_local}] {name}: " + ", ".join(parts)
                    )

    anchor_block = "\n".join(anchor_lines) if anchor_lines else "  (no anchor data — see TOP SCORERS below)"

    return f"""Tulis recap untuk pertandingan NBA berikut:

═══════════════════════════════════════════════════════════════
NUMERIC ANCHORS — copy-paste these EXACT digits when citing stats:
═══════════════════════════════════════════════════════════════
{anchor_block}
═══════════════════════════════════════════════════════════════

LIGA: {fld("league_name")}
JADWAL: {fld("tipoff_local")}
VENUE: {fld("venue")}

SCORE AKHIR: {fld("away_team")} ({fld("away_abbr")}) {fld("away_score")} @ {fld("home_score")} {fld("home_team")} ({fld("home_abbr")})

SERIES STATE:
{fld("series_block")}

TOP SCORERS:
{fld("scorers_block")}

TEAM STATS:
{fld("stats_block")}

KEY PLAYS (optional, may be empty):
{fld("plays_block")}

KANAL TAYANG: {fld("broadcast")}

REMINDER: Before submitting, re-read your draft. For every digit you wrote,
verify it appears LITERALLY in the NUMERIC ANCHORS or TOP SCORERS or
TEAM STATS block above. If you can't verify a number, DELETE the sentence
or rewrite it qualitatively. Length is not the bar — accuracy is.
"""


async def write_nba_recap(
    ctx: dict[str, Any],
    *,
    regen_hint: str | None = None,
) -> dict[str, Any]:
    """Generate an NBA recap article.

    Returns ``{body_md, model, usage, stop_reason}``.
    """
    voice = _load_voice_rules()
    agent_sys = _load_nba_recap_system()
    system = cached_system(voice + "\n\n---\n\n" + agent_sys)

    user_msg = format_nba_recap_user_message(ctx)

    # v0.59.5 — On regenerate-after-fact-check-fail, prepend a hint
    # block that tells the writer EXACTLY what stats it got wrong
    # last time and to avoid repeating those errors.
    if regen_hint:
        user_msg = (
            "PREVIOUS ATTEMPT FAILED THE FACT-CHECKER. Re-write avoiding these errors:\n\n"
            f"{regen_hint}\n\n"
            "RULES FOR THIS RETRY:\n"
            "- Read every number in the input data block CAREFULLY before writing\n"
            "- Cite numbers ONLY by copy-paste from input — no rounding, no inference\n"
            "- If a stat isn't in input, omit it qualitatively rather than invent\n"
            "- Shorter is fine — accuracy > length\n\n"
            "---\n\n"
            + user_msg
        )

    log.info(
        "nba_recap.start",
        home=ctx.get("home_abbr"),
        away=ctx.get("away_abbr"),
        score=f"{ctx.get('away_score')}-{ctx.get('home_score')}",
        is_retry=bool(regen_hint),
    )

    result = await run_messages(
        agent="nba-recap-writer",
        model=settings.model_narrative,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        # 600-word target ≈ ~900 output tokens with Bahasa expansion.
        max_tokens=2000,
    )

    log.info(
        "nba_recap.done",
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
