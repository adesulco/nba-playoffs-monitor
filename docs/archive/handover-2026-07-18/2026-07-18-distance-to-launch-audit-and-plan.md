# Gibol — Distance-to-Launch Audit & Detailed Execution Plan

**Date:** 2026-07-18 (Sat) · **Auditor:** Claude (CPO/CTO session) · **Audited against:** repo `origin/main` @ `4060d2e` (v0.80.3) + live www.gibol.co + live Pick'em API
**Method note:** the local `Gibol` folder is iCloud-evicted (140/142 key files are dataless placeholders), so this audit ran against a fresh GitHub clone + production curls. Two items below need Ade's Mac to close (§8).

---

## 0 · Verdict in one paragraph

The engine is in far better shape than the Jul-18 strategy plan assumed — pools, invites, guest picks, server-side locking, pure-function scoring with 105 tests, entitlement gates, and the API-Football proxy **already exist and are live**. But the flagship build **stalled on 2026-06-12** (last commit = last deploy = v0.80.3), and production is carrying a serious incident: **the WC2026 Pick'em was never scored — all 72 group fixtures still `scheduled`, zero results, zero knockout fixtures, final is tomorrow.** Track B (the flagship screens), R3 (billing), R4 (EPL) and R5 (skor.gibol.co) are all un-started. Distance to EPL launch is ~4 weeks of focused work, and the single most important structural fix is making football scoring autonomous (a cron, like NBA already has) so a stalled fortnight can never again mean a dead product.

---

## 1 · Incident: the WC2026 scoring blackout

**Facts (verified live, 2026-07-18):**
- `list-fixtures?league=WC2026` returns 72 fixtures, matchdays 1–3 only, **every one `status: scheduled`, every score `null`**.
- No Round-of-32/16, QF, SF, or final fixtures exist in the DB at all. The Jun 28 knockout backfill re-run (Ade-owned hard deadline in `00-HANDOVER.md` §5) never happened.
- Root cause chain: WC results depended on **manually running `scripts/backfill-wc2026.mjs` from Ade's Mac** (needs `SUPABASE_SERVICE_ROLE_KEY`); the only scheduled automation is `nba-fixtures-backfill.yml` (NBA-only, and that season is over). When the human stopped, the product stopped. NBA had already solved this (v0.79.11 made its loop autonomous); football never got the same treatment.
- Mitigating: picks locked correctly at kickoff (`lock_at` = kickoff, 409 after), so retro-scoring is legitimate — every locked pick can still be scored fairly.

**Decision (recommended, not a menu):**
1. **Today/tomorrow (before the final):** run the WC backfill + scoring for all group and knockout results, and insert the **final as a pickable fixture**. Anyone still around gets their full tournament points *and* one redemption pick on the final. Ship it as a GitHub Actions `workflow_dispatch` job (secrets already live in repo for the NBA workflow) so it doesn't need the Mac.
2. **No public mea culpa page** — a quiet "Skor WC2026 sudah final ✓" state on the WC surfaces plus a rollover banner to EPL. The audience was small and the window is over; the apology is the EPL product being good.
3. **Post-mortem rule going forward:** no competition ships unless its scoring path runs on a schedule with zero human steps (§6.1).

---

## 2 · Audit findings vs the §11 checklist

