# CLAUDE.md — Gibol repo (web + content engine)

Shared context for Claude Code, Cowork, and any other agent working in this repo. Read this first.

The umbrella project context (mission, who Ade is, how to work with him) lives at the parent project level (`Documents/Claude/Projects/Gibol/CLAUDE.md`). This file is the **repo-specific** companion: where code lives, what stack we're on, what each subdirectory owns, and what requires explicit approval before touching.

---

## What this repo is

Two things live in this single repo:

1. **The Gibol web app** — Vite + React 18 SPA at `www.gibol.co`. Code lives in `src/`, `api/`, `scripts/`, `public/`. This is the user-facing dashboard for NBA Playoffs 2026, Premier League 2025-26, Super League Indonesia (Liga 1) 2025-26, Formula 1 2026, Tennis 2026, and FIFA World Cup 2026.

2. **The Gibol Content Engine** — Python package at `packages/content-engine/`. Agent-driven pipeline that produces Bahasa-native pre-match previews, post-match recaps, weekly standings explainers, race recaps, and evergreen profiles. Phase 0 starts 2026-06-01 per `docs/content-engine-response.md` § 3. **Not yet active.** Read `spec-content-agent.md` (repo root, verbatim from spec author) + `docs/content-engine-response.md` (Vite-aligned amendments + locked decisions) before anything non-trivial in `packages/content-engine/`.

The two are sibling — generated content is written to `public/content/` as JSON, consumed by new lazy-loaded SPA routes (`/preview/[slug]`, `/recap/[slug]`, etc.), and prerendered by `scripts/prerender.mjs`.

---

## Stack (immutable unless explicitly changed)

### Web app
- **Frontend:** Vite + React 18 SPA. CSS-in-JS using the project's `COLORS` constant from `src/lib/constants.js`. CSS classes for media-query breakpoints in `src/index.css`. **Not Next.js** — anything assuming Next.js routing / MDX / ISR needs adaptation.
- **Deploy:** Vercel project `nba-playoffs-monitor` in team `adesulcos-projects`. Production domain `www.gibol.co`. Apex 308-redirects to www. Direct deploys via `npx vercel --prod --yes` (no git remote).
- **Functions:** Vercel Serverless under `api/`. Node runtime. **11 / 12 functions used** (Vercel Hobby limit). One slot remaining; next addition triggers consolidation.
- **Backend:** Supabase project `egzacjfbmgbcwhtvqixc` (Mumbai / ap-south-1). Postgres 17. Migrations live at `supabase/migrations/`. Apply via SQL editor (no Management API token in this env).
- **Data feeds:** ESPN (NBA + EPL + Liga 1), API-Football Pro $19/mo (EPL stats + Liga 1 + WC), Polymarket (NBA odds), jolpica-f1 + OpenF1 (F1), tennis sources via `tennis-news`. Anthropic API for the content engine. OpenAI embeddings (Phase 1+).
- **Schema source of truth:** Supabase tables `teams`, `series`, `brackets`, `picks`, `leagues`, `league_members`, `pickem_rules`, `profiles`, `derby_polls`, `derby_poll_votes`, `derby_reactions`, `derby_oneliners`. Content engine adds `fixtures`, `events`, `stats`, `articles`, `article_runs` via migration `0006_content_engine.sql` (not applied yet).

### Content engine (Phase 0+)
- **Language:** Python 3.12. `anthropic` Python SDK. Always enable prompt caching on system prompts + voice rules.
- **Models:** Sonnet 4.6 for narrative writing (preview, recap, profile), Haiku 4.5 for templated (standings, voice lint), Opus 4.7 for 10% QC sweep. **Never change a model used by an agent without explicit approval.**
- **Cost levers:** prompt caching always on (90% off cached input); Batch API for any work scheduled ≥1h ahead (50% off).
- **Storage:** Existing Supabase Postgres + pgvector for embeddings. New tables in migration `0006`.
- **Orchestration:** Cloudflare Workers + Queues for real-time triggers (final-whistle webhook → recap), GitHub Actions for batch (T-24h preview, weekly standings).
- **Publishing target:** JSON files at `public/content/{type}/{slug}.json`. SPA routes consume them. Prerender emits static HTML at build time.

