# HANDOVER — Pick'em Flagship · Entry point for Claude Code

**Date:** 2026-06-11 (WC2026 kickoff day) · Owner: Ade · Status: approved, ready to build
**This file is the front door.** Everything else in `pickem-flagship/` hangs off it.

---

## 1. The decision (one paragraph)

Pick'em is now Gibol's core business; the live-score hubs become the addon. gibol.co root inverts to a pool-first Pick'em product (Phase A now — home swap only, zero URL moves; Phase B post-final — hubs 301 to `skor.gibol.co`). Revenue: paid commissioner tiers ($19/Rp79k season · $49/Rp249k lifetime) + Gibol+ player premium (Rp19k/mo). Never real money in pools — SaaS fees for hosting only (judi online line, non-negotiable). Benchmark beaten on mechanics, not marketing: playoffpickems.com (17.7k players, commissioner-pays model proven). Our wedge: WhatsApp-group commissioners, Bahasa-first, Tebak Skor, and a live-data layer the competitor can't copy. North-star: **Weekly Active Pools** (grups with ≥3 members making ≥1 pick / 7 days).

## 2. Doc map — read in this order

| Doc | What it owns | Authority |
|---|---|---|
| `03-game-mechanics.md` | Core loop, scoring math, formats, anti-gaming, stop list | Mechanics truth |
| `06-gamification-audit.md` | Jagoan, lock countdown, completion ring, trophy case, Musuh Bersama, GA4 event schema + targets | **Amends 03 and 05; wins all conflicts** |
| `05-development-plan.md` | Releases R1–R5, migrations, API, tickets, risks | Engineering truth |
| `04-claude-code-design-prompt.md` | Screens, mobile-first rules, build order for UI | UI truth (separate design pass, may still be running) |
| `02-wireframes.html` | The 8 target screens (open in browser) | Reference |
| `01-strategy.md` | Business case, pricing, inversion phases, competitor teardown | Context |
| `11-PLATFORM-STRATEGY.md` | Multi-sport play-layer strategy v2, AFF calendar correction, sport portfolio, gates | Strategy spine (supersedes 01 on conflicts) |
| `13-WORLD-CLASS-PICKEM.md` | Global competitor research (ESPN/Superbru/Splash/Super 6/Kicktipp) + delta backlog D-1…D-9 (Nyaris point, Tebak 6, Streak Nasional, Babak Baru, Komandan Rewards, brand SKUs, Komunitas) | Research synthesis; deltas additive to 03/06/11 |
| `14-EXECUTION-HANDOVER.md` | Sport waves 0–5, league/permission model, 4-door onboarding (+ON-1 nickname), monetization ladder + B2B SKUs, tech deltas (0021–0023, dispatcher actions, infra triggers), master calendar | **Product-scope authority Sprint 2+; adopts 13's deltas; 09 keeps Sprint 0–1 engineering** |

Plus the standing repo docs: `docs/01-architecture.md` (stack truth), `docs/00-current-state.md` (live status), `src/lib/version.js` (ship notes).

**Design bundle landed 2026-06-11:** `design_handoff_flagship/` (in the repo) — hi-fi screens for all Track B surfaces + component inventory + interactive teach prototype. **Its README is now the UI/copy authority** (supersedes `04` on screens). Two rule changes it introduces: (1) **English-first copy, ID secondary** — reverses the Bahasa-first copy rule in `04` §1/§4 and `05`; EN becomes the default i18n locale; (2) lighter paper surface stack via `flagship-overrides.css`. It also adds the **Bracket Lock** game type (PlayoffPickems-parity mode, commissioner-selectable alongside match-by-match). Track B build order in the README's screen→step map. Competitive read: `07-side-by-side-playoffpickems.md`.