| §11 question | Finding | Status |
|---|---|---|
| Framework/hosting | **Vite + React 18 SPA on Vercel** (`vercel.json` `framework: vite`) — NOT Next.js as the Jul-18 plan assumed. PWA already in place. No migration needed or wanted before EPL. | ✅ confirmed |
| Pick 'em surfaces + data model | Full engine live: `fixtures`, `predictions` (+jagoan partial-unique index), `leagues`/`league_members` (grups), brackets, survivor, entitlements, consensus snapshot, KPI view. Migrations 0015–0020 applied. | ✅ better than assumed |
| Picks lock server-side? | Yes — `predict.js` checks `lock_at <= now()` server-side, 409 `fixture locked`. Scoring-rule freeze after first lock (409 in `update-league-settings`). | ✅ |
| Scoring idempotent + logged? | `scoring-core.js` pure functions, 105-test Vitest suite; consensus snapshot fills-null-only (idempotent); scoring via `pickem_score_fixture` RPC. **But the suite is NOT wired into CI** — `deploy.yml` runs build only. | ⚠️ engine ✅, CI gate ✗ |
| Auth provider | Supabase **magic-link only** (`signInWithOtp` + PKCE). No Google OAuth. Guest flow exists (`guestStore.js` + `merge-guest`), which matters more for the ≤3-taps loop. | ✅ adequate for launch; OAuth = fast-follow |
| Live data: scrape vs API? | **Already on API-Football via the paid server-side key** through `api/proxy` (WC hub uses it live). No scraping on the football path. The Jul-18 plan's "migrate to API-Football is week-1 work" is already done. | ✅ |
| Polymarket strip | `grep -ri polymarket src api` → only a historical mention in `version.js` ship notes. Acceptance bar met. | ✅ |
| Function budget | **12 function files counted** under `api/` (approve, auth/callback, cron/nba-close-game-scan, derby, health/data-sources, news, og-derby, og-recap, pickem, proxy, recap/[gameId], recap/page/[gameId]). Handover says "11/12, billing.js reserved" — by my count the slot is **already spent**. Verify in the Vercel dashboard; if 12/12, R3 needs a consolidation (fold `og-derby` into `og-recap`, or the two recap functions into one) before `billing.js` can exist. | ⚠️ verify |
| Lighthouse / mid-range mobile | Not run this session (needs live-browser pass). `lighthouse.yml` workflow exists — check its last runs. | ⏳ queued |
| Cut list vs P0 loop | See §5 — the hubs are fine as the "match center" support role; nothing in the build actively fights the loop. The gap is missing Track B UI, not excess product. | ✅ |

**Competition registry (live):** `NBA-Playoffs-2026` + `WC2026` only. **No EPL, no Liga 1.** `preseed-epl-2026-27.mjs` is a skeleton with its TODOs explicitly dated "R4 window, ~Jul 11–18" — i.e. this week, now overdue.

---

## 3 · Reconciling the three plans

Three documents claim authority: the **Jun-11 flagship handover** (R1–R5, WC-calendar-keyed), the **Jul-18 strategy plan** (EPL-first P0, written blind to the build), and **reality** (this audit). Reconciliation:

- The Jul-18 plan's **strategy spine stands** (wedge, WPP-style north star, free-to-play, no-build list, EPL mid-Aug → Liga 1 Sep 4 → AFF Dec). Adopt it.
- The Jul-18 plan's **Phase 0 build list is ~60% already built** (auth, pools, invites, locking, scoring engine, match-center live data, even the banker: "Bandar" = jagoan ×2, already in schema + API + partially in UI). Do **not** rebuild on Next.js; the Vite SPA ships this window.
- The Jun-11 handover's **R1/R2 Track A is DONE** (v0.80.0–0.80.3). Its WC-keyed calendar is dead — the WC window was missed. **Re-key R3–R5 to the EPL calendar** (§4).
- North star: Jun-11 says Weekly Active Pools, Jul-18 says WPP. **Call: WPP (weekly picking players in pools) as the north star, WAP as the loop-health guardrail.** Latest strategic doc wins, and WPP is the number a sponsor buys.
- Scoring mechanics: keep the shipped scoring-core math (outcome + tebak-skor 5/3/2 + jagoan + underdog + streak). The Jul-18 plan's "3 pts / +5 exact / Bandar" is a simplification of what already exists — no rework.
- Copy: the design bundle's EN-first rule stands for app chrome; SEO surfaces stay Bahasa (already the shipped v0.80.0 rule). The Jul-18 plan's "Bahasa-first UI" applies to the *ID locale quality*, not the default toggle — no conflict in practice.

---

## 4 · The detailed plan — re-keyed to the EPL calendar

Anchors: **EPL MW1 ≈ Sat Aug 15** (4 weeks out) · **Liga 1 / Super League Sep 4** (7 weeks) · **AFF Dec 2026**. Version targets in brackets.

