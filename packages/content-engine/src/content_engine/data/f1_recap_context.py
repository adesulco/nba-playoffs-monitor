"""F1 race recap context assembler.

Phase 1 ship #12. Three jolpica calls per article (results +
qualifying + standings). Pre-renders all sub-blocks as fixed-width
text for the writer prompt.
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


def _format_results_block(results: list[dict[str, Any]], limit: int = 15) -> str:
    """Render finish order with grid + points + status."""
    if not results:
        return "Race results tidak tersedia di sistem."
    lines = [f"  {'P':<3} {'CODE':<4} {'DRIVER':<25} {'CONSTRUCTOR':<18} {'GRID':<5} {'PTS':<4} {'STATUS'}"]
    for r in results[:limit]:
        fl_tag = " ⚡FL" if r.get("fastest_lap_rank") == 1 else ""
        lines.append(
            f"  {r['position']:<3} {r.get('driver_code','?'):<4} "
            f"{r.get('driver_name','?')[:25]:<25} "
            f"{(r.get('constructor') or '?')[:18]:<18} "
            f"P{r.get('grid','?'):<4} "
            f"{int(r.get('points',0)):<4} "
            f"{r.get('status','')}{fl_tag}"
        )
    # If full grid is longer than limit, note that DNFs / lower positions exist
    if len(results) > limit:
        lines.append(f"  ... ({len(results) - limit} more drivers, including any DNFs below P{limit})")
    return "\n".join(lines)


def _format_qualifying_block(quali: list[dict[str, Any]], limit: int = 5) -> str:
    if not quali:
        return "Qualifying data tidak tersedia di sistem."
    lines = [f"  {'P':<3} {'CODE':<4} {'DRIVER':<25} {'CONSTRUCTOR':<18} {'Q3'}"]
    for q in quali[:limit]:
        lines.append(
            f"  {q['position']:<3} {(q.get('driver_code') or '?'):<4} "
            f"{(q.get('driver_name') or '?')[:25]:<25} "
            f"{(q.get('constructor') or '?')[:18]:<18} "
            f"{q.get('q3') or q.get('q2') or q.get('q1') or '—'}"
        )
    return "\n".join(lines)


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


async def build_context(season: int, round_num: int) -> dict[str, Any]:
    """Fetch + assemble F1 recap context.

    Three parallel jolpica calls: results + qualifying + standings
    (driver + constructor as one logical pair).
    """
    async def _safe(coro, label):
        try:
            return await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_recap_context.fetch_failed", label=label, error=str(exc))
            return {}

    raw_results, raw_quali, raw_drivers, raw_cons = await asyncio.gather(
        _safe(f1_jolpica.fetch_race_results(season, round_num), "results"),
        _safe(f1_jolpica.fetch_qualifying(season, round_num), "qualifying"),
        _safe(f1_jolpica.fetch_driver_standings(season, round_num), "driver_standings"),
        _safe(f1_jolpica.fetch_constructor_standings(season, round_num), "constructor_standings"),
    )

    meta = f1_normalizer.normalize_race_meta(raw_results) or f1_normalizer.normalize_race_meta(raw_quali)
    results = f1_normalizer.normalize_race_results(raw_results)
    quali = f1_normalizer.normalize_qualifying(raw_quali)
    drivers = f1_normalizer.normalize_driver_standings(raw_drivers)
    constructors = f1_normalizer.normalize_constructor_standings(raw_cons)

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
        "results_block": _format_results_block(results),
        "qualifying_block": _format_qualifying_block(quali),
        "driver_standings_block": _format_driver_standings(drivers),
        "constructor_standings_block": _format_constructor_standings(constructors),
        # Raw shapes for downstream
        "_meta": meta,
        "_results": results,
        "_qualifying": quali,
        "_drivers": drivers,
        "_constructors": constructors,
    }

    log.info(
        "f1_recap_context.built",
        race=ctx["race_name"],
        round=ctx["round"],
        results_count=len(results),
        winner=results[0]["driver_code"] if results else None,
    )

    return ctx
