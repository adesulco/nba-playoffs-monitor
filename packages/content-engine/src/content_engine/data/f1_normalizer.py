"""jolpica F1 → content-engine shape.

Phase 1 ship #12. Sibling to ``nba_normalizer.py`` (NBA) and
``normalizer.py`` (football). Strips the ``MRData`` envelope and
exposes the slim shapes the F1 context builders + writer prompts read.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger()


def _race_date_utc(date_str: str | None, time_str: str | None) -> datetime | None:
    """Combine ``date`` (YYYY-MM-DD) + ``time`` (HHMMSSZ) → UTC datetime.
    jolpica returns these as separate fields."""
    if not date_str:
        return None
    t = (time_str or "14:00:00Z").replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(f"{date_str}T{t}")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        log.warning("f1_normalizer.bad_date", date=date_str, time=time_str)
        return None


def _race_obj(raw: dict[str, Any]) -> dict[str, Any]:
    """Pull the first race from jolpica's ``MRData.RaceTable.Races[0]``.
    Returns empty dict if missing rather than raising — callers handle
    the empty case as "data not available."
    """
    return ((raw.get("MRData") or {}).get("RaceTable") or {}).get("Races", [{}])[0] or {}


# ── Race meta ──────────────────────────────────────────────────────────────


def normalize_race_meta(raw: dict[str, Any]) -> dict[str, Any]:
    """Race-level metadata: name, round, circuit, country, date.

    Returns::

        {"season": 2026, "round": 3,
         "race_name": "Japanese Grand Prix",
         "circuit": "Suzuka Circuit",
         "locality": "Suzuka",
         "country": "Japan",
         "race_date_utc": datetime}
    """
    race = _race_obj(raw)
    if not race:
        return {}
    circuit = race.get("Circuit") or {}
    location = circuit.get("Location") or {}
    return {
        "season": int(race.get("season")) if race.get("season") else None,
        "round": int(race.get("round")) if race.get("round") else None,
        "race_name": race.get("raceName") or "Unknown Grand Prix",
        "circuit": circuit.get("circuitName") or "Unknown Circuit",
        "locality": location.get("locality"),
        "country": location.get("country"),
        "race_date_utc": _race_date_utc(race.get("date"), race.get("time")),
    }


# ── Race results ───────────────────────────────────────────────────────────


def normalize_race_results(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Per-driver classification rows. Returns the full grid in finish
    order::

        [{"position": 1, "driver_code": "ANT", "driver_name": "Andrea Kimi Antonelli",
          "constructor": "Mercedes", "grid": 1, "points": 25,
          "status": "Finished", "laps": 53, "time": "1:31:05.123",
          "fastest_lap_rank": 1 (or None), "fastest_lap_time": "1:31.234"}]
    """
    race = _race_obj(raw)
    if not race:
        return []
    rows: list[dict[str, Any]] = []
    for r in race.get("Results", []):
        try:
            d = r.get("Driver") or {}
            con = r.get("Constructor") or {}
            time = r.get("Time") or {}
            fl = r.get("FastestLap") or {}
            rows.append({
                "position": int(r.get("position") or 99),
                "driver_code": d.get("code") or "?",
                "driver_number": d.get("permanentNumber"),
                "driver_first": d.get("givenName"),
                "driver_last": d.get("familyName"),
                "driver_name": f"{d.get('givenName') or ''} {d.get('familyName') or ''}".strip(),
                "nationality": d.get("nationality"),
                "constructor": con.get("name") or "?",
                "constructor_id": con.get("constructorId"),
                "grid": int(r.get("grid") or 0),
                "points": float(r.get("points") or 0),
                "status": r.get("status") or "Unknown",
                "laps": int(r.get("laps") or 0),
                "time": time.get("time"),
                "fastest_lap_rank": int(fl.get("rank")) if fl.get("rank") else None,
                "fastest_lap_time": ((fl.get("Time") or {}).get("time")),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_normalizer.bad_result_row", error=str(exc))
    rows.sort(key=lambda r: r["position"])
    return rows


# ── Qualifying ─────────────────────────────────────────────────────────────


def normalize_qualifying(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Saturday qualifying: P1-P20 with Q1/Q2/Q3 times. Used by recap
    for pole + grid-position framing.

    Each row::

        {"position": 1, "driver_code": "ANT", "driver_name": "...",
         "constructor": "Mercedes",
         "q1": "1:30.123", "q2": "1:29.456", "q3": "1:28.789"}
    """
    race = _race_obj(raw)
    if not race:
        return []
    rows: list[dict[str, Any]] = []
    for r in race.get("QualifyingResults", []):
        try:
            d = r.get("Driver") or {}
            con = r.get("Constructor") or {}
            rows.append({
                "position": int(r.get("position") or 99),
                "driver_code": d.get("code"),
                "driver_name": f"{d.get('givenName') or ''} {d.get('familyName') or ''}".strip(),
                "constructor": con.get("name"),
                "q1": r.get("Q1"),
                "q2": r.get("Q2"),
                "q3": r.get("Q3"),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_normalizer.bad_qualifying_row", error=str(exc))
    rows.sort(key=lambda r: r["position"])
    return rows


# ── Standings ──────────────────────────────────────────────────────────────


def normalize_driver_standings(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Driver championship snapshot. Returns::

        [{"position": 1, "driver_code": "ANT", "driver_name": "...",
          "constructor": "Mercedes", "points": 72, "wins": 2}]
    """
    lists = ((raw.get("MRData") or {}).get("StandingsTable") or {}).get("StandingsLists") or []
    if not lists:
        return []
    rows: list[dict[str, Any]] = []
    for st in lists[0].get("DriverStandings", []):
        try:
            d = st.get("Driver") or {}
            cons = st.get("Constructors") or [{}]
            con = cons[0] if cons else {}
            rows.append({
                "position": int(st.get("position") or 99),
                "driver_code": d.get("code") or "?",
                "driver_name": f"{d.get('givenName') or ''} {d.get('familyName') or ''}".strip(),
                "nationality": d.get("nationality"),
                "constructor": con.get("name") or "?",
                "points": float(st.get("points") or 0),
                "wins": int(st.get("wins") or 0),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_normalizer.bad_driver_standings_row", error=str(exc))
    rows.sort(key=lambda r: r["position"])
    return rows


def normalize_constructor_standings(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Constructor championship snapshot. Returns::

        [{"position": 1, "constructor": "Mercedes", "points": 135, "wins": 2}]
    """
    lists = ((raw.get("MRData") or {}).get("StandingsTable") or {}).get("StandingsLists") or []
    if not lists:
        return []
    rows: list[dict[str, Any]] = []
    for st in lists[0].get("ConstructorStandings", []):
        try:
            con = st.get("Constructor") or {}
            rows.append({
                "position": int(st.get("position") or 99),
                "constructor": con.get("name") or "?",
                "nationality": con.get("nationality"),
                "points": float(st.get("points") or 0),
                "wins": int(st.get("wins") or 0),
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("f1_normalizer.bad_constructor_standings_row", error=str(exc))
    rows.sort(key=lambda r: r["position"])
    return rows
