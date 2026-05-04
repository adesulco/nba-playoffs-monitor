# Content Engine — STATUS

**Current phase:** Phase 0 (Foundation) — **🟢 Phase 0 work landed at v0.22.0 (ahead of June 1 target)**
**Last updated:** 2026-04-27 — Phase 0 source + migration applied, awaiting Ade's local dry-run
**Next action:** Ade runs `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run` locally (Python 3.12, pip install -e ".[dev]"). When that returns clean data → Phase 0 done → Phase 1 unlocks (writer agents).

This file tracks where we are in the build. Update on every meaningful commit. Future Claude Code / Cowork sessions read this first to know what's already done.

---

## Locked decisions (from `../../docs/content-engine-response.md` § 2)

| # | Decision | Confirmed |
|---|---|---|
| 1 | Author byline: Gibol Newsroom org for v1; named human editor on flagship matches by Month 3 | ✅ 2026-04-27 |
| 2 | AI disclosure footer: YES, standard wording on every generated article | ✅ 2026-04-27 |
| 3 | Live match thread (Phase 2 stretch): SKIP for v1 and v2 | ✅ 2026-04-27 |
| 4 | English-language version: SKIP — Bahasa-first stays | ✅ 2026-04-27 |
| 5 | Liga 1 voice supplement: PHASE 2 alongside EPL auto-publish, not Phase 3 | ✅ 2026-04-27 |
| 6 | Push notifications + WhatsApp digest: PHASE 4 stretch | ✅ 2026-04-27 |

Architectural amendments (from `../../docs/content-engine-response.md` § 1):

| Item | Confirmed |
|---|---|
| Stack: Vite + React 18 SPA (not Next.js); content output as JSON to `public/content/`, consumed by lazy SPA routes | ✅ 2026-04-27 |
| URL co-existence: existing canonical slugs stay (`/super-league-2025-26/club/[slug]` etc.); engine adds NEW URLs only (`/preview/`, `/recap/`, `/standings/`, `/race/`, `/h2h/`, `/glossary/`) | ✅ 2026-04-27 |
| Cost model corrected to ~$700/yr realistic (incl. infra), not $400/yr AI-only | ✅ 2026-04-27 |
| Phase 1 quality gate addition: 7-gram simhash plagiarism check vs external corpus (top 5 Indonesian sport sites, 30-day rolling retention) | ✅ 2026-04-27 |

---

## Phase 0 — Foundation (Week 1, scheduled 2026-06-01 → 2026-06-07)

Prep work landed 2026-04-27 at v0.21.1:

- [x] Drop `voice-rules.md` and `banned-phrases.txt` into `prompts/`
- [x] Drop `spec-content-agent.md` (verbatim from spec author) at repo root
- [x] Write `../../supabase/migrations/0006_content_engine.sql` (NOT applied yet — apply on Phase 0 kickoff)
- [x] Scaffold Python package skeleton (`pyproject.toml`, `.env.example`, `README.md`, empty `src/{agents,data,quality,publish,orchestrator}/`, `eval/`)
- [x] Create repo-root `../../CLAUDE.md` (Gibol web + content-engine sibling)
- [x] Lock product decisions in `../../docs/content-engine-response.md` and reflect here
- [x] Postgres + pgvector ready (existing Supabase project + `vector` extension provisioned by migration 0006)
- [x] API-Football Pro key already in Vercel env (paid for web app at v0.14.x)

Phase 0 actual work (landed at v0.22.0, 2026-04-27 — ahead of June 1 target):

