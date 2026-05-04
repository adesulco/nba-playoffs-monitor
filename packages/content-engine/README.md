# Gibol Content Engine

Bahasa-first sports content generation pipeline for [www.gibol.co](https://www.gibol.co).

**Phase 0 (foundation) starts:** 2026-06-01 per `../../docs/content-engine-response.md` § 3.

This package is **scaffolded but not active** — the schema, prompts, decisions, and sequencing are all locked in; what's left is the Python implementation work.

---

## Reading order

1. **`../../CLAUDE.md`** — repo-wide context (web app + content engine sibling)
2. **`../../spec-content-agent.md`** — original spec from the spec author (verbatim, not modified)
3. **`../../docs/content-engine-response.md`** — Vite-aligned amendments + locked product decisions
4. **`prompts/voice-rules.md`** — the Bahasa voice that is the product
5. **`STATUS.md`** — what phase we're in, what's done, what's next

---

## What's here

```
packages/content-engine/
├── pyproject.toml           # Python 3.12 deps + tooling (ruff, black, mypy, pytest)
├── .env.example             # required + optional env vars by phase
├── README.md                # this file
├── STATUS.md                # phase tracker — read first to know where we are
├── prompts/
│   ├── voice-rules.md       # Bahasa voice spec (the differentiator)
│   └── banned-phrases.txt   # machine-readable linter input
├── src/                     # Python source — empty in Phase 0 prep
│   ├── agents/              # preview, recap, standings, profile, race, qc — Phase 1+
│   ├── data/                # ingestion + normalization — Phase 0
│   ├── quality/             # validators + linter — Phase 1
│   ├── publish/             # JSON file writer + schema builder — Phase 1
│   └── orchestrator/        # triggers + queue + cron — Phase 1
└── eval/                    # eval sets + regression tests — Phase 1
```

---

## Phase 0 first commit checklist

When 2026-06-01 lands, the first session does this in order:

1. [ ] Confirm `ANTHROPIC_API_KEY` and `DATABASE_URL` are set in `.env` (or deployment env)
2. [ ] Apply `../../supabase/migrations/0006_content_engine.sql` via Supabase SQL editor
3. [ ] Verify the migration: `select count(*) from ce_leagues;` returns 5 (epl, liga-1-id, nba-playoffs-2026, f1-2026, fifa-wc-2026)
4. [ ] `pip install -e ".[dev]"` — installs the package + dev tooling
5. [ ] Create `src/content_engine/__init__.py` + `src/content_engine/cli.py` stub
6. [ ] Create `src/content_engine/data/api_football.py` — first ingestion module (EPL fixtures + lineups + events)
7. [ ] Create `src/content_engine/data/normalizer.py` — feed → `ce_*` schema mapping
8. [ ] Health-check script: `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run`
9. [ ] Tests for ingestion + normalization
10. [ ] Update `STATUS.md` with the first commit date

**Definition of done for Phase 0:** Running `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run` returns clean normalized data for every fixture, with zero hallucination + zero schema mismatches.

---

## Non-negotiable rules (also in `../../CLAUDE.md`)

These are not style preferences. Breaking any of these in production output is a defect.

1. **Ground every factual claim in source data.** No score, no scorer, no minute, no statistic, no quote that isn't in the input data block. If data is missing, write that it's missing — never fabricate.
2. **Voice rules are sacred.** Read `prompts/voice-rules.md` before any prompt change. Drift is the failure mode that kills this product.
3. **No auto-publish in Phase 1.** Every article goes through manual review until Phase 2 explicitly flips this for non-flagship matches.
4. **Never publish if any quality gate fails.** Fact validator, banned-phrase regex, length check, dedup hash, schema validity, plagiarism check — all must pass.
5. **High-profile matches always get human review** even after auto-publish: derbies, top-of-table EPL, NBA Finals, World Cup knockouts, F1 races at flagship circuits. Hard-coded list at `src/content_engine/quality/flagship.py` (Phase 1).
6. **Cost cap is enforced.** Hard daily token-budget per agent in `.env`. If exceeded, halt and alert.
7. **AI disclosure footer on every generated article.** Static text per locked decision: *"Konten ini disusun dengan bantuan AI dan diverifikasi oleh tim editorial Gibol. Data live diambil dari API-Football, ESPN, dan sumber resmi liga."*

---

## Locked product decisions

Per `../../docs/content-engine-response.md` § 2:

| # | Decision | Status |
|---|---|---|
| 1 | Author byline: Gibol Newsroom org for v1; named human editor on flagship matches by Month 3 | ✅ locked |
| 2 | AI disclosure footer: YES, standard wording on every generated article | ✅ locked |
| 3 | Live match thread: SKIP for v1 and v2 | ✅ locked |
| 4 | English-language version: SKIP — Bahasa-first stays | ✅ locked |
| 5 | Liga 1 voice supplement: PHASE 2, not Phase 3 | ✅ locked |
| 6 | Push notifications + WhatsApp: PHASE 4 stretch | ✅ locked |

---

## Common commands (Phase 0+, not yet active)

```bash
# Install
cd packages/content-engine
pip install -e ".[dev]"

# Run the engine locally against a single fixture
python -m content_engine.cli preview --fixture-id 1234567 --dry-run

# Backfill recaps for a gameweek (batch API, async)
python -m content_engine.cli backfill --league premier-league --gameweek 35

# Run the eval set (regression check on prompts)
python -m content_engine.eval.run --suite all

# Voice-lint a draft
python -m content_engine.quality.voice_lint < draft.md

# Lint + format the Python code
ruff check src tests
black src tests
mypy src

# Run tests
pytest
```

---

## Cost expectation

Per `../../docs/content-engine-response.md` § 1 corrected cost model:

| Line | Per month |
|---|---|
| Anthropic API | $7 |
| Postgres + pgvector (Supabase Pro at scale) | $25 |
| Cloudflare Workers + Queues | $5 |
| OpenAI embeddings | $2 |
| API-Football Pro (already paying for web app) | $19 |
| **Realistic all-in** | **~$58/mo = ~$700/yr** |

For ~4,250 Bahasa-native sport articles per year. A single junior content writer in Jakarta costs ~Rp 96 jt/year (~$5,800/yr) and produces maybe 5% of that volume.
