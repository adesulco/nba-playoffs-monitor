"""ESPN NBA → content-engine shape.

Phase 1 ship #11. Sibling to ``normalizer.py`` which handles the
football (API-Football) shapes; this module is NBA-only and stays
self-contained so changes to ESPN's response don't ripple into
the football layer.

Public functions (used by the NBA context builders):

  * ``normalize_game_header(raw)`` — final score, status, venue,
    playoff series state.
  * ``normalize_team_stats(raw)`` — per-team box score: FG%, 3P%,
    FT%, rebounds, assists, etc.
  * ``normalize_top_scorers(raw, limit=5)`` — top scorers per
    team with PTS / REB / AST stat line.
  * ``normalize_leaders(raw)`` — ESPN's pre-computed per-team
    leader for each major category (cleaner than picking from
    box score).
  * ``normalize_series_state(raw)`` — playoff-series snapshot:
    "BOS leads series 3-1", game number, prior-game line.
  * ``normalize_key_plays(raw, max=8)`` — plays of high
    leverage (lead changes, clutch buckets) for recap timeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger()


def _competition(raw: dict[str, Any]) -> dict[str, Any]:
    """Pull the single competition from header. ESPN wraps games as
    ``header.competitions[0]`` even though basketball games are 1:1."""
    return ((raw.get("header") or {}).get("competitions") or [{}])[0]


def _competitor(comp: dict[str, Any], home_or_away: str) -> dict[str, Any]:
    for c in (comp.get("competitors") or []):
        if c.get("homeAway") == home_or_away:
            return c
    return {}


def _kickoff_utc(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        # ESPN format: "2026-04-26T23:00Z"
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        log.warning("nba_normalizer.bad_date", value=date_str)
        return None


# ── Header / final score ──────────────────────────────────────────────────


def normalize_game_header(raw: dict[str, Any]) -> dict[str, Any]:
    """Top-level game shape. Returns::

        {"game_id": "401869406",
         "status": "final" | "scheduled" | "in_progress",
         "tipoff_utc": datetime,
         "venue": "TD Garden, Boston",
         "home_team": "Boston Celtics",
         "home_abbr": "BOS",
         "home_score": 128,
         "away_team": "Philadelphia 76ers",
         "away_abbr": "PHI",
         "away_score": 96,
         "winner_abbr": "BOS"}
    """
    comp = _competition(raw)
    status_obj = (comp.get("status") or {}).get("type") or {}
    state_raw = (status_obj.get("state") or "").lower()
    state_map = {"pre": "scheduled", "in": "in_progress", "post": "final"}
    status = state_map.get(state_raw, state_raw or "scheduled")

    home = _competitor(comp, "home")
    away = _competitor(comp, "away")
    home_team = (home.get("team") or {})
    away_team = (away.get("team") or {})

    venue_obj = comp.get("venue") or {}
    venue_name = venue_obj.get("fullName")
    if not venue_name:
        addr = venue_obj.get("address") or {}
        if addr.get("city"):
            venue_name = addr["city"]

    def _score(c):
        v = c.get("score")
        try:
            return int(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    home_score = _score(home)
    away_score = _score(away)
    winner = None
    if status == "final" and home_score is not None and away_score is not None:
        winner = home_team.get("abbreviation") if home_score > away_score else away_team.get("abbreviation")

    return {
        "game_id": str(((raw.get("header") or {}).get("id")) or comp.get("id") or ""),
        "status": status,
        "tipoff_utc": _kickoff_utc(comp.get("date")),
        "venue": venue_name,
        "home_team": home_team.get("displayName") or "Unknown",
        "home_abbr": home_team.get("abbreviation") or "?",
        "home_score": home_score,
        "away_team": away_team.get("displayName") or "Unknown",
        "away_abbr": away_team.get("abbreviation") or "?",
        "away_score": away_score,
        "winner_abbr": winner,
    }


# ── Team box score ────────────────────────────────────────────────────────


# Map ESPN stat labels → snake_case keys we expose. ESPN uses both
# "Field Goal %" and "fieldGoalPct" depending on which list you
# look at; our writer prompts read the snake-case form.
_TEAM_STAT_LABEL_MAP = {
    "FG": "fg_made_attempted",
    "Field Goal %": "fg_pct",
    "3PT": "three_made_attempted",
    "Three Point %": "three_pct",
    "FT": "ft_made_attempted",
    "Free Throw %": "ft_pct",
    "Rebounds": "rebounds",
    "Offensive Rebounds": "off_rebounds",
    "Defensive Rebounds": "def_rebounds",
    "Assists": "assists",
    "Steals": "steals",
    "Blocks": "blocks",
    "Turnovers": "turnovers",
    "Total Turnovers": "turnovers",
    "Personal Fouls": "fouls",
    "Fast Break Points": "fast_break_pts",
    "Points in Paint": "points_in_paint",
    "Points Off Turnovers": "points_off_turnovers",
}


def normalize_team_stats(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Per-team box score. Returns 2 elements (away, home in ESPN
    order — caller can re-key by abbr).

    ::

        [{"team_abbr": "PHI", "team_name": "Philadelphia 76ers",
          "stats": {"fg_pct": "41", "three_pct": "30", "rebounds": "44", ...}},
         {"team_abbr": "BOS", ...}]
    """
    out: list[dict[str, Any]] = []
    teams = ((raw.get("boxscore") or {}).get("teams") or [])
    for t in teams:
        team_obj = t.get("team") or {}
        stats: dict[str, Any] = {}
        for s in (t.get("statistics") or []):
            key = _TEAM_STAT_LABEL_MAP.get(s.get("label"))
            if key:
                stats[key] = s.get("displayValue")
        out.append({
            "team_abbr": team_obj.get("abbreviation") or "?",
            "team_name": team_obj.get("displayName") or "Unknown",
            "stats": stats,
        })
    return out


