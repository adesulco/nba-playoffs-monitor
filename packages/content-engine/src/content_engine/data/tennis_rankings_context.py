"""Tennis rankings explainer context assembler.

Phase 1 ship #13. Two ESPN calls (rankings + scoreboard) — the
scoreboard is optional flavor (mentions the active tournament when
one is running).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from content_engine.data import espn_tennis, tennis_normalizer

log = structlog.get_logger()


_WIB = timezone(timedelta(hours=7), name="WIB")


_LEAGUE_LABEL = {
    "atp": "ATP Tour 2026",
    "wta": "WTA Tour 2026",
}


def _fmt_date_local(dt_utc: datetime | None) -> str:
    if not dt_utc:
        return "—"
    months = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember",
    }
    wib = dt_utc.astimezone(_WIB)
    return f"{wib.day} {months[wib.month]} {wib.year}"


def _format_rankings_block(rankings: list[dict[str, Any]], limit: int = 20) -> str:
    """Render top-N as a fixed-width text table with movement column."""
    if not rankings:
        return "Rankings tidak tersedia di sistem."
    lines = [f"  {'RK':<3} {'PREV':<5} {'MOVE':<5} {'PLAYER':<28} {'COUNTRY':<12} {'PTS'}"]
    for r in rankings[:limit]:
        move_str = ""
        m = r.get("movement") or 0
        if m > 0:
            move_str = f"+{m}"
        elif m < 0:
            move_str = str(m)
        else:
            move_str = "—"
        prev_str = str(r.get("previous") or "—")
        lines.append(
            f"  {r['rank']:<3} {prev_str:<5} {move_str:<5} "
            f"{(r.get('athlete_name') or '?')[:28]:<28} "
            f"{(r.get('country') or '—')[:12]:<12} "
            f"{r.get('points', 0):,}"
        )
    return "\n".join(lines)


def _format_active_tournament_block(t: dict[str, Any] | None) -> str:
    if not t:
        return "(no active tournament)"
    lines = [f"  Tournament: {t.get('name')}"]
    if t.get("venue"):
        lines.append(f"  Venue: {t.get('venue')}")
    if t.get("start_utc") and t.get("end_utc"):
        lines.append(f"  Dates: {_fmt_date_local(t['start_utc'])} → {_fmt_date_local(t['end_utc'])}")
    if t.get("status"):
        lines.append(f"  Status: {t.get('status')}")
    if t.get("previous_winners"):
        winners = ", ".join(
            f"{w['year']}: {w['winner']}" for w in t["previous_winners"][:3] if w.get("winner")
        )
        if winners:
            lines.append(f"  Previous winners: {winners}")
    return "\n".join(lines)


async def build_context(tour: str = "atp") -> dict[str, Any]:
    """Fetch + assemble tennis rankings explainer context."""
    if tour not in {"atp", "wta"}:
        raise ValueError(f"tour must be atp or wta, got {tour!r}")

    async def _safe(coro, label):
        try:
            return await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("tennis_rankings_context.fetch_failed", label=label, error=str(exc))
            return {}

    raw_rankings, raw_scoreboard = await asyncio.gather(
        _safe(espn_tennis.fetch_rankings(tour), "rankings"),
        _safe(espn_tennis.fetch_scoreboard(tour), "scoreboard"),
    )

    rankings = tennis_normalizer.normalize_rankings(raw_rankings, limit=30)
    active = tennis_normalizer.normalize_active_tournament(raw_scoreboard)

    ctx = {
        "league_name": _LEAGUE_LABEL.get(tour, f"Tennis {tour.upper()}"),
        "tour": tour,
        "updated_utc": rankings.get("updated_utc"),
        "updated_local": _fmt_date_local(rankings.get("updated_utc")),
        "rankings_block": _format_rankings_block(rankings.get("rankings") or []),
        "active_tournament_block": _format_active_tournament_block(active),
        # Raw shapes for downstream
        "_rankings": rankings.get("rankings") or [],
        "_active": active,
    }

    log.info(
        "tennis_rankings_context.built",
        tour=tour,
        ranks=len(ctx["_rankings"]),
        no_1=ctx["_rankings"][0]["athlete_name"] if ctx["_rankings"] else None,
        active=active.get("name") if active else None,
    )

    return ctx