### Sprint 0 — Recovery & data spine (now → Sun Jul 26) [v0.81.x]
| # | Ticket | Notes |
|---|---|---|
| S0-1 | **WC backfill + score, via GitHub Actions `workflow_dispatch`** (new `wc-backfill.yml` reusing NBA workflow's secrets) — groups + KO + insert the final as pickable **before kickoff Jul 19** | The 24-hour item. Kills the incident. |
| S0-2 | **`football-backfill.yml` cron** (every 2h on matchdays, 6h off-days): generic script param'd by league id — WC now, EPL 39 + Liga 1 next. Backfill → trigger `pickem_score_fixture` per final whistle, exactly like NBA v0.79.11 | The structural fix. Nothing else ships until this is green. |
| S0-3 | **Finish `preseed-epl-2026-27.mjs`** + run: 380 fixtures (league 39, season 2026), MW1 lock_ats, `EPL-2026-27` registry entry + switcher pill | Fixtures are published; script TODOs are small. |
| S0-4 | **Wire the 105-test suite into `deploy.yml`** (fail = no deploy) | 1 hour; overdue since Jun 11. |
| S0-5 | **Verify function count** in Vercel dashboard; if 12/12, land the og/recap consolidation now while risk is low | Unblocks `billing.js` later. |
| S0-6 | **WC rollover banner** on WC surfaces + PickemHome: "WC selesai — grup lo lanjut ke EPL?" → one-tap re-create grup with same members (simplest honest version of R4-4) | Copy EN/ID, no new screens. |
| S0-7 | Ade: push/rescue the **Jul-2 local WIP** (§8) + Finder "Download Now" on the folder | Blocks nothing above; blocks Track B design refs. |

**Exit gate:** WC scored + final picked by real users · EPL fixtures visible in prod · cron green two days running · CI red on a broken scoring test.

### Sprint 1 — Track B, the loop's screens (Jul 27 → Aug 9) [v0.82–0.84]
Build order = the loop's critical path, from `design_handoff_flagship/README.md` (needs S0-7 to un-evict; the seam rule means Track A functions are all ready):
1. **Invite/guest landing `/g/:code`** — pool preview without account, first pick as guest, account gate at pick #2 via `merge-guest`. **Acceptance: link-tap → confirmed pick ≤3 taps, ≤60s, at 390×844.** This screen IS the growth engine; it gets the most polish time.
2. **"Malam Ini / Minggu Ini" pick sheet** — whole matchweek in one scroll, jagoan star, lock countdown chips, completion ring.
3. **Grup home + commissioner panel** — standings, `picked_current_matchday` nudge row ("belum pick · colek di WA"), pending-member-#11 sheet, CSV export (D5, already built).
4. **Share cards** — grup invite card, weekly brag card, "gue menang" card; static PNG via existing satori/resvg pipeline; OG meta per grup route.
5. **Root home swap** behind `VITE_FLAG_PICKEM_HOME` (Phase A inversion — flag on for beta, default-on at launch).
6. Provisional live points UI (`useProvisionalPoints` hook is done — render it in match center + grup home).

**Explicitly cut from this sprint** (unchanged from both plans): badges v2, streaks UI beyond the +3 math, notifications/push, premium/billing UI, NBA/F1 pick'em work, any hub redesign.

**Exit gate (closed beta, Aug 8–9 preseason weekend):** 5–10 real WhatsApp grups seeded from Ade's own circles; pick-completion ≥70% of members; invite→pick conversion measured via `pickemEvents`.

### Sprint 2 — EPL public launch (Aug 10 → MW1 Aug 15) [v0.85 = "1.0" moment]
- Beta fixes only; freeze Thu Aug 13. Flip `VITE_FLAG_PICKEM_HOME` default-on: **gibol.co root = Pick'em** (Phase A complete).
- Launch push: the share cards do the work; Ade's seeding list + 30–50 micro-KOL WA/IG pushes per the Jul-18 plan's marketing line.
- Live-ops rota for MW1: cron is autonomous, but the **10-min matchday check** (feed vs reality) becomes a standing ops habit — Liga 1 will demand it anyway.

### Sprint 3 — Liga 1 + retention (Aug 17 → Sep 4) [v0.86–0.87]
- Liga 1 seeding via the same generic script (API-Football carries Liga 1), club-badge picker, Bahasa-gaul pass on all football copy, **Liga 1 Predictor live before Sep 4 kickoff** — the home-market PR moment, and the "main prediction game for Indonesian sport" claim made real.
- Retention v1: weekly email digest (Resend or Supabase SMTP) "Grup lo: posisi #2, MW3 buka" — email only; push/FCM deferred until PWA numbers justify it.
- **R5 Phase B (hubs → skor.gibol.co)** moves here (was Jul 20): do it in the quiet week Aug 25–Sep 1, after EPL launch proves stable, 301s + sitemap swap per the Jun-11 plan.

### Sprint 4+ — Money & December (Sep → Dec)
- **R3 billing** re-keyed: commissioner tiers + Gibol+ ship ~Oct, **gated on Midtrans KYB (Ade — still the open dependency; if it slips again, `grant-entitlement` + IDR transfer stopgap is already built and tested)**. Function slot must be free (S0-5).
- Sponsor deck (Nov) off real EPL+Liga 1 WPP numbers → **AFF Dec 2026 sponsored tournament pool** = revenue #1, reusing the WC bracket + tournament template that already exists in the schema.
- Gates unchanged from the Jul-18 plan: EPL+4wks ≥8k registered, pool-member W4 ≥30%, K ≥0.3; Dec ≥60k reg / 15k WPP / 1 sponsor signed.

---

## 5 · What we are NOT doing (re-affirmed)

No Next.js rewrite. No native apps. No SMS OTP. No new Vercel functions outside the dispatcher (billing.js excepted, post-consolidation). No paid entry, odds UI, or betting affiliates — the banned-vocab guard (D2) already enforces the copy side. No NBA/F1/tennis pick'em investment before Liga 1 is live. No WhatsApp Business API. No new dependencies into the hot path.

---

## 6 · Structural fixes (the "never again" list)

1. **Autonomy over features:** every competition's fixtures+scoring runs on GitHub Actions cron with `workflow_dispatch` manual override. A human matchday check is a *verifier*, never the *engine*. (S0-2)
2. **CI test gate:** the money math's 105 tests must fail deploys. (S0-4)
3. **Repo is the source of truth, not the Mac:** the iCloud eviction proved the local folder can vanish. `pickem-flagship/` docs + `design_handoff_flagship/` should be committed to the repo (they're strategy/design, not secrets). Weekly `git push` discipline; anything only-on-the-Mac is one eviction away from gone. (§8)
4. **A liveness monitor:** extend `health/data-sources` (or the Better Stack check) with a "days since last scored fixture in an active competition" alarm. The WC blackout would have paged on Jun 13, not been discovered on Jul 18.

---

## 7 · Trust surface (carried from the Jul-18 plan, scheduled)

Public scoring-rules page w/ version + changelog (Sprint 1, cheap — the rules are already code), per-pick "scored at · rule vX" line (Sprint 3), 24h dispute window note (Sprint 3), "why it's free / no betting" page (Sprint 2 — one paragraph, big brand value vs judol). Status page + PDP consent copy ride Sprint 3–4.

---

## 8 · Ade-owned actions (this weekend)

1. **Before the final:** approve/trigger S0-1 (WC backfill + final pickable). If we ship `wc-backfill.yml` today it's one click in the Actions tab.
2. **Rescue the Jul-2 WIP:** the local folder has `api/_lib/pickem/league-settings.js`, `league-detail.js`, `league-config.js`, `package.json` modified **Jul 2** — 3 weeks after the last commit. In Finder: right-click `Gibol` → **Download Now**, then from `nba-playoffs-monitor/`: `git status` → commit/push (or discard consciously). Until then this audit can't see that work, and neither can a redeploy.
3. **Un-evict the folder** (same Download Now) so `pickem-flagship/` + `design_handoff_flagship/` are readable again → then commit them to the repo (§6.3).
4. **Midtrans KYB:** status check; if not filed, file it — it gates all of R3.
5. Confirm the **function count** in the Vercel dashboard (Settings → Functions) — decides whether S0-5's consolidation is needed.

---

## 9 · Immediate next session

Sprint 0 is executable right now from the clone: S0-1 (wc-backfill workflow), S0-2 (generic football cron), S0-3 (EPL preseed), S0-4 (CI gate) are all code I can write and push today with Ade's go-ahead — commits from the Mac per the repo rule, or via a PR branch from here for Ade to merge.
