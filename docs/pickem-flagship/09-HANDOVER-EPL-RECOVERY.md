# HANDOVER — EPL Recovery & Launch · Entry point for Claude Code

> **⚠ CALENDAR CORRECTION (added later on 2026-07-18):** the ASEAN Championship 2026 runs **Jul 24 – Aug 26, 2026** — NOT December as stated below. Consequence: add ticket **S0-3b — seed AFF 2026** (API-Football; re-point the WC2026 tournament template: seed script + `competitions.js` registry row + bracket reskin) immediately after S0-3, and the S0-6 rollover banner points **AFF → EPL** during the AFF knockouts. Strategy authority: `11-PLATFORM-STRATEGY.md` §2.
>
> **⚠ SCOPE NOTE (final packaging, same day):** this file is now the **R0 recovery ticket spec only** (T0 + S0-1…S0-7 + S0-3b). Its §4 Track B section and its references to `design_handoff_flagship/` as design authority are **superseded** — the locked design is `design_handoff_gibol_redesign/` (Sistem 4a) and the build sequence is `13-DEVELOPMENT-PLAN.md`. Front door: `14-HANDOVER-CLAUDE-CODE.md`. Do not execute this file's §4 or §9 prompt.

**Date:** 2026-07-18 (WC final is TOMORROW, Jul 19) · Owner: Ade · Status: approved, execute immediately
**This file supersedes `00-HANDOVER.md` as the front door.** Full audit behind it: `audits/2026-07-18-distance-to-launch-audit-and-plan.md` (in the Gibol folder root). 00's constraints and doc map still apply except where this file re-keys them.

---

## 1. Situation (read this before touching anything)

The flagship build stalled at **v0.80.3 (commit `4060d2e`, 2026-06-12)** — Track A (schema, scoring-core + 105 tests, dispatcher actions, gates, instrumentation) is DONE and live; Track B (screens), R3 (billing), R4 (EPL), R5 (skor.gibol.co) never started. Worse, production carries an incident: **the WC2026 Pick'em was never scored.** Verified live on Jul 18: all 72 group fixtures `status='scheduled'` with null scores, and **zero knockout fixtures exist in the DB** — the Jun-28 knockout backfill never ran, because football scoring depends on a human running `scripts/backfill-wc2026.mjs` from this Mac. Only NBA has an autonomous cron (v0.79.11 pattern).

The recovery plan re-keys everything to the EPL calendar: **EPL MW1 ≈ Sat Aug 15 is the launch. Liga 1 follows Sep 4.** The WC window is over; we score it retroactively (picks locked correctly at kickoff, so retro-scoring is fair), get the final pickable if humanly possible before kickoff, and pour everything into EPL.

North star going forward: **WPP — weekly picking players in pools** (Weekly Active Pools stays as the loop-health guardrail).

## 2. Ticket T0 — repo rescue (do FIRST, before any code)

