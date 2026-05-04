"""Postgres async connection pool + upserts.

Phase 0: enough to (1) ping the DB on health check, (2) upsert normalized
fixtures into ``ce_fixtures``, (3) read seed data from ``ce_leagues``.

Uses asyncpg (raw SQL, no ORM). Per ``CLAUDE.md`` § "Refactor internals as
long as public interfaces and outputs are unchanged" — anything inside this
module is fair game for refactor; the function signatures are the contract.
"""

from __future__ import annotations

import asyncio
from typing import Any

import asyncpg
import structlog

from content_engine.config import settings

log = structlog.get_logger()


# Module-level pool — initialized lazily on first use. asyncpg pools are
# safe to share across coroutines so a singleton is fine.
_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


async def get_pool() -> asyncpg.Pool:
    """Return the shared asyncpg pool, creating it on first call."""
    global _pool
    if _pool is not None:
        return _pool
    async with _pool_lock:
        if _pool is not None:  # double-check after acquiring lock
            return _pool
        _pool = await asyncpg.create_pool(
            dsn=str(settings.database_url),
            min_size=1,
            max_size=10,
            command_timeout=30,
        )
    return _pool


async def close_pool() -> None:
    """Close the pool. Called on graceful shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def ping() -> None:
    """Health check: verify DB connectivity + that migration 0006 applied.

    Selects ``count(*) from ce_leagues`` and asserts ≥5 rows (the seed).
    Raises if the DB is unreachable, the table doesn't exist, or the
    migration didn't seed the leagues.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select count(*) as n from ce_leagues")
        if row is None or row["n"] < 5:
            raise RuntimeError(
                "ce_leagues seed missing — has migration 0006 been applied?"
            )
    log.info("db.ping.ok", leagues_seeded=row["n"])


async def upsert_fixtures(rows: list[dict[str, Any]]) -> int:
    """Upsert normalized fixtures into ``ce_fixtures``.

    Idempotent: re-running with the same (league_id, source_fixture_id)
    pair updates in place. Returns the count actually written.

    Each row is the dict shape produced by ``normalizer.normalize_*``::

        {
            "league_id": "epl",
            "source_fixture_id": "1234567",
            "kickoff_utc": datetime,
            "venue": "Anfield, Liverpool",
            "status": "scheduled",
            "home_team": "Liverpool",
            "away_team": "Arsenal",
            "home_score": None,
            "away_score": None,
            "season": "2025-26",
            "gameweek": 35,
        }
    """
    if not rows:
        return 0

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.executemany(
                """
                insert into ce_fixtures (
                    league_id, source_fixture_id, kickoff_utc, venue, status,
                    home_team, away_team, home_score, away_score, season, gameweek
                ) values (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )
                on conflict (league_id, source_fixture_id) do update set
                    kickoff_utc = excluded.kickoff_utc,
                    venue       = excluded.venue,
                    status      = excluded.status,
                    home_score  = excluded.home_score,
                    away_score  = excluded.away_score,
                    updated_at  = now()
                """,
                [
                    (
                        r["league_id"],
                        r["source_fixture_id"],
                        r["kickoff_utc"],
                        r.get("venue"),
                        r["status"],
                        r["home_team"],
                        r["away_team"],
                        r.get("home_score"),
                        r.get("away_score"),
                        r["season"],
                        r.get("gameweek"),
                    )
                    for r in rows
                ],
            )
    log.info("db.upsert_fixtures", count=len(rows))
    return len(rows)


async def fetch_league(league_id: str) -> dict[str, Any] | None:
    """Look up a single league row by id. Returns None if not seeded."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "select id, sport, name_id, name_en, season, source_feed "
            "from ce_leagues where id = $1",
            league_id,
        )
    return dict(row) if row else None
