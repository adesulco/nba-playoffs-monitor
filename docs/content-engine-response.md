# Re: Gibol Content Engine Spec v1.0 — amendments + decisions before Phase 0

**Date:** 2026-04-27  •  **From:** Ade (Gibol)  •  **In response to:** `gibol-content-engine-handoff/spec-content-agent.md` (2026-04-27)

The voice work is excellent and the phasing is disciplined. Before Phase 0 starts, two architectural items need resolution and four product decisions need locking. This document is the response.

---

## 0 · Strong-from-the-start (no changes requested)

These pieces of the spec are correct and locked-in for v1:

- **`voice-rules.md` and `banned-phrases.txt`** — both go to `packages/content-engine/prompts/` as specified. The hard-ban list, pronoun discipline, tense-marker philosophy, side-by-side examples, and Indonesian sport vocab list are all calibrated correctly. **Do not iterate without measurement** — the eval-set + 10% Opus QC sweep are the right drift-catching mechanism.
- **Quality gate stack** — fact validator + banned-phrase regex + dedup sim-hash + length check + schema validity. **Hard gates, no override flag, ever.** Confirmed.
- **Phase 1 manual review of all 25 articles** — confirmed. Do not shortcut.
- **Cost levers** — prompt caching always on, batch API for async-eligible work. Confirmed.
- **Flagship-match always-human-review list** — derbies, top-of-table EPL, NBA Finals, World Cup knockouts, F1 races at flagship circuits. Confirmed; lives in `packages/content-engine/src/quality/flagship.py`.

---

## 1 · Architectural amendment: Vite + React SPA, not Next.js

**Spec assumption (§ 9, § 10):** Gibol is on Next.js, MDX in `/content/` rendered via file-based routing, ISR for fast publish-to-live.

**Reality:** Gibol is **Vite + React 18 SPA** (single-page app, no Next.js). Per `docs/01-architecture.md` and `package.json`. Confirmed via the codebase. The spec's MDX-in-repo-with-Next-routing pattern doesn't translate directly.

### Adapted publishing pipeline (Vite-aligned)

Replace § 9 in the spec with this:

1. **Agent finishes draft** → JSON object: `{ slug, type, body_md, schema, frontmatter, fixtureId? }`
2. **Quality gate** runs — pass / block (no change from spec)
3. **Renderer writes JSON** to `public/content/{type}/{slug}.json`. Body markdown is the `body_md` field; rendering happens at the SPA route, not via MDX compilation.
4. **Git commit** to a content branch (`content/auto`) with author `gibol-bot <bot@gibol.co>`
5. **Auto-merge to main** if all checks pass; PR for human review otherwise
6. **Vercel deploy** triggered (`npx vercel --prod` from CI, OR git push to main if remote is wired by then). The existing `scripts/prerender.mjs` gains content-from-disk awareness — at build time it reads `public/content/` and emits prerendered HTML for every published article.
7. **CDN purge** for affected paths
8. **Search Console / IndexNow ping**

### New SPA routes for content (added to `src/App.jsx`)

```
/preview/[slug]                  → src/pages/Preview.jsx     (lazy)
/recap/[slug]                    → src/pages/RecapArticle.jsx (lazy, distinct from existing /recap/[date])
/standings/[league]/pekan-[n]    → src/pages/StandingsExplainer.jsx (lazy)
/race/[circuit]/[year]           → src/pages/RaceWeekend.jsx (lazy)
/race/[circuit]/[year]/preview   → ditto
/race/[circuit]/[year]/recap     → ditto
/h2h/[a]-vs-[b]                  → src/pages/HeadToHead.jsx (lazy)
/glossary/[term]                 → src/pages/GlossaryEntry.jsx (lazy)
```

Each is a **lazy-loaded React route** that fetches its JSON from `/content/{type}/{slug}.json` on mount, renders body markdown via the existing markdown component, injects per-article JSON-LD via the `<SEO jsonLd={...}>` pattern, and uses the v0.17.x `<HubStatusStrip>` + `<HubActionRow>` + `<Breadcrumbs>` chrome from Phase 2.

### URL co-existence rule — DO NOT break existing slugs

The spec § 8 invents new URL shapes that collide with existing canonical pages:

