"""F1 championship-state context assembler.

Phase 2 ship #18b. Re-uses jolpica fetchers from f1_recap_context;
only difference is we don't fetch race results — just standings.
"""

from __future__ import annotations

import asyncio
from typing import Any

import structlog

from content_engine.data import f1_jolpica, f1_normalizer
from content_engine.data.f1_recap_context import (
    _format_constructor_standings,
    _format_driver_standings,
)

log = structlog.get_logger()


async def build_context(season: int, round_num: int) -> dict[str, Any]:
    """Build F1 championship-state context as of the given round.

    Two parallel jolpica calls (driver + constructor standings).
    The race meta is fetched too so the article can cite the round
    name ("setelah Round 3 di Suzuka").
    """
    async def _safe(coro, label):
        try:
            return await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_championship_context.fetch_failed", label=label, error=str(exc))
            return {}

    raw_meta, raw_drivers, raw_cons = await asyncio.gather(
        _safe(f1_jolpica.fetch_race_meta(season, round_num), "meta"),
        _safe(f1_jolpica.fetch_driver_standings(season, round_num), "drivers"),
        _safe(f1_jolpica.fetch_constructor_standings(season, round_num), "constructors"),
    )

    meta = f1_normalizer.normalize_race_meta(raw_meta)
    drivers = f1_normalizer.normalize_driver_standings(raw_drivers)
    constructors = f1_normalizer.normalize_constructor_standings(raw_cons)

    # Total season rounds — fetch the season schedule. Cheap (one
    # call, often already-cached at the network layer).
    rounds_total = 22  # default sensible
    try:
        sched_raw = await f1_jolpica.fetch_season_schedule(season)
        races = (sched_raw.get("MRData") or {}).get("RaceTable", {}).get("Races", [])
        if races:
            rounds_total = max(int(r.get("round") or 0) for r in races) or rounds_total
    except Exception as exc:  # noqa: BLE001
        log.warning("f1_championship_context.schedule_fetch_failed", error=str(exc))

    rounds_remaining = max(0, rounds_total - round_num)

    leader = drivers[0] if drivers else {}

    ctx = {
        "league_name": f"Formula 1 {season}",
        "season": season,
        "round": round_num,
        "race_name": meta.get("race_name") or f"Round {round_num}",
        "rounds_remaining": rounds_remaining,
        "rounds_total": rounds_total,
        "driver_standings_block": _format_driver_standings(drivers, limit=10),
        "constructor_standings_block": _format_constructor_standings(constructors, limit=8),
        "leader_driver": leader.get("driver_name"),
        "leader_points": leader.get("points"),
        "leader_constructor": leader.get("constructor"),
        # Raw shapes
        "_meta": meta,
        "_drivers": drivers,
        "_constructors": constructors,
    }
    log.info(
        "f1_championship_context.built",
        round=round_num,
        leader=ctx.get("leader_driver"),
        rounds_remaining=rounds_remaining,
    )
    return ctx
