"""Tennis match recap context assembler.

Phase 2 ship #17e. Walks the ATP/WTA scoreboard for the match by
competition id, extracts player + set + winner data, renders blocks
for the writer prompt.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import espn_tennis, tennis_normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


def _fmt_date_local(dt_utc: datetime | None) -> str:
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    wib = dt_utc.astimezone(_WIB)
    return f"{days[wib.weekday()]}, {wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


def _format_players_block(p1: dict[str, Any], p2: dict[str, Any]) -> str:
    def _line(p: dict[str, Any]) -> str:
        country = p.get("country") or p.get("country_code") or "—"
        winner_tag = " (winner)" if p.get("winner") else ""
        return f"  {p.get('name', '?')} ({country}){winner_tag}"
    return "\n".join([_line(p1), _line(p2)])


def _format_set_scores_block(p1: dict[str, Any], p2: dict[str, Any]) -> str:
    """Render set scores as a clean per-set table::

        Set 1:  Sinner 6 - 4 Alcaraz
        Set 2:  Sinner 7 - 6 Alcaraz
    """
    s1 = p1.get("set_scores") or []
    s2 = p2.get("set_scores") or []
    n = max(len(s1), len(s2))
    if n == 0:
        return "Set scores tidak tersedia di sistem."
    name1 = p1.get("name", "P1")
    name2 = p2.get("name", "P2")
    lines = []
    for i in range(n):
        a = s1[i] if i < len(s1) else "—"
        b = s2[i] if i < len(s2) else "—"
        lines.append(f"  Set {i+1}: {name1} {a} - {b} {name2}")
    # Set count summary
    p1_sets = p1.get("sets_won") or 0
    p2_sets = p2.get("sets_won") or 0
    lines.append(f"\n  Total sets won: {name1} {p1_sets} - {p2_sets} {name2}")
    return "\n".join(lines)


async def build_context(match_id: int | str, tour: str = "atp") -> dict[str, Any]:
    """Fetch the scoreboard, find the match by ID, normalize.

    The CLI accepts a `--tour atp|wta` flag because ESPN's scoreboard
    returns one tour at a time. If the match isn't found in the chosen
    tour we try the other.
    """
    raw_atp_or_wta = await espn_tennis.fetch_scoreboard(tour)
    found = tennis_normalizer.find_match_in_scoreboard(raw_atp_or_wta, match_id)
    actual_tour = tour
    if not found:
        # Try the other tour
        other = "wta" if tour == "atp" else "atp"
        log.info("tennis_match_recap_context.fallback_to_other_tour", from_tour=tour, to_tour=other)
        raw_other = await espn_tennis.fetch_scoreboard(other)
        found = tennis_normalizer.find_match_in_scoreboard(raw_other, match_id)
        actual_tour = other
    if not found:
        return {}

    match = tennis_normalizer.normalize_match(found["competition"])
    if not match:
        return {}

    p1, p2 = match["p1"], match["p2"]

    ctx = {
        "league_name": f"Tennis {actual_tour.upper()}",
        "tour": actual_tour,
        "match_id": match["match_id"],
        "status": match["status"],
        "tournament_name": found.get("tournament_name"),
        "venue": found.get("venue"),
        "round": match.get("round") or "—",
        "match_format": match.get("format"),
        "match_date_utc": match.get("match_date_utc"),
        "match_date_local": _fmt_date_local(match.get("match_date_utc")),
        "players_block": _format_players_block(p1, p2),
        "set_scores_block": _format_set_scores_block(p1, p2),
        "winner_name": match.get("winner_name"),
        # Raw fields downstream (slug, fact-check, frontmatter)
        "_p1": p1,
        "_p2": p2,
        "_match": match,
    }
    log.info(
        "tennis_match_recap_context.built",
        tournament=ctx["tournament_name"],
        round=ctx["round"],
        winner=ctx["winner_name"],
    )
    return ctx
