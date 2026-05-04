"""F1 driver profile context assembler.

Phase 2 ship #22. Two jolpica calls:
  * /{season}/driverStandings → identity + current championship state
  * /{season}/drivers/{id}/results → per-race results this season

The driver_id is jolpica's Ergast ID (e.g. "max_verstappen",
"hamilton", "leclerc"). It's stable across seasons.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import f1_jolpica

log = structlog.get_logger()


# Country / nationality → flag-code mapping for code-switching context
# (not used in the prompt directly; just a reference for the writer).
_NATIONALITY_TO_BAHASA = {
    "Dutch": "Belanda", "British": "Inggris", "Spanish": "Spanyol",
    "Monegasque": "Monako", "Australian": "Australia", "Mexican": "Meksiko",
    "Finnish": "Finlandia", "French": "Prancis", "German": "Jerman",
    "Italian": "Italia", "Japanese": "Jepang", "Canadian": "Kanada",
    "Thai": "Thailand", "Danish": "Denmark", "Argentine": "Argentina",
    "American": "Amerika Serikat", "Chinese": "Tiongkok",
    "Brazilian": "Brasil",
}


def _format_age(dob_iso: str) -> str | None:
    """Compute age in whole years from ISO DOB."""
    if not dob_iso:
        return None
    try:
        d = datetime.strptime(dob_iso, "%Y-%m-%d").date()
    except ValueError:
        return None
    today = datetime.now(timezone.utc).date()
    yrs = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    return str(yrs)


def _format_results_block(results_response: dict[str, Any]) -> str:
    """Render per-race results as a recent-form table."""
    races = (((results_response or {}).get("MRData") or {}).get("RaceTable") or {}).get("Races") or []
    if not races:
        return "Hasil per balapan tidak tersedia di sistem."
    lines = ["  Round  Race                          Pos  Pts  Status"]
    for r in races:
        round_num = r.get("round") or "?"
        race_name = (r.get("raceName") or "")[:28]
        results = r.get("Results") or []
        if not results:
            continue
        res = results[0]
        pos = res.get("position") or "?"
        pts = res.get("points") or "0"
        status = res.get("status") or ""
        # Truncate "+1 Lap" / DNF reasons to keep table tidy.
        if status and len(status) > 14:
            status = status[:14]
        lines.append(f"  {round_num:>5}  {race_name:<28}  {pos:>3}  {pts:>3}  {status}")
    if len(lines) == 1:
        return "Hasil per balapan tidak tersedia di sistem."
    return "\n".join(lines)


async def build_context(driver_id: str, season: int = 2026) -> dict[str, Any]:
    """Fetch + assemble F1 driver profile context.

    `driver_id` is jolpica's Ergast ID like "max_verstappen".
    """
    standings = await f1_jolpica.fetch_driver_standings(season=season)
    results = await f1_jolpica.fetch_driver_results(season=season, driver_id=driver_id)

    lists = (((standings or {}).get("MRData") or {}).get("StandingsTable") or {}).get("StandingsLists") or []
    if not lists:
        raise RuntimeError(f"jolpica returned no StandingsLists for season {season}")
    standings_rows = (lists[0] or {}).get("DriverStandings") or []
    me = next((r for r in standings_rows if (r.get("Driver") or {}).get("driverId") == driver_id), None)
    if not me:
        raise RuntimeError(f"Driver {driver_id!r} not in {season} standings")

    driver = me.get("Driver") or {}
    constructors = me.get("Constructors") or []
    cur_team = (constructors[-1] if constructors else {}) or {}

    full_name = f"{driver.get('givenName', '').strip()} {driver.get('familyName', '').strip()}".strip()
    nationality = driver.get("nationality") or ""
    nationality_id = _NATIONALITY_TO_BAHASA.get(nationality, nationality)
    code = driver.get("code") or ""
    permanent_number = driver.get("permanentNumber") or ""
    dob = driver.get("dateOfBirth") or ""
    age = _format_age(dob) or "?"

    pos = me.get("position") or "?"
    points = me.get("points") or "0"
    wins = me.get("wins") or "0"

    races_completed = len(((results or {}).get("MRData") or {}).get("RaceTable", {}).get("Races", []) or [])

    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    identity_lines = [
        f"  Nama: {full_name}",
        f"  Code: {code} (#{permanent_number})" if permanent_number else f"  Code: {code}",
        f"  Umur: {age} tahun (lahir {dob})" if dob else f"  Umur: {age} tahun",
        f"  Kebangsaan: {nationality_id} ({nationality})" if nationality_id != nationality else f"  Kebangsaan: {nationality}",
        f"  Tim saat ini: {cur_team.get('name') or '?'}",
    ]
    season_lines = [
        f"  Posisi klasemen: P{pos} ({points} poin)",
        f"  Kemenangan musim ini: {wins}",
        f"  Balapan yang sudah dijalani: {races_completed}",
    ]

    ctx = {
        "driver_id": driver_id,
        "driver_name": full_name,
        "driver_code": code,
        "driver_number": permanent_number,
        "nationality": nationality,
        "nationality_id": nationality_id,
        "dob": dob,
        "age": age,
        "current_team": cur_team.get("name") or "",
        "current_team_id": cur_team.get("constructorId") or "",
        "championship_pos": pos,
        "championship_points": points,
        "season_wins": wins,
        "season": season,
        "season_label": str(season),
        "as_of_id": as_of_id,
        "identity_block": "\n".join(identity_lines),
        "season_block": "\n".join(season_lines),
        "results_block": _format_results_block(results),
        "_standings_row": me,
        "_results_raw": results,
    }

    log.info(
        "f1_driver_profile_context.built",
        driver_id=driver_id,
        driver=full_name,
        team=cur_team.get("name"),
        season=season,
    )
    return ctx
