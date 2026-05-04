"""ESPN tennis → content-engine shape.

Phase 1 ship #13. Strips ESPN's nested envelopes for tennis rankings
+ active-tournament metadata.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger()


def _parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def normalize_rankings(raw: dict[str, Any], limit: int = 30) -> dict[str, Any]:
    """Top-N singles rankings + week-over-week movement.

    Returns::

        {"tour": "atp",
         "updated_utc": datetime,
         "rankings": [
            {"rank": 1, "previous": 1, "movement": 0,
             "points": 13350, "athlete_name": "Jannik Sinner",
             "athlete_short": "J. Sinner",
             "country": "Italy", "country_code": "ITA"},
            ...
         ]}

    `movement` = previous - current (positive = climbed, negative = dropped).
    """
    rankings_list = raw.get("rankings") or []
    if not rankings_list:
        return {"tour": None, "updated_utc": None, "rankings": []}

    r0 = rankings_list[0]
    tour_id = (r0.get("type") or "").lower()  # "atp" or "wta"
    updated_utc = _parse_iso(r0.get("update"))

    out_rows: list[dict[str, Any]] = []
    for r in (r0.get("ranks") or [])[:limit]:
        try:
            ath = r.get("athlete") or {}
            # `flag` field on athlete is the FLAG IMAGE URL (string).
            # Country name lives in `flagAltText` ("Italy"). Country code
            # is parseable from the flag-image URL ("…/ita.png" → "ITA").
            flag_url = ath.get("flag") or ""
            country_name = ath.get("flagAltText") or ath.get("citizenshipCountry") or None
            country_code = None
            if flag_url and isinstance(flag_url, str) and flag_url.endswith(".png"):
                country_code = flag_url.rsplit("/", 1)[-1].rsplit(".", 1)[0].upper()
            cur = int(r.get("current") or 0)
            prev = int(r.get("previous") or 0) if r.get("previous") is not None else None
            movement = (prev - cur) if (prev is not None and cur > 0) else 0
            out_rows.append({
                "rank": cur,
                "previous": prev,
                "movement": movement,
                "points": int(float(r.get("points") or 0)),
                "athlete_name": ath.get("displayName") or "?",
                "athlete_short": ath.get("shortname") or ath.get("displayName"),
                "country": country_name,
                "country_code": country_code,
            })
        except Exception as exc:  # noqa: BLE001
            log.warning("tennis_normalizer.bad_rank_row", error=str(exc))
    return {
        "tour": tour_id,
        "updated_utc": updated_utc,
        "rankings": out_rows,
    }


def find_match_in_scoreboard(raw: dict[str, Any], match_id: int | str) -> dict[str, Any] | None:
    """Walk scoreboard.events[].groupings[].competitions[] for the match
    with the given competition id. Returns the raw competition dict +
    its tournament name, or None.

    Phase 2 ship #17e — used by tennis match recap context to locate
    the match without a separate /summary endpoint (ESPN tennis doesn't
    expose match-level summaries, only the scoreboard envelope).
    """
    target = str(match_id)
    for ev in raw.get("events") or []:
        tournament_name = ev.get("name") or "Unknown Tournament"
        venue = (ev.get("venue") or {}).get("fullName")
        for grouping in ev.get("groupings") or []:
            for comp in grouping.get("competitions") or []:
                if str(comp.get("id")) == target:
                    return {
                        "competition": comp,
                        "tournament_name": tournament_name,
                        "venue": venue,
                    }
    return None


def normalize_match(raw_comp: dict[str, Any]) -> dict[str, Any]:
    """Extract a single tennis match into the writer-friendly shape.

    Returns::

        {"match_id": "176716",
         "status": "final" | "in_progress" | "scheduled",
         "round": "Round of 32",
         "format": "best of 3" | "best of 5",
         "match_date_utc": datetime,
         "p1": {"name": "Jannik Sinner", "country": "Italy",
                "winner": True, "sets_won": 2,
                "set_scores": [(6, 4), (7, 6)]},
         "p2": {"name": "Carlos Alcaraz", ...},
         "winner_name": "Jannik Sinner",
         "duration_minutes": None}
    """
    comp = raw_comp
    status_obj = (comp.get("status") or {}).get("type") or {}
    state_raw = (status_obj.get("state") or "").lower()
    state_map = {"pre": "scheduled", "in": "in_progress", "post": "final"}
    status = state_map.get(state_raw, state_raw or "scheduled")

    competitors = comp.get("competitors") or []
    if len(competitors) < 2:
        return {}

    def _player(c: dict[str, Any]) -> dict[str, Any]:
        ath = c.get("athlete") or {}
        # ESPN tennis match endpoint returns `flag` as a DICT
        # ({href, alt, rel}) here, not a string like the rankings
        # endpoint does. Country code is in `alt` ("USA" / "ITA"),
        # human name in `flagAltText` (often null on qualifying
        # matches). Fall back to the ISO code when name missing —
        # better than empty.
        flag = ath.get("flag")
        country_code = None
        country = ath.get("flagAltText")
        if isinstance(flag, dict):
            country_code = (flag.get("alt") or "").upper() or None
            href = flag.get("href") or ""
            if not country_code and isinstance(href, str) and href.endswith(".png"):
                country_code = href.rsplit("/", 1)[-1].rsplit(".", 1)[0].upper()
        elif isinstance(flag, str) and flag.endswith(".png"):
            country_code = flag.rsplit("/", 1)[-1].rsplit(".", 1)[0].upper()
        if not country and country_code:
            # Use the ISO code as the country label when ESPN didn't
            # supply a full name (common on qualifying matches).
            country = country_code
        linescores = c.get("linescores") or []
        set_scores: list[int] = []
        sets_won = 0
        for ls in linescores:
            try:
                v = int(ls.get("value") or 0)
            except (TypeError, ValueError):
                v = 0
            set_scores.append(v)
            if ls.get("winner"):
                sets_won += 1
        return {
            "name": ath.get("displayName") or "?",
            "short_name": ath.get("shortname") or ath.get("displayName"),
            "country": country,
            "country_code": country_code,
            "winner": bool(c.get("winner")),
            "sets_won": sets_won,
            "set_scores": set_scores,
        }

    p1 = _player(competitors[0])
    p2 = _player(competitors[1])

    # Round label often lives in `comp.round.displayName` or `notes[0].text`
    round_label = None
    round_obj = comp.get("round") or {}
    if isinstance(round_obj, dict):
        round_label = round_obj.get("displayName") or round_obj.get("name")
    if not round_label:
        for note in (comp.get("notes") or []):
            if note.get("type") == "event":
                round_label = note.get("headline") or note.get("text")
                break

    # Format: ESPN's `format.regulation.periods` is unreliable —
    # returns 5 even for qualifying matches that are clearly BO3.
    # Better heuristic: derive from the round + a player's set count.
    # Qualifying / WTA / non-Grand-Slam → BO3. Men's main-draw at a
    # Grand Slam → BO5. Without an authoritative source we leave the
    # field as None and let the prompt skip the format claim.
    match_format = None

    match_date_utc = None
    date_str = comp.get("date")
    if date_str:
        try:
            from datetime import datetime, timezone as _tz
            if date_str.endswith("Z"):
                date_str = date_str[:-1] + "+00:00"
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_tz.utc)
            match_date_utc = dt
        except Exception:  # noqa: BLE001
            pass

    winner_name = p1["name"] if p1["winner"] else (p2["name"] if p2["winner"] else None)

    return {
        "match_id": str(comp.get("id")),
        "status": status,
        "round": round_label,
        "format": match_format,
        "match_date_utc": match_date_utc,
        "p1": p1,
        "p2": p2,
        "winner_name": winner_name,
    }


def normalize_active_tournament(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Pull the currently-active tournament from the scoreboard.

    Returns minimal metadata::

        {"id": "413-2026",
         "name": "Mutua Madrid Open",
         "short_name": "Madrid Open",
         "start_utc": datetime,
         "end_utc": datetime,
         "venue": "Caja Magica, Madrid",
         "status": "in_progress" | "final" | "scheduled",
         "previous_winners": [{"year": 2025, "winner": "Jannik Sinner"}, ...]}

    Returns None if no event in the scoreboard.
    """
    events = raw.get("events") or []
    if not events:
        return None
    ev = events[0]

    venue_obj = ev.get("venue") or {}
    venue_name = venue_obj.get("fullName")
    if not venue_name:
        addr = venue_obj.get("address") or {}
        venue_name = addr.get("city")

    status_obj = (ev.get("status") or {}).get("type") or {}
    state_raw = (status_obj.get("state") or "").lower()
    state_map = {"pre": "scheduled", "in": "in_progress", "post": "final"}
    status = state_map.get(state_raw, state_raw or "in_progress")

    previous_winners = []
    for pw in (ev.get("previousWinners") or [])[:5]:
        previous_winners.append({
            "year": pw.get("year"),
            "winner": pw.get("displayName") or (pw.get("athlete") or {}).get("displayName"),
        })

    return {
        "id": ev.get("id"),
        "name": ev.get("name") or "Unknown Tournament",
        "short_name": ev.get("shortName") or ev.get("name"),
        "start_utc": _parse_iso(ev.get("date")),
        "end_utc": _parse_iso(ev.get("endDate")),
        "venue": venue_name,
        "status": status,
        "previous_winners": previous_winners,
    }
