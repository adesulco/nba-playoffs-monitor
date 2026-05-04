"""ESPN tennis data layer.

Phase 1 ship #13. ATP + WTA rankings + active-tournament metadata.

The SPA already uses ESPN tennis endpoints via the Vercel proxy
(``/api/proxy/espn/tennis/{tour}/rankings`` and ``/scoreboard``).
The content engine talks directly to ESPN — same source, no auth.

Endpoints:

  * ``/sports/tennis/{tour}/rankings`` — Top 150 with current /
    previous rank + points. Updated weekly by ESPN.
  * ``/sports/tennis/{tour}/scoreboard`` — Active tournament(s) +
    matches. The "events" array is tournaments, not individual
    matches; matches live nested under ``events[i].groupings[].competitions``.

`tour` is "atp" or "wta".
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

log = structlog.get_logger()


_BASE = "https://site.api.espn.com/apis/site/v2/sports/tennis"
_CORE_BASE = "https://sports.core.api.espn.com/v2/sports/tennis/leagues"
_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


async def _fetch(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {"accept": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        log.info("espn_tennis.fetch", path=path, params=params or {})
        resp = await client.get(f"{_BASE}/{path}", headers=headers, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_rankings(tour: str = "atp") -> dict[str, Any]:
    """Top 150 singles rankings for a tour. ``tour`` is ``"atp"`` or
    ``"wta"``. Response carries ``rankings[0].ranks`` with each entry's
    current/previous rank + total points + athlete reference.
    """
    if tour not in {"atp", "wta"}:
        raise ValueError(f"tour must be 'atp' or 'wta', got {tour!r}")
    return await _fetch(f"{tour}/rankings")


async def fetch_scoreboard(tour: str = "atp") -> dict[str, Any]:
    """Currently-active tournament for a tour. Used by the rankings
    explainer to mention "X tournament is happening right now" and
    by future tournament-preview articles."""
    if tour not in {"atp", "wta"}:
        raise ValueError(f"tour must be 'atp' or 'wta', got {tour!r}")
    return await _fetch(f"{tour}/scoreboard")


async def fetch_athlete(athlete_id: int | str, tour: str = "atp") -> dict[str, Any]:
    """ESPN core API athlete detail (Phase 2 ship #22).

    The site v2 ``/athletes/{id}`` endpoint returns 404 for tennis;
    the core API has the data we need. Returns:
      ``id``, ``fullName``, ``displayName``, ``firstName``, ``lastName``
      ``age``, ``dateOfBirth``, ``debutYear``
      ``height`` (inches), ``weight`` (lbs), ``displayHeight``,
        ``displayWeight``
      ``birthPlace.summary`` — city + country string
      ``hand`` — handedness (right / left), may be None
      ``active`` — bool

    Used by tennis_player_profile_context.
    """
    if tour not in {"atp", "wta"}:
        raise ValueError(f"tour must be 'atp' or 'wta', got {tour!r}")
    headers = {"accept": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        url = f"{_CORE_BASE}/{tour}/athletes/{athlete_id}"
        log.info("espn_tennis.fetch_athlete", url=url, athlete_id=str(athlete_id))
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()
