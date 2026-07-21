# HANDOVER — Sistem 4a Build · Entry point for Claude Code

**Date:** 2026-07-18 · Owner: Ade · Status: approved, execute immediately. **This file supersedes `09-HANDOVER-EPL-RECOVERY.md` as the front door** (09 remains the detailed spec for the R0 recovery tickets it defines).

## 1. Situation (one paragraph)

Build stalled at v0.80.3 (Jun 12); the WC2026 Pick'em was never scored (72 group fixtures `scheduled`, zero KO fixtures, final is Jul 19) — recovery tickets are defined in 09. Strategy moved to **multi-sport platform** (`11-PLATFORM-STRATEGY.md`): local moat + global magnets, Main·Skor·Kabar layers. **The AFF/ASEAN Championship runs Jul 24–Aug 26 (NOT December)** — it is the first beachhead, rolling into **EPL MW1 Aug 15**, then Liga 1 Sep 4. The full redesign is locked: **`design_handoff_gibol_redesign/`** ("Sistem 4a" — scarlet/ink/cobalt on paper, Bricolage Grotesque + Instrument Sans, Main/Grup/Skor/Kabar shell, 6 primitives, per-sport skins, Edisi Malam dark, 1080×1080 dark share cards). The engine (Vite/React/Supabase/dispatcher/feeds/satori) does not change. The plan of record is **`13-DEVELOPMENT-PLAN.md`** (releases R0–R6).

## 2. Authority chain (conflicts resolve downward)

1. `design_handoff_gibol_redesign/README.md` + the locked sections (`#t4` `#t5` `#t6`) of `Gibol Redesign Concepts.dc.html` — **UI, tokens, copy truth** (turns 1–3 are superseded; ignore)
2. `13-DEVELOPMENT-PLAN.md` — scope, sequence, acceptance
3. `11-PLATFORM-STRATEGY.md` — strategy & calendar (AFF correction)
4. `09-HANDOVER-EPL-RECOVERY.md` — R0 recovery ticket specs
5. `06-gamification-audit.md` — mechanics math (star = jagoan; schema unchanged)
6. `00`/`05`/`10`/`12` — background

## 3. Hard constraints (updated set — memorize)

1. **Vercel Hobby function budget:** treat as SPENT until R0-5 verifies (12 files counted vs "11/12" claimed). New endpoints ONLY as `?_action=` dispatcher cases; `api/billing.js` gets the freed slot in R5.
2. **No Tailwind, no new runtime deps, no 'use client'.** Icons = inline SVG components (Phosphor-bold style). **Fonts ARE allowed** — Bricolage Grotesque + Instrument Sans as self-hosted woff2 subsets (≤80KB total, `font-display: swap`, base64 copies for share cards); no Google Fonts runtime request. This amends the old "no new fonts" rule.
3. **Token migration is aliased:** `tokens-4a.css` replaces values; legacy var names alias to the nearest 4a token until every route is ported. Hubs, cron, auth, scoring engine never share a commit with a visual migration.
4. DDL = idempotent migration files only, additive during the window, RLS in the same migration, Ade applies via SQL Editor.
5. **Copy:** kamu/-mu register — never "lo/gue", never betting/money vocabulary in any locale (extend `check-vocab.mjs` with a lo/gue lint); EN default locale + native-ID keys; named mechanics keep ID names (Tebak Skor, colek); the design canvas is the copy deck; prestige framing ("Semua demi gengsi.").
6. **Mechanics are frozen:** ★ ×2 = existing jagoan (schema + scoring-core + tests untouched); prop picks (pencetak gol, pole, DNF…) are R6-parked — the pick sheet's question-card layout just leaves room.
7. Commit from Mac Claude Code; after every push curl-verify live `APP_VERSION`; stale → `npx vercel --prod --yes --force`. Version from **v0.81.0**; ship notes in `src/lib/version.js`.
8. If any file reads fail with "Resource deadlock avoided": iCloud-dataless — `brctl download .` (or cat the tree to /dev/null), retry.

## 4. Execution order

