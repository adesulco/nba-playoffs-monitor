"""Feed-specific JSON → unified ``ce_fixtures`` schema.

Phase 0: covers API-Football EPL + Liga 1 fixture shapes. The output is
the dict shape ``db.upsert_fixtures`` expects.

Each normalize_* function:
  * takes the raw response dict from the relevant fetcher
  * returns a list of normalized rows
  * never raises on a single bad fixture — logs + skips so a partial outage
    doesn't take down the whole gameweek
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

log = structlog.get_logger()


# ── API-Football helpers ──────────────────────────────────────────────────


def _af_status(short: str) -> str:
    """Map API-Football short status codes to our ``ce_fixtures.status`` enum.

    API-Football short codes:
      TBD / NS         = scheduled
      1H / HT / 2H / ET / P / LIVE = live
      FT / AET / PEN   = final
      PST              = postponed
      CANC / ABD       = cancelled
      AWD / WO         = walkover
    """
    short = (short or "").upper()
    if short in {"TBD", "NS"}:
        return "scheduled"
    if short in {"1H", "HT", "2H", "ET", "P", "LIVE", "BT", "INT"}:
        return "live"
    if short in {"FT", "AET", "PEN"}:
        return "final"
    if short == "PST":
        return "postponed"
    if short in {"CANC", "ABD"}:
        return "cancelled"
    if short in {"AWD", "WO"}:
        return "walkover"
    return "scheduled"


def _af_kickoff_utc(date_str: str | None) -> datetime | None:
    """Parse API-Football fixture.date (ISO8601 with offset) → UTC datetime."""
    if not date_str:
        return None
    # API-Football returns e.g. "2026-04-27T22:00:00+00:00" — already UTC offset.
    try:
        dt = datetime.fromisoformat(date_str)
    except ValueError:
        log.warning("normalizer.bad_kickoff", value=date_str)
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _af_venue(venue_obj: dict[str, Any] | None) -> str | None:
    """Format API-Football venue into ``"{name}, {city}"`` string."""
    if not venue_obj:
        return None
    name = venue_obj.get("name")
    city = venue_obj.get("city")
    if name and city:
        return f"{name}, {city}"
    return name or city


def _normalize_af_fixtures(
    raw: dict[str, Any],
    *,
    league_id: str,
    season: str,
    gameweek: int,
) -> list[dict[str, Any]]:
    """Common API-Football → ce_fixtures conversion. EPL + Liga 1 share this."""
    out: list[dict[str, Any]] = []
    for fx in raw.get("response", []):
        try:
            fixture = fx.get("fixture", {})
            teams = fx.get("teams", {})
            goals = fx.get("goals", {})
            home = teams.get("home", {}) or {}
            away = teams.get("away", {}) or {}
            row = {
                "league_id": league_id,
                "source_fixture_id": str(fixture.get("id")),
                "kickoff_utc": _af_kickoff_utc(fixture.get("date")),
                "venue": _af_venue(fixture.get("venue")),
                "status": _af_status(fixture.get("status", {}).get("short", "")),
                "home_team": home.get("name") or "Unknown",
                "away_team": away.get("name") or "Unknown",
                "home_score": goals.get("home"),
                "away_score": goals.get("away"),
                "season": season,
                "gameweek": gameweek,
            }
            # Hard requirement: kickoff_utc + ids must be present. If
            # API-Football returns a malformed row, log + skip.
            if not row["source_fixture_id"] or row["kickoff_utc"] is None:
                log.warning("normalizer.skipped", reason="missing_id_or_kickoff", row=row)
                continue
            out.append(row)
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_fixture", error=str(exc), fx_id=fx.get("fixture", {}).get("id"))
    return out


# ── Public API ────────────────────────────────────────────────────────────


def normalize_epl_fixtures(raw: dict[str, Any], gameweek: int = 35) -> list[dict[str, Any]]:
    """Convert an API-Football EPL fixtures response → ce_fixtures rows."""
    return _normalize_af_fixtures(raw, league_id="epl", season="2025-26", gameweek=gameweek)


def normalize_liga1_fixtures(raw: dict[str, Any], gameweek: int = 1) -> list[dict[str, Any]]:
    """Convert an API-Football Liga 1 fixtures response → ce_fixtures rows."""
    return _normalize_af_fixtures(raw, league_id="liga-1-id", season="2025-26", gameweek=gameweek)


# API-Football numeric league id → our internal slug. Used by the CLI
# to dispatch normalizer + context based on what the fixture actually
# says, rather than hardcoding "epl" everywhere.
_AF_LEAGUE_ID_TO_SLUG: dict[int, str] = {
    39: "epl",
    274: "liga-1-id",
    1: "fifa-wc-2026",
}


def detect_league_id(fx_raw: dict[str, Any]) -> str:
    """Detect our internal league_id slug from a raw API-Football fixture.

    Reads ``response[i].league.id`` and maps to our internal slug.
    Falls back to "epl" with a warning when the league id is unknown —
    the engine doesn't crash, but the caller should treat the article
    output skeptically.
    """
    league_obj = (fx_raw.get("league") or {})
    af_id = league_obj.get("id")
    slug = _AF_LEAGUE_ID_TO_SLUG.get(af_id)
    if slug:
        return slug
    log.warning(
        "normalizer.unknown_league_id",
        af_id=af_id,
        league_name=league_obj.get("name"),
        fallback="epl",
    )
    return "epl"


# ── Phase 1 ship #2 — preview-context normalizers ─────────────────────────
#
# Light shapes (dicts and lists, not DB rows) for the preview agent's
# context block. The DB will eventually persist standings/H2H/topscorers
# in `ce_standings`, `ce_h2h`, `ce_topscorers` (Phase 1 ship #3 — schema
# extension); for now these helpers just extract what the writer needs.


def normalize_standings(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract a clean (rank, team_id, team_name, points, played, form, gd) list.

    API-Football wraps standings inside ``response[0].league.standings`` as
    a list-of-lists (groups, for World Cup style competitions; for league
    tables there's a single inner list). We pick the first inner list,
    which is the unified standings table.

    The ``form`` field is API-Football's last-5 string e.g. "WLWDW"
    (left=oldest, right=most-recent). We pass it through verbatim — the
    writer prompt explains the convention so the model reads it correctly.
    """
    out: list[dict[str, Any]] = []
    try:
        league = (raw.get("response") or [{}])[0].get("league", {})
        groups = league.get("standings") or []
        # Most leagues = one group. World Cup style = multiple groups; we'd
        # flatten but for Phase 1 we only call this on EPL/Liga 1, both
        # single-table.
        rows = groups[0] if groups and isinstance(groups[0], list) else []
        for r in rows:
            try:
                team = r.get("team", {}) or {}
                all_stats = r.get("all", {}) or {}
                out.append({
                    "rank": r.get("rank"),
                    "team_id": team.get("id"),
                    "team_name": team.get("name") or "Unknown",
                    "points": r.get("points"),
                    "played": all_stats.get("played"),
                    "form": r.get("form") or "",
                    "goals_diff": r.get("goalsDiff"),
                })
            except Exception as exc:  # noqa: BLE001
                log.warning("normalizer.bad_standings_row", error=str(exc))
    except Exception as exc:  # noqa: BLE001
        log.warning("normalizer.bad_standings", error=str(exc))
    return out