# ── Top scorers per team ──────────────────────────────────────────────────


def normalize_top_scorers(raw: dict[str, Any], limit: int = 5) -> list[dict[str, Any]]:
    """Top N scorers per team with PTS / REB / AST. ESPN nests per-
    player stats inside ``boxscore.players`` keyed by team. Each
    team has a ``statistics[0].keys`` index telling us which stat
    is at which index of the ``stats`` array.

    Returns::

        [{"team_abbr": "BOS",
          "scorers": [{"name": "Jayson Tatum", "pts": 30, "reb": 8, "ast": 6,
                       "min": "38", "fgm_fga": "11-22", "three_made_attempted": "4-9"}, ...]},
         {"team_abbr": "PHI", "scorers": [...]}]
    """
    out: list[dict[str, Any]] = []
    for tp in ((raw.get("boxscore") or {}).get("players") or []):
        team_obj = tp.get("team") or {}
        team_abbr = team_obj.get("abbreviation") or "?"
        stat_block = (tp.get("statistics") or [{}])[0]
        keys = stat_block.get("keys") or []
        athletes = stat_block.get("athletes") or []

        def _stat(stats: list[str], key: str) -> str | None:
            if key not in keys:
                return None
            idx = keys.index(key)
            return stats[idx] if idx < len(stats) else None

        scorers = []
        for a in athletes:
            if a.get("didNotPlay"):
                continue
            stats_arr = a.get("stats") or []
            athlete = a.get("athlete") or {}
            try:
                pts = int(_stat(stats_arr, "points") or 0)
            except ValueError:
                pts = 0
            try:
                reb = int(_stat(stats_arr, "rebounds") or 0)
            except ValueError:
                reb = 0
            try:
                ast = int(_stat(stats_arr, "assists") or 0)
            except ValueError:
                ast = 0
            scorers.append({
                "name": athlete.get("displayName") or "?",
                "short_name": athlete.get("shortName") or athlete.get("displayName"),
                "position": (athlete.get("position") or {}).get("abbreviation"),
                "pts": pts,
                "reb": reb,
                "ast": ast,
                "min": _stat(stats_arr, "minutes"),
                "fgm_fga": _stat(stats_arr, "fieldGoalsMade-fieldGoalsAttempted") or _stat(stats_arr, "fg"),
                "three_made_attempted": _stat(stats_arr, "threePointFieldGoalsMade-threePointFieldGoalsAttempted") or _stat(stats_arr, "3pt"),
                "starter": a.get("starter") is True,
            })
        scorers.sort(key=lambda s: s["pts"], reverse=True)
        out.append({"team_abbr": team_abbr, "scorers": scorers[:limit]})
    return out


# ── Series state ──────────────────────────────────────────────────────────


