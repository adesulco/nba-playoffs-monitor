"""Football H2H context assembler.

Phase 2 ship #23. Uses API-Football's fetch_h2h to pull the last
N meetings between two teams (works across competitions — Premier
League meeting + FA Cup tie + UCL fixture all show in the same
result), then normalizes into a meeting block for the writer.

For NBA / F1 / tennis H2H, future ships will plug in their own
sport-specific data sources behind the same context shape (so the
H2H agent stays sport-agnostic).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import api_football

log = structlog.get_logger()


def _format_meetings_block(meetings: list[dict[str, Any]]) -> str:
    """Render last-N meetings into a tabular block."""
    if not meetings:
        return "Riwayat pertemuan tidak tersedia di sistem."
    lines = ["  Tanggal      Kompetisi              Tuan rumah  Skor   Tamu"]
    for m in meetings:
        fixt = m.get("fixture") or {}
        league = m.get("league") or {}
        teams = m.get("teams") or {}
        goals = m.get("goals") or {}
        date_iso = (fixt.get("date") or "")[:10]  # YYYY-MM-DD
        comp = (league.get("name") or "")[:20]
        home = (teams.get("home") or {}).get("name") or "?"
        away = (teams.get("away") or {}).get("name") or "?"
        gh = goals.get("home")
        ga = goals.get("away")
        score = f"{gh}-{ga}" if gh is not None and ga is not None else "—"
        lines.append(f"  {date_iso:<12} {comp:<22} {home[:14]:<14} {score:<6} {away[:14]}")
    return "\n".join(lines)


def _summarize_meetings(meetings: list[dict[str, Any]], team_a_id: int, team_b_id: int) -> dict[str, int]:
    """Tally W/D/L for team_a vs team_b across the meetings."""
    a_wins = b_wins = draws = 0
    a_goals = b_goals = 0
    for m in meetings:
        teams = m.get("teams") or {}
        home_id = (teams.get("home") or {}).get("id")
        away_id = (teams.get("away") or {}).get("id")
        gh = (m.get("goals") or {}).get("home")
        ga = (m.get("goals") or {}).get("away")
        if gh is None or ga is None:
            continue
        if home_id == team_a_id and away_id == team_b_id:
            a_goals += gh
            b_goals += ga
        elif home_id == team_b_id and away_id == team_a_id:
            a_goals += ga
            b_goals += gh
        else:
            continue
        # Determine winner from team_a's perspective.
        a_score = gh if home_id == team_a_id else ga
        b_score = ga if home_id == team_a_id else gh
        if a_score > b_score:
            a_wins += 1
        elif b_score > a_score:
            b_wins += 1
        else:
            draws += 1
    return {
        "team_a_wins": a_wins,
        "team_b_wins": b_wins,
        "draws": draws,
        "team_a_goals": a_goals,
        "team_b_goals": b_goals,
        "total_meetings": a_wins + b_wins + draws,
    }


async def build_context(
    team_a_id: int | str,
    team_b_id: int | str,
    league_id: str = "epl",
    last_n: int = 10,
) -> dict[str, Any]:
    """Fetch + assemble H2H context.

    Two API-Football calls:
      * /teams?id={team_a_id} — team A identity
      * /teams?id={team_b_id} — team B identity
      (these could be merged but keeping separate calls keeps the
      data layer composable)
      * /fixtures/headtohead — the actual meetings
    """
    team_a_id_int = int(team_a_id)
    team_b_id_int = int(team_b_id)

    a_detail = await api_football.fetch_team_detail(team_a_id_int)
    b_detail = await api_football.fetch_team_detail(team_b_id_int)
    h2h_raw = await api_football.fetch_h2h(team_a_id_int, team_b_id_int, last=last_n)

    a_team = ((a_detail.get("response") or [{}])[0] or {}).get("team") or {}
    b_team = ((b_detail.get("response") or [{}])[0] or {}).get("team") or {}
    a_venue = ((a_detail.get("response") or [{}])[0] or {}).get("venue") or {}
    b_venue = ((b_detail.get("response") or [{}])[0] or {}).get("venue") or {}

    if not a_team or not b_team:
        raise RuntimeError("API-Football missing team detail for one or both teams")

    meetings = (h2h_raw.get("response") or [])[:last_n]
    summary = _summarize_meetings(meetings, team_a_id_int, team_b_id_int)

    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    league_label_map = {
        "epl": "Liga Inggris",
        "liga-1-id": "Super League Indonesia",
    }

    summary_lines = [
        f"  Pertemuan terakhir: {summary['total_meetings']} laga",
        f"  {a_team.get('name')} menang: {summary['team_a_wins']}",
        f"  {b_team.get('name')} menang: {summary['team_b_wins']}",
        f"  Imbang: {summary['draws']}",
        f"  Total gol: {a_team.get('name')} {summary['team_a_goals']} — {b_team.get('name')} {summary['team_b_goals']}",
    ]

    ctx = {
        "team_a_id": str(team_a_id_int),
        "team_a_name": a_team.get("name") or "",
        "team_a_country": a_team.get("country") or "",
        "team_a_venue": a_venue.get("name") or "",
        "team_b_id": str(team_b_id_int),
        "team_b_name": b_team.get("name") or "",
        "team_b_country": b_team.get("country") or "",
        "team_b_venue": b_venue.get("name") or "",
        "league_id": league_id,
        "league_label": league_label_map.get(league_id, league_id),
        "as_of_id": as_of_id,
        "summary_block": "\n".join(summary_lines),
        "meetings_block": _format_meetings_block(meetings),
        "_summary": summary,
        "_meetings_raw": meetings,
    }

    log.info(
        "h2h_context.built",
        team_a=a_team.get("name"),
        team_b=b_team.get("name"),
        meetings=len(meetings),
        league_id=league_id,
    )
    return ctx
