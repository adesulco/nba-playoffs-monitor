"""Backfill voice-lint issues + QC suggestions into existing article JSON.

Phase 2 ship #28. Before this ship, the CLI persisted only the
compact voice_lint shape (verdict / score / issue_count / summary)
without the per-issue array. /editor's new "Show issues" panel
(also shipped #28) needs the issues array to render. This script
re-runs lint on every article so editor can see the actual
snippets + fix suggestions inline.

Cost shape:
  • Voice-lint (Haiku): ~$0.0006 per article × 168 = $0.10
  • Opus QC: skipped except for already-sampled articles. The
    deterministic 10% slug-hash sampler means re-running QC only
    on slugs the original sampler hit. ~17 articles × $0.30 = $5.

Usage::

    cd packages/content-engine
    .venv/bin/python scripts/backfill_lint_issues.py
    .venv/bin/python scripts/backfill_lint_issues.py --dry-run
    .venv/bin/python scripts/backfill_lint_issues.py --skip-qc
    .venv/bin/python scripts/backfill_lint_issues.py --types team --types h2h

Idempotency: skips any article whose voice_lint.issues array is
already populated. Re-run safely after partial failures.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

# Make the package importable when run as a script.
_SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPT_DIR.parent / "src"))

from content_engine.agents import qc as qc_agent  # noqa: E402
from content_engine.quality import qc_sampler, voice_lint  # noqa: E402

_REPO_ROOT = _SCRIPT_DIR.parent.parent.parent
_CONTENT_ROOT = _REPO_ROOT / "public" / "content"


def _reconstruct_source_context(article: dict) -> str | None:
    """Best-effort reconstruction of the source-context block.

    The original generation passed the writer's user-message into
    voice_lint.check / qc.review. That message isn't saved per-article.
    Without it, the Haiku linter has to guess what's grounded vs
    fabricated and tends to over-flag legit input data.

    Heuristic: stitch together the frontmatter fields that came from
    the input data block. Imperfect — score will be a few points lower
    on backfilled articles than on fresh-generated ones — but materially
    better than nothing. Acceptable for v1.
    """
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


async def _backfill_one(path: Path, *, skip_qc: bool, dry_run: bool) -> dict:
    """Returns {status: 'updated'|'skipped'|'failed', cost_usd, ...}."""
    try:
        article = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "failed", "error": f"bad json: {exc}", "cost_usd": 0.0}

    fm = article.setdefault("frontmatter", {})
    body_md = article.get("body_md") or ""
    if not body_md.strip():
        return {"status": "skipped", "reason": "empty body", "cost_usd": 0.0}

    slug = article.get("slug") or path.stem
    art_type = article.get("type") or path.parent.name

    existing_lint = fm.get("voice_lint") or {}
    existing_qc = fm.get("qc_review") or {}
    has_lint_issues = bool(existing_lint.get("issues"))
    has_qc_suggestions = bool(existing_qc.get("suggestions"))

    # In sample? Deterministic by slug hash.
    in_qc_sample = qc_sampler.is_sampled(slug)
    needs_qc = (not skip_qc) and in_qc_sample and not has_qc_suggestions
    needs_lint = not has_lint_issues

    if not needs_lint and not needs_qc:
        return {"status": "skipped", "reason": "already populated", "cost_usd": 0.0}

    source_ctx = _reconstruct_source_context(article)

    cost = 0.0
    notes = []

    if needs_lint:
        if dry_run:
            notes.append("[dry-run] would lint")
        else:
            lint_report = await voice_lint.check(body_md, source_context=source_ctx)
            fm["voice_lint"] = lint_report.to_frontmatter()
            cost += lint_report.usage.get("cost_usd", 0.0) or 0.0
            notes.append(f"lint: {lint_report.verdict} (score {lint_report.score}, {len(lint_report.issues)} issues)")

    if needs_qc:
        if dry_run:
            notes.append("[dry-run] would QC")
        else:
            try:
                qc_report = await qc_agent.review(
                    body_md, article_type=art_type,
                    source_context=source_ctx,
                    title=article.get("title"),
                )
                fm["qc_review"] = qc_report.to_frontmatter()
                cost += qc_report.usage.get("cost_usd", 0.0) or 0.0
                notes.append(f"qc: {qc_report.verdict} (overall {qc_report.overall_score}, {len(qc_report.suggestions)} suggestions)")
            except Exception as exc:  # noqa: BLE001
                notes.append(f"qc failed: {exc}")

    if not dry_run and (needs_lint or needs_qc):
        with path.open("w", encoding="utf-8") as f:
            json.dump(article, f, indent=2, ensure_ascii=False, sort_keys=False)
            f.write("\n")

    return {
        "status": "updated" if (needs_lint or needs_qc) and not dry_run else "would-update" if dry_run else "skipped",
        "notes": "; ".join(notes),
        "in_qc_sample": in_qc_sample,
        "cost_usd": cost,
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

    print(f"Found {len(targets)} articles to consider")
    if args.limit:
        targets = targets[: args.limit]
        print(f"Limited to first {len(targets)} (--limit)")

    total_cost = 0.0
    counts = {"updated": 0, "skipped": 0, "failed": 0, "would-update": 0}
    for i, path in enumerate(targets, 1):
        result = await _backfill_one(path, skip_qc=args.skip_qc, dry_run=args.dry_run)
        counts[result["status"]] = counts.get(result["status"], 0) + 1
        total_cost += result.get("cost_usd", 0.0) or 0.0
        notes = result.get("notes") or result.get("reason") or result.get("error") or ""
        sample_flag = " [QC-sampled]" if result.get("in_qc_sample") else ""
        print(f"  [{i:3d}/{len(targets)}] {path.name:48} {result['status']}{sample_flag} — {notes}")

    print()
    print(f"Done. {counts}. Total cost: ${total_cost:.4f}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill voice-lint issues + QC suggestions.")
    parser.add_argument("--dry-run", action="store_true", help="Don't write JSON; just report what would happen.")
    parser.add_argument("--skip-qc", action="store_true", help="Skip QC re-run even on sampled articles.")
    parser.add_argument("--types", action="append", help="Restrict to specific type folders (repeatable).")
    parser.add_argument("--limit", type=int, default=0, help="Process only the first N articles (debug).")
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("✗ ANTHROPIC_API_KEY not set. source .env first.", file=sys.stderr)
        sys.exit(2)

    asyncio.run(_main(args))


if __name__ == "__main__":
    main()