| Spec proposes | Already live + indexed | Resolution |
|---|---|---|
| `/team/{league}/{team_slug}` | `/super-league-2025-26/club/[slug]`, `/premier-league-2025-26/club/[slug]`, `/nba-playoff-2026/[teamSlug]`, `/formula-1-2026/team/[slug]` | **Existing URLs stay canonical.** Generated team-profile **prose** appends as a section to the existing page (rendered from `public/content/team/{league}-{slug}.json`). No new URLs for teams. |
| `/pemain/{league}/{slug}` | (no existing page; F1 has `/formula-1-2026/driver/[slug]`) | **F1 driver page stays canonical for F1.** For other sports, profile **prose** appends to existing club page squad section, not a new URL. New `/pemain/...` URLs are deferred. |

Brand-new URLs the engine **may** create:
- `/preview/[slug]` — match previews (no existing equivalent)
- `/recap/[slug]` — match recaps (note: existing `/recap/[date]` is the daily NBA recap, distinct slug pattern)
- `/standings/[league]/pekan-[n]` — weekly standings explainers
- `/race/[circuit]/[year]/{preview|recap}` — F1 weekend content
- `/h2h/[a]-vs-[b]` — head-to-head pages
- `/glossary/[term]` — glossary entries (existing `/glossary` aggregates them)

This is a load-bearing constraint. Touching existing slugs breaks SEO equity built up over 8+ months.

### Repo layout (Vite-adapted)

```
gibol/                                         # repo root (Vite project)
├── api/                                       # serverless functions (existing)
├── public/
│   ├── content/                               # NEW — content engine output
│   │   ├── preview/{slug}.json
│   │   ├── recap/{slug}.json
│   │   ├── standings/{slug}.json
│   │   ├── race/{slug}.json
│   │   ├── team/{slug}.json                   # appends to existing /super-league-2025-26/club/[slug]
│   │   ├── pemain/{slug}.json                 # appends to existing F1 /driver/[slug]
│   │   ├── h2h/{slug}.json
│   │   └── glossary/{slug}.json
├── packages/
│   └── content-engine/                        # NEW — Python package (per spec)
│       ├── src/
│       ├── prompts/voice-rules.md
│       ├── prompts/banned-phrases.txt
│       ├── eval/
│       └── pyproject.toml
├── scripts/
│   ├── prerender.mjs                          # MODIFIED — gains content-from-disk awareness
│   └── ...
├── src/                                        # existing Vite app
│   ├── pages/                                  # add 7 new lazy routes per § above
│   ├── components/v2/                          # existing chrome (HubStatusStrip etc.)
│   └── lib/
├── supabase/
│   └── migrations/
│       └── 0006_content_engine.sql            # NEW — fixtures, events, articles tables
├── CLAUDE.md                                   # update to reflect content engine
└── spec-content-agent.md                       # original spec (verbatim from handoff)
```

The `packages/content-engine/` is the Python content engine. The rest of the repo is the existing Vite app. Not a true monorepo — just a `packages/` subfolder for the Python sibling. Web build at root (`npm run build`); content engine has its own Python tooling (`pyproject.toml`, `pytest`, `ruff`).

### Cost model amendment (§ 11)

The spec's $400/year all-in is the **AI generation cost only**. Realistic infra-inclusive total:

| Line | Per month |
|---|---|
| Anthropic API (per spec) | $7 |
| Postgres + pgvector (Supabase Pro at scale) | $25 |
| Cloudflare Workers + Queues (paid plan past free tier) | $5 |
| OpenAI embeddings (mentioned, not priced) | $2 |
| API-Football Pro (already paying) | $19 |
| **Realistic all-in** | **~$58/mo = ~$700/yr** |

Still cheap relative to a Jakarta junior writer at ~Rp 96 jt/year (~$5,800/yr USD), but the spec's "$400/year" understates by ~$300/year. Update spec § 11 to reflect.

---

## 2 · Open decisions — Ade's calls

These resolve the spec § 14 open questions:

### 2.1 Author byline strategy → **(a) Gibol Newsroom org byline for v1; add (c) named human editor on flagship matches by Month 3.**

**Why:** Maintaining 2-3 fictional persona bylines is a credibility risk if discovered. Org byline + real-human-on-flagship is honest. EEAT signals come from publisher consistency + flagship-match human editor sign-off, not invented author personas.

**Implementation note:** `<meta name="author">` reads "Gibol Newsroom" by default. For flagship matches (per `flagship.py`), it reads `Diedit oleh: {real-editor-name}`. JSON-LD `author` is `{"@type": "Organization", "name": "Gibol"}` always; `editor` field on flagship articles is the human's `Person` schema.

### 2.2 AI disclosure transparency note → **YES.**

Standard footer on every generated article:

> *Konten ini disusun dengan bantuan AI dan diverifikasi oleh tim editorial Gibol. Data live diambil dari API-Football, ESPN, dan sumber resmi liga.*