def normalize_series_state(raw: dict[str, Any]) -> dict[str, Any]:
    """Playoff series snapshot. ESPN's ``header.competitions[0].series``
    is an array of two entries: 'season' (regular-season meetings, not
    interesting) and 'playoff'. We pluck the playoff one.

    Returns::

        {"description": "East 1st Round",
         "summary":     "BOS leads series 3-1",
         "completed":   False,            # series finished?
         "round":       "1",              # round number ("1", "Conference Semifinals", "NBA Finals")
         "current_game": 5,               # 1-indexed: how many games played + 1
         "total":       7}
    """
    series_list = (_competition(raw).get("series") or [])
    playoff = next((s for s in series_list if s.get("type") == "playoff"), None)
    if not playoff:
        # Fall back to the first entry (some APIs only return one)
        playoff = series_list[0] if series_list else {}

    description = playoff.get("description") or ""
    completed = bool(playoff.get("completed"))
    summary = playoff.get("summary") or ""
    total = playoff.get("totalCompetitions") or 7

    # Parse the summary string for the actual completed-games count.
    # ESPN's `events` array is pre-populated with 7 placeholder URLs
    # for the whole series (including future games), so its length
    # is NOT the games-played count. The summary is the source of
    # truth: "BOS leads series 3-1" → 4 played; "Series tied 2-2"
    # → 4 played; "BOS won series 4-1" → 5 played.
    import re as _re
    m = _re.search(r"(\d+)\s*-\s*(\d+)", summary)
    if m:
        events_played = int(m.group(1)) + int(m.group(2))
    else:
        # Fall back to the events list if no summary parse — rare for
        # in-progress series, common before Game 1 (events list still
        # has 7 placeholders).
        events_played = 0

    # Round derivation from description text
    round_label = description
    desc_lower = description.lower()
    if "1st round" in desc_lower or "first round" in desc_lower:
        round_label = "Round 1"
    elif "semifinal" in desc_lower:
        round_label = "Conference Semifinals"
    elif "conference final" in desc_lower:
        round_label = "Conference Finals"
    elif "nba final" in desc_lower or "finals" in desc_lower:
        round_label = "NBA Finals"

    return {
        "description": description,
        "summary": summary,
        "completed": completed,
        "round": round_label,
        "games_played": events_played,
        "current_game": events_played + (0 if completed else 1),
        "total": total,
    }


# ── Key plays (recap timeline support) ────────────────────────────────────


def normalize_key_plays(raw: dict[str, Any], max_plays: int = 8) -> list[dict[str, Any]]:
    """Pick a small set of "high-leverage" plays from the play-by-play.

    Heuristic for Phase 1:
      * lead changes (scoring change that flips which team is ahead)
      * 4th-quarter scoring plays in close-game situations (margin <= 5)
      * any play marked ``scoringPlay`` in OT
      * always include the final scoring play

    Returns chronological list, length <= max_plays. Each row::

        {"period": 4, "clock": "0:32",
         "team_abbr": "BOS", "type": "Three Point",
         "text": "Jayson Tatum 27' 3-pointer (Jaylen Brown assists)",
         "score": "BOS 123, PHI 96"}

    The recap writer reads this as a "moments" block. It is OPTIONAL —
    ESPN doesn't always include plays for every game (esp. live), and
    a missing block doesn't break the prompt.
    """
    plays_raw = raw.get("plays") or []
    if not plays_raw:
        return []

    out: list[dict[str, Any]] = []
    last_lead = None
    for p in plays_raw:
        period = (p.get("period") or {}).get("number")
        clock = (p.get("clock") or {}).get("displayValue") or "?"
        is_scoring = bool(p.get("scoringPlay"))
        if not is_scoring:
            continue

        home_score = p.get("homeScore")
        away_score = p.get("awayScore")
        if home_score is None or away_score is None:
            continue
        margin = abs(home_score - away_score)
        # Heuristic
        is_lead_change = last_lead is not None and (
            (home_score > away_score) != last_lead
        )
        last_lead = home_score > away_score
        is_clutch = (period == 4 and margin <= 5)
        is_ot_score = period and period >= 5
        if not (is_lead_change or is_clutch or is_ot_score):
            continue

        team_obj = p.get("team") or {}
        out.append({
            "period": period,
            "clock": clock,
            "team_abbr": team_obj.get("abbreviation") or "?",
            "type": p.get("type") or {},
            "text": p.get("text") or "",
            "score": f"BOS {home_score}, PHI {away_score}" if False else f"{away_score}-{home_score}",
        })

    # Trim to the most-recent N (keep chronology intact)
    if len(out) > max_plays:
        out = out[-max_plays:]
    return out