**Teardown deltas (2026-06-11, same day):** `08-teardown-deltas.md` — seven tweaks from a logged-in review of a real 63-member PlayoffPickems pool. **D1–D2 amend migration 0019** (sponsor-ready tier/product enums + `leagues.description` with banned-vocab guard) — read 08 before writing A1. D3 sets the football default template to both formats (kills their 16-day dead-air problem), D4 adds `picked_current_matchday` to `league-detail`, D5 adds a CSV export ticket to R2, D6–D7 are Track B UI notes (max-points denominators, free FIFA-rank chip).

## 3. Two tracks — what to build NOW vs what waits for design

The design pass (`04`) runs separately. **Do not block on it.** Everything below is design-independent foundation work; it's R1/R2 of `05` minus the screens.

### Track A — start immediately (no design dependency)

| # | Work | Source ticket |
|---|---|---|
| A1 | Migration `0019_pool_scoring_and_entitlements.sql` — full spec in `05` §2 **plus** `predictions.is_jagoan` + partial unique index (`06` GAP-1). File only; Ade applies via SQL Editor. Include the verification query block | R1 |
| A2 | **`scoring-core.js`** — extract all point math into pure functions: config resolution (`league.scoring_config ?? pickem_rules`), match/bracket/group points, tebak skor 5/3/2, underdog ×1.5 (strict `<0.30`), jagoan ×2/−25% (stack cap 4× base, matchday floor 0), streak +3, nemesis +2. **Vitest suite — exhaustive: boundaries, draws, walkovers, stack order, zeroed-out config values.** This is the money math; it gets the most tests in the repo | R1-3 · R2-1/2/7 · GAP-1/5 |
| A3 | Dispatcher actions in `api/pickem.js` (NO new functions — 11/12 limit): `update-league-settings`, `league-detail`, `merge-guest`, `approve-member`, `grant-entitlement` (admin-token), extend `create-league` (template) + `predict` (scores, jagoan, edit-event) + `join-league` (pending at cap) | R1-1/2/5 · R2-5/6 |
| A4 | Consensus-at-lock snapshot in the cron path (one UPDATE per fixture-league, SQL not JS) | R1-4 |
| A5 | `entitlements.js` helper + all gate logic (host >1 grup, member #11, multi-entry cap 3, manual entries, pre-pick consensus) — logic + tests now, UI later | R2-6 |
| A6 | Instrumentation: `src/lib/pickemEvents.js` wrapping GA4 with the `06` GAP-6 schema; `pickem_kpi_daily` Supabase view (in 0019 or 0020) | R1-7 |
| A7 | `ops/pickem-smoke.md` runbook + `ops/billing-runbook.md` skeleton | §7 |
| A8 | Prep scripts: verify `scripts/backfill-wc2026.mjs` ready for the Jun 28 knockout re-run; EPL pre-seed script skeleton (R4-4) |  |
| A9 | `useProvisionalPoints` hook — logic + tests against recorded live-feed fixtures (rendering waits for design) | R2-3 |

### Track B — after the design pass lands

All screens/flows: Malam Ini first-touch, create-grup wizard, invite/guest landing, jagoan star + countdown chips + completion ring UI, grup home + commissioner panel + pending-member sheet, root home swap (flag `VITE_FLAG_PICKEM_HOME`), WA artifacts. Build order and acceptance criteria per `04` §3 + `06` §4.

**Seam rule so the tracks merge cleanly:** Track A exposes everything through `src/pickem/api.js` client functions with stable signatures (document each in JSDoc). Track B consumes only those. No UI assumptions inside handlers; no fetch calls inside components.

## 4. Hard constraints (memorize — full list `05` §0)

1. Vercel Hobby **12-function limit, 11 used** — new endpoints only as dispatcher actions; `api/billing.js` reserved as #12 for R3.
2. **No Tailwind, no new deps, no 'use client'** — Vite + React 18, COLORS + `pickem-tokens.css`.
3. DDL = migration files only, idempotent, Ade applies manually.
4. Commit from Mac Claude Code (Cowork sandbox can't write `.git/`). After every push: curl-verify `APP_VERSION` on live; stale → `npx vercel --prod --yes --force`.
5. New tables ship RLS in the same migration; no self-referencing policies (0018 lesson).
6. **English-first** double-keyed strings (EN default locale, ID secondary — design rule change #1; named mechanics keep ID names: Tebak Skor, colek); no betting language in either locale; no secrets in code.
7. Never break the existing hubs, scoring cron, or auth. Additive migrations only during the window.

## 5. Calendar & external dependencies

| Date | Event |
|---|---|
| Jun 11–27 | Group stage — R1+R2 window; daily pick habit forms NOW |
| Jun 28 | **Hard deadline:** knockout backfill re-run (Ade) + Musuh Bersama live (R2-9) |
| Jun 28–Jul 10 | R3 (billing + tools). **Blocker owned by Ade: Midtrans KYB — apply today; Stripe ships first if it lags** |
| Jul 19 | Final → EPL rollover prompt (R4-4) must be live before this day |
| Jul 20+ | R5: skor.gibol.co Phase B migration |

## 6. Operating cadence

Ticket by ticket in Track A order. Per ticket: implement → test → push → curl-verify → one-paragraph report (shipped / verified / next). Ship notes in `version.js` per ship; `docs/00-current-state.md` per release; exit criteria per `05` (+ `06` instrumentation rider). Blocked >30 min → say so in one sentence, move to the next unblocked ticket. R1 = v0.80.0.

---

## 7. PASTE-READY KICKOFF PROMPT

Copy everything in the block below into Claude Code from `nba-playoffs-monitor/`:

```
Read pickem-flagship/00-HANDOVER.md in the repo's parent folder (Projects/Gibol/pickem-flagship/), then the doc set it maps in §2, in that order — including 08-teardown-deltas.md (amends migration 0019: read before writing A1) and design_handoff_flagship/README.md in the repo (the UI/copy authority; open its index.html for the screens).

You are building the Pick'em flagship in two sequential tracks. Track A first: the foundation (schema, scoring, dispatcher API, gates, instrumentation), tickets A1 → A9 in order, exposing everything through stable JSDoc-documented client functions in src/pickem/api.js per the seam rule (§3). Then Track B: the screens, following design_handoff_flagship/README.md's screen→build-step map and acceptance criteria — recreate the designs in src/pickem/ with the existing token sheets + flagship-overrides.css; they are references, not production code. Where a Track B surface only needs Track A functions that already exist, you may start it before A9 completes.

Honor every hard constraint in §4 — especially: no new Vercel functions (dispatcher actions only, 11/12 used; billing.js is reserved as #12 for R3), no new dependencies, idempotent migration files Ade applies manually via the Supabase SQL Editor (apply 08's D1–D2 amendments to 0019), additive-only schema, RLS in the same migration, ENGLISH-first double-keyed strings (EN default locale, ID secondary — design rule change #1), no betting language, and curl-verify the live APP_VERSION after every push (force-redeploy if the alias is stale).

Scoring math is the heart: A2's scoring-core.js must be pure functions with an exhaustive Vitest suite (boundaries, draws, walkovers, jagoan/underdog stack order with the 4× cap and matchday floor, zeroed config values, pickem_rules fallback). Wire the suite into CI via the existing deploy workflow.

Authority chain on conflicts: design_handoff_flagship/README.md wins on UI and copy; 06-gamification-audit.md wins on mechanics; 08-teardown-deltas.md wins on the specific tickets it amends; this handover (00) wins on everything else, including over 05.

Start with A1. After each ticket: one paragraph — what shipped, how it was verified, what's next. Track B exit test before calling any screen done: invite link → first confirmed pick in ≤3 taps with no login wall, at 390×844. If blocked more than 30 minutes on anything external (env vars, KYB, fixture data), flag it in one sentence and continue with the next unblocked ticket. Version the first ship v0.80.0 and keep ship notes in src/lib/version.js as always.
```
