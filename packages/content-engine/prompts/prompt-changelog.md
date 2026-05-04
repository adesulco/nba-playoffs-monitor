# Prompt Changelog

Per CLAUDE.md non-negotiable rule #7: every prompt edit gets logged here with date + measured eval-set impact (or expected impact + post-ship measurement when eval suite runs).

---

## v0.59.4 — 2026-05-04 — DO-NOT-INFER hard rules across all writer prompts

**Author:** Ade (approved) + Claude (implementation)
**Files modified:** all 17 writer system prompts in `packages/content-engine/prompts/*-system.md` except `voice-lint-system.md` and `qc-system.md` (those aren't writer prompts).

**Why:** voice-lint scoring across all 170 articles in the queue averaged 62 (median 62, max 82, none above 85). The dominant flag (24% of all 1,400+ issues) was `training_inference HIGH severity` — model writing arena names ("Paycom Center"), home-court speculation, generic round framing, all from training data instead of input. Editor reported "no articles passed yet" after multiple batches.

**Change:** added a `## CRITICAL: Do not infer beyond input data (auto-fail if violated)` section near the top of every writer prompt. Seven hard rules:

1. DO NOT name a venue/arena/stadium/court unless its exact name is in input
2. DO NOT speculate about home-court / crowd / venue atmosphere unless input mentions
3. DO NOT describe recent form / injuries / suspensions / season storylines unless in input
4. DO NOT use generic round/season framing ("Conference Semifinals biasanya soal...")
5. DO NOT invent specific career stats / prior matchup numbers / biographical details
6. DO NOT mention coaches / GMs / owners / broadcasters unless in input
7. If input data is thin, write a SHORTER article that strictly stays within facts

Sport-specific examples in the SPORT_EXAMPLES placeholder per file (NBA: All-Star counts; EPL: title counts; F1: world-champion counts; tennis: Slam counts).

**Expected impact:** ~70-80% reduction in `training_inference` HIGH flags. Median lint score 62 → ~78. Most articles should now land at `pass` or `review` verdict (under v0.59.4 verdict recalibration) rather than `fail`.

**Eval status:** No automated eval-set yet exists. Post-ship measurement: re-run a representative batch (5 NBA recaps + 5 NBA previews + 5 EPL previews) and compare avg lint score before/after. Will document in next entry.

**Companion changes (same ship):**
- `voice_lint.py` — verdict trichotomy: pass / review / fail (was binary pass/fail). Pass = score ≥85 OR (≥70 AND no high-severity); fail = <50 OR ≥3 high-severity; review = everything else.
- `voice_fixer.py` (new) — Haiku 4.5 post-pass that addresses lint flags by deleting/rewriting offending spans without inventing facts. Cost ~$0.005/call.
- `voice-fixer-system.md` (new) — system prompt for the fixer agent.
- `write_loop.py` (new) — orchestrator for writer → lint → fix → re-lint → regenerate (max 1 retry, $0.30 per-article cost cap via `QUALITY_LOOP_MAX_USD` env).
- `voice_lint.check_with_autofix()` — drop-in replacement for `check()` that adds the fixer pass when verdict=fail. All 17 CLI pipeline callsites swapped to this variant. Disabled by setting `QUALITY_AUTOFIX_ENABLED=0`.

**Rollback path:** revert this commit. The DO-NOT-INFER blocks are additive (don't remove existing rules), so even if the lint score lift doesn't materialize, no regression risk on what was working before.

---

## v0.59.5 — 2026-05-04 — Stat Citation Discipline + auto-regenerate-on-fact-check-fail

**Author:** Ade (approved) + Claude (implementation)
**Files modified:** `nba-recap-system.md`, `agents/nba_recap.py`, `agents/recap.py`, `cli.py`.

**Why:** v0.59.4 fixed voice-lint scores (62→82 on smoke test) but recap fact-check still hard-failed silently. NBA recap of ORL@DET hit `nba_fact_check.passed=False` because Sonnet hallucinated stat lines that didn't match the input box score. Per CLAUDE.md rule #9, fact-check is a hard publish-blocker → article never written, editor sees nothing.

**Change:**

1. **`nba-recap-system.md`** — added `## STAT CITATION DISCIPLINE (auto-fail if violated)` section between hard-grounding rules and article structure. Six explicit rules:
   - Copy-paste, don't paraphrase numbers (no rounding 27→30, no inference)
   - Final score from SCORE AKHIR only
   - Triple/double-double only if stat line literally qualifies
   - Run lengths only from KEY PLAYS
   - Shooting % only from TEAM STATS
   - Bench / +/- / fast-break: default to NOT citing
   Plus a "self-check before submitting" instruction (re-read every digit; verify against input).

2. **`agents/nba_recap.py` + `agents/recap.py`** — both `write_X(ctx)` functions now accept an optional `regen_hint` kwarg. When set, prepended to the user message as a "PREVIOUS ATTEMPT FAILED..." block listing exactly which claims were wrong + reminding the writer of stat-citation discipline.

3. **`cli.py`** — wrapped NBA recap + football recap pipelines in a retry loop (max 1 retry = 2 writer calls max). On fact-check fail, builds a hint from `fact_report.issues` listing claim/expected pairs, calls writer again with hint, re-runs the full lint+fact-check chain. Total cost across retries reported. After all retries exhausted, exits with code 6 (same as before) so the workflow's failure-capture step writes the row to `ce_generation_failures`.

**Expected impact:**
- NBA recap fact-check pass rate: 50-60% → 85-90% (most stat hallucinations get caught + corrected on retry 2)
- Football recap fact-check pass rate: similar lift
- Per-recap cost: ~$0.04 (single attempt, current) → average ~$0.05 (most pass first try; ~15% need a retry adding $0.04)
- Worst-case cost cap: $0.10 per article (writer × 2 + lint + fixer)

**Eval status:** smoke test pending — re-run game 401869418 (ORL@DET) which previously hit the fact-check.

**Companion changes (this ship):**
- Football recap got the same treatment for parity (its `fact_check.check(... recap=True)` is a hard gate too).
- F1 recap NOT changed yet — same pattern would apply but lower priority (only 1 race per ~2 weeks). Leave for follow-up if the rate of failures justifies.

**Rollback:** revert this commit. The `regen_hint` parameter is optional with default None — existing callers that don't pass it get unchanged behavior. The retry loop adds 1 extra Sonnet call per ~15% of recaps (those that fail first attempt); cost impact bounded.

---
