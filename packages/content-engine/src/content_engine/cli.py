"""Command-line entry point.

Phase 0 supports::

    python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run
    python -m content_engine.cli health

Phase 1+ adds::

    python -m content_engine.cli preview --fixture-id 1234567 --dry-run
    python -m content_engine.cli recap --fixture-id 1234567
    python -m content_engine.cli backfill --league premier-league --gameweek 35
    python -m content_engine.cli eval --suite all
"""

from __future__ import annotations

import asyncio
import sys
from typing import Annotated

import structlog
import typer

from content_engine.config import settings
from content_engine.publish import auto_publish

app = typer.Typer(
    name="content-engine",
    help="Gibol content engine — Bahasa-first sports content generation pipeline.",
    add_completion=False,
    no_args_is_help=True,
)

log = structlog.get_logger()


async def _maybe_qc_writeback(path, *, slug: str, type_: str, body_md: str, source_context: str | None, title: str | None) -> None:
    """Phase 2 ship #19. Run the Opus 4.7 QC reviewer on a 10% sample
    of generated articles and patch the article's frontmatter with
    the compact QC summary.

    Editor sees the verdict + score in /editor without rebuilding the
    index — the JSON file is updated in-place after the initial write.

    Advisory only — never blocks publish. QC errors are swallowed
    (logged) so a QC failure can't stop the cron loop.
    """
    import json as _json
    from content_engine.quality import qc_sampler

    qc_report = await qc_sampler.maybe_review(
        slug=slug, type_=type_, body_md=body_md,
        source_context=source_context, title=title,
    )
    if qc_report is None:
        return
    # Patch the JSON file with the QC summary. We re-read + re-write
    # so we don't have to thread qc_report through every callsite's
    # frontmatter dict.
    try:
        data = _json.loads(path.read_text(encoding="utf-8"))
        data.setdefault("frontmatter", {})["qc_review"] = qc_report.to_frontmatter()
        path.write_text(_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        typer.echo(
            f"  QC ({qc_report.verdict}, score {qc_report.overall_score}): "
            f"{qc_report.summary[:120]}"
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("cli.qc_writeback_failed", error=str(exc))


def _print_auto_publish_outcome(result) -> None:
    """Phase 1 ship #15. Format the auto-publish decision for the
    CLI output. Called by every per-sport CLI command after the
    JSON file is written.

    Three outcomes:
      • published=True  → article is publicly visible (skipped manual review)
      • flagship_reason set → article is in manual queue regardless of allowlist
      • else            → article is in manual queue (sport not in allowlist)
    """
    if result.published:
        typer.echo(f"  ✓ Auto-published: {result.reason}")
    elif result.flagship_reason:
        typer.echo(f"  ⚠ Flagship — manual review required: {result.flagship_reason}")
    elif result.error:
        typer.echo(f"  ⚠ Auto-publish failed (manual review required): {result.error}", err=True)
    else:
        typer.echo(f"  → Manual review queue: {result.reason}")


@app.command()
def health() -> None:
    """Print resolved config + DB connectivity check.

    Sanity check that ``.env`` is readable, required keys are present,
    Postgres is reachable, and the migration 0006 tables exist.
    """
    typer.echo("[content-engine] Phase: " + settings.phase)
    db_status = "set" if settings.database_url else "not set (OK for Phase 0 dry-run)"
    typer.echo(f"  database_url     : {db_status}")
    typer.echo(f"  anthropic_api_key: {'***' + settings.anthropic_api_key[-6:]}")
    typer.echo(f"  api_football_key : {'***' + settings.api_football_key[-6:]}")
    typer.echo(f"  openai_api_key   : {'set' if settings.openai_api_key else 'not set (OK for Phase 0–3)'}")
    typer.echo(f"  daily_budget_usd : ${settings.daily_token_budget_usd}")
    typer.echo(f"  models           : {settings.model_narrative} / {settings.model_templated} / {settings.model_qc}")
    typer.echo(f"  prompt cache     : {'on' if settings.enable_prompt_cache else 'off'}")
    typer.echo(f"  batch API        : {'on' if settings.enable_batch_api else 'off'}")

    # DB ping — only attempt if DATABASE_URL is configured. Phase 0 dry-run
    # path skips DB entirely (fetches from API-Football, prints, exits). The
    # ping comes online for Phase 0 final-acceptance + Phase 1 onwards.
    if not settings.database_url:
        typer.echo("  postgres         : skipped (DATABASE_URL not set)")
        return
    try:
        from content_engine.data import db

        asyncio.run(db.ping())
        typer.echo("  postgres         : ✓ reachable")
    except Exception as exc:  # noqa: BLE001
        typer.echo(f"  postgres         : ✗ {exc}", err=True)
        sys.exit(1)


@app.command()
def ingest(
    league: Annotated[str, typer.Option(help="League id: premier-league, liga-1-id, nba-playoffs-2026, f1-2026, fifa-wc-2026")],
    gameweek: Annotated[int | None, typer.Option(help="Gameweek (football); ignored for nba/f1.")] = None,
    dry_run: Annotated[bool, typer.Option(help="Fetch + normalize + log; do NOT write to ce_* tables.")] = False,
) -> None:
    """Fetch fixtures + events for a league/gameweek and store in ``ce_*`` tables.

    Phase 0 health check: ``ingest --league premier-league --gameweek 35 --dry-run``
    should return clean normalized rows for every fixture, with zero schema
    mismatches and zero hallucinated data.
    """
    from content_engine.data import api_football, normalizer, db

    log.info("ingest.start", league=league, gameweek=gameweek, dry_run=dry_run)

    async def _run() -> None:
        if league in {"premier-league", "epl"}:
            raw = await api_football.fetch_epl_gameweek(gameweek or 35)
            normalized = normalizer.normalize_epl_fixtures(raw)
        elif league in {"liga-1-id", "super-league"}:
            raw = await api_football.fetch_liga1_gameweek(gameweek or 1)
            normalized = normalizer.normalize_liga1_fixtures(raw)
        else:
            typer.echo(f"League '{league}' not yet supported in Phase 0.", err=True)
            sys.exit(2)

        log.info("ingest.fetched", count=len(normalized))

        if dry_run:
            typer.echo(f"DRY RUN — {len(normalized)} fixtures normalized:")
            for fx in normalized[:5]:
                typer.echo(f"  {fx['kickoff_utc']} | {fx['home_team']} vs {fx['away_team']} | {fx['venue']}")
            if len(normalized) > 5:
                typer.echo(f"  … {len(normalized) - 5} more")
            return

        written = await db.upsert_fixtures(normalized)
        typer.echo(f"✓ {written} fixtures upserted into ce_fixtures.")

    asyncio.run(_run())


@app.command()
def preview(
    fixture_id: Annotated[str, typer.Option(help="API-Football fixture id (numeric string).")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON to public/content/preview/.")] = True,
    write: Annotated[bool, typer.Option(help="Write the article JSON to public/content/preview/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa pre-match preview for an API-Football fixture.

    Phase 1 ship #1. Fetches the fixture context, loads voice rules +
    preview system prompt (cached), runs Sonnet 4.6, applies the
    banned-phrase quality gate, optionally writes JSON to
    ``public/content/preview/{slug}.json``.

    Manual review queue: even with --write, the article goes to disk
    with frontmatter.manual_review = true. The SPA route rendering it
    can show a "PENDING REVIEW" badge until that flag flips.

    Example::

        python -m content_engine.cli preview --fixture-id 1234567 --dry-run
        python -m content_engine.cli preview --fixture-id 1234567 --write
    """
    import asyncio
    import json as _json
    from datetime import datetime, timezone

    from content_engine.agents import preview as preview_agent
    from content_engine.data import api_football, normalizer, preview_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, fact_check, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("preview.cli.start", fixture_id=fixture_id, dry_run=dry_run, write=write)

        # 1. Fetch fixture from API-Football
        raw = await api_football.fetch_fixture(fixture_id)
        if not raw.get("response"):
            typer.echo(f"✗ Fixture {fixture_id} not found in API-Football response.", err=True)
            raise typer.Exit(2)
        fx_raw = raw["response"][0]

        # 2. Detect the league from the fixture's league.id and
        # normalize. Phase 1 ship #9: previously we hardcoded "epl"
        # which broke Liga 1 generation through the same CLI command.
        league_id = normalizer.detect_league_id(fx_raw)
        norm = normalizer._normalize_af_fixtures(  # noqa: SLF001 — Phase 1 tap-in
            {"response": [fx_raw]},
            league_id=league_id,
            season="2025-26",
            gameweek=fx_raw.get("league", {}).get("round", "").split(" - ")[-1].strip() or 0,
        )
        if not norm:
            typer.echo("✗ Fixture normalization failed.", err=True)
            raise typer.Exit(2)
        fx = norm[0]

        # 3. Build the full user-message context via preview_context.
        # Phase 1 ship #2: real standings + form + H2H + top-scorer
        # data lands here. The module caches league-wide fetches (
        # standings, topscorers) within the run, so a 10-fixture
        # batch hits the API ~12 times instead of ~30.
        kickoff_utc: datetime = fx["kickoff_utc"]  # tz-aware datetime
        ctx = await preview_context.build_context(fx)

        # 4. Run the preview agent (Sonnet 4.6 with cached system prompt)
        result = await preview_agent.write_preview(ctx)
        body_raw = result["body_md"]

        # 5. Deterministic polish — em-dash → comma, semicolon → period,
        # smart quotes → straight, etc. Runs BEFORE the hard gate per
        # quality/polish.py docstring: voice-rules.md prescribes the
        # exact substitution, so this is doctrine-compliant remediation,
        # not a bypass. Mechanical only; no LLM judgment.
        body = polish.polish(body_raw)

        # 6. Quality gate: banned-phrase regex (hard fail = regenerate).
        # Polished body should pass cleanly; anything that fails here is
        # an actual voice violation that the polish couldn't reconcile.
        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed. Regenerate with the offenders called out in the prompt.", err=True)
            # Print the article so the human can see what was generated
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        # 6b. Voice lint (Haiku 4.5). Catches what regex can't —
        # tense over-marking, soft-discouraged repeats, training-data
        # inferences, academic register drift.
        #
        # Phase 1: SOFT gate. The linter is calibrated strictly enough
        # that legitimate articles often score 62-82, so blocking on
        # verdict would create excessive regenerate loops without
        # clear quality signal. Per CLAUDE.md rule #9 the hard gates
        # are banned-phrase regex + fact validator + plagiarism;
        # voice lint isn't on that list. Phase 2 flips this to hard
        # when auto-publish lands and we've tuned the threshold on
        # 100+ articles of editorial feedback.
        #
        # We DO persist the verdict + score + issues in the
        # frontmatter so the editor dashboard can sort by score and
        # surface low-medium issues for human review even on a "pass"
        # verdict.
        #
        # Pass the same user-message the writer agent saw so the
        # linter can ground-check fact claims against the input data.
        source_ctx = preview_agent.format_fixture_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # 6c. Fact validator HARD gate. Rule-based numerical-claim
        # cross-check against the same source context the writer saw.
        # Per CLAUDE.md non-negotiable rule #9.
        # Catches: wrong table position, wrong points total, wrong
        # form string, wrong top-scorer goal count, wrong recap
        # score, wrong goal-minute. Hard fail = exit 6, no bypass
        # flag.
        fact_report = fact_check.check(body, source_ctx, recap=False)
        typer.echo(fact_report.summary())
        if not fact_report.passed:
            typer.echo(
                "\n✗ Fact validator failed. The article asserts numerical "
                "claims (positions, points, form, goal counts) that don't "
                "match the input data. Regenerate with the offending values "
                "called out, or correct manually.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED FACT GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(6)

        # 6d. Plagiarism + dedup HARD gate. Per CLAUDE.md rule #9 +
        # response doc § 6: 64-bit SimHash over 7-gram char shingles
        # against (a) all previously-published articles in
        # public/content/, (b) the external corpus (Bola.net /
        # Detik / etc — corpus snapshot in
        # packages/content-engine/data/external-corpus.jsonl,
        # currently empty in Phase 1 ship #4 — populated by future
        # ship's polite scraper).
        #
        # Distance ≤ 6 / 64 = ≥ 90.6% similarity = hard fail.
        # Self-comparison is skipped (slug match) so a regenerate
        # against an existing article doesn't fail itself.
        article_slug_for_check = slug_mod.fixture_slug(
            fx["home_team"], fx["away_team"], kickoff_utc
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug_for_check,
            article_type="preview",
            title=f"Preview {fx['home_team']} vs {fx['away_team']}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo(
                "\n✗ Plagiarism gate failed. The article overlaps too "
                "closely with another article (internal or external corpus). "
                "Regenerate with a different angle or rewrite the matching "
                "passages.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED PLAGIARISM GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(5)

        # 7. Cost report (preview agent + voice lint combined)
        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Preview: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN PREVIEW (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/preview/) ---")
            return

        # 7. Build slug + write JSON
        article_slug = slug_mod.fixture_slug(fx["home_team"], fx["away_team"], kickoff_utc)
        title = f"Preview {fx['home_team']} vs {fx['away_team']}"
        description = (
            f"Preview Bahasa Indonesia untuk {fx['home_team']} vs {fx['away_team']} di "
            f"{fx.get('venue') or 'venue tba'}, {kickoff_utc.strftime('%-d %B %Y')}."
        )

        path = json_writer.write_article(
            type_="preview",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": league_id,
                "fixture_id": fx["source_fixture_id"],
                "home_team": fx["home_team"],
                "away_team": fx["away_team"],
                "kickoff_utc": kickoff_utc.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "venue": fx.get("venue"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                # Voice-lint results — Phase 1 ship #3. Editor
                # dashboard can sort by score, surface low-medium
                # issues for human review even on a "pass" verdict.
                "voice_lint": lint_report.to_frontmatter(),
                # Plagiarism fingerprint — Phase 1 ship #4. The hex
                # 64-bit SimHash lets future loads of this article
                # participate in the internal dedup corpus without
                # re-fingerprinting (cheap optimization at scale).
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
                # Fact-check status — Phase 1 ship #5. By the time
                # we reach JSON write the gate has already passed,
                # so we just persist the fact that it passed +
                # whatever metadata is useful for editorial sort.
                "fact_check": {
                    "passed": fact_report.passed,
                    "issue_count": len(fact_report.issues),
                },
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route (after Phase 1 ship #2): /preview/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="preview",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="preview",
            sport_id=league_id, flagship_ctx=fx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command()
def recap(
    fixture_id: Annotated[str, typer.Option(help="API-Football fixture id (numeric string).")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON to public/content/recap/.")] = True,
    write: Annotated[bool, typer.Option(help="Write the article JSON to public/content/recap/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa post-match recap for a finished API-Football fixture.

    Phase 1 ship #3. Mirrors the preview command's pipeline:

      1. Fetch fixture (must be status=final)
      2. Normalize, then build recap context (events + lineups + stats
         pulled in parallel from /fixtures/{events,lineups,statistics})
      3. Run Sonnet 4.6 with the cached voice-rules + recap-system prompt
      4. Polish (em-dash → comma, etc.)
      5. Banned-phrase gate (hard fail blocks publish)
      6. Voice lint (soft gate — surfaces issues, persists to frontmatter)
      7. Optionally write JSON to public/content/recap/{slug}.json

    Manual review queue: even with --write, the article goes to disk
    with frontmatter.manual_review = true.

    Example::

        python -m content_engine.cli recap --fixture-id 1379304 --dry-run
        python -m content_engine.cli recap --fixture-id 1379304 --write
    """
    import asyncio

    from content_engine.agents import recap as recap_agent
    from content_engine.data import api_football, normalizer, recap_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, fact_check, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("recap.cli.start", fixture_id=fixture_id, dry_run=dry_run, write=write)

        # 1. Fetch fixture from API-Football
        raw = await api_football.fetch_fixture(fixture_id)
        if not raw.get("response"):
            typer.echo(f"✗ Fixture {fixture_id} not found in API-Football response.", err=True)
            raise typer.Exit(2)
        fx_raw = raw["response"][0]

        # 2. Detect league from fixture + normalize. Multi-league
        # ready (Phase 1 ship #9 — Liga 1 dispatch).
        league_id = normalizer.detect_league_id(fx_raw)
        norm = normalizer._normalize_af_fixtures(  # noqa: SLF001 — Phase 1 tap-in
            {"response": [fx_raw]},
            league_id=league_id,
            season="2025-26",
            gameweek=fx_raw.get("league", {}).get("round", "").split(" - ")[-1].strip() or 0,
        )
        if not norm:
            typer.echo("✗ Fixture normalization failed.", err=True)
            raise typer.Exit(2)
        fx = norm[0]

        if fx["status"] != "final":
            typer.echo(
                f"✗ Fixture {fixture_id} is status={fx['status']!r}, not final. "
                "Recap requires a finished match.",
                err=True,
            )
            raise typer.Exit(2)

        kickoff_utc = fx["kickoff_utc"]

        # 3. Build the recap context — events + lineups + stats fetched
        # in parallel through the API-Football proxy.
        ctx = await recap_context.build_context(fx)

        # 4. Run the recap agent (Sonnet 4.6 with cached system prompt)
        result = await recap_agent.write_recap(ctx)
        body_raw = result["body_md"]

        # 5. Deterministic polish
        body = polish.polish(body_raw)

        # 6. Banned-phrase hard gate
        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed. Regenerate.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        # 6b. Voice lint (soft gate — surface, don't block)
        source_ctx = recap_agent.format_recap_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # 6c. Fact validator HARD gate. Catches wrong final score,
        # wrong goal-minute claims. Same module as preview pipeline,
        # called with recap=True.
        fact_report = fact_check.check(body, source_ctx, recap=True)
        typer.echo(fact_report.summary())
        if not fact_report.passed:
            typer.echo(
                "\n✗ Fact validator failed. The recap asserts numerical "
                "claims (final score, goal minutes) that don't match the "
                "match data. Regenerate or correct manually.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED FACT GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(6)

        # 6d. Plagiarism + dedup HARD gate. Same shape as preview path.
        # See preview command for the full doctrine note.
        article_slug_for_check = slug_mod.fixture_slug(
            fx["home_team"], fx["away_team"], kickoff_utc
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug_for_check,
            article_type="recap",
            title=f"Recap {fx['home_team']} {fx.get('home_score')}-{fx.get('away_score')} {fx['away_team']}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo(
                "\n✗ Plagiarism gate failed. Recap overlaps too closely with "
                "another article. Regenerate with a different angle.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED PLAGIARISM GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(5)

        # 7. Cost report
        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Recap: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN RECAP (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/recap/) ---")
            return

        # 8. Build slug + write JSON
        article_slug = slug_mod.fixture_slug(fx["home_team"], fx["away_team"], kickoff_utc)
        title = f"Recap {fx['home_team']} {fx.get('home_score')}-{fx.get('away_score')} {fx['away_team']}"
        description = (
            f"Recap Bahasa Indonesia untuk {fx['home_team']} vs {fx['away_team']} "
            f"({fx.get('home_score')}-{fx.get('away_score')}) di "
            f"{fx.get('venue') or 'venue tba'}, {kickoff_utc.strftime('%-d %B %Y')}."
        )

        path = json_writer.write_article(
            type_="recap",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": league_id,
                "fixture_id": fx["source_fixture_id"],
                "home_team": fx["home_team"],
                "away_team": fx["away_team"],
                "home_score": fx.get("home_score"),
                "away_score": fx.get("away_score"),
                "kickoff_utc": kickoff_utc.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "venue": fx.get("venue"),
                "home_formation": ctx.get("home_formation"),
                "home_coach": ctx.get("home_coach"),
                "away_formation": ctx.get("away_formation"),
                "away_coach": ctx.get("away_coach"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /match-recap/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="recap",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="recap",
            sport_id=league_id, flagship_ctx=fx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command()
def standings(
    league: Annotated[str, typer.Option(help="League id: epl, liga-1-id")] = "epl",
    gameweek: Annotated[int, typer.Option(help="Gameweek that just finished — used for slug + matches-left framing")] = 34,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON to public/content/standings/.")] = True,
    write: Annotated[bool, typer.Option(help="Write the article JSON to public/content/standings/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa weekly standings explainer.

    Phase 1 ship #8. Templated agent (Haiku 4.5). Pipeline:

      1. Fetch standings via the existing /standings endpoint.
      2. Build context (fixed-width table + top/bottom 3 movers block).
      3. Run Haiku 4.5 with cached voice-rules + standings-system prompt.
      4. Polish (em-dash → comma, etc.)
      5. Banned-phrase regex (hard fail blocks publish)
      6. Voice lint (soft Phase 1)
      7. Plagiarism + dedup (hard)
      8. Optionally write JSON to public/content/standings/{slug}.json

    Skipped vs preview/recap pipelines: fact validator. The current
    rule-based fact-check is calibrated for fixture-shaped articles
    (positions, points, form, scorer goals). Standings articles cite
    EVERY position + every team's form by design — the fact-check
    rules wouldn't add signal here. Phase 2 may add a standings-
    specific fact-check (every figure in the body must appear in the
    rendered table).

    Example::

        python -m content_engine.cli standings --league epl --gameweek 34 --dry-run
        python -m content_engine.cli standings --league epl --gameweek 34 --write
    """
    import asyncio

    from content_engine.agents import standings as standings_agent
    from content_engine.data import standings_context
    from content_engine.publish import json_writer
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info(
            "standings.cli.start",
            league=league, gameweek=gameweek, dry_run=dry_run, write=write,
        )

        # 1. Build the context (standings table + movers block)
        ctx = await standings_context.build_context(
            league_id=league, gameweek=gameweek,
        )

        # 2. Run the Haiku agent
        result = await standings_agent.write_standings(ctx)
        body_raw = result["body_md"]

        # 3. Polish
        body = polish.polish(body_raw)

        # 4. Banned-phrase hard gate
        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed. Regenerate.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        # 5. Voice lint (soft gate)
        source_ctx = standings_agent.format_standings_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # 6. Plagiarism hard gate
        article_slug = f"{league}-2025-26-pekan-{gameweek}"
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="standings",
            title=f"Klasemen {ctx['league_name']} pekan {gameweek}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed. Regenerate.", err=True)
            raise typer.Exit(5)

        # 7. Cost report
        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Standings: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN STANDINGS (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/standings/) ---")
            return

        # 8. Write JSON
        title = f"Klasemen {ctx['league_name']} pekan {gameweek}"
        description = (
            f"Analisis klasemen {ctx['league_name']} setelah pekan {gameweek}. "
            f"Sisa {ctx['matches_left']} pertandingan."
        )
        path = json_writer.write_article(
            type_="standings",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": league,
                "gameweek": gameweek,
                "matches_left": ctx["matches_left"],
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /standings/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="standings",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="standings",
            sport_id=league, flagship_ctx={},
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="nba-recap")
def nba_recap_cmd(
    game_id: Annotated[str, typer.Option(help="ESPN NBA game (event) id, e.g. 401869406")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/recap/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa NBA Playoffs recap for a finished ESPN game.

    Phase 1 ship #11. Same gate pipeline as football recap:
    polish → banned-phrase → voice-lint → fact-check (skipped, NBA-specific
    rule-based fact-check is a future ship) → plagiarism → JSON write.

    Example::

        python -m content_engine.cli nba-recap --game-id 401869406 --write
    """
    import asyncio

    from content_engine.agents import nba_recap as nba_recap_agent
    from content_engine.data import nba_recap_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, nba_fact_check, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("nba_recap.cli.start", game_id=game_id, dry_run=dry_run, write=write)

        # 1. Build the recap context (one ESPN /summary call)
        ctx = await nba_recap_context.build_context(game_id)

        if ctx["status"] != "final":
            typer.echo(
                f"✗ Game {game_id} is status={ctx['status']!r}, not final. "
                "NBA recap requires a finished game.",
                err=True,
            )
            raise typer.Exit(2)

        # 2. Run the writer
        result = await nba_recap_agent.write_nba_recap(ctx)
        body_raw = result["body_md"]

        # 3. Polish
        body = polish.polish(body_raw)

        # 4. Banned-phrase hard gate
        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed. Regenerate.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        # 5. Voice lint (soft)
        source_ctx = nba_recap_agent.format_nba_recap_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # 5b. NBA-specific fact-check HARD gate (Ship #17). Catches
        # triple-double / double-double misuse + scorer-points
        # mismatches + wrong final-score citations against the input
        # box-score data. Same hard-gate semantics as the football
        # fact validator.
        nba_fact_report = nba_fact_check.check(body, ctx)
        typer.echo(nba_fact_report.summary())
        if not nba_fact_report.passed:
            typer.echo(
                "\n✗ NBA fact-check failed. Stat lines / scores cited in the article "
                "don't match the input box score. Regenerate or correct manually.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED NBA FACT GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(6)

        # 6. Plagiarism hard gate
        game_number = ctx["_series"].get("current_game") if ctx.get("_series") else None
        # For finished games, current_game might be N+1 (next game). We
        # want THIS game's number, which is games_played for completed
        # series else the last completed event index.
        games_played = ctx["_series"].get("games_played") if ctx.get("_series") else None
        article_slug = slug_mod.nba_game_slug(
            ctx["home_abbr"], ctx["away_abbr"],
            ctx["_header"]["tipoff_utc"],
            games_played,
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="recap",
            title=f"NBA Recap {ctx['away_abbr']} {ctx['away_score']}-{ctx['home_score']} {ctx['home_abbr']}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        # 7. Cost report
        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"NBA recap: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN NBA RECAP (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/recap/) ---")
            return

        title = f"Recap {ctx['away_team']} {ctx['away_score']}-{ctx['home_score']} {ctx['home_team']} (Game {games_played or '?'})"
        description = (
            f"Recap NBA Playoffs 2026 — {ctx['away_team']} vs {ctx['home_team']} "
            f"({ctx['away_score']}-{ctx['home_score']}) di {ctx.get('venue') or 'venue tba'}, "
            f"{ctx['_header']['tipoff_utc'].strftime('%-d %B %Y')}."
        )
        path = json_writer.write_article(
            type_="recap",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "nba",
                "sport": "basketball",
                "game_id": ctx["game_id"],
                "home_team": ctx["home_team"],
                "home_abbr": ctx["home_abbr"],
                "away_team": ctx["away_team"],
                "away_abbr": ctx["away_abbr"],
                "home_score": ctx["home_score"],
                "away_score": ctx["away_score"],
                "winner_abbr": ctx["winner_abbr"],
                "kickoff_utc": ctx["_header"]["tipoff_utc"].strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "venue": ctx.get("venue"),
                "series_round": (ctx.get("_series") or {}).get("round"),
                "series_summary": (ctx.get("_series") or {}).get("summary"),
                "game_number": games_played,
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /match-recap/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="recap",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="recap",
            sport_id="nba", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="nba-preview")
def nba_preview_cmd(
    game_id: Annotated[str, typer.Option(help="ESPN NBA game (event) id, e.g. 401869408")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/preview/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa NBA Playoffs preview for an upcoming game.

    Example::

        python -m content_engine.cli nba-preview --game-id 401869408 --write
    """
    import asyncio

    from content_engine.agents import nba_preview as nba_preview_agent
    from content_engine.data import nba_preview_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("nba_preview.cli.start", game_id=game_id, dry_run=dry_run, write=write)

        ctx = await nba_preview_context.build_context(game_id)

        if ctx["status"] == "final":
            typer.echo(
                f"✗ Game {game_id} is already final. Use nba-recap instead.",
                err=True,
            )
            raise typer.Exit(2)

        result = await nba_preview_agent.write_nba_preview(ctx)
        body_raw = result["body_md"]
        body = polish.polish(body_raw)

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = nba_preview_agent.format_nba_preview_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # Use current_game for upcoming preview slug
        current_game = (ctx.get("_series") or {}).get("current_game")
        article_slug = slug_mod.nba_game_slug(
            ctx["home_abbr"], ctx["away_abbr"],
            ctx["_header"]["tipoff_utc"],
            current_game,
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="preview",
            title=f"NBA Preview {ctx['away_abbr']} @ {ctx['home_abbr']}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"NBA preview: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN NBA PREVIEW (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/preview/) ---")
            return

        title = f"Preview {ctx['away_team']} @ {ctx['home_team']} (Game {current_game or '?'})"
        description = (
            f"Preview NBA Playoffs 2026 — {ctx['away_team']} di kandang {ctx['home_team']} "
            f"({ctx.get('venue') or 'venue tba'}), "
            f"{ctx['_header']['tipoff_utc'].strftime('%-d %B %Y')}."
        )
        path = json_writer.write_article(
            type_="preview",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "nba",
                "sport": "basketball",
                "game_id": ctx["game_id"],
                "home_team": ctx["home_team"],
                "home_abbr": ctx["home_abbr"],
                "away_team": ctx["away_team"],
                "away_abbr": ctx["away_abbr"],
                "kickoff_utc": ctx["_header"]["tipoff_utc"].strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "venue": ctx.get("venue"),
                "series_round": (ctx.get("_series") or {}).get("round"),
                "series_summary": (ctx.get("_series") or {}).get("summary"),
                "game_number": current_game,
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /preview/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="preview",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="preview",
            sport_id="nba", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="f1-recap")
def f1_recap_cmd(
    season: Annotated[int, typer.Option(help="F1 season, e.g. 2026")] = 2026,
    round_num: Annotated[int, typer.Option("--round", help="Round number (1-22)")] = 3,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/recap/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa F1 race recap.

    Phase 1 ship #12. Three jolpica calls (results + qualifying +
    standings), then Sonnet 4.6, then full gate pipeline.

    Example::

        python -m content_engine.cli f1-recap --season 2026 --round 3 --write
    """
    import asyncio

    from content_engine.agents import f1_recap as f1_recap_agent
    from content_engine.data import f1_recap_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, f1_fact_check, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("f1_recap.cli.start", season=season, round=round_num, dry_run=dry_run, write=write)

        ctx = await f1_recap_context.build_context(season, round_num)
        if not ctx.get("_results"):
            typer.echo(
                f"✗ No results for {season} round {round_num}. Race may not have happened yet.",
                err=True,
            )
            raise typer.Exit(2)

        result = await f1_recap_agent.write_f1_recap(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = f1_recap_agent.format_f1_recap_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # F1-specific fact-check HARD gate (Ship #17). Catches wrong
        # winner attribution + wrong driver-position pairings.
        f1_fact_report = f1_fact_check.check(body, ctx)
        typer.echo(f1_fact_report.summary())
        if not f1_fact_report.passed:
            typer.echo(
                "\n✗ F1 fact-check failed. Driver positions / winner cited in the "
                "article don't match the race classification. Regenerate or correct.",
                err=True,
            )
            typer.echo("\n--- DRAFT (FAILED F1 FACT GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(6)

        article_slug = slug_mod.f1_race_slug(ctx["race_name"], season)
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="recap",
            title=f"Recap {ctx['race_name']} {season}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"F1 recap: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN F1 RECAP (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/recap/) ---")
            return

        winner = ctx["_results"][0] if ctx.get("_results") else {}
        title = f"Recap {ctx['race_name']} {season} — {winner.get('driver_name', '?')} Juara"
        description = (
            f"Recap F1 {season} {ctx['race_name']} di {ctx.get('circuit', 'sirkuit')}, "
            f"{ctx.get('country', '')}. Round {round_num}/22 musim {season}."
        )
        path = json_writer.write_article(
            type_="recap",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "f1",
                "sport": "motorsport",
                "season": season,
                "round": round_num,
                "race_name": ctx["race_name"],
                "circuit": ctx.get("circuit"),
                "country": ctx.get("country"),
                "kickoff_utc": ctx["race_date_utc"].strftime("%Y-%m-%dT%H:%M:%S+00:00") if ctx.get("race_date_utc") else None,
                "winner_driver": winner.get("driver_name"),
                "winner_code": winner.get("driver_code"),
                "winner_constructor": winner.get("constructor"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /match-recap/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="recap",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="recap",
            sport_id="f1", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="f1-preview")
def f1_preview_cmd(
    season: Annotated[int, typer.Option(help="F1 season, e.g. 2026")] = 2026,
    round_num: Annotated[int, typer.Option("--round", help="Round number (1-22)")] = 4,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/preview/{slug}.json.")] = False,
) -> None:
    """Generate a Bahasa F1 race weekend preview.

    Example::

        python -m content_engine.cli f1-preview --season 2026 --round 4 --write
    """
    import asyncio

    from content_engine.agents import f1_preview as f1_preview_agent
    from content_engine.data import f1_preview_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("f1_preview.cli.start", season=season, round=round_num, dry_run=dry_run, write=write)

        ctx = await f1_preview_context.build_context(season, round_num)
        if not ctx.get("race_name"):
            typer.echo(f"✗ Could not load race meta for {season} round {round_num}.", err=True)
            raise typer.Exit(2)

        result = await f1_preview_agent.write_f1_preview(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = f1_preview_agent.format_f1_preview_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.f1_race_slug(ctx["race_name"], season)
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="preview",
            title=f"Preview {ctx['race_name']} {season}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"F1 preview: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN F1 PREVIEW (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/preview/) ---")
            return

        leader = ctx["_drivers"][0] if ctx.get("_drivers") else {}
        title = f"Preview {ctx['race_name']} {season} — Round {round_num}"
        description = (
            f"Preview F1 {season} {ctx['race_name']} di {ctx.get('circuit', 'sirkuit')}, "
            f"{ctx.get('country', '')}. {leader.get('driver_name', 'Pemimpin')} pimpin klasemen."
        )
        path = json_writer.write_article(
            type_="preview",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "f1",
                "sport": "motorsport",
                "season": season,
                "round": round_num,
                "race_name": ctx["race_name"],
                "circuit": ctx.get("circuit"),
                "country": ctx.get("country"),
                "kickoff_utc": ctx["race_date_utc"].strftime("%Y-%m-%dT%H:%M:%S+00:00") if ctx.get("race_date_utc") else None,
                "championship_leader": leader.get("driver_name"),
                "leader_points": leader.get("points"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /preview/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="preview",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="preview",
            sport_id="f1", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="tennis-rankings")
def tennis_rankings_cmd(
    tour: Annotated[str, typer.Option(help="Tour: 'atp' or 'wta'")] = "atp",
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/standings/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa weekly tennis rankings analysis (ATP or WTA).

    Phase 1 ship #13. Templated agent (Haiku 4.5). Two ESPN calls
    (rankings + active-scoreboard for tournament context). Same gate
    pipeline as football standings:
    polish → banned-phrase → voice-lint → plagiarism.

    Article filed under the ``standings`` content type so the SPA's
    /standings/[slug] route serves it. Slug format:
    ``ranking-{tour}-{year}-pekan-{week-iso}``.

    Example::

        python -m content_engine.cli tennis-rankings --tour atp --write
        python -m content_engine.cli tennis-rankings --tour wta --write
    """
    import asyncio
    from datetime import datetime, timezone

    from content_engine.agents import tennis_rankings as tennis_agent
    from content_engine.data import tennis_rankings_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False
    if tour not in {"atp", "wta"}:
        typer.echo(f"✗ tour must be 'atp' or 'wta', got {tour!r}", err=True)
        raise typer.Exit(2)

    async def _run() -> None:
        log.info("tennis_rankings.cli.start", tour=tour, dry_run=dry_run, write=write)

        ctx = await tennis_rankings_context.build_context(tour=tour)
        if not ctx.get("_rankings"):
            typer.echo("✗ No rankings data — ESPN may be down.", err=True)
            raise typer.Exit(2)

        result = await tennis_agent.write_tennis_rankings(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = tennis_agent.format_tennis_rankings_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # Slug uses ISO calendar week of the rankings update date so weekly
        # articles stack cleanly.
        ref_dt = ctx.get("updated_utc") or datetime.now(timezone.utc)
        year, week, _ = ref_dt.isocalendar()
        article_slug = slug_mod.tennis_rankings_slug(tour, year, f"pekan-{week:02d}")
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="standings",
            title=f"Ranking {tour.upper()} pekan {week}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Tennis rankings: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN TENNIS RANKINGS (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/standings/) ---")
            return

        no_1 = ctx["_rankings"][0] if ctx["_rankings"] else {}
        title = f"Ranking {tour.upper()} pekan {week} — {no_1.get('athlete_name', '?')} di Puncak"
        description = (
            f"Analisis ranking {tour.upper()} {year} pekan {week}. "
            f"{no_1.get('athlete_name', 'Top seed')} ({no_1.get('points', 0):,} poin) memimpin tour."
        )
        path = json_writer.write_article(
            type_="standings",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "tennis",
                "sport": "tennis",
                "tour": tour,
                "year": year,
                "iso_week": week,
                "no_1_name": no_1.get("athlete_name"),
                "no_1_points": no_1.get("points"),
                "active_tournament": (ctx.get("_active") or {}).get("name"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /standings/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="standings",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="standings",
            sport_id="tennis", flagship_ctx={"article_type": "ranking"},
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="tennis-recap")
def tennis_recap_cmd(
    match_id: Annotated[str, typer.Option(help="ESPN tennis competition id, e.g. 176716")],
    tour: Annotated[str, typer.Option(help="Tour: 'atp' or 'wta'")] = "atp",
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/recap/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa tennis match recap from a finished ESPN match.

    Phase 2 ship #17e. Walks the ATP or WTA scoreboard for the match,
    extracts player + set + winner data, runs Sonnet 4.6, full gate
    pipeline (polish → banned-phrase → voice-lint → plagiarism).
    Article filed under the recap content type.

    Example::

        python -m content_engine.cli tennis-recap --match-id 176716 --tour atp --write
    """
    import asyncio
    from datetime import datetime

    from content_engine.agents import tennis_match_recap as tennis_match_agent
    from content_engine.data import tennis_match_recap_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("tennis_recap.cli.start", match_id=match_id, tour=tour, dry_run=dry_run, write=write)

        ctx = await tennis_match_recap_context.build_context(match_id, tour=tour)
        if not ctx:
            typer.echo(
                f"✗ Tennis match {match_id} not found in ATP or WTA scoreboard. "
                "Match may be too old (scoreboard truncates after a few weeks).",
                err=True,
            )
            raise typer.Exit(2)
        if ctx["status"] != "final":
            typer.echo(
                f"✗ Match {match_id} is status={ctx['status']!r}, not final.",
                err=True,
            )
            raise typer.Exit(2)

        result = await tennis_match_agent.write_tennis_match_recap(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = tennis_match_agent.format_tennis_match_recap_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        # Slug — winner first per the engine's convention.
        p1, p2 = ctx["_p1"], ctx["_p2"]
        winner = p1 if p1.get("winner") else p2
        loser = p2 if p1.get("winner") else p1
        year = (ctx.get("match_date_utc") or datetime.now()).year
        article_slug = slug_mod.tennis_match_slug(
            winner.get("name"), loser.get("name"),
            ctx.get("tournament_name") or "tournament",
            year,
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="recap",
            title=f"Recap {ctx.get('tournament_name')} — {winner.get('name')} vs {loser.get('name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Tennis recap: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN TENNIS RECAP (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/recap/) ---")
            return

        title = f"Recap {ctx['tournament_name']} — {winner.get('name')} kalahkan {loser.get('name')}"
        sets = " ".join(
            f"{w}-{l}" for w, l in zip(winner.get("set_scores", []), loser.get("set_scores", []))
        )
        description = (
            f"Recap {ctx['tournament_name']} {ctx.get('round') or ''}: "
            f"{winner.get('name')} mengalahkan {loser.get('name')} {sets}."
        )
        path = json_writer.write_article(
            type_="recap",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "tennis",
                "sport": "tennis",
                "tour": ctx["tour"],
                "match_id": ctx["match_id"],
                "tournament_name": ctx.get("tournament_name"),
                "round": ctx.get("round"),
                "match_format": ctx.get("match_format"),
                "venue": ctx.get("venue"),
                "kickoff_utc": ctx["match_date_utc"].strftime("%Y-%m-%dT%H:%M:%S+00:00") if ctx.get("match_date_utc") else None,
                "winner_name": winner.get("name"),
                "winner_country": winner.get("country"),
                "loser_name": loser.get("name"),
                "loser_country": loser.get("country"),
                "set_scores_winner": winner.get("set_scores"),
                "set_scores_loser": loser.get("set_scores"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /match-recap/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="recap",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="recap",
            sport_id="tennis", flagship_ctx={"article_type": "match_recap"},
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="nba-series")
def nba_series_cmd(
    game_id: Annotated[str, typer.Option(help="Any ESPN NBA game id from the series (header → series.events). Other games auto-discovered.")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/standings/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa NBA Playoffs series-state explainer.

    Phase 2 ship #18a. Templated agent (Haiku 4.5). Reads ESPN's
    summary for any game in the series to bootstrap, then fetches
    each completed game's header for per-game scores. Filed under
    `standings` content type so /standings/{slug} serves it.

    Example::

        python -m content_engine.cli nba-series --game-id 401869406 --write
    """
    import asyncio
    from datetime import datetime

    from content_engine.agents import nba_series as nba_series_agent
    from content_engine.data import nba_series_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("nba_series.cli.start", game_id=game_id, dry_run=dry_run, write=write)

        ctx = await nba_series_context.build_context(game_id)
        if not ctx:
            typer.echo(f"✗ Could not build NBA series context for game {game_id}.", err=True)
            raise typer.Exit(2)

        result = await nba_series_agent.write_nba_series(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = nba_series_agent.format_nba_series_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        year = (ctx["_header"].get("tipoff_utc") or datetime.now()).year
        article_slug = slug_mod.nba_series_slug(
            ctx["home_abbr"], ctx["away_abbr"],
            ctx.get("round") or "playoff",
            year,
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="standings",
            title=f"{ctx['round']} — {ctx['series_summary']}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"NBA series: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN NBA SERIES (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/standings/) ---")
            return

        title = f"{ctx['round']}: {ctx['series_summary']}"
        description = (
            f"State of {ctx['round']} antara {ctx['away_team']} dan "
            f"{ctx['home_team']}. Series score: {ctx['series_summary']}."
        )
        path = json_writer.write_article(
            type_="standings",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "nba",
                "sport": "basketball",
                "article_subtype": "series_state",
                "round": ctx.get("round"),
                "series_summary": ctx.get("series_summary"),
                "home_team": ctx.get("home_team"),
                "home_abbr": ctx.get("home_abbr"),
                "away_team": ctx.get("away_team"),
                "away_abbr": ctx.get("away_abbr"),
                "games_played": len(ctx.get("_games") or []),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /standings/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="standings",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="standings",
            sport_id="nba", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="f1-championship")
def f1_championship_cmd(
    season: Annotated[int, typer.Option(help="F1 season, e.g. 2026")] = 2026,
    round_num: Annotated[int, typer.Option("--round", help="Round number to summarize after")] = 3,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/standings/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa F1 championship-state explainer after a round.

    Phase 2 ship #18b. Templated agent (Haiku 4.5). Two parallel
    jolpica calls (driver + constructor standings). Filed under
    `standings` content type.

    Example::

        python -m content_engine.cli f1-championship --season 2026 --round 3 --write
    """
    import asyncio

    from content_engine.agents import f1_championship as f1_champ_agent
    from content_engine.data import f1_championship_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("f1_championship.cli.start", season=season, round=round_num, dry_run=dry_run, write=write)

        ctx = await f1_championship_context.build_context(season, round_num)
        if not ctx.get("_drivers"):
            typer.echo(f"✗ No driver standings for {season} round {round_num}.", err=True)
            raise typer.Exit(2)

        result = await f1_champ_agent.write_f1_championship(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = f1_champ_agent.format_f1_championship_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.f1_championship_slug(season, round_num)
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="standings",
            title=f"F1 {season} Championship after Round {round_num}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"F1 championship: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN F1 CHAMPIONSHIP (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/standings/) ---")
            return

        title = f"Klasemen F1 {season} setelah Round {round_num} — {ctx.get('leader_driver') or 'TBD'} di Puncak"
        description = (
            f"Analisis klasemen F1 {season} setelah Round {round_num} ({ctx.get('race_name')}). "
            f"{ctx.get('leader_driver') or 'Pemimpin'} memimpin pembalap dengan {int(ctx.get('leader_points') or 0)} poin."
        )
        path = json_writer.write_article(
            type_="standings",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "f1",
                "sport": "motorsport",
                "article_subtype": "championship_state",
                "season": season,
                "round": round_num,
                "race_name": ctx.get("race_name"),
                "rounds_remaining": ctx.get("rounds_remaining"),
                "leader_driver": ctx.get("leader_driver"),
                "leader_points": ctx.get("leader_points"),
                "leader_constructor": ctx.get("leader_constructor"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /standings/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="standings",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="standings",
            sport_id="f1", flagship_ctx={"race_name": ctx.get("race_name"), "round": round_num},
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="nba-team-profile")
def nba_team_profile_cmd(
    team_id: Annotated[str, typer.Option(help="ESPN NBA team id, e.g. 2 for BOS, 13 for LAL, 21 for PHI.")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON to public/content/team/{slug}.json. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa NBA team profile (evergreen).

    Phase 2 ship #21. The Profile Writer from CLAUDE.md's agent
    table — first sport vertical. Same gate pipeline as recap/preview
    minus the rule-based fact-check (no specific game stats to verify;
    voice-lint + grounding rules in the prompt cover it). Saves to
    /content/team/{slug}.json, served at /profile/{slug}.

    Slug shape: ``nba-{team-slug}`` (e.g. ``nba-boston-celtics``).

    ESPN team IDs (current 30-team league):
      ATL=1, BOS=2, NOP=3, CHI=4, CLE=5, DAL=6, DEN=7, DET=8,
      GSW=9, HOU=10, IND=11, LAC=12, LAL=13, MIA=14, MIL=15,
      MIN=16, BKN=17, NYK=18, ORL=19, PHI=20 (76ers id=20 historic, current=21),
      PHX=21, POR=22, SAC=23, SAS=24, OKC=25, UTA=26, WAS=27,
      TOR=28, MEM=29, CHA=30. Use ``curl '.../teams'`` for the
      authoritative list if any of these have rotated.

    Example::

        python -m content_engine.cli nba-team-profile --team-id 2 --write
    """
    import asyncio

    from content_engine.agents import nba_team_profile as nba_team_profile_agent
    from content_engine.data import nba_team_profile_context
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("nba_team_profile.cli.start", team_id=team_id, dry_run=dry_run, write=write)

        ctx = await nba_team_profile_context.build_context(team_id)

        result = await nba_team_profile_agent.write_nba_team_profile(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            typer.echo("\n--- DRAFT (FAILED GATE) ---\n")
            typer.echo(body)
            raise typer.Exit(3)

        source_ctx = nba_team_profile_agent.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.nba_team_profile_slug(
            ctx.get("team_slug") or "", ctx.get("team_abbr") or "",
        )
        plag_report = plagiarism.check(
            body,
            slug=article_slug,
            article_type="team",
            title=f"Profil {ctx.get('team_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"NBA team profile: in={usage['input_tokens']} (cache_read={usage['cache_read_input_tokens']}) "
            f"out={usage['output_tokens']} ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN NBA TEAM PROFILE (not written) ---\n")
            typer.echo(body)
            typer.echo("\n--- (use --write to publish to public/content/team/) ---")
            return

        # Title: "Profil Boston Celtics: Atlantic, Eastern Conference (2025-26)"
        # Build conditionally so missing pieces don't leave dangling
        # punctuation in the title (the previous version had a
        # rstrip-the-paren bug).
        team_name = ctx.get("team_name") or "Tim"
        conf = ctx.get("conference") or ""
        div = ctx.get("division") or ""
        season = ctx.get("season_label") or ""
        title_parts = [f"Profil {team_name}"]
        loc_bits = []
        if div:
            loc_bits.append(div)
        if conf:
            loc_bits.append(conf)
        if loc_bits:
            title_parts.append(": " + ", ".join(loc_bits))
        if season:
            title_parts.append(f" ({season})")
        title = "".join(title_parts)
        description = (
            f"Profil {ctx.get('team_name')} — franchise NBA dari "
            f"{ctx.get('team_location') or '?'} di {ctx.get('division') or 'division'} "
            f"{ctx.get('conference') or 'conference'}. Snapshot data per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="team",
            slug=article_slug,
            title=title,
            description=description,
            body_md=body,
            frontmatter={
                "league": "nba",
                "sport": "basketball",
                "article_subtype": "team_profile",
                "team_id": ctx.get("team_id"),
                "team_name": ctx.get("team_name"),
                "team_abbr": ctx.get("team_abbr"),
                "team_location": ctx.get("team_location"),
                "conference": ctx.get("conference"),
                "division": ctx.get("division"),
                "season_label": ctx.get("season_label"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /profile/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="team",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="team",
            sport_id="nba", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="football-team-profile")
def football_team_profile_cmd(
    team_id: Annotated[str, typer.Option(help="API-Football team id, e.g. 40 (Liverpool), 33 (Man Utd), see https://www.api-football.com/")],
    league: Annotated[str, typer.Option(help="League id: 'epl' or 'liga-1-id'.")] = "epl",
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa football club profile (evergreen).

    Phase 2 ship #22. Single command shared by EPL + Liga 1 (same
    API-Football data shape, same prompt). The --league flag picks
    the league context for the IDENTITAS + KLASEMEN blocks.

    Slug shape: ``{league-id}-{team-slug}`` (e.g. `epl-liverpool`,
    `liga-1-id-persija-jakarta`). Output: /content/team/{slug}.json
    served at /profile/{slug}.

    EPL example::

        python -m content_engine.cli football-team-profile --league epl --team-id 40 --write

    Liga 1 example::

        python -m content_engine.cli football-team-profile --league liga-1-id --team-id 2885 --write
    """
    import asyncio

    from content_engine.agents import football_team_profile as agent_mod
    from content_engine.data import football_team_profile_context as ctx_mod
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("football_team_profile.cli.start", team_id=team_id, league=league, dry_run=dry_run, write=write)

        ctx = await ctx_mod.build_context(team_id, league_id=league)
        result = await agent_mod.write_football_team_profile(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            raise typer.Exit(3)

        source_ctx = agent_mod.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.football_team_profile_slug(ctx.get("team_name") or "", league)
        plag_report = plagiarism.check(
            body, slug=article_slug, article_type="team",
            title=f"Profil {ctx.get('team_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. "
            f"Football profile: ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. "
            f"Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN (not written) ---\n")
            typer.echo(body)
            return

        title_parts = [f"Profil {ctx.get('team_name')}"]
        if ctx.get("competition_short"):
            title_parts.append(f": {ctx['competition_short']}")
        if ctx.get("season_label"):
            title_parts.append(f" ({ctx['season_label']})")
        title = "".join(title_parts)
        description = (
            f"Profil {ctx.get('team_name')} — klub sepak bola dari "
            f"{ctx.get('team_country') or '?'} di {ctx.get('competition_short')}. "
            f"Snapshot data per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="team", slug=article_slug, title=title, description=description, body_md=body,
            frontmatter={
                "league": league, "sport": "football",
                "article_subtype": "team_profile",
                "team_id": ctx.get("team_id"),
                "team_name": ctx.get("team_name"),
                "team_country": ctx.get("team_country"),
                "team_founded": ctx.get("team_founded"),
                "venue_name": ctx.get("venue_name"),
                "venue_city": ctx.get("venue_city"),
                "venue_capacity": ctx.get("venue_capacity"),
                "competition": ctx.get("competition_short"),
                "season_label": ctx.get("season_label"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /profile/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="team",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="team",
            sport_id=league, flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="f1-driver-profile")
def f1_driver_profile_cmd(
    driver_id: Annotated[str, typer.Option(help="jolpica/Ergast driver id, e.g. 'max_verstappen', 'hamilton', 'leclerc'.")],
    season: Annotated[int, typer.Option(help="F1 season year.")] = 2026,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa F1 driver profile (evergreen).

    Phase 2 ship #22. Slug shape: ``f1-{driver-slug}``. Output:
    /content/team/{slug}.json served at /profile/{slug}.

    Example::

        python -m content_engine.cli f1-driver-profile --driver-id max_verstappen --write
    """
    import asyncio

    from content_engine.agents import f1_driver_profile as agent_mod
    from content_engine.data import f1_driver_profile_context as ctx_mod
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("f1_driver_profile.cli.start", driver_id=driver_id, season=season, dry_run=dry_run, write=write)

        ctx = await ctx_mod.build_context(driver_id, season=season)
        result = await agent_mod.write_f1_driver_profile(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            raise typer.Exit(3)

        source_ctx = agent_mod.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.f1_driver_profile_slug(ctx.get("driver_code") or "", ctx.get("driver_name") or "")
        plag_report = plagiarism.check(
            body, slug=article_slug, article_type="team",
            title=f"Profil {ctx.get('driver_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. F1 driver profile: ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN (not written) ---\n")
            typer.echo(body)
            return

        title = f"Profil {ctx.get('driver_name')}: Pembalap F1 {ctx.get('current_team') or ''} ({ctx.get('season_label')})".rstrip()
        description = (
            f"Profil pembalap F1 {ctx.get('driver_name')} ({ctx.get('nationality_id')}) "
            f"untuk tim {ctx.get('current_team')}. Klasemen, hasil, dan data per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="team", slug=article_slug, title=title, description=description, body_md=body,
            frontmatter={
                "league": "f1", "sport": "motorsport",
                "article_subtype": "driver_profile",
                "driver_id": ctx.get("driver_id"),
                "driver_name": ctx.get("driver_name"),
                "driver_code": ctx.get("driver_code"),
                "driver_number": ctx.get("driver_number"),
                "nationality": ctx.get("nationality"),
                "current_team": ctx.get("current_team"),
                "current_team_id": ctx.get("current_team_id"),
                "championship_pos": ctx.get("championship_pos"),
                "championship_points": ctx.get("championship_points"),
                "season": ctx.get("season"),
                "season_label": ctx.get("season_label"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /profile/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="team",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="team",
            sport_id="f1", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="tennis-player-profile")
def tennis_player_profile_cmd(
    athlete_id: Annotated[str, typer.Option(help="ESPN tennis athlete id, e.g. 3623 (Sinner), 5837 (Alcaraz).")],
    tour: Annotated[str, typer.Option(help="Tour: 'atp' or 'wta'.")] = "atp",
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa tennis player profile (evergreen).

    Phase 2 ship #22. Slug shape: ``tennis-{player-slug}``.

    Example::

        python -m content_engine.cli tennis-player-profile --athlete-id 3623 --tour atp --write
    """
    import asyncio

    from content_engine.agents import tennis_player_profile as agent_mod
    from content_engine.data import tennis_player_profile_context as ctx_mod
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("tennis_player_profile.cli.start", athlete_id=athlete_id, tour=tour, dry_run=dry_run, write=write)

        ctx = await ctx_mod.build_context(athlete_id, tour=tour)
        result = await agent_mod.write_tennis_player_profile(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            raise typer.Exit(3)

        source_ctx = agent_mod.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.tennis_player_profile_slug(ctx.get("athlete_name") or "")
        plag_report = plagiarism.check(
            body, slug=article_slug, article_type="team",
            title=f"Profil {ctx.get('athlete_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. Tennis player profile: ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN (not written) ---\n")
            typer.echo(body)
            return

        rank_part = f" — Peringkat {ctx.get('current_rank')}" if ctx.get('current_rank') else ""
        title = f"Profil {ctx.get('athlete_name')} ({tour.upper()}){rank_part}"
        description = (
            f"Profil petenis {ctx.get('athlete_name')} ({tour.upper()}). "
            f"Snapshot peringkat dan bio per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="team", slug=article_slug, title=title, description=description, body_md=body,
            frontmatter={
                "league": "tennis", "sport": "tennis",
                "tour": tour,
                "article_subtype": "player_profile",
                "athlete_id": ctx.get("athlete_id"),
                "athlete_name": ctx.get("athlete_name"),
                "current_rank": ctx.get("current_rank"),
                "previous_rank": ctx.get("previous_rank"),
                "points": ctx.get("points"),
                "trend": ctx.get("trend"),
                "birthplace": ctx.get("birthplace"),
                "dob": ctx.get("dob"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /profile/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="team",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="team",
            sport_id="tennis", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="h2h")
def h2h_cmd(
    team_a: Annotated[str, typer.Option(help="API-Football team id for klub A.")],
    team_b: Annotated[str, typer.Option(help="API-Football team id for klub B.")],
    league: Annotated[str, typer.Option(help="League id: 'epl' or 'liga-1-id'.")] = "epl",
    last_n: Annotated[int, typer.Option(help="Number of recent meetings to fetch.")] = 10,
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa football head-to-head explainer.

    Phase 2 ship #23. Slug shape: ``{league}-{a}-vs-{b}-h2h``
    (alphabetically sorted team names so order doesn't matter).
    Output: /content/h2h/{slug}.json served at /h2h/{slug}.

    Example::

        python -m content_engine.cli h2h --team-a 40 --team-b 33 --league epl --write
        python -m content_engine.cli h2h --team-a 2445 --team-b 2439 --league liga-1-id --write
    """
    import asyncio

    from content_engine.agents import h2h as agent_mod
    from content_engine.data import h2h_context as ctx_mod
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("h2h.cli.start", team_a=team_a, team_b=team_b, league=league, last_n=last_n)

        ctx = await ctx_mod.build_context(team_a, team_b, league_id=league, last_n=last_n)
        result = await agent_mod.write_h2h(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            raise typer.Exit(3)

        source_ctx = agent_mod.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.h2h_slug(ctx.get("team_a_name") or "", ctx.get("team_b_name") or "", league)
        plag_report = plagiarism.check(
            body, slug=article_slug, article_type="h2h",
            title=f"H2H {ctx.get('team_a_name')} vs {ctx.get('team_b_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. H2H: ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN (not written) ---\n")
            typer.echo(body)
            return

        title = f"H2H {ctx.get('team_a_name')} vs {ctx.get('team_b_name')} ({ctx.get('league_label')})"
        description = (
            f"Head-to-head antara {ctx.get('team_a_name')} dan {ctx.get('team_b_name')} "
            f"di {ctx.get('league_label')}. {ctx['_summary']['total_meetings']} pertemuan terakhir, "
            f"data per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="h2h", slug=article_slug, title=title, description=description, body_md=body,
            frontmatter={
                "league": league, "sport": "football",
                "article_subtype": "h2h",
                "team_a_id": ctx.get("team_a_id"),
                "team_a_name": ctx.get("team_a_name"),
                "team_b_id": ctx.get("team_b_id"),
                "team_b_name": ctx.get("team_b_name"),
                "summary": ctx.get("_summary"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /h2h/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="h2h",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="h2h",
            sport_id=league, flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


@app.command(name="nba-player-profile")
def nba_player_profile_cmd(
    athlete_id: Annotated[str, typer.Option(help="ESPN NBA athlete id, e.g. 3917376 (Jaylen Brown). Find via /teams/{id}/roster.")],
    dry_run: Annotated[bool, typer.Option(help="Generate + print, do NOT write JSON.")] = True,
    write: Annotated[bool, typer.Option(help="Write JSON. Implies --no-dry-run.")] = False,
) -> None:
    """Generate a Bahasa NBA player profile (evergreen).

    Phase 2 ship #24. Slug shape: ``pemain-nba-{player-slug}``.
    Saved under team/ folder (same SPA route /profile/:slug as
    team profiles). The slug prefix distinguishes player from team.

    Example::

        python -m content_engine.cli nba-player-profile --athlete-id 3917376 --write
    """
    import asyncio

    from content_engine.agents import nba_player_profile as agent_mod
    from content_engine.data import nba_player_profile_context as ctx_mod
    from content_engine.publish import json_writer, slug as slug_mod
    from content_engine.quality import banned_phrase, plagiarism, polish, voice_lint

    if write:
        dry_run = False

    async def _run() -> None:
        log.info("nba_player_profile.cli.start", athlete_id=athlete_id, dry_run=dry_run, write=write)

        ctx = await ctx_mod.build_context(athlete_id)
        result = await agent_mod.write_nba_player_profile(ctx)
        body = polish.polish(result["body_md"])

        report = banned_phrase.check(body)
        typer.echo(report.summary())
        if not report.passed:
            typer.echo("\n✗ Banned-phrase gate failed.", err=True)
            raise typer.Exit(3)

        source_ctx = agent_mod.format_user_message(ctx)
        body, lint_report = await voice_lint.check_with_autofix(body, source_context=source_ctx)
        typer.echo(lint_report.summary_text())

        article_slug = slug_mod.nba_player_profile_slug(ctx.get("athlete_name") or "")
        plag_report = plagiarism.check(
            body, slug=article_slug, article_type="team",
            title=f"Profil {ctx.get('athlete_name')}",
        )
        typer.echo(plag_report.summary())
        if not plag_report.passed:
            typer.echo("\n✗ Plagiarism gate failed.", err=True)
            raise typer.Exit(5)

        usage = result["usage"]
        lint_usage = lint_report.usage
        total_cost = usage["cost_usd"] + lint_usage.get("cost_usd", 0.0)
        typer.echo(
            f"\n✓ Generated {len(body)} chars. NBA player profile: ${usage['cost_usd']:.4f}. "
            f"Voice-lint: ${lint_usage.get('cost_usd', 0.0):.4f}. Total: ${total_cost:.4f}"
        )

        if dry_run:
            typer.echo("\n--- DRY RUN (not written) ---\n")
            typer.echo(body)
            return

        title = f"Profil {ctx.get('athlete_name')}: {ctx.get('position') or 'Pemain'} {ctx.get('team_name') or ''}"
        title = title.replace("  ", " ").rstrip()
        description = (
            f"Profil pemain NBA {ctx.get('athlete_name')}, {ctx.get('position') or '?'} "
            f"{ctx.get('team_name') or '?'}. Statistik per pertandingan dan bio per {ctx.get('as_of_id')}."
        )
        path = json_writer.write_article(
            type_="team", slug=article_slug, title=title, description=description, body_md=body,
            frontmatter={
                "league": "nba", "sport": "basketball",
                "article_subtype": "player_profile",
                "athlete_id": ctx.get("athlete_id"),
                "athlete_name": ctx.get("athlete_name"),
                "team_name": ctx.get("team_name"),
                "team_abbr": ctx.get("team_abbr"),
                "position": ctx.get("position"),
                "jersey": ctx.get("jersey"),
                "age": ctx.get("age"),
                "birthplace": ctx.get("birthplace"),
                "as_of_id": ctx.get("as_of_id"),
                "model": result["model"],
                "cost_usd": round(total_cost, 6),
                "voice_lint": lint_report.to_frontmatter(),
                "plagiarism_hash": f"0x{plag_report.fingerprint.hash_value:016x}",
            },
        )
        typer.echo(f"\n✓ Written: {path.relative_to(path.parents[3])}")
        typer.echo(f"  SPA route: /profile/{article_slug}")
        await _maybe_qc_writeback(
            path, slug=article_slug, type_="team",
            body_md=body, source_context=source_ctx, title=title,
        )
        ap_result = auto_publish.maybe_publish(
            slug=article_slug, type_="team",
            sport_id="nba", flagship_ctx=ctx,
        )
        _print_auto_publish_outcome(ap_result)

    asyncio.run(_run())


def main() -> None:
    """Entry point for ``python -m content_engine.cli``."""
    app()


if __name__ == "__main__":
    main()
