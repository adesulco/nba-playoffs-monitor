"""NBA preview context assembler.

Phase 1 ship #11. Mirrors nba_recap_context but for upcoming games
(status='scheduled'). The series state + prior-game scores carry
most of the article weight since there's no in-progress data yet.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import espn_nba, nba_normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


def _fmt_tipoff_wib(dt_utc: datetime | None) -> str:
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    wib = dt_utc.astimezone(_WIB)
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    day_name = days[wib.weekday()]
    return f"{day_name} {wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


def _format_series_block(series: dict[str, Any], header: dict[str, Any]) -> str:
    if not series:
        return "Series state tidak tersedia di sistem."
    lines = []
    if series.get("round"):
        lines.append(f"  Round: {series['round']}")
    if series.get("summary"):
        lines.append(f"  Status: {series['summary']}")
    current = series.get("current_game") or 1
    total = series.get("total", 7)
    lines.append(f"  Game number: {current} of {total}")
    return "\n".join(lines)


async def _format_prior_games_block(prior_game_ids: list[str]) -> str:
    """Fetch each prior game's summary and render the score line.

    Phase 1 ship #11: caps at 6 prior games (covers Game 1-6 in a
    7-game series). Each is one ESPN call — for a Game 5 preview
    that's 4 extra calls. Cheap, no caching needed.
    """
    if not prior_game_ids:
        return "Prior games tidak tersedia di sistem."
    lines = []
    for i, gid in enumerate(prior_game_ids[:6], start=1):
        try:
            raw = await espn_nba.fetch_game_summary(gid)
            h = nba_normalizer.normalize_game_header(raw)
            if h["away_score"] is None or h["home_score"] is None:
                continue
            winner = h["winner_abbr"] or "?"
            lines.append(
                f"  Game {i}: {h['away_abbr']} {h['away_score']} @ "
                f"{h['home_score']} {h['home_abbr']}  ({winner} W)"
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("nba_preview_context.prior_fetch_failed", game_id=gid, error=str(exc))
    return "\n".join(lines) if lines else "—"


async def build_context(game_id: int | str) -> dict[str, Any]:
    """Fetch + assemble the NBA preview context dict.

    For an upcoming game, the summary endpoint still returns header +
    series + standings. Prior-game scores in the same playoff series
    come from the series.events list — we fetch each one's header to
    get the actual score line.
    """
    raw = await espn_nba.fetch_game_summary(game_id)

    header = nba_normalizer.normalize_game_header(raw)
    series = nba_normalizer.normalize_series_state(raw)

    # Pull prior-game IDs from the series events list (the upcoming
    # game itself shouldn't be in this list, but if it is we filter
    # it out).
    upcoming = str(game_id)
    series_list = ((raw.get("header") or {}).get("competitions") or [{}])[0].get("series") or []
    playoff = next((s for s in series_list if s.get("type") == "playoff"), {})
    prior_ids = []
    for ev in (playoff.get("events") or []):
        eid = str(ev.get("id") or "")
        if eid and eid != upcoming:
            prior_ids.append(eid)

    prior_block = await _format_prior_games_block(prior_ids)

    ctx = {
        "league_name": "NBA Playoffs 2026",
        "tipoff_local": _fmt_tipoff_wib(header["tipoff_utc"]),
        "venue": header.get("venue") or "—",
        "game_id": header["game_id"],
        "status": header["status"],
        "home_team": header["home_team"],
        "home_abbr": header["home_abbr"],
        "away_team": header["away_team"],
        "away_abbr": header["away_abbr"],
        "series_block": _format_series_block(series, header) + "\n  Prior games:\n" + prior_block,
        "form_block": "(team season records / recent form not yet ingested in Phase 1 ship #11)",
        "broadcast": "NBA League Pass / Vidio",
        # Raw structures
        "_header": header,
        "_series": series,
    }

    log.info(
        "nba_preview_context.built",
        away=header["away_abbr"],
        home=header["home_abbr"],
        tipoff=ctx["tipoff_local"],
        prior_count=len(prior_ids),
    )

    return ctx
