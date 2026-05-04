"""Cron discovery script — finds + generates new articles per sport.

Phase 1 ship #14. Designed to be invoked from GitHub Actions on a
schedule (see ``.github/workflows/content-cron.yml``). Single entry
point with --mode flag to dispatch:

  python -m content_engine.scripts.discover --mode football-previews
  python -m content_engine.scripts.discover --mode football-recaps
  python -m content_engine.scripts.discover --mode nba-previews
  python -m content_engine.scripts.discover --mode nba-recaps
  python -m content_engine.scripts.discover --mode f1-weekend
  python -m content_engine.scripts.discover --mode tennis-rankings
  python -m content_engine.scripts.discover --mode weekly-standings
  python -m content_engine.scripts.discover --mode all

Each mode does:
  1. Query the relevant data source for candidates in the time window
  2. Filter out anything already on disk (idempotent — running twice is
     safe, won't regenerate existing articles)
  3. For remaining candidates, invoke the same CLI commands a human
     would invoke. The gate pipeline (polish → banned-phrase →
     voice-lint → plagiarism) runs per-article. Hard-gate failures
     skip + log, don't crash the batch.
  4. Print a summary for the GitHub Actions log.

Articles land in public/content/ with manual_review:true (Phase 1
doctrine — the GH Actions runner commits the JSON files; deploy
puts them live as drafts; editor approves via /editor manually).

Phase 2 (Ship #15) will add an --auto-publish flag that bypasses
the manual_review wait + writes a Supabase publish row immediately
for non-flagship sports.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import structlog
import typer

log = structlog.get_logger()


# Project-relative paths. The script is invoked as a module
# (``python -m content_engine.scripts.discover``) so __file__'s
# parent walk gets us to the repo root.
_REPO_ROOT = Path(__file__).resolve().parents[5]
_CONTENT_DIR = _REPO_ROOT / "public" / "content"


app = typer.Typer(no_args_is_help=True, add_completion=False)


def _existing_slugs(article_type: str) -> set[str]:
    """Return slugs of all articles already on disk for a content type.
    Idempotency anchor — discovery skips candidates whose slug already
    exists."""
    type_dir = _CONTENT_DIR / article_type
    if not type_dir.exists():
        return set()
    return {f.stem for f in type_dir.glob("*.json")}


def _run_cli(args: list[str]) -> int:
    """Invoke a content-engine CLI command in a subprocess. Returns the
    exit code. Output is streamed to the parent (GitHub Actions log).

    We fork a fresh Python process per article instead of importing +
    calling the CLI in-process so a single article's gate failure
    doesn't taint the next article's state (typer's exit handling
    raises SystemExit which is awkward to catch cleanly across many
    runs).
    """
    cmd = [sys.executable, "-m", "content_engine.cli", *args]
    log.info("discover.cli.run", cmd=" ".join(cmd))
    return subprocess.call(cmd, cwd=str(_REPO_ROOT / "packages" / "content-engine"))


# ── Football (EPL + Liga 1) discovery ─────────────────────────────────────


async def _discover_football_previews(
    league_id: str,
    hours_min: int,
    hours_max: int,
) -> list[dict[str, Any]]:
    """Fixtures starting in the [hours_min, hours_max] window from now.

    Phase 2 ship #17: consults ce_league_state for the current
    gameweek anchor. Falls back to the heuristic scan if the cache
    is empty / unavailable.
    """
    from content_engine.data import api_football, league_state, normalizer

    now_utc = datetime.now(timezone.utc)
    earliest = now_utc + timedelta(hours=hours_min)
    latest = now_utc + timedelta(hours=hours_max)

    # Cache lookup — Phase 2 ship #17. Per-league anchored season
    # depends on the league's calendar shape. EPL = "2025-26",
    # Liga 1 = "2025-26".
    season = "2025-26"
    cached = league_state.get_state(sport_id="football", league_id=league_id, season=season)
    if cached and cached.current_gameweek:
        anchor_gw = cached.current_gameweek
        log.info("discover.football_preview_cache_hit", league=league_id, anchor_gw=anchor_gw)
    else:
        # Heuristic fallback: 35 for EPL, 30 for Liga 1.
        anchor_gw = 35 if league_id == "epl" else 30
        log.info("discover.football_preview_cache_miss", league=league_id, fallback_gw=anchor_gw)

    out: list[dict[str, Any]] = []
    # Scan a window of 3 gameweeks (current + 2 ahead) to cover the
    # case where the next gameweek starts mid-window.
    for gw_offset in range(0, 3):
        try:
            target_gw = anchor_gw + gw_offset
            if league_id == "epl":
                raw = await api_football.fetch_epl_gameweek(target_gw)
            elif league_id == "liga-1-id":
                raw = await api_football.fetch_liga1_gameweek(target_gw)
            else:
                continue
            norm = (
                normalizer.normalize_epl_fixtures(raw, gameweek=target_gw)
                if league_id == "epl"
                else normalizer.normalize_liga1_fixtures(raw, gameweek=target_gw)
            )
            for fx in norm:
                if fx.get("status") != "scheduled":
                    continue
                kt = fx.get("kickoff_utc")
                if kt and earliest <= kt <= latest:
                    out.append(fx)
        except Exception as exc:  # noqa: BLE001
            log.warning("discover.football_preview_gw_failed", league=league_id, gw_offset=gw_offset, error=str(exc))

    # Best-effort cache update: if we found scheduled fixtures in
    # gameweek N + nothing in N-1 (i.e. N-1 was completed), advance
    # the cache. Only attempt write if we have the service-role key.
    if out:
        # Find the lowest gameweek with scheduled fixtures — that's
        # the new "current". Anything below that is completed.
        scheduled_gws = sorted({
            int(fx.get("gameweek")) for fx in out
            if fx.get("gameweek") is not None
        })
        if scheduled_gws:
            new_current = scheduled_gws[0]
            if new_current != anchor_gw:
                league_state.upsert_state(
                    sport_id="football", league_id=league_id, season=season,
                    current_gameweek=new_current,
                    last_completed_gameweek=new_current - 1,
                    notes=f"discover.football_preview advanced from {anchor_gw} to {new_current}",
                )

    return out


async def _discover_football_recaps(
    league_id: str,
    hours_back_max: int,
) -> list[dict[str, Any]]:
    """Recently-finished fixtures within the last `hours_back_max` hours.

    Used by the T+15min recap cadence. Same data source as previews.
    """
    from content_engine.data import api_football, normalizer

    now_utc = datetime.now(timezone.utc)
    earliest = now_utc - timedelta(hours=hours_back_max)

    out: list[dict[str, Any]] = []
    for gw_offset in range(-2, 1):
        try:
            target_gw = 34 + gw_offset
            if league_id == "epl":
                raw = await api_football.fetch_epl_gameweek(target_gw)
            elif league_id == "liga-1-id":
                raw = await api_football.fetch_liga1_gameweek(29 + gw_offset)
            else:
                continue
            norm = normalizer.normalize_epl_fixtures(raw, gameweek=target_gw) \
                if league_id == "epl" else \
                normalizer.normalize_liga1_fixtures(raw, gameweek=29 + gw_offset)
            for fx in norm:
                if fx.get("status") != "final":
                    continue
                kt = fx.get("kickoff_utc")
                if kt and kt >= earliest and kt <= now_utc:
                    out.append(fx)
        except Exception as exc:  # noqa: BLE001
            log.warning("discover.football_recap_gw_failed", league=league_id, error=str(exc))
    return out


@app.command(name="football-previews")
def cmd_football_previews(
    hours_min: int = 18,
    hours_max: int = 48,
) -> None:
    """Generate previews for upcoming EPL + Liga 1 fixtures.

    Default window matches the T-24h cadence — fixtures with kickoff
    in 18-48h from now. Idempotent: skips fixtures whose slug already
    exists in public/content/preview/.
    """
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing = _existing_slugs("preview")
        wrote = 0
        skipped = 0
        for league in ("epl", "liga-1-id"):
            candidates = await _discover_football_previews(league, hours_min, hours_max)
            log.info("discover.football_preview_window", league=league, count=len(candidates))
            for fx in candidates:
                article_slug = slug_mod.fixture_slug(fx["home_team"], fx["away_team"], fx["kickoff_utc"])
                if article_slug in existing:
                    skipped += 1
                    log.info("discover.skip_existing", slug=article_slug)
                    continue
                rc = _run_cli(["preview", "--fixture-id", str(fx["source_fixture_id"]), "--write"])
                if rc == 0:
                    wrote += 1
                else:
                    log.warning("discover.cli_failed", slug=article_slug, rc=rc)
        typer.echo(f"\nfootball-previews: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


@app.command(name="football-recaps")
def cmd_football_recaps(
    hours_back_max: int = 6,
) -> None:
    """Generate recaps for recently-finished EPL + Liga 1 fixtures.

    Default window is T+0 to T+6h — covers the T+15min cadence with
    slack for cron miss-fires. Idempotent: skips slugs already in
    public/content/recap/.
    """
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing = _existing_slugs("recap")
        wrote = 0
        skipped = 0
        for league in ("epl", "liga-1-id"):
            candidates = await _discover_football_recaps(league, hours_back_max)
            log.info("discover.football_recap_window", league=league, count=len(candidates))
            for fx in candidates:
                article_slug = slug_mod.fixture_slug(fx["home_team"], fx["away_team"], fx["kickoff_utc"])
                if article_slug in existing:
                    skipped += 1
                    continue
                rc = _run_cli(["recap", "--fixture-id", str(fx["source_fixture_id"]), "--write"])
                if rc == 0:
                    wrote += 1
                else:
                    log.warning("discover.cli_failed", slug=article_slug, rc=rc)
        typer.echo(f"\nfootball-recaps: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


# ── NBA discovery ─────────────────────────────────────────────────────────


@app.command(name="nba-previews")
def cmd_nba_previews(hours_min: int = 0, hours_max: int = 12) -> None:
    """Discover NBA games tipping off in the next 0-12 hours.

    The T-4h cadence is approximated by running every 4h with this
    window — newer tipoffs land in the window the cron next time.
    """
    from content_engine.data import espn_nba, nba_normalizer
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing = _existing_slugs("preview")
        wrote = 0
        skipped = 0
        now_utc = datetime.now(timezone.utc)
        earliest = now_utc + timedelta(hours=hours_min)
        latest = now_utc + timedelta(hours=hours_max)

        # Scan today + tomorrow's scoreboard (enough to find any game
        # tipping in the next 12h).
        for offset in (0, 1):
            d = (now_utc + timedelta(days=offset)).strftime("%Y%m%d")
            try:
                raw = await espn_nba.fetch_scoreboard_for_date(d)
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.nba_preview_scoreboard_failed", date=d, error=str(exc))
                continue
            for ev in raw.get("events", []):
                comp = (ev.get("competitions") or [{}])[0]
                comp_status = (comp.get("status") or {}).get("type", {})
                state = (comp_status.get("state") or "").lower()
                if state != "pre":
                    continue
                # Build a header to get tipoff + abbrs
                header_input = {"header": {"competitions": [comp], "id": ev.get("id")}}
                h = nba_normalizer.normalize_game_header(header_input)
                tipoff = h.get("tipoff_utc")
                if not tipoff or not (earliest <= tipoff <= latest):
                    continue
                # Game number from series — best-effort
                series = nba_normalizer.normalize_series_state(header_input)
                article_slug = slug_mod.nba_game_slug(
                    h["home_abbr"], h["away_abbr"], tipoff,
                    series.get("current_game"),
                )
                if article_slug in existing:
                    skipped += 1
                    continue
                rc = _run_cli(["nba-preview", "--game-id", str(h["game_id"]), "--write"])
                if rc == 0:
                    wrote += 1
        typer.echo(f"\nnba-previews: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


@app.command(name="nba-recaps")
def cmd_nba_recaps(hours_back_max: int = 6) -> None:
    """Discover recently-finished NBA games."""
    from content_engine.data import espn_nba, nba_normalizer
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing = _existing_slugs("recap")
        wrote = 0
        skipped = 0
        now_utc = datetime.now(timezone.utc)
        earliest = now_utc - timedelta(hours=hours_back_max)

        for offset in (0, -1):
            d = (now_utc + timedelta(days=offset)).strftime("%Y%m%d")
            try:
                raw = await espn_nba.fetch_scoreboard_for_date(d)
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.nba_recap_scoreboard_failed", date=d, error=str(exc))
                continue
            for ev in raw.get("events", []):
                comp = (ev.get("competitions") or [{}])[0]
                comp_status = (comp.get("status") or {}).get("type", {})
                state = (comp_status.get("state") or "").lower()
                if state != "post":
                    continue
                header_input = {"header": {"competitions": [comp], "id": ev.get("id")}}
                h = nba_normalizer.normalize_game_header(header_input)
                tipoff = h.get("tipoff_utc")
                if not tipoff or tipoff < earliest:
                    continue
                series = nba_normalizer.normalize_series_state(header_input)
                article_slug = slug_mod.nba_game_slug(
                    h["home_abbr"], h["away_abbr"], tipoff,
                    series.get("games_played"),
                )
                if article_slug in existing:
                    skipped += 1
                    continue
                rc = _run_cli(["nba-recap", "--game-id", str(h["game_id"]), "--write"])
                if rc == 0:
                    wrote += 1
        typer.echo(f"\nnba-recaps: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


# ── F1 discovery ──────────────────────────────────────────────────────────


@app.command(name="f1-weekend")
def cmd_f1_weekend(season: int = 2026) -> None:
    """Generate F1 race weekend preview (Thursday cadence) and recap
    (Sunday +15min cadence). Discovers next-upcoming + last-completed
    race based on jolpica's calendar.
    """
    from content_engine.data import f1_jolpica, f1_normalizer
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing_preview = _existing_slugs("preview")
        existing_recap = _existing_slugs("recap")
        wrote = 0
        skipped = 0
        now_utc = datetime.now(timezone.utc)

        try:
            sched_raw = await f1_jolpica.fetch_season_schedule(season)
            races = (sched_raw.get("MRData") or {}).get("RaceTable", {}).get("Races", [])
        except Exception as exc:  # noqa: BLE001
            log.warning("discover.f1_schedule_failed", error=str(exc))
            races = []

        next_round = None
        last_completed_round = None
        for r in races:
            try:
                from content_engine.data.f1_normalizer import _race_date_utc as parse_date
                race_date = parse_date(r.get("date"), r.get("time"))
                if not race_date:
                    continue
                if race_date < now_utc:
                    last_completed_round = int(r["round"])
                elif next_round is None:
                    next_round = int(r["round"])
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.f1_race_parse_failed", error=str(exc))

        # Preview: next upcoming race (any time before it happens — the
        # Thursday cron would catch it)
        if next_round is not None:
            try:
                meta_raw = await f1_jolpica.fetch_race_meta(season, next_round)
                meta = f1_normalizer.normalize_race_meta(meta_raw)
                if meta.get("race_name"):
                    article_slug = slug_mod.f1_race_slug(meta["race_name"], season)
                    if article_slug in existing_preview:
                        skipped += 1
                    else:
                        rc = _run_cli(["f1-preview", "--season", str(season), "--round", str(next_round), "--write"])
                        if rc == 0:
                            wrote += 1
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.f1_preview_failed", round=next_round, error=str(exc))

        # Recap: last completed race (idempotent on slug)
        if last_completed_round is not None:
            try:
                meta_raw = await f1_jolpica.fetch_race_meta(season, last_completed_round)
                meta = f1_normalizer.normalize_race_meta(meta_raw)
                if meta.get("race_name"):
                    article_slug = slug_mod.f1_race_slug(meta["race_name"], season)
                    if article_slug in existing_recap:
                        skipped += 1
                    else:
                        rc = _run_cli(["f1-recap", "--season", str(season), "--round", str(last_completed_round), "--write"])
                        if rc == 0:
                            wrote += 1
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.f1_recap_failed", round=last_completed_round, error=str(exc))

        typer.echo(f"\nf1-weekend: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


# ── Tennis discovery ──────────────────────────────────────────────────────


@app.command(name="tennis-rankings")
def cmd_tennis_rankings() -> None:
    """Generate weekly ATP + WTA rankings explainers.

    Idempotency note: the CLI computes the slug from the rankings'
    UPDATE timestamp (which ESPN publishes weekly), not from "now".
    So we probe each tour first, find the actual update week, then
    check existing slugs against that. Without this probe, the
    discovery would generate fresh articles every week the CLI runs
    even when the rankings haven't actually moved.
    """
    from content_engine.data import espn_tennis, tennis_normalizer
    from content_engine.publish import slug as slug_mod

    async def _run() -> None:
        existing = _existing_slugs("standings")
        wrote = 0
        skipped = 0
        for tour in ("atp", "wta"):
            try:
                raw = await espn_tennis.fetch_rankings(tour)
                rk = tennis_normalizer.normalize_rankings(raw, limit=1)
                ref_dt = rk.get("updated_utc") or datetime.now(timezone.utc)
            except Exception as exc:  # noqa: BLE001
                log.warning("discover.tennis_rankings_probe_failed", tour=tour, error=str(exc))
                ref_dt = datetime.now(timezone.utc)
            year, week, _ = ref_dt.isocalendar()
            article_slug = slug_mod.tennis_rankings_slug(tour, year, f"pekan-{week:02d}")
            if article_slug in existing:
                skipped += 1
                log.info("discover.skip_existing", slug=article_slug)
                continue
            rc = _run_cli(["tennis-rankings", "--tour", tour, "--write"])
            if rc == 0:
                wrote += 1
        typer.echo(f"\ntennis-rankings: wrote {wrote}, skipped {skipped} existing")

    asyncio.run(_run())


# ── Standings discovery ───────────────────────────────────────────────────


@app.command(name="weekly-standings")
def cmd_weekly_standings() -> None:
    """Generate weekly EPL + Liga 1 standings explainers + Tennis rankings.
    Best run on Monday after the gameweek's last fixture finishes.
    """
    async def _run() -> None:
        wrote = 0
        # Football standings — Phase 1 hardcodes gameweek; Phase 2 will
        # auto-discover the latest completed gameweek.
        for league, gw in (("epl", 35), ("liga-1-id", 30)):
            rc = _run_cli(["standings", "--league", league, "--gameweek", str(gw), "--write"])
            if rc == 0:
                wrote += 1
        # Tennis rankings — Haiku is cheap, just regenerate weekly
        cmd_tennis_rankings()
        typer.echo(f"\nweekly-standings: wrote {wrote} football articles + tennis rankings")

    asyncio.run(_run())


# ── ALL — run everything (manual or smoke-test) ───────────────────────────


@app.command(name="all")
def cmd_all() -> None:
    """Run every discovery mode. Useful for manual back-fill /
    smoke-test from the command line. Cron jobs would call individual
    modes per their schedule.
    """
    cmd_football_previews()
    cmd_football_recaps()
    cmd_nba_previews()
    cmd_nba_recaps()
    cmd_f1_weekend()
    cmd_tennis_rankings()


if __name__ == "__main__":
    app()
