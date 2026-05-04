"""Football team profile context assembler.

Phase 2 ship #22. Single context builder shared by EPL + Liga 1
(both use API-Football and have the same data shape). The
league_id parameter ("epl" or "liga-1-id") drives which league
mapping to use; everything else flows the same way.

Three API-Football calls per profile:
  * /teams?id={team_id} — identity, venue, founded year, country
  * /teams/statistics — season stats (goals, clean sheets, form)
  * /standings (cached at league level; we filter to this team)

Squad endpoint (/players/squads) is intentionally skipped: it
costs an extra API call and the season-stats already give us
goal scorers via /players/topscorers (which preview/recap
already fetches at league level). Keeps profile gen cheap.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import api_football

log = structlog.get_logger()


# Sport metadata per league. league_label is the human-friendly
# tournament name; competition_short is what to use in titles.
_LEAGUE_META = {
    "epl": {
        "league_label": "Liga Inggris",
        "competition_short": "Premier League",
        "season_label": "2025-26",
        "country_default": "Inggris",
    },
    "liga-1-id": {
        "league_label": "Super League Indonesia",
        "competition_short": "Liga 1",
        "season_label": "2025-26",
        "country_default": "Indonesia",
    },
}


def _format_record_block(stats_response: dict[str, Any]) -> str:
    """Render the team's season stats as a PERFORMA block."""
    s = (stats_response or {}).get("response") or {}
    if not s:
        return "Statistik musim tidak tersedia di sistem."
    fixtures = s.get("fixtures") or {}
    played_obj = fixtures.get("played") or {}
    wins_obj = fixtures.get("wins") or {}
    draws_obj = fixtures.get("draws") or {}
    loses_obj = fixtures.get("loses") or {}
    goals_for_obj = ((s.get("goals") or {}).get("for") or {}).get("total") or {}
    goals_against_obj = ((s.get("goals") or {}).get("against") or {}).get("total") or {}
    avg_for = ((s.get("goals") or {}).get("for") or {}).get("average") or {}
    avg_against = ((s.get("goals") or {}).get("against") or {}).get("average") or {}
    clean_sheet = s.get("clean_sheet") or {}
    failed_to_score = s.get("failed_to_score") or {}
    form = s.get("form") or ""

    lines = []
    p = played_obj.get("total")
    w = wins_obj.get("total")
    d = draws_obj.get("total")
    l = loses_obj.get("total")
    if p is not None:
        lines.append(f"  Main: {p} ({w or 0}M-{d or 0}S-{l or 0}K)")
    gf = goals_for_obj.get("total")
    ga = goals_against_obj.get("total")
    if gf is not None and ga is not None:
        diff = (gf or 0) - (ga or 0)
        sign = "+" if diff >= 0 else ""
        lines.append(f"  Gol cetak/kebobolan: {gf}/{ga} (selisih {sign}{diff})")
        af = avg_for.get("total")
        ag = avg_against.get("total")
        if af and ag:
            lines.append(f"  Rata-rata per laga: {af} cetak, {ag} kebobolan")
    cs = clean_sheet.get("total")
    if cs is not None:
        lines.append(f"  Clean sheet: {cs}")
    fts = failed_to_score.get("total")
    if fts is not None:
        lines.append(f"  Gagal mencetak gol: {fts} laga")
    if form:
        # Form is "WWLDW" (last 5+); clip to last 8 chars.
        last_eight = form[-8:] if len(form) > 8 else form
        lines.append(f"  Form (laga terakhir): {last_eight}")
    home = wins_obj.get("home")
    away = wins_obj.get("away")
    if home is not None and away is not None:
        h_d = (draws_obj.get("home") or 0)
        h_l = (loses_obj.get("home") or 0)
        a_d = (draws_obj.get("away") or 0)
        a_l = (loses_obj.get("away") or 0)
        lines.append(f"  Kandang: {home}M-{h_d}S-{h_l}K · Tandang: {away}M-{a_d}S-{a_l}K")
    return "\n".join(lines) if lines else "Statistik musim tidak tersedia di sistem."


