"""NBA player profile context assembler.

Phase 2 ship #24. Single ESPN web-api call:
  * /common/v3/.../athletes/{id} → identity + team + season stats

The athlete_id is ESPN's numeric NBA athlete ID (e.g. 3917376
for Jaylen Brown). Discoverable via /teams/{id}/roster, which
the bulk script uses.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import espn_nba

log = structlog.get_logger()


# Stat name → human label for the prompt block. Order matters; we
# render in this order so the writer sees the most-relevant stats
# first and biases toward them.
_STAT_ORDER = [
    ("avgPoints", "PPG"),
    ("avgRebounds", "RPG"),
    ("avgAssists", "APG"),
    ("avgSteals", "SPG"),
    ("avgBlocks", "BPG"),
    ("fieldGoalPct", "FG%"),
    ("threePointFieldGoalPct", "3P%"),
    ("freeThrowPct", "FT%"),
    ("avgMinutes", "MPG"),
    ("avgTurnovers", "TPG"),
]


def _format_stats_block(stats: list[dict[str, Any]]) -> str:
    """Render the season-stat summary block."""
    if not stats:
        return "Statistik per pertandingan tidak tersedia di sistem."
    by_name = {s.get("name"): s for s in stats}
    lines = ["  Stat                 Value     Liga rank"]
    for name, label in _STAT_ORDER:
        s = by_name.get(name)
        if not s:
            continue
        val = s.get("displayValue") or "—"
        rank = s.get("rankDisplayValue") or "—"
        lines.append(f"  {label:<20} {val:<8}  {rank}")
    if len(lines) == 1:
        return "Statistik per pertandingan tidak tersedia di sistem."
    return "\n".join(lines)


async def build_context(athlete_id: int | str) -> dict[str, Any]:
    """Fetch + assemble NBA player profile context.

    `athlete_id` is ESPN's numeric NBA athlete id.
    """
    raw = await espn_nba.fetch_athlete(athlete_id)
    ath = raw.get("athlete") or {}
    if not ath:
        raise RuntimeError(f"ESPN returned no athlete for id={athlete_id}")

    team = ath.get("team") or {}
    college = ath.get("college") or {}
    college_name = college.get("name") if isinstance(college, dict) else (college or "")
    pos = ath.get("position") or {}
    pos_name = pos.get("displayName") if isinstance(pos, dict) else str(pos or "")
    pos_abbr = pos.get("abbreviation") if isinstance(pos, dict) else ""

    stats_summary = ath.get("statsSummary") or {}
    stats_list = stats_summary.get("statistics") or []

    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    full_name = ath.get("displayName") or ath.get("fullName") or "?"

    identity_lines = [f"  Nama: {full_name}"]
    age = ath.get("age")
    if age:
        identity_lines.append(f"  Umur: {age} tahun")
    bp = ath.get("displayBirthPlace") or ""
    if bp:
        identity_lines.append(f"  Tempat lahir: {bp}")
    height = ath.get("displayHeight") or ""
    weight = ath.get("displayWeight") or ""
    if height or weight:
        bits = []
        if height:
            bits.append(f"tinggi {height}")
        if weight:
            bits.append(f"berat {weight}")
        identity_lines.append(f"  Postur: {', '.join(bits)}")
    jersey = ath.get("jersey")
    if jersey:
        identity_lines.append(f"  Jersey: #{jersey}")
    if pos_name or pos_abbr:
        identity_lines.append(f"  Posisi: {pos_name}" + (f" ({pos_abbr})" if pos_abbr else ""))
    if college_name:
        identity_lines.append(f"  College: {college_name}")
    debut_year = ath.get("debutYear")
    if debut_year:
        identity_lines.append(f"  Debut NBA: {debut_year}")
    exp = ath.get("displayExperience")
    if exp:
        identity_lines.append(f"  Pengalaman: {exp}")
    draft = ath.get("displayDraft") or ""
    if draft:
        identity_lines.append(f"  Draft: {draft}")

    team_lines = []
    if team.get("displayName"):
        team_lines.append(f"  Tim saat ini: {team.get('displayName')}")
    if team.get("abbreviation"):
        team_lines.append(f"  Singkatan: {team.get('abbreviation')}")

    ctx = {
        "athlete_id": str(athlete_id),
        "athlete_name": full_name,
        "first_name": ath.get("firstName") or "",
        "last_name": ath.get("lastName") or "",
        "age": age,
        "birthplace": bp,
        "height": height,
        "weight": weight,
        "jersey": jersey,
        "position": pos_name,
        "position_abbr": pos_abbr,
        "team_name": team.get("displayName") or "",
        "team_abbr": team.get("abbreviation") or "",
        "college": college_name,
        "debut_year": debut_year,
        "experience": exp,
        "draft": draft,
        "as_of_id": as_of_id,
        "identity_block": "\n".join(identity_lines),
        "team_block": "\n".join(team_lines) if team_lines else "  Tim saat ini: tidak tersedia",
        "stats_block": _format_stats_block(stats_list),
        "_athlete_raw": ath,
        "_stats_raw": stats_list,
    }

    log.info(
        "nba_player_profile_context.built",
        athlete_id=athlete_id,
        athlete=full_name,
        team=team.get("displayName"),
    )
    return ctx