**T0** repo rescue (Jul-2 WIP in `api/_lib/pickem/league-{settings,detail,config}.js`: status → report one paragraph → commit or discard; then commit `../pickem-flagship/` and `design_handoff_gibol_redesign/` into the repo) → **R0** recovery per 09 §3 + S0-3b AFF seed (kickoff Jul 24 — verify API-Football AFF league id and two-legged SF/F handling on day 1) → **R1** Sistem 4a foundation (fonts → tokens+aliases → logo → 6 primitives on a flagged `/dev/primitives` route → skins → icons → theme engine → kamu-copy pass) → **R2** five surfaces in loop order (invite landing → pick sheet → grup home → Main shell behind `VITE_FLAG_PICKEM_HOME` → Skor tab v1 → share cards v2), live-beta'd on AFF traffic → **R3** EPL launch Aug 15 (freeze Aug 13, flag default-on) → **R4** Liga 1 + skor.gibol.co Phase B + Kabar v1 + desktop `#t6` → **R5** billing (KYB-gated) + NBA nightly + Mandalika Oct 11. Full ticket tables and exit gates: `13` §2.

**Cadence:** ticket by ticket; per ticket implement → test → push → curl-verify → one-paragraph report (shipped/verified/next). Blocked >30 min on anything external → one sentence, next unblocked ticket. R0's exit gate blocks R2 (not R1 — R1 runs parallel).

---

## 5. PASTE-READY KICKOFF PROMPT

Copy everything below into Claude Code from `nba-playoffs-monitor/`:

```
Read ../pickem-flagship/14-HANDOVER-CLAUDE-CODE.md — it is the front door and supersedes 09's calendar. Then, in order: design_handoff_gibol_redesign/README.md plus the locked sections #t4/#t5/#t6 of "Gibol Redesign Concepts.dc.html" (UI/tokens/copy truth — turns 1–3 are superseded; the HTML is a design reference to recreate in our Vite+React codebase, not production code), ../pickem-flagship/13-DEVELOPMENT-PLAN.md (plan of record, releases R0–R6), ../pickem-flagship/11-PLATFORM-STRATEGY.md §2 (AFF runs Jul 24–Aug 26, not December), and ../pickem-flagship/09-HANDOVER-EPL-RECOVERY.md §3 (the R0 recovery ticket specs). If any read fails with "Resource deadlock avoided", the file is iCloud-dataless: force-materialize (brctl download . or cat the tree to /dev/null) and retry.

Context in one line: prod is stalled at v0.80.3, the WC2026 Pick'em was never scored (final is Jul 19), AFF kicks off Jul 24, EPL launches Aug 15, and the locked Sistem 4a redesign now restyles the whole product on the unchanged engine.

Execute: T0 (rescue the Jul-2 WIP in api/_lib/pickem/league-*.js — report, then commit or discard; commit the doc sets into the repo), then R0 recovery (WC backfill+score+insert-the-final via a workflow_dispatch action TODAY; generic football cron; EPL seed; AFF 2026 seed re-pointing the WC tournament template — verify API-Football's AFF league id and two-legged semifinal/final handling on day 1; CI test gate; function-budget verify + og/recap consolidation; functional AFF→EPL rollover; liveness alarm), then R1 Sistem 4a foundation (self-hosted Bricolage/Instrument subsets ≤80KB; tokens-4a.css with legacy aliases; CSS logo block; the 6 primitives with exact chip states on a flagged /dev/primitives QA route in 3 sport skins × light/Edisi-Malam; sportSkins.js config; inline-SVG icons; auto dark 19:00–06:00 WIB with override; kamu-register copy migration with a lo/gue lint in check-vocab.mjs), then R2 screens in loop order (invite landing, pick sheet, grup home, Main tab shell behind VITE_FLAG_PICKEM_HOME, Skor tab v1, share cards v2 at 1080×1080 dark + og crop) — pixel-faithful to #t4, consuming only src/pickem/api.js, beta-live on AFF traffic. R3 flips the root flag for EPL Aug 15 (freeze Aug 13). Full tables, exit gates and R4–R6 in 13 §2.

Hard constraints (§3 of the handover): dispatcher-only endpoints until the function budget is verified; no Tailwind, no new runtime deps, no icon libraries (inline SVG); fonts self-hosted only; aliased token migration — hubs/cron/auth/scoring never share a commit with visual work; additive idempotent migrations Ade applies manually; kamu/-mu voice, never lo/gue, never betting vocabulary; star = the existing jagoan mechanic, schema and scoring math untouched; prop picks are parked; curl-verify APP_VERSION after every push and force-redeploy if stale.

Cadence: ticket by ticket — implement → test → push → curl-verify → one-paragraph report (shipped / verified / next). Blocked >30 minutes on anything external: one sentence, move to the next unblocked ticket. R0's exit gate blocks R2 but not R1. Version the first ship v0.81.0; ship notes in src/lib/version.js. R2 exit test per screen: invite link → first confirmed pick in ≤3 taps, ≤60 seconds, no login wall, at 390×844.
```