**Why:** 2026 reader expectation. UU ITE legal cover. Hidden AI content is a reputation time-bomb if discovered, and Indonesian sport readers in 2026 will spot it. Transparency turns a risk into a feature ("kami pakai AI tapi datanya beneran").

**Implementation:** Static footer block in the article-page template, not generated per-article. Same wording across all generated content for consistency.

### 2.3 Live match thread (Phase 2 stretch) → **SKIP for v1 and v2. Revisit at Phase 5+.**

**Why:** Detik publishes minute-by-minute live within seconds of events using human-staffed live blogs. Competing on speed is expensive (cost scales linearly with match-minute updates, ~50-90 generation calls per fixture) and the moat is shallow. Recap excellence is defensible; live-thread mediocrity is not. Better to win match-end recap (5 min after final whistle) and pre-match preview (24h ahead) — both are differentiated against Detik's generic live blog.

### 2.4 English-language version → **SKIP.**

**Why:** Bahasa-first is the brand per `CLAUDE.md` core principle #3 (already locked-in via `docs/phase-2-ux-response.md` rejecting the English-default UX shift). Diaspora is real but small. English version doubles content surface for ~30% additional cost and dilutes the "for Indonesian fans" identity. The user-driven `id ↔ en` UI toggle stays as-is (translates the dashboard chrome, not generated articles).

### 2.5 Liga 1 voice supplement timing → **MOVE TO PHASE 2** alongside NBA, not Phase 3.

**Why:** Liga 1 is the highest-stake content for Indonesian audience. The brand is "Bahasa-first multi-sport for Indonesian fans" — putting EPL (foreign league) + NBA (foreign league) before Liga 1 (home league) is wrong priority. Phase 2 covers EPL + Liga 1 in parallel; NBA standings/bracket is the templated Haiku 4.5 work that runs alongside without adding much risk.

**Sequence change:**
- Phase 2 becomes: **EPL preview/recap auto-publish** (continuation) + **Liga 1 preview/recap MVP** + standings explainer
- Phase 3 becomes: **NBA recap quarter-based** + F1 weekend + World Cup tournament-mode

Ship `voice-rules-liga-1.md` supplement in Phase 2 with heavier code-switching, more klub-nickname density, more Indonesian football slang ("nge-tackle", "ngegol", suporter culture references).

### 2.6 Push notifications + WhatsApp digest scope → **PHASE 4 stretch.**

**Why:** PWA infra already shipped (manifest, service worker, install prompt, offline cache live since v0.13.x). But the content engine needs to be reliable first — pushing low-quality recaps to a fan's lock screen is worse than no push at all. Push notification subscription flow lands when recaps are auto-publishing reliably for 4+ weeks (= late Phase 2 or Phase 3).

WhatsApp digest is a separate question — it's a distribution channel, not a content type, and goes through WhatsApp Business API which has its own approval cycle. Defer to Phase 5 or beyond.

---

## 3 · Sequencing — content engine vs. existing growth-track

Two things are already in flight + the content engine on top:

| Track | Status | Window |
|---|---|---|
| **Derby OG share-card** (v0.21.0) | ✅ shipped 2026-04-27 | Persija-Persib derby is 13 days out (May 10 at JIS) |
| **Phase 2 UX (Sprints A–F)** | ✅ shipped (v0.16.0 → v0.20.0) | Done |
| **FIFA WC pre-launch teaser** | ⏳ queued | Kickoff Jun 11, 6 weeks of compound runway |
| **Content engine Phase 0** | 📋 awaiting greenlight | TBD per this document |

### Recommended sequence

