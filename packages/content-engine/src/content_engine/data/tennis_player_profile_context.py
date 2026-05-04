"""Tennis player profile context assembler.

Phase 2 ship #22. Two ESPN calls:
  * /tennis/{tour}/rankings → current ranking + points + trend
  * core API /athletes/{id} → bio (DOB, birthplace, handedness)

The athlete_id is ESPN's tennis athlete ID (e.g. 3623 = Sinner).
Tour ('atp' / 'wta') is required since it changes both ranking
context and the athlete endpoint.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import espn_tennis

log = structlog.get_logger()


def _format_age(dob_iso: str) -> str | None:
    """Compute age from ISO date (handles 'YYYY-MM-DDTHH:MMZ' too)."""
    if not dob_iso:
        return None
    # Some core-API DOBs come as '2001-08-16T07:00Z' — strip time.
    date_part = dob_iso.split("T")[0]
    try:
        d = datetime.strptime(date_part, "%Y-%m-%d").date()
    except ValueError:
        return None
    today = datetime.now(timezone.utc).date()
    yrs = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    return str(yrs)


def _find_in_rankings(rankings_response: dict[str, Any], athlete_id: int | str) -> dict[str, Any] | None:
    """Return the ranking row for `athlete_id`, or None."""
    aid = str(athlete_id)
    for ranking in (rankings_response or {}).get("rankings", []):
        for row in ranking.get("ranks", []):
            ath = row.get("athlete") or {}
            if str(ath.get("id")) == aid:
                return row
    return None


async def build_context(athlete_id: int | str, tour: str = "atp") -> dict[str, Any]:
    """Fetch + assemble tennis player profile context.

    `athlete_id` is ESPN's numeric tennis athlete id.
    `tour` is 'atp' or 'wta'.
    """
    if tour not in {"atp", "wta"}:
        raise ValueError(f"tour must be 'atp' or 'wta', got {tour!r}")

    rankings = await espn_tennis.fetch_rankings(tour=tour)
    bio = await espn_tennis.fetch_athlete(athlete_id, tour=tour)

    rank_row = _find_in_rankings(rankings, athlete_id)
    if rank_row is None:
        log.warning("tennis_player_profile_context.not_in_top_150", athlete_id=athlete_id, tour=tour)

    full_name = bio.get("fullName") or bio.get("displayName") or "?"
    first = bio.get("firstName") or ""
    last = bio.get("lastName") or ""
    age = _format_age(bio.get("dateOfBirth") or "")
    dob_part = (bio.get("dateOfBirth") or "").split("T")[0]
    bp = bio.get("birthPlace") or {}
    birthplace = bp.get("summary") or ""
    hand = bio.get("hand") or ""
    height = bio.get("displayHeight") or ""
    weight = bio.get("displayWeight") or ""
    debut_year = bio.get("debutYear")
    active = bio.get("active")

    if rank_row is not None:
        cur_rank = rank_row.get("current")
        prev_rank = rank_row.get("previous")
        points = rank_row.get("points")
        trend = rank_row.get("trend") or ""
    else:
        cur_rank = None
        prev_rank = None
        points = None
        trend = ""

    update_iso = (rankings.get("rankings", [{}])[0] or {}).get("update") if rankings.get("rankings") else None

    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    identity_lines = [f"  Nama: {full_name}"]
    if dob_part:
        identity_lines.append(f"  Lahir: {dob_part}" + (f" (umur {age} tahun)" if age else ""))
    if birthplace:
        identity_lines.append(f"  Tempat lahir: {birthplace}")
    if hand:
        identity_lines.append(f"  Tangan: {hand}")
    if height or weight:
        bits = []
        if height:
            bits.append(f"tinggi {height}")
        if weight:
            bits.append(f"berat {weight}")
        identity_lines.append(f"  Postur: {', '.join(bits)}")
    if debut_year:
        identity_lines.append(f"  Debut profesional: {debut_year}")

    if cur_rank is not None:
        ranking_lines = [
            f"  Tour: {tour.upper()}",
            f"  Peringkat saat ini: {cur_rank}",
            f"  Peringkat sebelumnya: {prev_rank}" if prev_rank else f"  Peringkat sebelumnya: —",
            f"  Poin: {points}",
        ]
        if trend and trend != "-":
            ranking_lines.append(f"  Trend: {trend}")
    else:
        ranking_lines = [
            f"  Tour: {tour.upper()}",
            "  Peringkat: di luar Top 150 ESPN saat ini",
        ]

    if update_iso:
        ranking_lines.append(f"  Data ranking per: {update_iso}")

    ctx = {
        "athlete_id": str(athlete_id),
        "athlete_name": full_name,
        "first_name": first,
        "last_name": last,
        "age": age,
        "dob": dob_part,
        "birthplace": birthplace,
        "hand": hand,
        "height": height,
        "weight": weight,
        "debut_year": debut_year,
        "active": active,
        "tour": tour,
        "current_rank": cur_rank,
        "previous_rank": prev_rank,
        "points": points,
        "trend": trend,
        "as_of_id": as_of_id,
        "rankings_update_iso": update_iso,
        "identity_block": "\n".join(identity_lines),
        "ranking_block": "\n".join(ranking_lines),
        "_bio_raw": bio,
        "_rank_row": rank_row,
    }

    log.info(
        "tennis_player_profile_context.built",
        athlete_id=athlete_id,
        athlete=full_name,
        tour=tour,
        current_rank=cur_rank,
    )
    return ctx
