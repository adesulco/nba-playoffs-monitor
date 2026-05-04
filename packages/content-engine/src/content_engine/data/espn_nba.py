"""ESPN NBA data layer.

Phase 1 ship #11 — extends the content engine to NBA Playoffs 2026.
Same architectural shape as ``api_football.py`` but talks to ESPN's
public site API directly (no proxy needed; ESPN serves CORS-friendly
JSON without auth for the read endpoints we use).

Endpoints used:

* ``/scoreboard`` and ``/scoreboard?dates=YYYYMMDD`` — list of games
  for a date. We use this only when we need to discover game IDs
  (the CLI also accepts game IDs directly so this is rarely needed
  in production).

* ``/summary?event=<gameId>`` — the workhorse. Returns ~14 top-level
  keys including ``boxscore``, ``leaders``, ``seasonseries``,
  ``plays``, ``header``, ``standings``. Both preview and recap
  contexts assemble from this single response (1 request per
  article — same cost shape as football's per-fixture flow).

The same ESPN endpoints already power the SPA's NBA dashboard
(``src/lib/api.js``) so this layer is reusing the same data source —
not introducing new infrastructure.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

log = structlog.get_logger()


_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


async def _fetch(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """GET ``{_BASE}/{path}`` with logging + timeout. ESPN site API is
    read-only public; no auth header needed.
    """
    headers = {"accept": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        log.info("espn_nba.fetch", path=path, params=params or {})
        resp = await client.get(f"{_BASE}/{path}", headers=headers, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_scoreboard_for_date(yyyymmdd: str) -> dict[str, Any]:
    """List of NBA games on a given date. ``yyyymmdd`` is the ESPN
    convention (no separators). Returns the raw response — the
    ``events`` array is the list of games for that date.
    """
    return await _fetch("scoreboard", {"dates": yyyymmdd})


async def fetch_scoreboard() -> dict[str, Any]:
    """Current scoreboard (today's games + recent). Cheaper than
    fetching every date; useful when the orchestrator just wants to
    know what's live or just-finished."""
    return await _fetch("scoreboard")


_WEB_BASE = "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba"


async def fetch_athlete(athlete_id: int | str) -> dict[str, Any]:
    """ESPN NBA athlete detail (Phase 2 ship #24).

    The site v2 ``/athletes/{id}`` returns 404 like tennis. The web
    common-v3 endpoint has the data: ``athlete`` block with bio +
    team + season stat summary. Used by nba_player_profile_context.

    Returns the full response dict; ``athlete`` is the main key.
    Notable fields: displayName, age, jersey, position, team
    {displayName, abbreviation}, displayHeight, displayWeight,
    displayBirthPlace, debutYear, college, displayExperience,
    displayDraft, statsSummary.statistics[] with PPG/RPG/APG/FG%/etc.
    """
    headers = {"accept": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        url = f"{_WEB_BASE}/athletes/{athlete_id}"
        log.info("espn_nba.fetch_athlete", url=url, athlete_id=str(athlete_id))
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def fetch_team(team_id: int | str) -> dict[str, Any]:
    """ESPN team detail.

    Phase 2 ship #21 — used by the NBA team profile context builder.
    Returns the raw response; the ``team`` top-level key has:

      * ``id``, ``displayName``, ``shortDisplayName``, ``name``,
        ``location``, ``abbreviation``, ``slug``, ``color``,
        ``alternateColor`` — branding.
      * ``record.items[]`` — list of record breakdowns (Overall, Home,
        Road). Each has ``stats[]`` with ``wins``, ``losses``,
        ``winPercent``, ``avgPointsFor``, ``avgPointsAgainst``,
        ``playoffSeed`` etc.
      * ``standingSummary`` — short string like "1st in Atlantic
        Division". Useful for the lead.
      * ``groups`` — division/conference IDs.
      * ``franchise.venue`` — home arena (sometimes nested).
      * ``nextEvent[]`` — upcoming game(s); useful when profile is
        published mid-playoffs.
    """
    return await _fetch(f"teams/{team_id}")


async def fetch_team_roster(team_id: int | str) -> dict[str, Any]:
    """ESPN team roster.

    Returns ``athletes[]`` — current roster. Each athlete has
    ``displayName``, ``firstName``, ``lastName``, ``position``,
    ``jersey``, ``age``, ``experience.years``, ``height``, ``weight``,
    ``college``, ``dateOfBirth``, ``birthPlace``. We use this to seed
    the "key players" block in the profile (top 5-7 by jersey-listed
    starters or filtered by position diversity).
    """
    return await _fetch(f"teams/{team_id}/roster")


async def fetch_game_summary(game_id: int | str) -> dict[str, Any]:
    """Full ESPN summary for a single game.

    Top-level keys we care about (other content-engine modules read
    these):

      * ``header.competitions[0]`` — final score, status, date, venue,
        playoff series state ("BOS leads series 3-1"), home/away
        records.
      * ``boxscore.teams`` — team-level stats (FG%, 3PT%, etc).
      * ``boxscore.players`` — per-player stats. The
        ``statistics[0].keys`` array tells us which stat lives at
        each index (points, rebounds, assists, etc).
      * ``leaders`` — per-team leader picks already grouped by
        category (points, rebounds, assists). Cleaner than building
        from boxscore.
      * ``seasonseries`` — playoff series state across the seven-
        game format. Used for preview ("Game 5") and recap framing.
      * ``plays`` — chronological event list with quarters + clock.
        Used by recap context for lead-change / clutch-time drama
        when we want to cite a moment.

    NOTE: response can be large (~150KB). For recap generation we
    extract just the fields we use; the agent never sees raw JSON.
    """
    return await _fetch("summary", {"event": str(game_id)})