1. **Now → 2026-05-10 (13 days):** Monitor derby OG share-card analytics. Tune `SharePredictionButton` copy if needed. Derby weekend is a brand moment + a content corpus moment — manual recap of the JIS derby itself becomes Eval Set Gold #1 for the engine later.
2. **2026-05-11 → 2026-05-31 (3 weeks):** **FIFA WC manual content sprint.** Hand-write ~10 articles: 5 group previews (USA-Mex-Can host context, top contenders, Asian qualifiers Indonesia angle), 5 host-city guides + 3 manager profiles for top contenders. **These articles double as Eval Set Gold #2 for the engine.** Manual now = automated correctly later.
3. **2026-06-01 → 2026-06-07 (1 week, Phase 0):** Content engine foundation. Scaffold `packages/content-engine/`, set up Postgres schema migration `0006_content_engine.sql`, build EPL fixture ingestion + Anthropic SDK wrapper with caching enabled, write `STATUS.md` first commit.
4. **2026-06-08 → 2026-06-28 (3 weeks, Phase 1):** EPL preview + recap MVP. EPL season just ended (May 2026) so daily volume is low — perfect tuning window. Ship 25 articles, manual review every one, log changes in `prompt-changelog.md`. **Definition of done:** 10 random Gibol previews next to 10 Bola.net previews, an Indonesian football fan can't tell which are AI-assisted from voice alone.
5. **2026-06-29 → 2026-07-19 (3 weeks, Phase 2):** Liga 1 preview/recap MVP (Liga 1 season starts August so prep matters) + EPL auto-publish enabled for non-flagship matches + standings explainer + Liga 1 voice supplement.
6. **2026-07-20 → 2026-08-09 (3 weeks, Phase 3):** NBA + F1 + WC. NBA Finals likely active in this window (June-July typically). F1 mid-season. WC group stage in August.
7. **2026-08-10 onwards (Phase 4+):** Evergreen profiles, head-to-head pages, glossary batch, Opus QC sweep cadence, Search Console dashboard.

### Why this sequence works

- **Derby + FIFA WC manual content becomes the Eval Set.** The engine's voice is calibrated against articles you wrote and approved, not against an abstract rubric. This is the single highest-leverage decision in the rollout.
- **EPL Phase 1 timing is low-stakes.** EPL just finished — daily article volume is near zero. We can tune prompts at leisure before Liga 1 starts in August (high-stakes, high-volume).
- **Liga 1 lands when its season starts.** August. Generated content arrives just as readers are looking for previews of the new season.
- **NBA + WC Phase 3 lands when those competitions are active.** Real fixtures = real eval.

---

## 4 · What needs to land before Phase 0 starts

Hard gates on Phase 0 kickoff:

- [ ] **Confirm Vite + JSON-files publishing approach (this doc § 1).** Reject if you'd rather migrate Gibol to Next.js — that's a separate ~6 week project + breaks Phase 2 UX.
- [ ] **Confirm URL co-existence rule (this doc § 1).** Existing canonical slugs stay; engine adds NEW URLs only.
- [ ] **Confirm 6 product decisions (this doc § 2).** Recommendations stand unless overruled.
- [ ] **Confirm sequencing (this doc § 3).** FIFA WC manual content first → June 1 Phase 0 start.
- [ ] **Anthropic API key provisioned** in Vercel env (`ANTHROPIC_API_KEY`).
- [ ] **OpenAI embeddings key** provisioned if going with `text-embedding-3-small` (`OPENAI_API_KEY`).

If those land, Phase 0 starts June 1 with a 5-day scaffolding window.

---

## 5 · Documents to update once decisions land

In the spec author's repo:

- `spec-content-agent.md` § 9, § 10 — replace Next.js publishing pipeline with Vite + JSON files
- `spec-content-agent.md` § 8 — update URL structure to clarify co-existence with existing slugs
- `spec-content-agent.md` § 11 — correct cost model to include infra ($700/yr, not $400)
- `spec-content-agent.md` § 12 — re-phase per § 3 above (Liga 1 to Phase 2, NBA to Phase 3)
- `spec-content-agent.md` § 14 — mark all 6 open decisions as resolved per § 2 above
- `CLAUDE.md` — note that web app is Vite + React, not Next.js
- `STATUS.md` — Phase 0 start date 2026-06-01

In the Gibol repo (when Phase 0 starts):

- `CLAUDE.md` — add content-engine section to project instructions
- `docs/01-architecture.md` — add Python content-engine sibling at `packages/content-engine/`
- `supabase/migrations/0006_content_engine.sql` — fixtures + events + stats + articles tables

---

## 6 · One thing not in the spec that should be: plagiarism check vs external sources

The spec's dedup hash catches **internal** duplication (same article published twice). But the bigger risk is generated content too similar to **external** sources — Detik / Bola.net training data could lead Sonnet/Opus to produce phrases close enough to flag plagiarism.

**Recommendation:** Add a Phase 1 quality gate: per-article 7-gram sim-hash check against a rolling corpus of the top 5 Indonesian sport sites (scraped via existing news endpoints, retained for 30 days). Score > 0.6 similarity to any single external article = block + regenerate. Cheap to implement, kills the legal risk.

Worth adding to spec § 7 (Quality & Evaluation Framework) before Phase 1 starts.

---

**End of response.** Once you sign off on §§ 1–4 above, the spec author can update their repo, and we kick Phase 0 on 2026-06-01 with a clean starting line.