def _format_identity_block(team_obj: dict[str, Any], venue_obj: dict[str, Any], league_id: str) -> str:
    meta = _LEAGUE_META.get(league_id, {})
    lines = []
    name = team_obj.get("name") or "?"
    country = team_obj.get("country") or meta.get("country_default", "")
    founded = team_obj.get("founded")
    lines.append(f"  Nama: {name}")
    if country:
        lines.append(f"  Negara: {country}")
    if founded:
        lines.append(f"  Berdiri: {founded}")
    venue_name = venue_obj.get("name") or ""
    venue_city = venue_obj.get("city") or ""
    venue_capacity = venue_obj.get("capacity")
    if venue_name or venue_city:
        bits = [venue_name]
        if venue_city:
            bits.append(venue_city)
        venue_line = f"  Kandang: {', '.join(b for b in bits if b)}"
        if venue_capacity:
            venue_line += f" (kapasitas {venue_capacity:,})"
        lines.append(venue_line)
    return "\n".join(lines)


def _format_standings_block(standings_response: dict[str, Any], team_id: int) -> str:
    """Find this team's row in the standings response, render position."""
    rows = (((standings_response or {}).get("response") or [{}])[0].get("league") or {}).get("standings") or []
    if not rows:
        return "Klasemen tidak tersedia di sistem."
    table = rows[0] if isinstance(rows[0], list) else rows
    me = next((r for r in table if (r.get("team") or {}).get("id") == team_id), None)
    if not me:
        return f"Tim id={team_id} tidak ditemukan di klasemen."
    rank = me.get("rank")
    points = me.get("points")
    played = (me.get("all") or {}).get("played")
    wins = (me.get("all") or {}).get("win")
    draws = (me.get("all") or {}).get("draw")
    losses = (me.get("all") or {}).get("lose")
    goals_diff = me.get("goalsDiff")
    description = me.get("description") or ""  # "Promotion - Champions League (Group Stage)"
    lines = [f"  Posisi liga: {rank} ({points} poin dari {played} laga)"]
    if wins is not None:
        lines.append(f"  Total: {wins}M-{draws}S-{losses}K, selisih gol {goals_diff:+d}" if goals_diff is not None else f"  Total: {wins}M-{draws}S-{losses}K")
    if description:
        lines.append(f"  Status: {description}")
    return "\n".join(lines)


async def build_context(team_id: int | str, league_id: str = "epl") -> dict[str, Any]:
    """Fetch + assemble football team profile context.

    Three API-Football calls (team detail + season stats + standings).
    Same shape as nba_team_profile_context.
    """
    if league_id not in _LEAGUE_META:
        raise ValueError(f"unknown league_id: {league_id!r}; expected one of {list(_LEAGUE_META)}")

    team_id_int = int(team_id)
    detail = await api_football.fetch_team_detail(team_id_int)
    stats = await api_football.fetch_team_season_stats(team_id_int, league_id=league_id)
    standings = await api_football.fetch_standings(league_id=league_id)

    # Detail: response[0] = {team: {...}, venue: {...}}
    detail_resp = (detail.get("response") or [{}])
    if not detail_resp:
        raise RuntimeError(f"API-Football returned no team for id={team_id_int}")
    team = (detail_resp[0] or {}).get("team") or {}
    venue = (detail_resp[0] or {}).get("venue") or {}

    meta = _LEAGUE_META[league_id]

    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    # Standings row (for the head-coach we don't have direct;
    # API-Football offers /coachs but skipping for v1).
    ctx = {
        "team_id": str(team.get("id") or team_id_int),
        "team_name": team.get("name") or "",
        "team_short": team.get("name") or "",
        "team_country": team.get("country") or meta["country_default"],
        "team_founded": team.get("founded"),
        "venue_name": venue.get("name") or "",
        "venue_city": venue.get("city") or "",
        "venue_capacity": venue.get("capacity"),
        "league_id": league_id,
        "league_label": meta["league_label"],
        "competition_short": meta["competition_short"],
        "season_label": meta["season_label"],
        "as_of_id": as_of_id,
        "identity_block": _format_identity_block(team, venue, league_id),
        "performa_block": _format_record_block(stats),
        "standings_block": _format_standings_block(standings, team_id_int),
        "_team_raw": team,
        "_venue_raw": venue,
        "_stats_raw": stats,
    }

    log.info(
        "football_team_profile_context.built",
        team_id=team.get("id"),
        team=team.get("name"),
        league_id=league_id,
    )
    return ctx