The working copy has files modified **Jul 2** — three weeks after the last commit — that no one has seen since (the Cowork cloud session can't read them; you can):

- `api/_lib/pickem/league-settings.js`, `api/_lib/pickem/league-detail.js`, `api/_lib/pickem/league-config.js`
- `package.json`, `package-lock.json`

Run `git status` + `git diff`, report what the Jul-2 WIP actually is in one paragraph, then **commit it or discard it consciously** — do not let it sit. If `git` errors with "Resource deadlock avoided", files are still iCloud-dataless: run `find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -exec cat {} + > /dev/null 2>&1` (or `brctl download .`) to force-materialize, then retry.

Then two hygiene commits (structural fix — the iCloud eviction proved the Mac is not a source of truth):
1. Copy `../pickem-flagship/` into the repo as `docs/pickem-flagship/` (they're strategy docs, not secrets) and commit.
2. Verify `design_handoff_flagship/` is committed (it was referenced as "in the repo" but is absent from origin/main); if gitignored, un-ignore and commit it.

## 3. Sprint 0 — recovery & data spine (now → Jul 26) · v0.81.x

Work these in order. S0-1 is the 24-hour item.

| # | Ticket | Spec |
|---|---|---|
| **S0-1** | **WC2026 backfill + score + insert the final, TODAY** | New `.github/workflows/wc-backfill.yml` with `workflow_dispatch` (+ hourly cron until Jul 20, then delete the cron), reusing the same secrets as `nba-fixtures-backfill.yml`. It runs `scripts/backfill-wc2026.mjs` — the KO round parser is already knockout-ready (A8, v0.80.2): R32/R16/QF/SF/3rd/final → matchdays 4–8. Backfill groups + all KO results, then trigger `pickem_score_fixture` per finalized fixture (copy the v0.79.11 loop from `scripts/backfill-fixtures-nba.mjs` ~lines 300–325 if the WC script lacks it). Acceptance: `list-fixtures?league=WC2026` shows final-whistle scores + `status='final'` on played games, the Jul 19 final exists as `scheduled` with correct `lock_at`, and leaderboards move. |
| **S0-2** | **Generic football backfill+score cron** | New `scripts/backfill-fixtures-football.mjs` (param: `--league-id` / `--competition`) + `.github/workflows/football-backfill.yml`: every 2h on matchdays, 6h otherwise (a single cron `0 */2 * * *` with an in-script "any fixture within ±6h?" cheap-exit is fine). Same shape as NBA: upsert fixtures from API-Football → trigger scoring RPC on newly-final fixtures. This is the structural fix; **nothing else ships until it's green two consecutive days.** Include `workflow_dispatch` always. |
| **S0-3** | **EPL seed** | Finish `scripts/preseed-epl-2026-27.mjs` per its own header TODOs (league 39, season 2026, all 380 fixtures, MW1 `lock_at`s) and run it; add the `EPL-2026-27` entry to `src/pickem/competitions.js` + switcher pill. Acceptance: MW1 fixtures visible and pickable in prod behind the switcher. |
| **S0-4** | **CI test gate** | Add `npm test` (the 105-test Vitest suite) as a required step in `deploy.yml` before Build. A red suite must block deploy. |
| **S0-5** | **Function budget** | Count in the Vercel dashboard. The repo has **12** non-`_lib` function files (approve, auth/callback, cron/nba-close-game-scan, derby, health/data-sources, news, og-derby, og-recap, pickem, proxy, recap/[gameId], recap/page/[gameId]) — 00-HANDOVER's "11/12" looks wrong. If 12/12: consolidate (fold `og-derby` into `og-recap` via a query param, or the two recap functions into one) so `api/billing.js` has a slot for R3. |
| **S0-6** | **WC → EPL rollover banner** | On WC surfaces + PickemHome: "WC selesai — skor final udah masuk. Grup lo lanjut ke EPL?" → one tap re-creates the grup (same name, same commissioner, EPL-2026-27) and produces the invite link to re-share on WA. EN/ID double-keyed. Track `rollover_accept` (schema already in `src/lib/pickemEvents.js`). No new screens — a banner + one dispatcher-backed action (reuse `create-league`). |
| **S0-7** | **Liveness alarm** | Extend `api/health/data-sources.js`: `days_since_last_scored_fixture` per active competition; alert threshold 2 days. The WC blackout would have paged Jun 13, not been found Jul 18. |

**Sprint 0 exit gate:** WC fully scored + final was pickable · EPL MW1 fixtures live · football cron green 2 days · CI fails on a broken scoring test · function budget confirmed with a free slot.

## 4. Sprint 1 — Track B, the loop's screens (Jul 27 → Aug 9) · v0.82–0.84

Design authority: `design_handoff_flagship/README.md` (screens, copy, build-step map). Mechanics authority: `06-gamification-audit.md`. Seam rule from 00 §3 still binding: UI consumes only the stable JSDoc'd fns in `src/pickem/api.js`; no fetch in components. Track A functions you need all exist.

Build order = the loop's critical path:
1. **Invite/guest landing `/g/:code`** — pool preview with NO account, first pick as guest (`guestStore` + `merge-guest` are built). **Exit test: link-tap → confirmed pick in ≤3 taps, ≤60s, no login wall, at 390×844.** This screen is the growth engine — it gets the most polish.
2. **"Minggu Ini" pick sheet** — the whole matchweek one scroll: jagoan star, lock countdown chips, completion ring (mechanics per 06).
3. **Grup home + commissioner panel** — standings, `picked_current_matchday` nudge row ("belum pick · colek di WA"), pending-member-#11 upgrade sheet (402 path is built), CSV export button (`entriesCsv.js` is built).
4. **Share cards** — grup invite, weekly brag, "gue menang" — static PNG via the existing satori/resvg pipeline (`scripts/generate-*-og.mjs` pattern) + OG meta on `/g/:code`.
5. **Root home swap** behind `VITE_FLAG_PICKEM_HOME` (Phase A inversion): flag-on for beta Aug 8–9, default-on at launch Aug 15.
6. **Provisional live points** — render `useProvisionalPoints` (built + tested) in match center and grup home.

Cut from this sprint: badges v2, push notifications, billing UI, NBA/F1 pick'em, hub redesigns, D6–D7 unless free.

**Exit gate (closed beta Aug 8–9):** 5–10 real WhatsApp grups; pick-completion ≥70%; invite→pick funnel measured via `pickemEvents`.

## 5. Sprint 2+ (context so you cut in the right direction)

Aug 10–14: beta fixes only, freeze Thu Aug 13, **launch EPL MW1 Sat Aug 15** with root = Pick'em. Aug 17–Sep 3: Liga 1 via the same generic script + club-badge picker + Bahasa-gaul pass (**live before Sep 4 kickoff**); email digest v1; R5 Phase B (hubs → skor.gibol.co) in the quiet week Aug 25–Sep 1. R3 billing ~Oct, gated on Midtrans KYB (Ade) — `grant-entitlement` + IDR-transfer stopgap already built if it slips. AFF Dec = first sponsored pool.

## 6. Hard constraints (unchanged from 00 §4 unless noted)

1. Vercel Hobby function limit — **treat the budget as SPENT until S0-5 proves otherwise**; new endpoints only as `?_action=` dispatcher cases.
2. No Tailwind, no new deps, no `'use client'` — Vite + React 18, COLORS + token sheets.
3. DDL = idempotent migration files only; Ade applies via SQL Editor; RLS ships in the same migration; additive-only during the window.
4. Commit from Mac Claude Code; after every push: curl-verify `APP_VERSION` on live (`curl -s https://www.gibol.co/assets/<bundle>.js | grep -o '0\.[0-9.]*'`); stale → `npx vercel --prod --yes --force`.
5. EN-first double-keyed strings (ID secondary; named mechanics keep ID names: Tebak Skor, jagoan, colek); no betting language — the banned-vocab guard (D2) is live server-side, keep client copy consistent with it.
6. Never break the live hubs, NBA cron, or auth. The WC surfaces must keep rendering while you retro-score.
7. Version from **v0.81.0**; ship notes in `src/lib/version.js` per ship, as always.

## 7. Authority chain on conflicts

`09` (this file) → `audits/2026-07-18-distance-to-launch-audit-and-plan.md` → `design_handoff_flagship/README.md` (UI/copy) → `06-gamification-audit.md` (mechanics) → `08-teardown-deltas.md` (its tickets) → `00-HANDOVER.md` / `05-development-plan.md` (everything else). Where 00/05 reference WC dates, this file's EPL calendar wins.

## 8. Operating cadence

Ticket by ticket in order (T0 → S0-1 … S0-7 → Track B 1–6). Per ticket: implement → test → push → curl-verify → one-paragraph report (shipped / verified / next). Blocked >30 min on anything external (secrets, KYB, feed data) → one sentence, move to the next unblocked ticket. Update `docs/00-current-state.md` at each sprint exit.

---

## 9. PASTE-READY KICKOFF PROMPT

Copy everything below into Claude Code from `nba-playoffs-monitor/`:

```
Read ../pickem-flagship/09-HANDOVER-EPL-RECOVERY.md first — it is the front door and supersedes 00-HANDOVER.md's calendar. Then skim the audit it references (../audits/2026-07-18-distance-to-launch-audit-and-plan.md) and the authority chain in its §7. If any of these files fail to read with "Resource deadlock avoided", they are iCloud-dataless: force-materialize (brctl download . or cat the tree to /dev/null) and retry.

Context in one line: the build stalled at v0.80.3 on Jun 12, the WC2026 Pick'em was never scored (72 group fixtures still 'scheduled', zero knockout fixtures in the DB, final is Jul 19), and the launch is re-keyed to EPL matchweek 1 (~Aug 15) then Liga 1 (Sep 4).

Execute in this exact order:

T0 — repo rescue: git status + git diff; the working copy has Jul-2 modifications (api/_lib/pickem/league-settings.js, league-detail.js, league-config.js, package.json) newer than origin/main. Report in one paragraph what that WIP is, then commit or consciously discard it. Then commit ../pickem-flagship/ into the repo as docs/pickem-flagship/ and make sure design_handoff_flagship/ is committed too.

S0-1 (the 24-hour item): ship .github/workflows/wc-backfill.yml (workflow_dispatch + hourly cron until Jul 20) running scripts/backfill-wc2026.mjs with the same secrets as nba-fixtures-backfill.yml; backfill all WC group + knockout results, insert the Jul 19 final as a pickable fixture with correct lock_at, and trigger pickem_score_fixture per finalized fixture (copy the v0.79.11 loop from backfill-fixtures-nba.mjs if missing). Verify live via /api/pickem?_action=list-fixtures&league=WC2026 — played games must show scores and status 'final', and leaderboards must move.

Then S0-2 through S0-7, then Track B screens 1–6, exactly per the handover's §3–§4 specs, acceptance criteria included. Honor every hard constraint in §6 — especially: treat the Vercel function budget as spent until S0-5 verifies it (dispatcher actions only), no new dependencies, idempotent migrations Ade applies manually, EN-first double-keyed strings with no betting vocabulary, never break the live hubs or auth, and curl-verify APP_VERSION after every push (force-redeploy if stale).

Cadence: per ticket — implement → test → push → curl-verify → one-paragraph report (shipped / verified / next). Blocked >30 minutes on anything external: one sentence, move on. Version the first ship v0.81.0 and keep ship notes in src/lib/version.js. The Track B exit test before calling any screen done: invite link → first confirmed pick in ≤3 taps, ≤60 seconds, no login wall, at 390×844.
```