---

## Content engine — current state

| Item | Status |
|---|---|
| Spec received | ✅ `spec-content-agent.md` (verbatim from author) |
| Vite-adapted amendments | ✅ `docs/content-engine-response.md` (locked decisions) |
| Voice rules | ✅ `packages/content-engine/prompts/voice-rules.md` |
| Banned-phrase linter list | ✅ `packages/content-engine/prompts/banned-phrases.txt` |
| Phase 0 status tracker | ✅ `packages/content-engine/STATUS.md` |
| Postgres migration | 📋 written (`supabase/migrations/0006_content_engine.sql`), **not applied** |
| Python package skeleton | ✅ `packages/content-engine/{src/{agents,data,quality,publish,orchestrator},eval,pyproject.toml,.env.example}` |
| Anthropic API key | ⏳ to provision in Vercel env (`ANTHROPIC_API_KEY`) |
| OpenAI embeddings key | ⏳ to provision (`OPENAI_API_KEY`) |
| Phase 0 kickoff date | 📅 2026-06-01 |

Locked decisions from `docs/content-engine-response.md` § 2:
- (1) Author byline: **Gibol Newsroom org for v1; named human editor on flagship matches by Month 3.**
- (2) AI disclosure: **YES.** Standard footer on every generated article.
- (3) Live match thread: **SKIP for v1 and v2.**
- (4) English-language version: **SKIP.** Bahasa-first stays.
- (5) Liga 1 voice supplement: **PHASE 2** alongside EPL auto-publish, not Phase 3.
- (6) Push notifications + WhatsApp digest: **PHASE 4 stretch.**

---

## Where to look first

