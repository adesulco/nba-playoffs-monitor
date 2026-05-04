"""API-Football v3 client.

Phase 0: bare-minimum ingestion of fixtures by league + gameweek. Lineups
+ events + player stats land Phase 1 when the recap writer needs them.

API docs: https://www.api-football.com/documentation-v3

Auth: header ``x-apisports-key: {API_FOOTBALL_KEY}``. The key is already
provisioned for the web app (used by ``/api/proxy/api-football/*``) so the
engine reuses it directly rather than going through the Vercel proxy.

League IDs (API-Football):
  39  = Premier League
  274 = Indonesian Super League (BRI Liga 1)
  1   = FIFA World Cup
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from content_engine.config import settings

log = structlog.get_logger()


# Phase 0 dev path: route through the Vercel proxy at /api/proxy/api-football/.
# The proxy already injects the x-apisports-key header (live since v0.14.x);
# this keeps the engine usable for dry-run acceptance without requiring the
# key locally — handy because Vercel marks the key Sensitive and `vercel env
# pull` returns an empty string. Phase 1 will switch to direct API-Football
# (https://v3.football.api-sports.io) once we provision the key in local .env
# and want full request-rate (the proxy adds ~50ms latency + has its own
# in-edge cache that we'd want to bypass for fresh data).
_BASE = "https://www.gibol.co/api/proxy/api-football"
_USE_PROXY = True  # flip to False in Phase 1 when local key is in .env
_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


# Mapping from our internal league_id to API-Football's numeric league id.
# Source: cross-checked against the web app's existing API-Football usage
# in `src/hooks/useEPLLeaderboard.js` etc.
_LEAGUE_MAP = {
    "epl": {"af_id": 39, "season": 2025, "gameweek_label": "Regular Season"},
    "liga-1-id": {"af_id": 274, "season": 2025, "gameweek_label": "Regular Season"},
    "fifa-wc-2026": {"af_id": 1, "season": 2026, "gameweek_label": "Group Stage"},
}


async def _fetch(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """GET ``{_BASE}/{path}`` with auth + log + timeout. Raises on non-2xx.

    When _USE_PROXY is True, requests go to the Vercel-hosted proxy which
    injects the auth header server-side; we send no key. When False, we
    auth directly with the x-apisports-key header from settings.
    """
    headers: dict[str, str] = {"accept": "application/json"}
    if not _USE_PROXY:
        headers["x-apisports-key"] = settings.api_football_key
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        log.info("api_football.fetch", path=path, params=params, via_proxy=_USE_PROXY)
        resp = await client.get(f"{_BASE}/{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_epl_gameweek(gameweek: int) -> dict[str, Any]:
    """Fetch all EPL fixtures for a given gameweek (round in API-Football lingo).

    Returns the raw API-Football response dict. The ``response`` key is a list
    of fixture objects; the rest is metadata. Pass the whole dict to
    ``normalizer.normalize_epl_fixtures`` to convert into our schema.
    """
    cfg = _LEAGUE_MAP["epl"]
    return await _fetch(
        "fixtures",
        {
            "league": cfg["af_id"],
            "season": cfg["season"],
            "round": f"{cfg['gameweek_label']} - {gameweek}",
        },
    )


async def fetch_liga1_gameweek(gameweek: int) -> dict[str, Any]:
    """Fetch all Liga 1 (Indonesian Super League) fixtures for a gameweek."""
    cfg = _LEAGUE_MAP["liga-1-id"]
    return await _fetch(
        "fixtures",
        {
            "league": cfg["af_id"],
            "season": cfg["season"],
            "round": f"{cfg['gameweek_label']} - {gameweek}",
        },
    )


async def fetch_fixture(source_fixture_id: int | str) -> dict[str, Any]:
    """Fetch a single fixture by its API-Football id. Used by the recap path
    to grab lineups + events + stats once the match has finished."""
    return await _fetch("fixtures", {"id": str(source_fixture_id)})


async def fetch_status() -> dict[str, Any]:
    """Hit ``/status`` to confirm the API key is valid + check daily quota.

    Useful for the orchestrator's morning health check — refuse to start a
    batch run if remaining requests < estimated need.
    """
    return await _fetch("status", {})


# ── Phase 1 ship #2 — preview-context enrichers ───────────────────────────
#
# These three endpoints feed the preview writer's context block (positions,
# form, top-scorers, H2H). Without them the writer has no real data and
# falls back to "data belum tersedia" filler — which is honest, but doesn't
# differentiate articles. With them, every preview gets dense substance.
#
# Cost: each endpoint is ~1 API-Football request per call. Standings +
# topscorers per league change at most once a day (post-match), so a
# higher-level caller should cache them per (league, day). H2H is per
# (home, away) pair — also stable until the next meeting.


async def fetch_standings(league_id: str = "epl") -> dict[str, Any]:
    """Fetch league standings + per-team form (last 5 results as 'WWLDW').

    Returns the raw API-Football ``/standings`` response. The
    ``response[0].league.standings[0]`` array is the table; each row has
    ``rank``, ``points``, ``all.played``, ``form`` ("WWLDW" string), and
    ``team.{id, name}``.

    Used by ``preview_context`` to populate ``home_position`` /
    ``away_position`` / ``home_form`` / ``away_form`` for the writer
    prompt. Stable across a gameweek — cache at caller level.
    """
    cfg = _LEAGUE_MAP[league_id]
    return await _fetch(
        "standings",
        {"league": cfg["af_id"], "season": cfg["season"]},
    )


async def fetch_h2h(home_team_id: int, away_team_id: int, last: int = 5) -> dict[str, Any]:
    """Fetch the last N head-to-head fixtures between two teams.

    ``last`` defaults to 5 per spec § 5.2's preview template. API-Football
    accepts the team-id pair as ``"{a}-{b}"`` query param; order doesn't
    matter (the endpoint returns meetings either direction). The
    ``response`` array is sorted most-recent-first.
    """
    return await _fetch(
        "fixtures/headtohead",
        {"h2h": f"{home_team_id}-{away_team_id}", "last": last},
    )


async def fetch_team_detail(team_id: int | str) -> dict[str, Any]:
    """Fetch a single team's full info (Phase 2 ship #22).

    Returns ``response[0]`` shape:
      ``team.{id, name, code, country, founded, national, logo}``
      ``venue.{id, name, address, city, capacity, surface, image}``

    Used by ``football_team_profile_context.build_context`` to populate
    the IDENTITAS block (founded year, home stadium, capacity, country).
    Stable per team — single fetch per profile.
    """
    return await _fetch("teams", {"id": str(team_id)})


async def fetch_team_season_stats(team_id: int, league_id: str = "epl") -> dict[str, Any]:
    """Fetch a team's season stats — full performance breakdown.

    ``response`` shape (single object, not array):
      ``form`` — last N results as 'WWLDW' string
      ``fixtures.{played, wins, draws, loses}.{home, away, total}``
      ``goals.{for, against}.{total, average}.{home, away, total}``
      ``biggest`` — biggest wins, losses, streak
      ``clean_sheet.{home, away, total}``
      ``failed_to_score.{home, away, total}``
      ``cards`` — yellow + red cards by minute bucket

    Used by ``football_team_profile_context.build_context`` for the
    PERFORMA block (goals scored/conceded, clean sheets, form).
    """
    cfg = _LEAGUE_MAP[league_id]
    return await _fetch(
        "teams/statistics",
        {"league": cfg["af_id"], "season": cfg["season"], "team": str(team_id)},
    )


async def fetch_team_squad(team_id: int) -> dict[str, Any]:
    """Fetch a team's current squad (Phase 2 ship #22).

    Returns ``response[0].players`` — list of player objects with
    ``id``, ``name``, ``age``, ``number``, ``position``, ``photo``.
    Used by ``football_team_profile_context`` for the SQUAD block.
    Profile writer picks 2-3 names to highlight from the list.
    """
    return await _fetch("players/squads", {"team": str(team_id)})


async def fetch_topscorers(league_id: str = "epl") -> dict[str, Any]:
    """Fetch the top-scorer leaderboard for a league/season.

    ``response`` is a list of player objects sorted by goals scored.
    Each entry has ``player.{id, name}`` and a ``statistics`` array
    (one entry per team they played for that season — for transfer
    cases). The first stats entry is normally enough.

    Used by ``preview_context`` to find the relevant top-scorer for
    each side (the highest scorer who plays for home_team / away_team).
    """
    cfg = _LEAGUE_MAP[league_id]
    return await _fetch(
        "players/topscorers",
        {"league": cfg["af_id"], "season": cfg["season"]},
    )


# ── Phase 1 ship #3 — recap-context enrichers ─────────────────────────────
#
# Recap Writer needs the full post-match picture: goals (with scorer +
# minute + assist), cards, substitutions, lineups + formations, and
# the team-level stat box (possession, shots, on-target, saves,
# corners, fouls, passes, accuracy).
#
# These all live under /fixtures/{events,lineups,statistics} keyed by
# the API-Football fixture id. Each is a separate request so the
# recap pipeline costs ~3 requests per match. Cheap relative to the
# Sonnet generation cost.


async def fetch_fixture_events(fixture_id: int | str) -> dict[str, Any]:
    """Fetch in-match events for a finished fixture.

    Returns the raw response. The ``response`` array contains entries
    like::

        {"time": {"elapsed": 23, "extra": null},
         "team": {"id": 33, "name": "Manchester United"},
         "player": {"id": 1100, "name": "B. Mbeumo"},
         "assist": {"id": 11000, "name": "M. Mount"},
         "type": "Goal",
         "detail": "Normal Goal",
         "comments": null}

    Types we care about: "Goal", "Card" (yellow/red), "subst" (substitution),
    "Var" (VAR review). Order is chronological.
    """
    return await _fetch("fixtures/events", {"fixture": str(fixture_id)})


async def fetch_fixture_lineups(fixture_id: int | str) -> dict[str, Any]:
    """Fetch starting XI + formation + bench for both sides.

    Returns the raw response. ``response`` is a 2-element list (home
    and away) with::

        {"team": {"id": 33, "name": "...", "logo": "..."},
         "formation": "4-2-3-1",
         "startXI": [{"player": {"id": ..., "name": ..., "number": ..., "pos": "G/D/M/F"}}, ...],
         "substitutes": [...],
         "coach": {"id": ..., "name": "..."}}

    Includes coach name — useful for recaps to ground "anak asuh
    Slot" / "tim Maresca" claims that the voice linter would
    otherwise flag as training-data inference.
    """
    return await _fetch("fixtures/lineups", {"fixture": str(fixture_id)})


async def fetch_fixture_statistics(fixture_id: int | str) -> dict[str, Any]:
    """Fetch the team-level box score for a finished fixture.

    ``response`` is a 2-element list with team + ``statistics`` array
    where each entry is ``{"type": "Ball Possession", "value": "62%"}``.
    Common types: Shots on Goal, Shots off Goal, Total Shots, Blocked
    Shots, Shots insidebox, Shots outsidebox, Fouls, Corner Kicks,
    Offsides, Ball Possession, Yellow Cards, Red Cards, Goalkeeper
    Saves, Total passes, Passes accurate, Passes %, expected_goals.
    """
    return await _fetch("fixtures/statistics", {"fixture": str(fixture_id)})


async def fetch_team_injuries(team_id: int, league_id: str = "epl") -> dict[str, Any]:
    """Fetch the team's season injury log.

    Used by the preview pipeline when fixture-specific injuries
    haven't been published yet (which is normal until ~24-48h before
    kickoff). Returns ALL injury / suspension / rest entries for the
    team across the season, keyed by player + fixture. Caller filters
    by recency to extract the current sidelined list.

    Each entry shape::

        {"player": {"id": ..., "name": "...", "type": "Missing Fixture",
                    "reason": "Sprained ankle"},
         "team":   {"id": 42, "name": "Arsenal", ...},
         "fixture":{"id": ..., "date": "2026-04-25T19:00:00+00:00", ...},
         "league": {...}}

    `type` values: "Missing Fixture" (injured/suspended out for one
    match), "Questionable" (50/50). `reason` is short free-text from
    the league press: "Injured Doubtful", "Sprained ankle", "Wound",
    "Card suspension", "Coach's decision", "Knock", "Hamstring",
    "Thigh problems".
    """
    cfg = _LEAGUE_MAP[league_id]
    return await _fetch(
        "injuries",
        {"team": team_id, "season": cfg["season"]},
    )


async def fetch_fixture_injuries(fixture_id: int | str) -> dict[str, Any]:
    """Fetch injuries scoped to a specific fixture.

    Returns the per-fixture sidelined squad after teams release their
    pre-match injury reports (typically T-24h to T-48h). Empty before
    that window — caller should fall back to ``fetch_team_injuries``
    + recency filter for earlier preview generation.
    """
    return await _fetch("injuries", {"fixture": str(fixture_id)})