def normalize_h2h(raw: dict[str, Any], home_team: str, away_team: str) -> dict[str, Any]:
    """Build an H2H summary from the headtohead response.

    Returns::

        {
            "summary":   "L 1-2, D 2-2, W 4-3, L 0-1, D 1-1",  # from home POV
            "fixtures":  [{date, home, away, home_score, away_score, result_for_home}, ...],
            "wins_home": 2,
            "wins_away": 1,
            "draws":     2,
        }

    The ``summary`` string is the most-recent-first compact form the
    writer prompt expects ("L 1-2" = home lost 1-2 in their most-recent
    meeting). Built from the home team's perspective so the writer can
    use it directly without flipping.
    """
    fixtures: list[dict[str, Any]] = []
    wins_home = wins_away = draws = 0
    for fx in raw.get("response", []):
        try:
            t = fx.get("teams", {}) or {}
            g = fx.get("goals", {}) or {}
            f = fx.get("fixture", {}) or {}
            t_home = (t.get("home") or {}).get("name") or ""
            t_away = (t.get("away") or {}).get("name") or ""
            g_home = g.get("home")
            g_away = g.get("away")
            if g_home is None or g_away is None:
                continue  # match in progress / postponed — skip
            # Determine result from THIS preview's home POV. Note the H2H
            # endpoint returns matches at either venue, so we have to
            # check which side of the meeting was the preview's home.
            if t_home.lower() == home_team.lower():
                # Preview home played at home in this meeting
                ph_score, pa_score = g_home, g_away
                if g_home > g_away:
                    result = "W"
                    wins_home += 1
                elif g_home < g_away:
                    result = "L"
                    wins_away += 1
                else:
                    result = "D"
                    draws += 1
            elif t_away.lower() == home_team.lower():
                # Preview home played AWAY in this meeting
                ph_score, pa_score = g_away, g_home
                if g_away > g_home:
                    result = "W"
                    wins_home += 1
                elif g_away < g_home:
                    result = "L"
                    wins_away += 1
                else:
                    result = "D"
                    draws += 1
            else:
                # Neither side matched — name mismatch (rebrand / id reuse).
                # Skip rather than guess.
                continue
            fixtures.append({
                "date": (f.get("date") or "")[:10],
                "home": t_home,
                "away": t_away,
                "home_score": g_home,
                "away_score": g_away,
                "result_for_home": result,
                "score_for_home": f"{ph_score}-{pa_score}",
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_h2h_row", error=str(exc))

    # Compose the compact summary string from the preview-home POV.
    # API-Football returns most-recent first; preserve that order.
    summary = ", ".join(f"{f['result_for_home']} {f['score_for_home']}" for f in fixtures) or ""

    return {
        "summary": summary,
        "fixtures": fixtures,
        "wins_home": wins_home,
        "wins_away": wins_away,
        "draws": draws,
    }


def normalize_topscorers(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the topscorers response into ``[{name, team, goals}]`` rows.

    Each player entry's ``statistics`` array can have multiple rows when
    a player switched clubs mid-season. We pick the entry with the
    highest goals (typically their main club for the season). For
    preview-context lookups we only need (player_name, team_name, goals)
    — anything beyond that is Phase 2.
    """
    out: list[dict[str, Any]] = []
    for p in raw.get("response", []):
        try:
            player = p.get("player", {}) or {}
            stats_list = p.get("statistics") or []
            # Pick the team they scored most for. Defensive: stats can be
            # empty if the API hiccups.
            best = None
            for s in stats_list:
                goals = ((s.get("goals") or {}).get("total") or 0)
                if best is None or goals > (best.get("goals") or 0):
                    team_obj = s.get("team") or {}
                    best = {
                        "name": player.get("name") or "Unknown",
                        "team_id": team_obj.get("id"),
                        "team": team_obj.get("name") or "Unknown",
                        "goals": goals,
                    }
            if best:
                out.append(best)
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_topscorer_row", error=str(exc))
    return out


def find_team_top_scorer(scorers: list[dict[str, Any]], team_name: str) -> dict[str, Any] | None:
    """Return the highest-scoring player from a given team in the list.

    The topscorers endpoint is league-wide; previews want the relevant
    per-team scorer. Returns None if no player from that team is in the
    leaderboard (meaning their top scorer is below the API's truncation
    threshold — usually means the team has no high-volume scorer, which
    is itself a signal the preview can use).
    """
    for s in scorers:
        if s.get("team", "").lower() == team_name.lower():
            return s
    return None


# ── Phase 1 ship #3 — recap normalizers ───────────────────────────────────


def normalize_events(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the in-match events list to a chronological row stream.

    Output rows::

        {"minute": 23, "extra": None, "team": "Manchester United",
         "type": "goal", "detail": "Normal Goal",
         "player": "B. Mbeumo", "assist": "M. Mount"}

    The recap writer prompt receives this as a "TIMELINE" block and
    cites the scorer + minute literally, so the data has to be
    high-fidelity. Events with missing player names get the placeholder
    "(unknown)" rather than being skipped — better an honest gap than
    a 1' goal that disappears from the recap.
    """
    out: list[dict[str, Any]] = []
    for ev in raw.get("response", []):
        try:
            t = (ev.get("time") or {})
            team = (ev.get("team") or {}).get("name") or "Unknown"
            player = (ev.get("player") or {}).get("name") or "(unknown)"
            assist = (ev.get("assist") or {}).get("name")
            ev_type = (ev.get("type") or "").lower()  # Goal, Card, subst, Var
            detail = ev.get("detail") or ""
            out.append({
                "minute": t.get("elapsed"),
                "extra": t.get("extra"),
                "team": team,
                "type": ev_type,
                "detail": detail,
                "player": player,
                "assist": assist,
                "comments": ev.get("comments"),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_event", error=str(exc), ev=ev)
    # Sort by minute (with extra). API-Football usually returns sorted but
    # we re-sort defensively — order is load-bearing for the recap timeline.
    out.sort(key=lambda r: ((r.get("minute") or 0), (r.get("extra") or 0)))
    return out


def normalize_lineups(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert the lineup endpoint into per-team dicts.

    Returns a 2-element list (home, away) with::

        {"team": "Liverpool", "formation": "4-3-3", "coach": "Arne Slot",
         "start_xi": [{"name": "...", "number": 1, "pos": "G"}, ...],
         "subs":     [{"name": "...", "number": 14, "pos": "M"}, ...]}

    Coach name lands here so the recap writer can use it directly
    without inferring from training data.
    """
    out: list[dict[str, Any]] = []
    for entry in raw.get("response", []):
        try:
            team = (entry.get("team") or {}).get("name") or "Unknown"
            coach = (entry.get("coach") or {}).get("name")
            formation = entry.get("formation")
            start_xi = []
            for p in (entry.get("startXI") or []):
                player_obj = (p.get("player") or {})
                start_xi.append({
                    "name": player_obj.get("name") or "Unknown",
                    "number": player_obj.get("number"),
                    "pos": player_obj.get("pos"),
                })
            subs = []
            for p in (entry.get("substitutes") or []):
                player_obj = (p.get("player") or {})
                subs.append({
                    "name": player_obj.get("name") or "Unknown",
                    "number": player_obj.get("number"),
                    "pos": player_obj.get("pos"),
                })
            out.append({
                "team": team,
                "formation": formation,
                "coach": coach,
                "start_xi": start_xi,
                "subs": subs,
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_lineup", error=str(exc))
    return out


# Map API-Football statistic types → snake-case keys we expose to the
# recap writer's context block. Field names match how an Indonesian
# sports journalist would think about them, so the writer doesn't have
# to translate (e.g. "possession" not "ball_possession").
_STAT_TYPE_MAP = {
    "Shots on Goal": "shots_on_target",
    "Shots off Goal": "shots_off_target",
    "Total Shots": "total_shots",
    "Blocked Shots": "blocked_shots",
    "Shots insidebox": "shots_in_box",
    "Shots outsidebox": "shots_outside_box",
    "Fouls": "fouls",
    "Corner Kicks": "corners",
    "Offsides": "offsides",
    "Ball Possession": "possession",
    "Yellow Cards": "yellow_cards",
    "Red Cards": "red_cards",
    "Goalkeeper Saves": "saves",
    "Total passes": "total_passes",
    "Passes accurate": "passes_accurate",
    "Passes %": "passes_pct",
    "expected_goals": "xg",
}


def normalize_injuries(
    raw: dict[str, Any],
    *,
    days_back: int = 21,
    days_forward: int = 14,
    reference_utc: datetime | None = None,
) -> list[dict[str, Any]]:
    """Filter the team-injury log to currently-relevant entries.

    The /injuries endpoint returns ALL entries for the season — one
    per (player, fixture) pair where the player was unavailable. For
    a preview we want the CURRENT sidelined list. This function:

      1. Filters to entries within `days_back` past or `days_forward`
         future of `reference_utc` (defaults to now).
      2. Dedupes by player name, keeping the most recent entry
         (so "Injured Doubtful" → "Out 2 weeks" sequence collapses
         to the latest status).
      3. Sorts by team + player name.

    Returns rows::

        {"player_name": "B. Saka", "team": "Arsenal",
         "type": "Missing Fixture", "reason": "Thigh problems",
         "last_seen_utc": datetime, "fixture_id": ...}

    Empty list = team has no current injuries reported. The preview
    writer prompt knows how to render that ("Belum ada update cedera
    resmi.") so the empty case is handled cleanly downstream.
    """
    if reference_utc is None:
        reference_utc = datetime.now(timezone.utc)
    earliest = reference_utc - timedelta(days=days_back)
    latest = reference_utc + timedelta(days=days_forward)

    by_player: dict[str, dict[str, Any]] = {}
    for entry in raw.get("response", []):
        try:
            p = entry.get("player") or {}
            t = entry.get("team") or {}
            fx = entry.get("fixture") or {}
            name = p.get("name")
            if not name:
                continue
            fx_date_str = fx.get("date")
            fx_dt: datetime | None = None
            if fx_date_str:
                try:
                    fx_dt = datetime.fromisoformat(fx_date_str)
                    if fx_dt.tzinfo is None:
                        fx_dt = fx_dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    fx_dt = None
            # Recency filter — drop entries from too far back / too far ahead.
            if fx_dt and not (earliest <= fx_dt <= latest):
                continue
            existing = by_player.get(name)
            # Keep the most recent entry per player.
            if existing and existing.get("last_seen_utc") and fx_dt:
                if existing["last_seen_utc"] >= fx_dt:
                    continue
            by_player[name] = {
                "player_name": name,
                "team": t.get("name") or "Unknown",
                "type": p.get("type") or "Missing Fixture",
                "reason": p.get("reason") or "—",
                "last_seen_utc": fx_dt,
                "fixture_id": fx.get("id"),
            }
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_injury_row", error=str(exc))
    rows = list(by_player.values())
    rows.sort(key=lambda r: (r["team"], r["player_name"]))
    return rows


def normalize_statistics(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the team-level stat block into a 2-element list keyed by team.

    Output::

        [{"team": "Liverpool", "stats": {"possession": "62%",
                                         "total_shots": 18,
                                         "shots_on_target": 7,
                                         ...}},
         {"team": "Crystal Palace", "stats": {...}}]

    Values are passed through verbatim — possession comes back as
    "62%" string, total_shots as int. The writer prompt explains the
    convention so percentages stay strings (more readable in prose).
    """
    out: list[dict[str, Any]] = []
    for entry in raw.get("response", []):
        try:
            team = (entry.get("team") or {}).get("name") or "Unknown"
            stats: dict[str, Any] = {}
            for s in (entry.get("statistics") or []):
                key = _STAT_TYPE_MAP.get(s.get("type"))
                if key:
                    stats[key] = s.get("value")
            out.append({"team": team, "stats": stats})
        except Exception as exc:  # noqa: BLE001
            log.warning("normalizer.bad_stat_block", error=str(exc))
    return out
