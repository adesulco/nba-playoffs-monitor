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
