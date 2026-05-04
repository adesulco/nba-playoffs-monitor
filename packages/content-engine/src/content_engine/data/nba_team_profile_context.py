"""NBA team profile context assembler.

Phase 2 ship #21. Pulls ESPN's ``/teams/{id}`` and
``/teams/{id}/roster`` endpoints and renders the data into the
prompt blocks the profile writer expects.

Profiles are EVERGREEN — they're meant to remain useful months
after generation. So the context emphasizes:

  * stable team identity (name, location, conference, division)
  * the current season as a snapshot ("season 2025-26: 56-26,
    seed 2") with explicit dating so future readers know when
    this was written
  * key players from the current roster (no specific game stats —
    those rot fast)

Things we DON'T include because they fabricate or rot fast:
  * championship counts (ESPN's public endpoints don't give us a
    clean franchise titles list — would need scraping wikipedia or
    a different feed; deferring to a v2 ship)
  * historical eras / coach legends
  * specific playoff series state (that's the recap/preview's job)

Per CLAUDE.md non-negotiable rule #6: no fact gets fabricated.
The agent will see only what's in the input data block.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

from content_engine.data import espn_nba

log = structlog.get_logger()


# Static map of ESPN groups.id (division id) → human label. ESPN's
# group endpoint returns these but for a static six-division league
# it's faster to hard-code than fetch.
_DIVISION_NAMES = {
    "1": "Atlantic", "2": "Central", "3": "Southeast",
    "4": "Northwest", "5": "Pacific", "6": "Southwest",
}
# Conference: parent.id 5 = Eastern, parent.id 6 = Western.
_CONFERENCE_NAMES = {
    "5": "Eastern Conference",
    "6": "Western Conference",
}


def _stat(item: dict[str, Any], name: str) -> Any:
    """Pluck a named stat value out of an ESPN record item."""
    for s in item.get("stats", []):
        if s.get("name") == name:
            return s.get("value")
    return None


def _format_record_block(team: dict[str, Any]) -> str:
    """Render Overall / Home / Road records as a clean block."""
    items = (team.get("record") or {}).get("items") or []
    if not items:
        return "Record tidak tersedia di sistem."
    lines = []
    for item in items:
        desc = item.get("description") or item.get("type") or "Record"
        wins = _stat(item, "wins")
        losses = _stat(item, "losses")
        win_pct = _stat(item, "winPercent")
        if wins is None and losses is None:
            continue
        line = f"  {desc}: {int(wins or 0)}-{int(losses or 0)}"
        if win_pct is not None:
            line += f" ({float(win_pct):.3f})"
        lines.append(line)
        # Only show extras for total record — keeps block compact.
        if (item.get("type") == "total"):
            apg_for = _stat(item, "avgPointsFor")
            apg_against = _stat(item, "avgPointsAgainst")
            seed = _stat(item, "playoffSeed")
            extras = []
            if apg_for is not None and apg_against is not None:
                extras.append(f"avg {float(apg_for):.1f} PPG, allow {float(apg_against):.1f}")
            if seed is not None and float(seed) > 0:
                extras.append(f"seed {int(seed)}")
            if extras:
                lines.append(f"    ({', '.join(extras)})")
    return "\n".join(lines) if lines else "Record tidak tersedia di sistem."


def _format_roster_block(athletes: list[dict[str, Any]]) -> str:
    """Render the active roster — first 12 athletes only.

    We intentionally don't pick "key players" here because there are
    no per-player stats in the roster endpoint. The agent will pick
    1-3 players to highlight from the list based on jersey number,
    experience, or position diversity. This keeps the data layer
    grounding-safe — we surface what ESPN gave us, prompt does the
    selection.
    """
    if not athletes:
        return "Roster tidak tersedia di sistem."
    lines = ["  Pos  #   Player                          Age  Exp  College/Notes"]
    for a in athletes[:14]:
        name = a.get("displayName") or a.get("fullName") or "?"
        pos = a.get("position")
        if isinstance(pos, dict):
            pos_abbr = pos.get("abbreviation") or pos.get("displayName") or "?"
        elif isinstance(pos, str):
            pos_abbr = pos[:3].upper() if pos else "?"
        else:
            pos_abbr = "?"
        jersey = a.get("jersey") or "—"
        age = a.get("age") or "—"
        exp_obj = a.get("experience")
        if isinstance(exp_obj, dict):
            exp_yrs = exp_obj.get("years")
            exp = f"{exp_yrs}y" if exp_yrs is not None else "—"
        else:
            exp = "—"
        college = a.get("college")
        if isinstance(college, dict):
            college_name = college.get("name") or college.get("shortName") or ""
        else:
            college_name = college or ""
        lines.append(
            f"  {pos_abbr:<4} {str(jersey):<3} {name[:32]:<32} {str(age):<4} {exp:<4} {college_name[:18]}"
        )
    if len(athletes) > 14:
        lines.append(f"  ... +{len(athletes) - 14} more on roster")
    return "\n".join(lines)


def _format_next_event_block(team: dict[str, Any]) -> str:
    """If ESPN has a next-event entry, surface its tipoff date.

    Profiles are evergreen, so we only mention the next game if it's
    within ~7 days — past that horizon the line ages poorly. Keep
    soft; agent decides whether to include it.
    """
    events = team.get("nextEvent") or []
    if not events:
        return "(no upcoming game in feed)"
    e = events[0]
    name = e.get("name") or e.get("shortName") or "next game"
    date_str = e.get("date") or ""
    return f"  {name} on {date_str}"


def _conference_division(team: dict[str, Any]) -> tuple[str, str]:
    """Resolve conference + division names from team.groups."""
    g = team.get("groups") or {}
    div_id = str(g.get("id") or "")
    parent_id = str((g.get("parent") or {}).get("id") or "")
    division = _DIVISION_NAMES.get(div_id, "")
    conference = _CONFERENCE_NAMES.get(parent_id, "")
    return conference, division


async def build_context(team_id: int | str) -> dict[str, Any]:
    """Fetch + assemble the NBA team profile context.

    Two ESPN calls (team detail + roster). Same shape as recap/
    preview context: prose-friendly text blocks for the agent +
    raw structures for downstream (slug builder, frontmatter).
    """
    detail = await espn_nba.fetch_team(team_id)
    roster_raw = await espn_nba.fetch_team_roster(team_id)

    team = detail.get("team") or {}
    if not team:
        raise RuntimeError(f"ESPN returned no team for id={team_id}")

    athletes = roster_raw.get("athletes") or []
    season = roster_raw.get("season") or {}
    season_year = season.get("year") or datetime.now(timezone.utc).year
    # ESPN gives season.year=2026 for the 2025-26 NBA season because
    # the playoffs spill into 2026. The display label users expect is
    # "2025-26". Same convention we use elsewhere in the codebase.
    season_label = f"{season_year - 1}-{str(season_year)[-2:]}"

    conference, division = _conference_division(team)
    coach_obj = roster_raw.get("coach") or []
    head_coach = ""
    if isinstance(coach_obj, list) and coach_obj:
        c0 = coach_obj[0]
        if isinstance(c0, dict):
            first = c0.get("firstName") or ""
            last = c0.get("lastName") or ""
            head_coach = f"{first} {last}".strip()

    # Generated-at date in WIB so the article can timestamp itself
    # naturally ("data per 28 April 2026").
    months_id = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    now = datetime.now(timezone.utc)
    as_of_id = f"{now.day} {months_id[now.month]} {now.year}"

    ctx = {
        "team_id": str(team.get("id") or team_id),
        "team_slug": team.get("slug") or "",
        "team_name": team.get("displayName") or team.get("name") or "",
        "team_short": team.get("shortDisplayName") or team.get("name") or "",
        "team_location": team.get("location") or "",
        "team_abbr": team.get("abbreviation") or "",
        "color_primary": team.get("color"),
        "color_alt": team.get("alternateColor"),
        "conference": conference,
        "division": division,
        "standing_summary": team.get("standingSummary") or "",
        "head_coach": head_coach,
        "season_label": season_label,
        "as_of_id": as_of_id,
        "record_block": _format_record_block(team),
        "roster_block": _format_roster_block(athletes),
        "next_event_block": _format_next_event_block(team),
        "_team_raw": team,
        "_athletes_raw": athletes,
        "_athlete_names": [a.get("displayName") for a in athletes if a.get("displayName")],
        "_record_items": (team.get("record") or {}).get("items") or [],
    }

    log.info(
        "nba_team_profile_context.built",
        team_id=team.get("id"),
        team=team.get("displayName"),
        roster_size=len(athletes),
        conference=conference,
        division=division,
    )
    return ctx
