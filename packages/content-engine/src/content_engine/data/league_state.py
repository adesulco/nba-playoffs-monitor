"""Per-league state cache helpers.

Phase 2 ship #17. Reads + writes the ``ce_league_state`` Supabase
table. Used by ``scripts/discover.py`` to replace heuristic gameweek
scans with a single Supabase lookup.

Read path is anon-friendly (RLS allows SELECT). Write path needs the
service-role client — only the cron runner has it. Standalone CLI
runs without the service-role key fall back to the heuristic scan
(read returns None → discovery does its own fetch_epl_gameweek loop).

Usage::

    state = get_state(sport_id="football", league_id="epl", season="2025-26")
    if state and state.current_gameweek:
        # Use cached gameweek
        gw = state.current_gameweek
    else:
        # Fall back to scanning
        gw = ...

    # When the cron observes a finished gameweek, advance the cache:
    upsert_state(
        sport_id="football", league_id="epl", season="2025-26",
        current_gameweek=36, last_completed_gameweek=35,
    )
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import structlog

from content_engine.config import settings

log = structlog.get_logger()


@dataclass
class LeagueState:
    sport_id: str
    league_id: str
    season: str
    current_gameweek: int | None = None
    last_completed_gameweek: int | None = None
    current_round: int | None = None
    last_completed_round: int | None = None
    current_playoff_round: str | None = None
    active_series_count: int | None = None
    active_tournament_id: str | None = None
    active_tournament_name: str | None = None
    notes: str | None = None


def _make_anon_client():
    """Read-only Supabase client (anon key). Returns None if anon
    creds aren't available — caller treats absence as 'no cached state'.
    """
    try:
        from supabase import create_client
        # anon key may live in settings or env. We use the
        # already-configured supabase_url + anon-from-env path.
        import os as _os
        anon = (
            _os.environ.get("SUPABASE_ANON_KEY")
            or _os.environ.get("VITE_SUPABASE_ANON_KEY")
            or _os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        )
        if not anon:
            return None
        return create_client(settings.supabase_url, anon)
    except Exception as exc:  # noqa: BLE001
        log.warning("league_state.anon_client_failed", error=str(exc))
        return None


def _make_admin_client():
    """Service-role client for writes. Raises if key missing."""
    from supabase import create_client
    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "league_state: SUPABASE_SERVICE_ROLE_KEY missing — write path unavailable"
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_state(
    *,
    sport_id: str,
    league_id: str,
    season: str,
) -> LeagueState | None:
    """Read the cached state for (sport, league, season). Returns None
    if no row exists OR the anon client is unavailable.
    """
    client = _make_anon_client()
    if client is None:
        return None
    try:
        resp = (
            client.table("ce_league_state")
            .select("*")
            .eq("sport_id", sport_id)
            .eq("league_id", league_id)
            .eq("season", season)
            .maybe_single()
            .execute()
        )
        row = resp.data if resp else None
        if not row:
            return None
        return LeagueState(
            sport_id=row.get("sport_id"),
            league_id=row.get("league_id"),
            season=row.get("season"),
            current_gameweek=row.get("current_gameweek"),
            last_completed_gameweek=row.get("last_completed_gameweek"),
            current_round=row.get("current_round"),
            last_completed_round=row.get("last_completed_round"),
            current_playoff_round=row.get("current_playoff_round"),
            active_series_count=row.get("active_series_count"),
            active_tournament_id=row.get("active_tournament_id"),
            active_tournament_name=row.get("active_tournament_name"),
            notes=row.get("notes"),
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("league_state.read_failed", sport_id=sport_id, league_id=league_id, error=str(exc))
        return None


def upsert_state(
    *,
    sport_id: str,
    league_id: str,
    season: str,
    **fields: Any,
) -> bool:
    """Upsert a state row. ``fields`` are the optional columns —
    current_gameweek, last_completed_gameweek, current_round, etc.

    Returns True on success. Returns False if service-role key is
    missing OR the upsert fails (logs the failure; caller decides
    whether to retry).
    """
    try:
        client = _make_admin_client()
    except RuntimeError as exc:
        log.warning("league_state.write_skipped", reason=str(exc))
        return False

    row = {
        "sport_id": sport_id,
        "league_id": league_id,
        "season": season,
        **{k: v for k, v in fields.items() if v is not None},
    }
    try:
        client.table("ce_league_state").upsert(
            row, on_conflict="sport_id,league_id,season",
        ).execute()
        log.info("league_state.upserted", sport_id=sport_id, league_id=league_id, season=season)
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("league_state.write_failed", error=str(exc))
        return False
