"""NBA series-state context assembler.

Phase 2 ship #18a. Reads ESPN's `summary` for any game in the series
to get the playoff series snapshot, then fetches each prior game's
header for per-game scores. Same pattern as nba_preview_context's
prior-game block, but here ALL completed games matter (not just
"the prior round").
"""

from __future__ import annotations

import asyncio
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
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    wib = dt_utc.astimezone(_WIB)
    return f"{days[wib.weekday()]}, {wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


def _format_games_block(games: list[dict[str, Any]]) -> str:
    """Render per-game score lines, chronological."""
    if not games:
        return "Per-game scores tidak tersedia di sistem."
    lines = []
    for i, g in enumerate(games, start=1):
        if g.get("home_score") is None or g.get("away_score") is None:
            continue
        winner = g.get("winner_abbr") or "?"
        date_short = g["tipoff_utc"].astimezone(_WIB).strftime("%-d %B") if g.get("tipoff_utc") else "?"
        lines.append(
            f"  Game {i} ({date_short}): {g.get('away_abbr')} {g.get('away_score')} @ "
            f"{g.get('home_score')} {g.get('home_abbr')}  →  {winner} W"
        )
    return "\n".join(lines)


async def build_context(any_game_id_in_series: int | str) -> dict[str, Any]:
    """Build series-state context from ANY game id that's part of the
    series. The summary endpoint returns the full series.events list,
    so one game id is enough to bootstrap the whole series snapshot.
    """
    raw = await espn_nba.fetch_game_summary(any_game_id_in_series)
    series = nba_normalizer.normalize_series_state(raw)
    if not series:
        return {}

    # Pull the playoff entry's events list from the raw summary —
    # same logic as nba_preview_context but iterating ALL events.
    series_list = ((raw.get("header") or {}).get("competitions") or [{}])[0].get("series") or []
    playoff = next((s for s in series_list if s.get("type") == "playoff"), {})
    event_ids = [str(ev.get("id")) for ev in (playoff.get("events") or []) if ev.get("id")]

    # Identify both teams from the headerc — they participate in EVERY
    # series game, so any game's competitors will do.
    header = nba_normalizer.normalize_game_header(raw)

    # Fetch each game's header to render per-game scores.
    games: list[dict[str, Any]] = []
    next_game_meta: dict[str, Any] | None = None

    async def _safe_header(gid):
        try:
            r = await espn_nba.fetch_game_summary(gid)
            return nba_normalizer.normalize_game_header(r)
        except Exception as exc:  # noqa: BLE001
            log.warning("nba_series_context.game_header_failed", game_id=gid, error=str(exc))
            return None

    headers = await asyncio.gather(*[_safe_header(gid) for gid in event_ids])
    for h in headers:
        if not h:
            continue
        if h.get("status") == "final":
            games.append(h)
        elif h.get("status") in {"scheduled", "in_progress"} and next_game_meta is None:
            next_game_meta = h

    # Sort completed games chronologically
    games.sort(key=lambda g: g.get("tipoff_utc") or datetime.min.replace(tzinfo=timezone.utc))

    # Build next-game block
    next_block = ""
    if next_game_meta:
        next_block = (
            f"  Next: {next_game_meta.get('away_abbr')} @ {next_game_meta.get('home_abbr')} — "
            f"{_fmt_tipoff_wib(next_game_meta.get('tipoff_utc'))}, "
            f"{next_game_meta.get('venue') or 'venue tba'}"
        )

    ctx = {
        "league_name": "NBA Playoffs 2026",
        "round": series.get("round") or "Playoff Round",
        "series_summary": series.get("summary") or "—",
        "home_team": header.get("home_team"),
        "home_abbr": header.get("home_abbr"),
        "away_team": header.get("away_team"),
        "away_abbr": header.get("away_abbr"),
        "games_block": _format_games_block(games),
        "next_game_block": next_block or "(Tidak ada game selanjutnya — series mungkin sudah selesai.)",
        # Raw shapes
        "_series": series,
        "_games": games,
        "_next_game": next_game_meta,
        "_header": header,
    }
    log.info(
        "nba_series_context.built",
        round=ctx["round"],
        summary=ctx["series_summary"],
        games_played=len(games),
    )
    return ctx
