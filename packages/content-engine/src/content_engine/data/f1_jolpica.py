"""jolpica F1 data layer (Ergast-compatible API).

Phase 1 ship #12. Sister module to ``espn_nba.py``. The SPA already
uses jolpica via the Vercel proxy at ``/api/proxy/jolpica-f1/`` for
schedule + results + standings; the content engine talks directly to
jolpica's public hostname (no auth required, CORS-friendly).

Endpoints used:

  * ``/{season}.json`` — full season schedule (race calendar)
  * ``/{season}/{round}/results.json`` — race result for one round
  * ``/{season}/{round}/qualifying.json`` — qualifying result
  * ``/{season}/{round}/driverStandings.json`` — championship snapshot
    AT THAT POINT in the season (after this round was scored)
  * ``/{season}/{round}/constructorStandings.json`` — same shape
  * ``/{season}/{round}.json`` — race meta (circuit, date, time)

All fetches return jolpica's standard ``MRData`` envelope; normalizers
strip it.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

log = structlog.get_logger()


_BASE = "https://api.jolpi.ca/ergast/f1"
_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


async def _fetch(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {"accept": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        log.info("f1_jolpica.fetch", path=path, params=params or {})
        resp = await client.get(f"{_BASE}/{path}", headers=headers, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_season_schedule(season: int = 2026) -> dict[str, Any]:
    """Full calendar — list of races + circuits + dates."""
    return await _fetch(f"{season}.json")


async def fetch_race_meta(season: int, round_num: int) -> dict[str, Any]:
    """Race-level metadata (circuit, date, time, etc) for one round.
    Cheaper than results when we only need scheduling info for a
    preview."""
    return await _fetch(f"{season}/{round_num}.json")


async def fetch_race_results(season: int, round_num: int) -> dict[str, Any]:
    """Final race classification: P1-P20 + grid + points + status +
    fastest lap. Used by recap context."""
    return await _fetch(f"{season}/{round_num}/results.json")


async def fetch_qualifying(season: int, round_num: int) -> dict[str, Any]:
    """Saturday qualifying result (Q1/Q2/Q3 times + final grid).
    Used by recap context for "won pole" + "stunning Q3 lap" framing."""
    return await _fetch(f"{season}/{round_num}/qualifying.json")


async def fetch_driver_standings(season: int, round_num: int | None = None) -> dict[str, Any]:
    """Driver championship standings.

    If `round_num` is provided, returns the standings AS OF that round
    (i.e. after that round's points were applied). Without a round,
    returns current end-of-season-so-far.
    """
    if round_num is not None:
        return await _fetch(f"{season}/{round_num}/driverStandings.json")
    return await _fetch(f"{season}/driverStandings.json")


async def fetch_constructor_standings(season: int, round_num: int | None = None) -> dict[str, Any]:
    """Constructor championship standings (Mercedes / Ferrari / etc)."""
    if round_num is not None:
        return await _fetch(f"{season}/{round_num}/constructorStandings.json")
    return await _fetch(f"{season}/constructorStandings.json")


async def fetch_driver_results(season: int, driver_id: str) -> dict[str, Any]:
    """Per-race results for a driver in a season (Phase 2 ship #22).

    Used by f1_driver_profile_context to pull the driver's per-race
    finishing positions, building a "recent form" block. Each race
    has Results[0] with position, status, points, etc.
    """
    return await _fetch(f"{season}/drivers/{driver_id}/results.json")


async def fetch_driver_career(driver_id: str) -> dict[str, Any]:
    """Driver lifetime metadata (Phase 2 ship #22).

    Endpoint: ``drivers/{driverId}.json`` (season-agnostic). Returns
    Driver record with DOB, nationality, wikipedia URL. We use this
    when the driver is not in current driver standings (e.g. retired).
    For active drivers we can pluck the same info from
    fetch_driver_standings — keeping this around as a fallback +
    for the "career wins" enrichment.
    """
    return await _fetch(f"drivers/{driver_id}.json")
