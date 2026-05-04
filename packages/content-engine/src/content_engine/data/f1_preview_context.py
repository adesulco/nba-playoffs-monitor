"""F1 race weekend preview context assembler.

Phase 1 ship #12. Mirror of f1_recap_context for upcoming races.
Pulls race meta + current championship standings + last race result
(for momentum context).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import f1_jolpica, f1_normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


def _fmt_race_local(dt_utc: datetime | None) -> str:
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


def _format_driver_standings(rows: list[dict[str, Any]], limit: int = 10) -> str:
    if not rows:
        return "Driver standings tidak tersedia di sistem."
    lines = [f"  {'P':<3} {'CODE':<4} {'DRIVER':<25} {'CONSTRUCTOR':<18} {'PTS':<5} {'WINS'}"]
    for r in rows[:limit]:
        lines.append(
            f"  {r['position']:<3} {r.get('driver_code','?'):<4} "
            f"{r.get('driver_name','?')[:25]:<25} "
            f"{(r.get('constructor') or '?')[:18]:<18} "
            f"{int(r.get('points',0)):<5} "
            f"{r.get('wins',0)}"
        )
    return "\n".join(lines)


def _format_constructor_standings(rows: list[dict[str, Any]], limit: int = 8) -> str:
    if not rows:
        return "Constructor standings tidak tersedia di sistem."
    lines = [f"  {'P':<3} {'CONSTRUCTOR':<25} {'PTS':<5} {'WINS'}"]
    for r in rows[:limit]:
        lines.append(
            f"  {r['position']:<3} "
            f"{r.get('constructor','?')[:25]:<25} "
            f"{int(r.get('points',0)):<5} "
            f"{r.get('wins',0)}"
        )
    return "\n".join(lines)


def _format_prior_results(results: list[dict[str, Any]], race_meta: dict[str, Any], limit: int = 5) -> str:
    if not results:
        return "Prior round result tidak tersedia di sistem."
    name = race_meta.get("race_name") or "Last race"
    lines = [f"  {name}:"]
    for r in results[:limit]:
        lines.append(f"    P{r['position']:<3} {r.get('driver_code','?'):<4} {r.get('driver_name','?'):<25} ({r.get('constructor','?')})")
    return "\n".join(lines)


async def build_context(season: int, round_num: int) -> dict[str, Any]:
    """Fetch + assemble F1 preview context.

    For an upcoming race we need:
      * Race meta (circuit, date, round)
      * Current championship standings (driver + constructor)
      * Optional: last completed race's top 5 (for momentum framing)
    """
    async def _safe(coro, label):
        try:
            return await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_preview_context.fetch_failed", label=label, error=str(exc))
            return {}

    # Race meta (this round)
    raw_meta = await _safe(f1_jolpica.fetch_race_meta(season, round_num), "meta")
    meta = f1_normalizer.normalize_race_meta(raw_meta)

    # Standings — at the moment, after the last completed round.
    # jolpica returns "season-to-date" when no round is given.
    raw_drivers, raw_cons = await asyncio.gather(
        _safe(f1_jolpica.fetch_driver_standings(season), "driver_standings"),
        _safe(f1_jolpica.fetch_constructor_standings(season), "constructor_standings"),
    )
    drivers = f1_normalizer.normalize_driver_standings(raw_drivers)
    constructors = f1_normalizer.normalize_constructor_standings(raw_cons)

    # Prior round — if round_num > 1, fetch (round_num - 1)'s results
    prior_meta = {}
    prior_results = []
    if round_num > 1:
        raw_prior = await _safe(f1_jolpica.fetch_race_results(season, round_num - 1), "prior_results")
        prior_meta = f1_normalizer.normalize_race_meta(raw_prior)
        prior_results = f1_normalizer.normalize_race_results(raw_prior)

    ctx = {
        "league_name": f"Formula 1 {season}",
        "season": season,
        "round": meta.get("round") or round_num,
        "race_name": meta.get("race_name"),
        "circuit": meta.get("circuit"),
        "country": meta.get("country"),
        "locality": meta.get("locality"),
        "race_date_utc": meta.get("race_date_utc"),
        "race_date_local": _fmt_race_local(meta.get("race_date_utc")),
        "driver_standings_block": _format_driver_standings(drivers),
        "constructor_standings_block": _format_constructor_standings(constructors),
        "prior_results_block": _format_prior_results(prior_results, prior_meta),
        # Raw shapes
        "_meta": meta,
        "_drivers": drivers,
        "_constructors": constructors,
        "_prior_results": prior_results,
        "_prior_meta": prior_meta,
    }

    log.info(
        "f1_preview_context.built",
        race=ctx["race_name"],
        round=ctx["round"],
        leader=drivers[0]["driver_code"] if drivers else None,
    )

    return ctx