| If you need to… | Read |
|---|---|
| Understand the web app architecture | `docs/01-architecture.md` |
| Current web app status (live ship, what's open) | `docs/00-current-state.md` (and `src/lib/version.js` ship notes) |
| Phase 2 UX history (Sprints A–F) | `docs/phase-2-ux-directive.md` (revised) + `docs/phase-2-ux-response.md` |
| Content engine architecture | `spec-content-agent.md` (author's spec) → THEN `docs/content-engine-response.md` (our amendments) |
| Bahasa voice rules (non-negotiable) | `packages/content-engine/prompts/voice-rules.md` |
| Banned phrases for the voice linter | `packages/content-engine/prompts/banned-phrases.txt` |
| Content-engine implementation status | `packages/content-engine/STATUS.md` |
| Web app pages | `src/pages/` |
| Web app shared components | `src/components/`, `src/components/v2/` (Phase 2 chrome) |
| Serverless functions | `api/` |
| Generated articles (Phase 1+) | `public/content/{type}/{slug}.json` (not yet populated) |

---

## Non-negotiable rules

These are not style preferences. Breaking any of these in production output is a defect.

### Web app

1. **Bahasa-first, casual register.** Default UI copy is Bahasa Indonesia. Voice matches the fan (gue/lo OK in editorial, formal in data tables). English is a user-driven toggle, not the default. Per `docs/phase-2-ux-response.md` § 2, the "English-default" proposal was rejected.
2. **URL co-existence with content engine.** Existing canonical slugs (`/super-league-2025-26/club/[slug]`, `/premier-league-2025-26/club/[slug]`, `/nba-playoff-2026/[teamSlug]`, `/formula-1-2026/{race,team,driver}/[slug]`, `/tennis/[slug]`, `/tennis/rankings/[tour]`, `/derby/persija-persib`) are **canonical and must not be replaced or redirected.** Content engine adds NEW URLs only (`/preview/`, `/recap/`, `/standings/`, `/race/[circuit]/[year]`, `/h2h/`, `/glossary/[term]`).
3. **Five protected surfaces** (per `docs/phase-2-ux-response.md` § 4) must not regress without explicit approval:
   1. `/derby/persija-persib` (engagement layer: Supabase polls/reactions/oneliners + JSON-LD + share OG)
   2. `/fifa-world-cup-2026` (waitlist content slot)
   3. PWA install prompt
   4. Favorites store
   5. Per-club squad pages (squad data via API-Football, currently 11/12 functions used)
4. **Vercel Hobby function limit (12) is hard-enforced.** We're at 11. Adding a function = consolidation pass first.
5. **Lawful scraping only.** Public APIs preferred. For Liga 1 / IBL where APIs are limited, scrape politely, respect robots.txt, rate-limit, cache aggressively.

### Content engine (Phase 1+)

6. **Ground every factual claim in source data.** No score, no scorer, no minute, no statistic, no quote that isn't in the input data block. If data is missing, write that it's missing — never fabricate.
7. **Voice rules are sacred.** Read `packages/content-engine/prompts/voice-rules.md` before any prompt change. Drift is the failure mode that kills this product. Every prompt edit gets logged in `packages/content-engine/prompts/prompt-changelog.md` (will exist Phase 1) with date + measured eval-set impact.
8. **No auto-publish in Phase 1.** Every article goes through manual review. Auto-publish enabled in Phase 2 for non-flagship matches.
9. **Never publish if any quality gate fails.** Fact validator + banned-phrase regex + length check + dedup hash + schema validity + (Phase 1 add) external sim-hash plagiarism check. No bypass flags.
10. **High-profile matches always get human review** even after auto-publish is on: derbies, top-of-table EPL, NBA Finals, World Cup knockouts, F1 races at flagship circuits. Hard-coded list in `packages/content-engine/src/quality/flagship.py`.
11. **Cost cap is enforced.** Hard daily token-budget per agent in env config. If exceeded, halt and alert — don't silently degrade or downgrade models.
12. **AI disclosure footer on every generated article.** Static text per locked decision (`docs/content-engine-response.md` § 2.2): *"Konten ini disusun dengan bantuan AI dan diverifikasi oleh tim editorial Gibol. Data live diambil dari API-Football, ESPN, dan sumber resmi liga."*

---

## Code conventions

- **Web app (TypeScript-aware JS, JSX):** existing conventions — match what's there. CSS-in-JS via `COLORS` constant. Media-query CSS classes in `src/index.css`. Lazy-load every new page route via `React.lazy()`. SEO via `<SEO>` component (Helmet + JSON-LD).
- **Content engine (Python 3.12):** ruff + black, type hints required for public functions, pytest for tests. Filenames snake_case for modules.
- **Slugs:** Bahasa-friendly kebab-case (`liga-inggris-2025-26`, `manchester-united`, `mohamed-salah`, `persija-vs-persib-2026-05-10`).
- **Commit messages:** conventional commits (`feat:`, `fix:`, `chore:`); generated content uses author `gibol-bot <bot@gibol.co>` so it's filterable.
- **All prompts** live in `packages/content-engine/prompts/` as text files, not inline strings. Version-controlled and diffable.

---

## Common commands

```bash
# Web app dev
npm run dev                                    # Vite dev server
npm run build                                  # Vite build + prerender
npx vercel --prod --yes                        # Production deploy

# Web app verification (post-deploy)
curl -sL "https://www.gibol.co/" | grep -oE '"[0-9]+\.[0-9]+\.[0-9]+"'   # version check

# Content engine (Phase 0+, not yet active)
cd packages/content-engine
python -m content_engine.cli ingest --league premier-league --gameweek 35 --dry-run
python -m content_engine.cli preview --fixture-id 1234567 --dry-run
python -m content_engine.eval.run --suite all
python -m content_engine.quality.voice_lint < draft.md
```

---

## Workflow expectations

**Before starting any non-trivial task:**

1. If the task touches the **web app**: check `src/lib/version.js` ship notes for recent context, check `docs/phase-2-ux-directive.md` for Phase 2 surfaces, check `docs/phase-2-ux-response.md` for protected surfaces.
2. If the task touches the **content engine**: read `spec-content-agent.md` § for that area, check `docs/content-engine-response.md` for the Vite-aligned amendments, check `packages/content-engine/STATUS.md` for current phase.
3. If the task isn't in the current phase, stop and ask Ade before proceeding.

**During work:**

- Prefer small, reviewable PRs to one giant change.
- Tests: web app uses minimal automated tests; content engine ingestion + validators + publishers require pytest coverage.
- If you're about to change a system prompt, eval set, or voice rule: pause, propose the change, wait for approval.

**Things that always require explicit approval before doing:**

- Editing voice rules or banned phrases
- Changing system prompts in any agent
- Disabling or modifying a quality gate
- Adding a new content type
- Changing the URL/slug structure (SEO impact)
- Adding a new data feed or removing one
- Changing the model used by an agent
- Anything that could publish to production without human review
- Migrating Gibol web app off Vite to another framework
- Modifying any of the 5 protected surfaces in a way that regresses behavior

**Things you can just do:**

- Write tests
- Refactor internals as long as public interfaces and outputs are unchanged
- Add logging, observability, error handling
- Update `STATUS.md` to reflect work completed
- Improve docstrings and type hints
- Fix bugs that have a reproducible test case
- Bump version in `src/lib/version.js` with a ship-notes entry

---

## Working with Ade

- Ade is owner; technical and analytically sharp. Default to direct, concise, technical responses.
- Bahasa-English code-switching in conversation is normal and welcomed; production output is Bahasa-only per voice rules.
- He's running multiple projects in parallel — don't make him repeat context already in this file or in `spec-content-agent.md`.
- He prefers prose explanations over bullet lists for analysis; bullets are fine for action items, configs, and lists of facts.
- When you disagree with a direction, say so once with reasoning. Don't argue past the first push-back unless there's new information.
- He uses Cowork (planning, research, docs) and Claude Code (implementation). Hand off work between them via files in this repo.
- For destructive operations (database migrations, deletions, deploys to production), confirm in chat before executing.

---

## Quick reference: agent responsibilities (Phase 1+)

| Agent | Job | Model | File |
|---|---|---|---|
| Preview Writer | T-24h match previews | Sonnet 4.6 | `agents/preview.py` |
| Recap Writer | Post-match recaps | Sonnet 4.6 | `agents/recap.py` |
| Standings Explainer | Weekly tables analysis | Haiku 4.5 | `agents/standings.py` |
| Profile Writer | Team/player evergreen | Sonnet 4.6 | `agents/profile.py` |
| Race Writer | F1 weekend + race | Sonnet 4.6 | `agents/race.py` |
| QC Reviewer | 10% sample editorial check | Opus 4.7 | `agents/qc.py` |
| Voice Linter | Per-article naturalness | Haiku 4.5 | `quality/voice_lint.py` |
| Fact Validator | Per-article fact-check | rule-based + Haiku 4.5 | `quality/fact_check.py` |
| Plagiarism Check | 7-gram sim-hash vs external corpus | rule-based | `quality/plagiarism.py` (Phase 1, per response doc § 6) |

---

## Definition of done

A task is done when:

1. Code is merged with passing tests (where tests apply)
2. `STATUS.md` is updated (web app: ship-notes in `src/lib/version.js`; content engine: `packages/content-engine/STATUS.md`)
3. If a prompt or eval changed: `prompt-changelog.md` records what changed and the measured eval-set impact
4. If a content type was added or modified: `spec-content-agent.md` is updated
5. The change has been verified end-to-end against at least one real fixture/page, not just unit-tested
6. If the change touches a protected surface, the verification screenshot or curl output is in the ship notes

---

*If anything in this file is wrong, outdated, or missing — flag it. CLAUDE.md is a living doc, not a contract. Cross-references between this file, `spec-content-agent.md`, and `docs/content-engine-response.md` should resolve cleanly; if they conflict, the response document is authoritative on Vite/URL/decisions.*
