"""Standings explainer context assembler.

Phase 1 ship #8. Fetches the league standings via the existing
``api_football.fetch_standings`` + ``normalizer.normalize_standings``
pipeline already wired for previews, then renders the table as a
fixed-width text block the writer reads literally.

Why fixed-width text not JSON: the standings agent (Haiku 4.5) writes
better when it sees a human-readable table — less translation overhead,
fewer hallucination paths, and the rendered table doubles as the
fact-check ground truth (prompt cites figures that are literally in
the prompt).
"""

from __future__ import annotations

from typing import Any

import structlog

from content_engine.data import api_football, normalizer

log = structlog.get_logger()


_LEAGUE_LABEL = {
    "epl": "Liga Inggris 2025-26",
    "liga-1-id": "Super League Indonesia 2025-26",
}


# Total gameweeks per league per season. Used to compute "sisa pekan"
# (matches left) for the standings prompt's stakes framing. EPL = 38,
# Liga 1 (BRI) varies; for Phase 1 we only ship EPL standings so the
# Liga 1 entry is informational + future-ready.
_TOTAL_GAMEWEEKS = {
    "epl": 38,
    "liga-1-id": 34,
}


def _format_table(standings: list[dict[str, Any]]) -> str:
    """Render the standings list as a fixed-width text table.

    Output (one line per team)::

        POS  TEAM                    P    PTS   GD   FORM
          1  Arsenal                 34   73    +38  WLLWW
          2  Manchester City         33   70    +37  WWWDD
        ...

    Numbers right-aligned, names left-aligned, columns fixed-width so
    the writer can scan vertically. GD prefixed with sign explicitly
    (the API gives signed int; we re-prefix).
    """
    if not standings:
        return "Klasemen tidak tersedia di sistem."

    rows = [
        f"  {'POS':<3}  {'TEAM':<22}  {'P':>2}   {'PTS':>3}   {'GD':>4}   FORM"
    ]
    for s in standings:
        rank = s.get("rank")
        name = (s.get("team_name") or "?")[:22]
        played = s.get("played")
        pts = s.get("points")
        gd = s.get("goals_diff")
        form = s.get("form") or "—"
        gd_str = f"{gd:+d}" if isinstance(gd, int) else "—"
        rows.append(
            f"  {str(rank):>3}  {name:<22}  {str(played):>2}   {str(pts):>3}   {gd_str:>4}   {form}"
        )
    return "\n".join(rows)


def _derive_movers(standings: list[dict[str, Any]]) -> str:
    """Surface a few ground-truth observations for the writer.

    Phase 1 ship #8 keeps this minimal — just the top 3, bottom 3, and
    biggest goal-diff outliers. A future ship could compute week-over-
    week deltas (which would require persisting last week's table) and
    actual position changes. For now the writer infers movement from
    form strings already in the table.
    """
    if not standings:
        return "—"
    bits: list[str] = []
    if len(standings) >= 3:
        bits.append(
            f"Tiga teratas: {standings[0]['team_name']} ({standings[0]['points']} pts), "
            f"{standings[1]['team_name']} ({standings[1]['points']} pts), "
            f"{standings[2]['team_name']} ({standings[2]['points']} pts)."
        )
    if len(standings) >= 3:
        bottom = standings[-3:]
        bits.append(
            f"Tiga terbawah: {bottom[0]['team_name']} ({bottom[0]['points']} pts), "
            f"{bottom[1]['team_name']} ({bottom[1]['points']} pts), "
            f"{bottom[2]['team_name']} ({bottom[2]['points']} pts)."
        )
    return "\n".join(bits)


async def build_context(*, league_id: str, gameweek: int) -> dict[str, Any]:
    """Assemble the standings explainer context dict.

    Fetches the standings table fresh (no in-process cache here — this
    is a one-off per gameweek, not part of a batch). ``gameweek`` is
    passed in by the caller because the standings table itself doesn't
    say which gameweek it represents — the writer needs it for "sisa
    pekan" framing.
    """
    raw = await api_football.fetch_standings(league_id)
    standings = normalizer.normalize_standings(raw)

    total = _TOTAL_GAMEWEEKS.get(league_id, 38)
    matches_left = max(0, total - gameweek)

    ctx = {
        "league_name": _LEAGUE_LABEL.get(league_id, league_id),
        "league_id": league_id,
        "gameweek": gameweek,
        "matches_left": matches_left,
        "table_block": _format_table(standings),
        "movers_block": _derive_movers(standings),
        "_standings": standings,  # raw rows for downstream (e.g. fact-check)
    }

    log.info(
        "standings_context.built",
        league=league_id,
        gameweek=gameweek,
        team_count=len(standings),
        matches_left=matches_left,
    )

    return ctx