- [x] Apply `../../supabase/migrations/0006_content_engine.sql` via Supabase SQL editor — applied via Chrome MCP, confirmed "Success. No rows returned"
- [x] Verify migration: `select count(*) from ce_leagues;` returns 5 — verified via SQL editor (epl, liga-1-id, nba-playoffs-2026, f1-2026, fifa-wc-2026)
- [x] Provision `ANTHROPIC_API_KEY` in Vercel + local `.env` — done at v0.21.1
- [ ] Provision `OPENAI_API_KEY` — deferred to Phase 4 (~September), per locked decision (only used by evergreen retrieval)
- [ ] `pip install -e ".[dev]"` from `packages/content-engine/` — Ade runs this locally on his Mac (Python 3.12)
- [x] Create `src/content_engine/__init__.py`, `cli.py`, `config.py` (pydantic-settings)
- [x] Create `src/content_engine/data/api_football.py` — first ingestion module
- [x] Create `src/content_engine/data/normalizer.py` — feed → `ce_*` schema mapping
- [x] Create `src/content_engine/data/db.py` — asyncpg pool + upsert helpers
- [x] Create `src/content_engine/anthropic_client.py` — SDK wrapper with prompt caching enabled by default + cost estimation across all 3 models + budget guardrail
- [ ] Health-check script run locally: `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run` (Ade's box, requires local Python 3.12 + DB pool — final acceptance)
- [x] Tests for ingestion + normalization: 18 tests in test_normalizer.py + 8 tests in test_anthropic_client.py. All 10 modules parse cleanly via ast.
- [x] First commit to `packages/content-engine/src/` — landed at v0.22.0

**Definition of done for Phase 0:** Running `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run` returns clean normalized data for every fixture, with zero hallucination + zero schema mismatches. No agents written yet — that's Phase 1.

---

## Phase 1 — EPL Preview + Recap MVP (3 weeks, 2026-06-08 → 2026-06-28)

- [ ] Preview Writer agent (`agents/preview.py`) with system prompt v1 from `prompts/preview-system.md`
- [ ] Recap Writer agent (`agents/recap.py`) with system prompt v1
- [ ] Quality gate: fact validator + banned-phrase regex + dedup simhash
- [ ] **Quality gate addition (per response doc § 6):** external plagiarism check via 7-gram simhash vs `ce_external_corpus`. Initial corpus seed = scrape top 5 Indonesian sport sites once, retain 30 days, refresh weekly.
- [ ] Publisher (`publish/json_writer.py`) writes to `../../public/content/{type}/{slug}.json` (Vite-aligned, NOT MDX-to-Next.js per architectural amendment)
- [ ] Schema markup builder (NewsArticle + SportsEvent JSON-LD, embedded in article frontmatter)
- [ ] Web app: 7 new lazy SPA routes (`/preview/[slug]`, `/recap/[slug]`, `/standings/[league]/pekan-[n]`, `/race/[circuit]/[year]/{preview,recap}`, `/h2h/[a]-vs-[b]`, `/glossary/[term]`)
- [ ] Web app: extend `scripts/prerender.mjs` to read `public/content/` and emit prerendered HTML at build
- [ ] Cron: T-24h preview trigger; final-whistle webhook → recap trigger
- [ ] Manual review queue (no auto-publish in Phase 1, all 25 articles human-reviewed)
- [ ] Ship 25 articles. Read every one. Tune prompts. Log changes in `prompts/prompt-changelog.md`.

**Definition of done for Phase 1:** Reading 10 random Gibol previews next to 10 Bola.net previews, an Indonesian football fan can't tell which are AI-assisted from voice alone. Eval set established with 50 reference articles (the 25 generated + 25 hand-picked from Gibol's manual FIFA WC + derby content per § "Eval Set Gold" in response doc § 3).

---

## Phase 2 — Liga 1 + EPL auto-publish + Standings (3 weeks, 2026-06-29 → 2026-07-19)

**Order swap from spec:** Liga 1 lands HERE, not Phase 3, per locked decision #5.

- [ ] Ship `prompts/voice-rules-liga-1.md` supplement (heavier code-switching, more klub nicknames, suporter culture references, Indonesian football slang)
- [ ] Liga 1 ingestion: API-Football coverage already verified in v0.14.5 work
- [ ] Liga 1 Preview + Recap agents (reuse EPL agents, swap voice-rules supplement)
- [ ] Standings Explainer agent (`agents/standings.py`) + Sunday 22:00 WIB cron — covers EPL + Liga 1
- [ ] Auto-publish flag flipped for non-flagship matches (`ENABLE_AUTO_PUBLISH=true` in env, but flagship list at `quality/flagship.py` still hard-routes to manual review)
- [ ] Bracket state agent for NBA Playoffs (NBA still active in late-June / July typically)

---

## Phase 3 — NBA recap + F1 + WC (3 weeks, 2026-07-20 → 2026-08-09)

**Order swap from spec:** NBA detailed recaps move HERE (after Liga 1) per locked decision #5.

- [ ] NBA recap agent (`agents/nba_recap.py`) — quarter-based structure, lead changes, +/-, distinct from football recaps
- [ ] F1 weekend preview agent (`agents/race.py`) — Friday 06:00 WIB cron
- [ ] F1 race recap — race end + 10min trigger
- [ ] World Cup tournament-mode handling — group stage tables, knockout brackets (active in this window — kicks off Jun 11)

