"""NBA recap context assembler.

Phase 1 ship #11. One ESPN ``/summary`` call per article — fetches
header + boxscore + leaders + series + plays in a single round-trip,
then renders into the user-message blocks the recap agent expects.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import espn_nba, nba_normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


def _fmt_tipoff_wib(dt_utc: datetime | None) -> str:
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    wib = dt_utc.astimezone(_WIB)
    return f"{wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


def _format_series_block(series: dict[str, Any], header: dict[str, Any]) -> str:
    """Render the playoff series state for the writer prompt."""
    if not series:
        return "Series state tidak tersedia di sistem."
    lines = []
    if series.get("round"):
        lines.append(f"  Round: {series['round']}")
    if series.get("summary"):
        lines.append(f"  Status: {series['summary']}")
    if series.get("current_game"):
        lines.append(f"  Game number: {series['current_game']} of {series.get('total', 7)}")
    if series.get("completed"):
        lines.append("  Series completed: YES")
    return "\n".join(lines) if lines else "  (no series data)"


def _format_scorers_block(scorers: list[dict[str, Any]]) -> str:
    """Render top scorers per team as a stat-line block."""
    if not scorers:
        return "Top scorers tidak tersedia di sistem."
    lines = []
    for team in scorers:
        lines.append(f"  {team['team_abbr']}:")
        for s in team['scorers']:
            stat_line = f"{s['pts']} pts, {s['reb']} reb, {s['ast']} ast"
            extra = []
            if s.get('fgm_fga'):
                extra.append(f"FG {s['fgm_fga']}")
            if s.get('three_made_attempted'):
                extra.append(f"3PT {s['three_made_attempted']}")
            if s.get('min'):
                extra.append(f"{s['min']} min")
            extras = ", ".join(extra)
            tag = " (starter)" if s.get('starter') else " (bench)"
            lines.append(f"    {s['name']:<28} {stat_line}{(' | ' + extras) if extras else ''}{tag}")
    return "\n".join(lines)


def _format_stats_block(team_stats: list[dict[str, Any]]) -> str:
    """Render team box-score side-by-side."""
    if len(team_stats) != 2:
        return "Team stats tidak tersedia di sistem."
    a, h = team_stats[0], team_stats[1]
    a_abbr = a.get("team_abbr") or "AWAY"
    h_abbr = h.get("team_abbr") or "HOME"
    rows = [f"  {'STAT':<24} {a_abbr:<14} {h_abbr}"]
    order = [
        ("fg_made_attempted", "Field goals"),
        ("fg_pct", "FG %"),
        ("three_made_attempted", "3-pointers"),
        ("three_pct", "3PT %"),
        ("ft_made_attempted", "Free throws"),
        ("ft_pct", "FT %"),
        ("rebounds", "Rebounds"),
        ("assists", "Assists"),
        ("turnovers", "Turnovers"),
        ("steals", "Steals"),
        ("blocks", "Blocks"),
        ("fouls", "Fouls"),
        ("fast_break_pts", "Fast-break pts"),
        ("points_in_paint", "Points in paint"),
    ]
    for key, label in order:
        a_val = a.get("stats", {}).get(key)
        h_val = h.get("stats", {}).get(key)
        if a_val is None and h_val is None:
            continue
        rows.append(f"  {label:<24} {str(a_val or '-'):<14} {h_val or '-'}")
    return "\n".join(rows)


def _format_plays_block(plays: list[dict[str, Any]]) -> str:
    """Render the optional clutch-play timeline."""
    if not plays:
        return "(no key plays extracted — recap will rely on stats + series state)"
    lines = []
    for p in plays:
        period = f"Q{p['period']}" if p.get('period', 0) <= 4 else f"OT{p['period'] - 4}"
        lines.append(
            f"  {period} {p.get('clock', '?'):>5}  [{p.get('team_abbr', '?')}] "
            f"{p.get('text', '')} (score {p.get('score', '?')})"
        )
    return "\n".join(lines)


async def build_context(game_id: int | str) -> dict[str, Any]:
    """Fetch + assemble the full NBA recap context dict.

    Single ESPN /summary call. All sub-blocks rendered in this module
    so the agent sees prose-friendly text.
    """
    raw = await espn_nba.fetch_game_summary(game_id)

    header = nba_normalizer.normalize_game_header(raw)
    if header["status"] != "final":
        log.warning(
            "nba_recap_context.not_final",
            game_id=game_id,
            status=header["status"],
        )
        # Caller (CLI) should bail with a clear error before reaching the writer.

    series = nba_normalizer.normalize_series_state(raw)
    scorers = nba_normalizer.normalize_top_scorers(raw, limit=5)
    team_stats = nba_normalizer.normalize_team_stats(raw)
    plays = nba_normalizer.normalize_key_plays(raw, max_plays=8)

    ctx = {
        "league_name": "NBA Playoffs 2026",
        "tipoff_local": _fmt_tipoff_wib(header["tipoff_utc"]),
        "venue": header.get("venue") or "—",
        "game_id": header["game_id"],
        "status": header["status"],
        "home_team": header["home_team"],
        "home_abbr": header["home_abbr"],
        "home_score": header["home_score"],
        "away_team": header["away_team"],
        "away_abbr": header["away_abbr"],
        "away_score": header["away_score"],
        "winner_abbr": header["winner_abbr"],
        "series_block": _format_series_block(series, header),
        "scorers_block": _format_scorers_block(scorers),
        "stats_block": _format_stats_block(team_stats),
        "plays_block": _format_plays_block(plays),
        "broadcast": "NBA League Pass / Vidio",
        # Raw structures for downstream (slug builder, fact-check)
        "_header": header,
        "_series": series,
        "_scorers": scorers,
        "_team_stats": team_stats,
    }

    log.info(
        "nba_recap_context.built",
        away=header["away_abbr"],
        home=header["home_abbr"],
        score=f"{header['away_score']}-{header['home_score']}",
        series=series.get("summary"),
        plays=len(plays),
    )

    return ctx
