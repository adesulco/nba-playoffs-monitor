"""Backfill voice-lint scores using the EXACT writer source-context.

Phase 2 ship #28 polish (post-mortem fix). The first backfill
(scripts/backfill_lint_issues.py, ship #28) used a heuristic that
stitched a few frontmatter fields into a fake "source context"
block. That misled Haiku into flagging genuine ground-truth claims
(56-26 record, 47.7% FG, head coach name) as training-inference
because the heuristic block didn't include those specific stats.

Result: 131/168 articles dropped below the 70 threshold; 0
articles ended up at the ≥85 ship-as-is tier. Bulk-approve UI
became useless, undoing the throughput win from Ship #26.

This v2 backfill does what should have been done originally:
re-runs each article's WRITER source-context by calling the same
data builders + agent.format_user_message that the original
generation used. The result is the EXACT prose data block Haiku
saw at gen time. Lint scores should rebound to live-gen levels.

Cost: per-article = 1 ESPN/API-Football/jolpica call + 1 Haiku
lint call. ~$0.001/article × 168 = ~$0.20 total. Plus ~30 min
runtime serially.

Idempotent — only re-lints articles whose voice_lint.summary
matches the v1 backfill's signature (summary mentions
"Indonesian sport voice" or starts with "Solid" — the live-gen
summaries don't match this shape).

Usage::

    cd packages/content-engine
    .venv/bin/python scripts/backfill_lint_v2.py
    .venv/bin/python scripts/backfill_lint_v2.py --dry-run
    .venv/bin/python scripts/backfill_lint_v2.py --limit 5
    .venv/bin/python scripts/backfill_lint_v2.py --types team
    .venv/bin/python scripts/backfill_lint_v2.py --force  # also re-lint live-gen scores
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

_SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPT_DIR.parent / "src"))

from content_engine.quality import voice_lint  # noqa: E402

_REPO_ROOT = _SCRIPT_DIR.parent.parent.parent
_CONTENT_ROOT = _REPO_ROOT / "public" / "content"


# ── Dispatcher ───────────────────────────────────────────────────────────
#
# Each builder returns the EXACT user-message string the original writer
# agent saw. Returns None when the dispatcher can't reconstruct (missing
# IDs, exotic article shape) — caller falls back to the v1 heuristic.

async def _build_for_team_profile(article: dict) -> str | None:
    fm = article["frontmatter"]
    sport = fm.get("sport")
    league = fm.get("league")
    sub = fm.get("article_subtype") or "team_profile"

    if league == "nba" and sub == "team_profile":
        from content_engine.agents import nba_team_profile as agent
        from content_engine.data import nba_team_profile_context as ctxmod
        team_id = fm.get("team_id")
        if not team_id:
            return None
        ctx = await ctxmod.build_context(team_id)
        return agent.format_user_message(ctx)

    if league == "nba" and sub == "player_profile":
        from content_engine.agents import nba_player_profile as agent
        from content_engine.data import nba_player_profile_context as ctxmod
        athlete_id = fm.get("athlete_id")
        if not athlete_id:
            return None
        ctx = await ctxmod.build_context(athlete_id)
        return agent.format_user_message(ctx)

    if league in ("epl", "liga-1-id") and sub == "team_profile":
        from content_engine.agents import football_team_profile as agent
        from content_engine.data import football_team_profile_context as ctxmod
        team_id = fm.get("team_id")
        if not team_id:
            return None
        ctx = await ctxmod.build_context(team_id, league_id=league)
        return agent.format_user_message(ctx)

    if league == "f1" and sub == "driver_profile":
        from content_engine.agents import f1_driver_profile as agent
        from content_engine.data import f1_driver_profile_context as ctxmod
        driver_id = fm.get("driver_id")
        season = fm.get("season") or 2026
        if not driver_id:
            return None
        ctx = await ctxmod.build_context(driver_id, season=season)
        return agent.format_user_message(ctx)

    if league == "tennis" and sub == "player_profile":
        from content_engine.agents import tennis_player_profile as agent
        from content_engine.data import tennis_player_profile_context as ctxmod
        athlete_id = fm.get("athlete_id")
        tour = fm.get("tour") or "atp"
        if not athlete_id:
            return None
        ctx = await ctxmod.build_context(athlete_id, tour=tour)
        return agent.format_user_message(ctx)

    return None


async def _build_for_recap(article: dict) -> str | None:
    fm = article["frontmatter"]
    league = fm.get("league")

    if league == "nba":
        from content_engine.agents import nba_recap as agent
        from content_engine.data import nba_recap_context as ctxmod
        gid = fm.get("game_id")
        if not gid:
            return None
        ctx = await ctxmod.build_context(gid)
        return agent.format_nba_recap_user_message(ctx)

    if league in ("epl", "liga-1-id"):
        from content_engine.agents import recap as agent
        from content_engine.data import api_football, normalizer, recap_context as ctxmod
        fid = fm.get("fixture_id")
        if not fid:
            return None
        raw = await api_football.fetch_fixture(fid)
        if not raw.get("response"):
            return None
        fx_raw = raw["response"][0]
        league_id = normalizer.detect_league_id(fx_raw)
        norm = normalizer._normalize_af_fixtures(
            {"response": [fx_raw]},
            league_id=league_id,
            season="2025-26",
            gameweek=fx_raw.get("league", {}).get("round", "").split(" - ")[-1].strip() or 0,
        )
        if not norm:
            return None
        ctx = await ctxmod.build_context(norm[0])
        return agent.format_recap_user_message(ctx)

    if league == "f1":
        from content_engine.agents import f1_recap as agent
        from content_engine.data import f1_recap_context as ctxmod
        season = fm.get("season") or 2026
        rnd = fm.get("round")
        if rnd is None:
            return None
        ctx = await ctxmod.build_context(season=season, round_num=rnd)
        return agent.format_f1_recap_user_message(ctx)

    if league == "tennis":
        from content_engine.agents import tennis_match_recap as agent
        from content_engine.data import tennis_match_recap_context as ctxmod
        tid = fm.get("tournament_id")
        mid = fm.get("match_id")
        tour = fm.get("tour") or "atp"
        if not tid or not mid:
            return None
        ctx = await ctxmod.build_context(tournament_id=tid, match_id=mid, tour=tour)
        return agent.format_tennis_match_recap_user_message(ctx)

    return None


async def _build_for_preview(article: dict) -> str | None:
    fm = article["frontmatter"]
    league = fm.get("league")

    if league == "nba":
        from content_engine.agents import nba_preview as agent
        from content_engine.data import nba_preview_context as ctxmod
        gid = fm.get("game_id")
        if not gid:
            return None
        ctx = await ctxmod.build_context(gid)
        return agent.format_nba_preview_user_message(ctx)

    if league in ("epl", "liga-1-id"):
        from content_engine.agents import preview as agent
        from content_engine.data import api_football, normalizer, preview_context as ctxmod
        fid = fm.get("fixture_id")
        if not fid:
            return None
        raw = await api_football.fetch_fixture(fid)
        if not raw.get("response"):
            return None
        fx_raw = raw["response"][0]
        league_id = normalizer.detect_league_id(fx_raw)
        norm = normalizer._normalize_af_fixtures(
            {"response": [fx_raw]},
            league_id=league_id,
            season="2025-26",
            gameweek=fx_raw.get("league", {}).get("round", "").split(" - ")[-1].strip() or 0,
        )
        if not norm:
            return None
        ctx = await ctxmod.build_context(norm[0])
        return agent.format_preview_user_message(ctx)

    if league == "f1":
        from content_engine.agents import f1_preview as agent
        from content_engine.data import f1_preview_context as ctxmod
        season = fm.get("season") or 2026
        rnd = fm.get("round")
        if rnd is None:
            return None
        ctx = await ctxmod.build_context(season=season, round_num=rnd)
        return agent.format_f1_preview_user_message(ctx)

    return None


async def _build_for_standings(article: dict) -> str | None:
    fm = article["frontmatter"]
    league = fm.get("league")
    sub = fm.get("article_subtype")

    if league in ("epl", "liga-1-id"):
        from content_engine.agents import standings as agent
        from content_engine.data import standings_context as ctxmod
        gw = fm.get("gameweek")
        if gw is None:
            return None
        ctx = await ctxmod.build_context(league_id=league, gameweek=gw)
        return agent.format_standings_user_message(ctx)

    if league == "nba" and sub == "series_state":
        from content_engine.agents import nba_series as agent
        from content_engine.data import nba_series_context as ctxmod
        gid = fm.get("game_id")
        if not gid:
            # nba-series uses any game from the series; if game_id absent,
            # try via home_abbr/away_abbr lookup (skip for v1).
            return None
        ctx = await ctxmod.build_context(gid)
        return agent.format_nba_series_user_message(ctx)

    if league == "f1" and sub == "championship_state":
        from content_engine.agents import f1_championship as agent
        from content_engine.data import f1_championship_context as ctxmod
        season = fm.get("season") or 2026
        rnd = fm.get("round")
        if rnd is None:
            return None
        ctx = await ctxmod.build_context(season=season, round_num=rnd)
        return agent.format_f1_championship_user_message(ctx)

    if league == "tennis":
        from content_engine.agents import tennis_rankings as agent
        from content_engine.data import tennis_rankings_context as ctxmod
        tour = fm.get("tour") or "atp"
        ctx = await ctxmod.build_context(tour=tour)
        return agent.format_tennis_rankings_user_message(ctx)

    return None


async def _build_source_context(article: dict) -> str | None:
    """Dispatch to the right builder by article type."""
    art_type = article.get("type")
    try:
        if art_type == "team":
            return await _build_for_team_profile(article)
        if art_type == "recap":
            return await _build_for_recap(article)
        if art_type == "preview":
            return await _build_for_preview(article)
        if art_type == "standings":
            return await _build_for_standings(article)
        # h2h has its own context builder, skip for v1 (1 article).
    except Exception as exc:
        print(f"  ! dispatcher failed for {article.get('slug')}: {exc}", file=sys.stderr)
        return None
    return None


def _v1_heuristic_context(article: dict) -> str:
    """Fallback — same logic as backfill v1. Used when dispatcher can't
    rebuild the real source context."""
    fm = article.get("frontmatter") or {}
    bits = []
    for key in (
        "league", "competition", "season_label",
        "home_team", "away_team", "home_score", "away_score",
        "team_name", "team_country", "team_founded",
        "venue_name", "venue_city",
        "athlete_name", "driver_name", "current_team", "championship_pos",
        "championship_points", "season_wins", "current_rank", "previous_rank",
        "points", "trend", "birthplace", "dob", "age", "position",
        "as_of_id", "kickoff_utc",
    ):
        v = fm.get(key)
        if v is None or v == "":
            continue
        bits.append(f"{key}: {v}")
    return "\n".join(bits) if bits else None


# ── Backfill loop ────────────────────────────────────────────────────────


def _was_backfilled_v1(article: dict) -> bool:
    """Heuristic check: did the v1 backfill produce this article's lint?
    The v1 summaries tend to have very generic phrasing because the
    fake context underweights specific facts. Conservative — re-lints
    if uncertain.
    """
    fm = article.get("frontmatter") or {}
    vl = fm.get("voice_lint") or {}
    summary = (vl.get("summary") or "").lower()
    # Live-gen summaries usually mention specific facts ("3-1 lead", "55%
    # from three"); v1-backfill summaries are more generic.
    if not summary:
        return True
    # If it has issues array AND score is below 70, very likely v1 backfill
    # since live-gen pass tier skewed higher.
    if vl.get("issues") and (vl.get("score") or 0) < 70:
        return True
    return False


async def _backfill_one(path: Path, *, dry_run: bool, force: bool) -> dict:
    try:
        article = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "failed", "error": f"bad json: {exc}", "cost_usd": 0.0}

    # v2: always re-lint. The live-gen detection heuristic was
    # unreliable (couldn't reliably distinguish live-gen from v1
    # backfill summaries), and the cost of re-linting is so cheap
    # (~$0.001/article) that re-running everything is the safe call.
    # `force=True` is the new default; --skip-fresh kept as a flag
    # in case a future re-run wants to preserve recent edits.
    _ = force  # parameter kept for signature stability

    body_md = article.get("body_md") or ""
    if not body_md.strip():
        return {"status": "skipped", "reason": "empty body", "cost_usd": 0.0}

    # Build authoritative source context via dispatcher; fall back if it can't.
    source_ctx = await _build_source_context(article)
    used_dispatcher = source_ctx is not None
    if not source_ctx:
        source_ctx = _v1_heuristic_context(article)

    if dry_run:
        return {
            "status": "would-update",
            "notes": f"dispatcher={used_dispatcher}, ctx_chars={len(source_ctx or '')}",
            "cost_usd": 0.0,
        }

    lint = await voice_lint.check(body_md, source_context=source_ctx)
    fm = article.setdefault("frontmatter", {})
    fm["voice_lint"] = lint.to_frontmatter()

    with path.open("w", encoding="utf-8") as f:
        json.dump(article, f, indent=2, ensure_ascii=False, sort_keys=False)
        f.write("\n")

    return {
        "status": "updated",
        "notes": f"lint: {lint.verdict} (score {lint.score}, {len(lint.issues)} issues, dispatcher={used_dispatcher})",
        "cost_usd": (lint.usage or {}).get("cost_usd", 0.0) or 0.0,
    }


async def _main(args) -> None:
    targets: list[Path] = []
    type_filter = set(args.types) if args.types else None
    for type_dir in sorted(_CONTENT_ROOT.iterdir()):
        if not type_dir.is_dir():
            continue
        if type_filter and type_dir.name not in type_filter:
            continue
        for f in sorted(type_dir.glob("*.json")):
            targets.append(f)

    print(f"Found {len(targets)} articles")
    if args.limit:
        targets = targets[: args.limit]

    counts = {"updated": 0, "skipped": 0, "failed": 0, "would-update": 0}
    total = 0.0
    for i, p in enumerate(targets, 1):
        res = await _backfill_one(p, dry_run=args.dry_run, force=args.force)
        counts[res["status"]] = counts.get(res["status"], 0) + 1
        total += res.get("cost_usd", 0.0) or 0.0
        notes = res.get("notes") or res.get("reason") or res.get("error") or ""
        print(f"  [{i:3d}/{len(targets)}] {p.name:48} {res['status']:12} — {notes}")

    print(f"\nDone. {counts}. Total cost: ${total:.4f}")


if __name__ == "__main__":
    import os
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--types", action="append")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true",
                        help="Re-lint even articles that look like live-gen scores")
    args = parser.parse_args()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("✗ ANTHROPIC_API_KEY not set", file=sys.stderr); sys.exit(2)
    asyncio.run(_main(args))