---

## Phase 4 — Evergreen + Scale (Month 3, 2026-08-10 → 2026-09-09)

- [ ] Player/driver profile generator (Sonnet 4.6, on-demand)
- [ ] Team profile generator (refresh monthly)
- [ ] Head-to-head pages
- [ ] Glossary batch (Haiku 4.5, one-off)
- [ ] Editorial QC sweep (Opus 4.7 on 10% sample, weekly drift report)
- [ ] Search Console dashboard for SEO performance per content type
- [ ] Push notification subscription flow (per locked decision #6 — recaps must be reliably auto-publishing for 4+ weeks first)

---

## Phase 5 — Optimization (ongoing)

- [ ] Prompt tuning from QC + Search Console CTR data
- [ ] A/B test article variations (lead-paragraph styles, length)
- [ ] Internal-link graph optimization
- [ ] Live match thread (still SKIP per locked decision #3)

---

## Open items requiring Ade input

- [x] **Provision `ANTHROPIC_API_KEY`** in Vercel production env — done 2026-04-27 via `npx vercel env add` (verified `Encrypted` in `vercel env ls`).
- [ ] **Provision `OPENAI_API_KEY`** for embeddings — deferred to Phase 4 (~September). Engine doesn't need it until evergreen profile retrieval lands.
- [ ] **Apply `../../supabase/migrations/0006_content_engine.sql`** via Supabase SQL editor on Phase 0 kickoff (2026-06-01). Migration is idempotent + safe to run multiple times.

Everything else from the original spec § 14 open decisions is locked.

---

## Recent changes log

### 2026-04-27 — [Phase 0 prep] foundation files landed at v0.21.1

- Dropped `voice-rules.md` + `banned-phrases.txt` into `prompts/` (verbatim from spec author handoff)
- Dropped `spec-content-agent.md` at repo root (verbatim, not modified)
- Wrote Vite-aligned amendments + locked all 6 product decisions in `../../docs/content-engine-response.md`
- Wrote `../../supabase/migrations/0006_content_engine.sql` — NOT applied yet
- Scaffolded Python package: `pyproject.toml`, `.env.example`, `README.md`, empty `src/{agents,data,quality,publish,orchestrator}/` subdirectories, `eval/`
- Wrote repo-root `../../CLAUDE.md` synthesizing Gibol web + content-engine sibling
- Provisioned `ANTHROPIC_API_KEY` in Vercel production env

### 2026-04-27 — [Phase 0] kickoff ahead of target at v0.22.0

Pulled Phase 0 forward from June 1 → today since prep was complete + Anthropic key was set.

- ✅ Applied `../../supabase/migrations/0006_content_engine.sql` via Supabase SQL editor (Chrome MCP). Result: "Success. No rows returned." Verified `ce_leagues` count = 5 (epl, liga-1-id, nba-playoffs-2026, f1-2026, fifa-wc-2026).
- ✅ Wrote `src/content_engine/__init__.py` + `cli.py` + `config.py` (pydantic-settings)
- ✅ Wrote `src/content_engine/anthropic_client.py` — AsyncAnthropic singleton, `cached_system()` helper, `run_messages()` wrapper, cost estimation for Sonnet/Haiku/Opus including cache-creation (1.25x) and cache-read (0.10x) pricing, `BudgetExceededError` guardrail
- ✅ Wrote `src/content_engine/data/{__init__,db,api_football,normalizer}.py` — asyncpg pool, fixture upsert, API-Football fetcher (httpx async), API-Football → ce_* normalizer with defensive skip on bad input
- ✅ Wrote `tests/test_normalizer.py` (18 tests including provenance assertion that no field is fabricated) + `tests/test_anthropic_client.py` (8 tests including cost-math correctness for cache-read vs cache-creation pricing)
- ✅ All 10 Python modules parse cleanly via `ast.parse`
- ⏳ **Final acceptance pending:** Ade runs `python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run` on his local Mac (Python 3.12, after `pip install -e ".[dev]"`). When that returns clean normalized data → Phase 0 done → Phase 1 unlocks.

No agents written yet (writers land Phase 1). The package is at the "data layer + SDK wrapper + tests + verified DB schema" state.

_Append future entries here. Format:_

```
### YYYY-MM-DD — [phase] short description
What changed, what was measured, links to relevant commits or files.
```
