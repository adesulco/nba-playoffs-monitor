"""Recap context assembler — builds the user-message dict for the
recap writer agent from a finished fixture's events + lineups + stats.

Phase 1 ship #3. Three API-Football endpoints feed the writer's
context block; this module fetches them in parallel, normalizes,
and pre-formats the timeline / stats / lineups into the markdown
strings the writer reads literally.

Why pre-format here and not in the agent: the writer prompt is
tighter when it sees pre-rendered prose-friendly blocks rather than
raw JSON. Less translation overhead = less hallucination surface.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import api_football, normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


_LEAGUE_LABEL = {
    "epl": "Liga Inggris 2025-26",
    "liga-1-id": "Super League Indonesia 2025-26",
}

_BROADCAST = {
    "epl": "Vidio, beIN Sports",
    "liga-1-id": "Vidio, Indosiar, MNCTV",
}


def _fmt_kickoff_wib(dt_utc: datetime) -> str:
    """Match the preview-context format for consistency."""
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    wib = dt_utc.astimezone(_WIB)
    return f"{wib.day} {months[wib.month]} {wib.year}, {wib.strftime('%H.%M')} WIB"


def _format_events_block(events: list[dict[str, Any]]) -> str:
    """Pre-render the events list into a chronological prose-friendly
    timeline that the writer can read literally.

    Output shape (one line per event)::

        19'  [Crystal Palace] YELLOW CARD — Daniel Muñoz
        24'  [Liverpool]      VAR — Penalty cancelled (Mohamed Salah)
        35'  [Liverpool]      GOAL — A. Isak (assist: A. Mac Allister)
        ...

    Lower-cased event types from the normalizer get human labels here.
    """
    if not events:
        return "Timeline events tidak tersedia di sistem."

    type_label = {
        "goal": "GOAL",
        "card": "CARD",
        "subst": "SUBSTITUTION",
        "var": "VAR",
    }
    lines: list[str] = []
    for ev in events:
        m = ev.get("minute")
        extra = ev.get("extra")
        clock = f"{m}+{extra}'" if extra else f"{m}'"
        team = ev.get("team") or "?"
        kind = type_label.get(ev.get("type") or "", (ev.get("type") or "EVENT").upper())
        detail = ev.get("detail") or ""
        player = ev.get("player") or "(unknown)"
        assist = ev.get("assist")

        # Card type lives in `detail` ("Yellow Card" / "Red Card")
        if kind == "CARD":
            label = detail.upper() or "CARD"
            lines.append(f"  {clock:>5}  [{team}] {label} — {player}")
            continue

        # Subs: detail is "Substitution N"; player is the OUTGOING player,
        # assist field actually contains the INCOMING player name (API-
        # Football quirk). Rephrase so it reads naturally.
        if kind == "SUBSTITUTION":
            in_player = assist or "(unknown)"
            lines.append(f"  {clock:>5}  [{team}] SUB — {player} OUT, {in_player} IN")
            continue

        # Goals + VAR: include the detail (e.g. "Normal Goal", "Penalty",
        # "Penalty cancelled", "Own Goal") and assist where present.
        suffix = ""
        if assist:
            suffix = f" (assist: {assist})"
        lines.append(f"  {clock:>5}  [{team}] {kind} — {detail or player} — {player}{suffix}")
    return "\n".join(lines)


def _format_stats_block(stats: list[dict[str, Any]]) -> str:
    """Render team stat comparison as a side-by-side block.

    Shape::

        STAT                  Liverpool     Crystal Palace
        Possession            53%           47%
        Total shots           9             14
        Shots on target       3             7
        ...

    Stats present for one side but missing the other (rare API-Football
    edge case) get an em-dash. Voice polish converts those to commas
    pre-publish, but the recap agent rarely echoes the block verbatim
    so this is mostly for the agent's reference.
    """
    if not stats or len(stats) != 2:
        return "Team statistics tidak tersedia di sistem."

    home, away = stats[0], stats[1]
    rows: list[str] = []
    # Iterate over a curated order — the writer references these in
    # rough order of importance (possession, shots, shots-on-target,
    # xG, then the rest).
    order = [
        ("possession", "Possession"),
        ("total_shots", "Total shots"),
        ("shots_on_target", "Shots on target"),
        ("shots_off_target", "Shots off target"),
        ("shots_in_box", "Shots in box"),
        ("blocked_shots", "Blocked shots"),
        ("xg", "Expected goals (xG)"),
        ("corners", "Corners"),
        ("offsides", "Offsides"),
        ("fouls", "Fouls"),
        ("yellow_cards", "Yellow cards"),
        ("red_cards", "Red cards"),
        ("saves", "GK saves"),
        ("total_passes", "Total passes"),
        ("passes_accurate", "Passes accurate"),
        ("passes_pct", "Passes %"),
    ]
    home_label = home.get("team") or "Home"
    away_label = away.get("team") or "Away"
    rows.append(f"  {'STAT':<22} {home_label:<22} {away_label}")
    for key, label in order:
        h = home["stats"].get(key)
        a = away["stats"].get(key)
        if h is None and a is None:
            continue
        rows.append(f"  {label:<22} {str(h or '-'):<22} {str(a or '-')}")
    return "\n".join(rows)


def _format_lineups_block(lineups: list[dict[str, Any]]) -> str:
    """Render lineups as a compact block: formation + coach + starters.

    The writer rarely lists all 11 players; the block is here so the
    agent can cite formation + coach without inferring from training
    data, and so it can name a substitute who came on for a key event.
    """
    if not lineups:
        return "Lineups tidak tersedia di sistem."

    chunks: list[str] = []
    for team in lineups:
        name = team.get("team") or "Unknown"
        formation = team.get("formation") or "(unknown formation)"
        coach = team.get("coach") or "(coach unknown)"
        chunks.append(f"  {name} ({formation}) — Coach: {coach}")
        starters = ", ".join(p.get("name") or "?" for p in team.get("start_xi") or [])
        chunks.append(f"    Start XI: {starters}")
        if team.get("subs"):
            subs = ", ".join(p.get("name") or "?" for p in team.get("subs") or [])
            chunks.append(f"    Bench: {subs}")
        chunks.append("")  # blank line between teams
    return "\n".join(chunks).rstrip()


async def build_context(fx: dict[str, Any]) -> dict[str, Any]:
    """Assemble a full recap-writer context dict from a normalized fixture.

    ``fx`` is a row from ``normalizer.normalize_epl_fixtures`` (or
    Liga 1 equivalent) where ``status == "final"``. Pulls events +
    lineups + stats in parallel, normalizes, pre-formats the blocks,
    returns the dict the recap agent expects.
    """
    league_id = fx.get("league_id") or "epl"
    fixture_id = fx["source_fixture_id"]

    # Three API-Football calls in parallel. Total ~150ms over local
    # network when the proxy cache is warm. Soft-fail individually —
    # if events fails we still get lineups + stats (the writer prompt
    # tolerates partial data per CLAUDE.md rule #6 "honest gap" stance).
    async def _safe(coro, label):
        try:
            return await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("recap_context.fetch_failed", label=label, error=str(exc))
            return {}

    raw_events, raw_lineups, raw_stats = await asyncio.gather(
        _safe(api_football.fetch_fixture_events(fixture_id), "events"),
        _safe(api_football.fetch_fixture_lineups(fixture_id), "lineups"),
        _safe(api_football.fetch_fixture_statistics(fixture_id), "statistics"),
    )

    events = normalizer.normalize_events(raw_events)
    lineups = normalizer.normalize_lineups(raw_lineups)
    stats = normalizer.normalize_statistics(raw_stats)

    # Coach + formation extracted as separate fields too so the agent
    # can read them off directly without parsing the lineups block.
    home_team = fx["home_team"]
    away_team = fx["away_team"]
    home_lineup = next((l for l in lineups if (l.get("team") or "").lower() == home_team.lower()), None)
    away_lineup = next((l for l in lineups if (l.get("team") or "").lower() == away_team.lower()), None)

    ctx = {
        "league_name": _LEAGUE_LABEL.get(league_id, league_id),
        "kickoff_local": _fmt_kickoff_wib(fx["kickoff_utc"]),
        "venue": fx.get("venue") or "—",
        "home_team": home_team,
        "away_team": away_team,
        "home_score": fx.get("home_score"),
        "away_score": fx.get("away_score"),
        "home_formation": home_lineup.get("formation") if home_lineup else None,
        "home_coach": home_lineup.get("coach") if home_lineup else None,
        "away_formation": away_lineup.get("formation") if away_lineup else None,
        "away_coach": away_lineup.get("coach") if away_lineup else None,
        "events_block": _format_events_block(events),
        "stats_block": _format_stats_block(stats),
        "lineups_block": _format_lineups_block(lineups),
        "broadcast": _BROADCAST.get(league_id, "Cek penyedia siaran resmi."),
        # Raw lists too, in case downstream wants them (e.g. spawning a
        # share card that needs to highlight the goal scorers).
        "_events": events,
        "_lineups": lineups,
        "_stats": stats,
    }

    log.info(
        "recap_context.built",
        home=home_team,
        away=away_team,
        score=f"{fx.get('home_score')}-{fx.get('away_score')}",
        events_count=len(events),
        has_lineups=bool(lineups),
        has_stats=bool(stats),
    )

    return ctx
