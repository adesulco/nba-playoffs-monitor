# Execution Handover — Sports Rollout, League Model, Onboarding, Monetization, Tech

**Date:** 2026-07-19 (WC final day) · Owner: Ade · Status: approved plan, hand to development
**Authority:** This doc is the **product/scope authority for Sprint 2 onward** and for everything in `13-WORLD-CLASS-PICKEM.md`. It does NOT touch Sprint 0/Sprint 1 engineering — `09-HANDOVER-EPL-RECOVERY.md` remains the engineering front door for T0 → S0-7 → Track B 1–6, unchanged. Authority chain: `09` (Sprint 0–1 engineering) → **`14` (this doc — product scope, sports, monetization, onboarding)** → `13` (mechanic rationale) → `design_handoff_flagship/README.md` (UI/copy) → `06` (mechanics math) → `11` (strategy spine) → everything else.

**Hard constraints inherited unchanged** (09 §6): dispatcher-only endpoints, function budget treated as spent until S0-5, no new deps, no Tailwind, idempotent migrations Ade applies manually, RLS in same migration, EN-first double-keyed strings (ID names for named mechanics), banned-vocab guard, never break hubs/auth/NBA cron, curl-verify after every push, version from v0.81.0.

---

## 1 · Sports & leagues — the implementation decision

One rule governs everything: **a sport ships as a config row on the shared grammar, with an autonomous scoring path, into a calendar moment ≤6 weeks out.** Never more than one NEW sport integration in flight (solo dev). The waves:

### Wave 0 — NOW (Jul 19–26) · recovery + AFF beachhead

| League | Registry ID | Formats | Data path | Ship date |
|---|---|---|---|---|
| WC2026 (close-out) | `WC2026` | retro-score everything; final pickable today | `wc-backfill.yml` (S0-1) | **Jul 19** |
| **AFF / ASEAN Cup 2026** | `AFF-2026` | match 1X2 + **Tebak Skor** + group picks + bracket (re-pointed WC template) + Survivor | API-Football (S0-2 generic cron + S0-3b seed) | **before Jul 24 kickoff**; acceptable to land matchday 2 if slipping — group stage runs to ~Aug 8 |

AFF is the Timnas acquisition spike and the pan-SEA cross-border proof (invite links don't check passports). Everything Sprint 0 in `09` applies; S0-3b spec: seed script param'd off the generic football script (API-Football carries the ASEAN Championship), `competitions.js` registry row, bracket reskin (two groups of five → two-legged SF → final).

### Wave 1 — Aug 15 · EPL 2026/27 (the launch)

| League | Registry ID | Formats | Data | Notes |
|---|---|---|---|---|
| **EPL 2026/27** | `EPL-2026-27` | 1X2 + Tebak Skor (with **Nyaris point, D-1**) + jagoan + streak garnish + matchweek completion ring | API-Football league 39 (S0-3 seed done in Sprint 0) | Root home swap (Phase A) same day. AFF→EPL rollover banner live from AFF semis (~Aug 17 — banner ships Aug 15, fires on both). Both-formats default per `08` D3. |

### Wave 2 — Sep 4 · Liga 1 / Super League (the home-league claim)

Same grammar as EPL, zero new mechanics: API-Football carries Liga 1; club-badge picker; Bahasa-gaul copy pass; supporter-team capture at team pick (feeds D-8 boards and GAP-5 nemesis). **Komunitas pages (D-7) ship in this window** — Liga 1 fanbases are the komunitas launch audience.

### Wave 3 — Oct · NBA nightly + Mandalika + Streak Nasional

| League | Formats | Data | Notes |
|---|---|---|---|
| **NBA 2026-27** (from ~Oct 20) | nightly winner slate on "Malam Ini" (existing NBA grammar; playoff bracket in Apr) | ESPN cron (live since v0.79.11) | Cheapest wave — data + scoring already autonomous |
| **MotoGP — Mandalika event mode** (Oct 11) | **podium-in-order** (3 slots, drag-free: three taps) + pole bonus. New pick grammar, deliberately tiny: one race weekend, 22 riders | **Ops-entry** (Ade enters results; 1 race = 3 rows) — no feed cost; decide API-Sports MotoGP only if event-mode WPP justifies a 2027 season product | First sponsored-pool pitch target |
| **Streak Nasional (D-5)** | one pick/day anywhere across the multi-sport slate; longest streak; **monthly reset**; official Gibol-run league (`format: streak` on 0017 tables) | rides existing crons | The cross-sport bridge; sponsor-ready surface ("Streak Oktober presented by X") |

### Wave 4 — Nov–Dec · Tebak 6 + badminton pilot + BM locale

| Item | Spec | Notes |
|---|---|---|
| **Tebak 6 (D-6)** | 6 curated matches/week cross-competition (3 Liga 1 + 2 EPL + 1 wildcard), exact-score, golden-goal-minute tiebreaker (`fixtures.tiebreak_value`), one weekly leaderboard | **Soft-launch unsponsored in Nov** with merch/Kartu Bola prize to prove entrant numbers → sell title sponsorship for Jan 2027 with real data. Entry always free. |
| **BWF Finals badminton pilot** (Dec) | round-winner picks + seed-upset bonus | Ops-scored (≤ a dozen matches/day for one week). Sportradar conversation only if pilot WPP justifies it |
| **Bahasa Melayu locale** | string files + MY country leaderboard | Regional entry, no product change (`11` §6) |

### Wave 5 — Jan 2027 · the platform test

IBL 2027 + Proliga 2027 as **pure config rows** (≤2 weeks each, per `11` §7 gate — if either needs bespoke build, the grammar failed and we fix the pattern, not the sport). IBL = NBA nightly grammar; Proliga = match winner + set-count Tebak Skor variant, ops-entry pilot. Indonesia Masters badminton (Jan) on the pilot pattern.

### Explicitly NOT implementing (year 1)

F1 pick'em (hub stays, no picks — MotoGP outdraws it locally and one motorsport grammar is enough) · tennis pick'em · esports (risk read first) · EPL salary-cap fantasy (FPL exists; fantasy is for local leagues — Liga 1 Fantasy beta at mid-season break per `11` §4) · any sport without an autonomous or ops-budgeted scoring path.

---

## 2 · League model — who can create what

Vocabulary: a **grup** = a `leagues` row. Five grades, one table, differentiated by `tier` + flags (enums already landed in 0019 per `08` D1):

| Grade | Who creates | How | Limits |
|---|---|---|---|
| **Grup (free)** | any **registered** user — registration = magic link, nothing else | 3-step wizard (§3.2) | 1 grup owned, 10 members, 1 entry/member, template scoring (can pick template, not edit values) |
| **Grup (Season Pass / Lifetime)** | paying commissioner | same wizard + upgrade | unlimited members + grups, multi-entry (cap 3), manual entries for offline members, **custom scoring values** (`scoring_config` editor incl. zeroing jagoan/nemesis/nyaris), CSV export |
| **Komunitas grup (D-7)** | any Season/Lifetime commissioner flags it (`is_community=true`); free grups can flag at ≥15 members (which requires the paid tier anyway — the flag is effectively a paid feature without saying so) | toggle in commissioner panel + public page fields (name, badge, motto) | public page + komunitas-vs-komunitas table; **verified badge** granted manually via `grant-entitlement` (admin token) for known fanbases/campuses — verification is ops, not code |
| **Official pool** | Gibol only (admin token) | seeded per competition | the default public competition every player can join; identity boards (D-8) hang off these |
| **Sponsored pool (SKU 1–2)** | Gibol only (admin token), sold to a brand | official-pool machinery + sponsor fields (0019 sponsor enums) + opt-in data capture at join | prizes = goods/vouchers only; "tanpa taruhan · gratis selamanya" stamp; banned-vocab guard applies to sponsor copy too |

Rules that make this seamless:
1. **Guests can join and pick, never create.** Creation is the registration moment for commissioners; lock/save is the registration moment for members. Nobody hits an account wall before they've experienced the product.
2. **A member of any grup can create their own grup in one tap** ("Bikin grup lo sendiri" on every leaderboard footer) — every pool is a nursery for more pools. This is the K-factor mechanic that costs nothing.
3. **One person, many hats:** commissioner entitlements live on `profiles.user_id` (entitlements table, built) — a Season Pass bought for AFF carries the person's grups, not one grup.
4. **Joining is always free, in every grade, forever.** The buyer is the commissioner or the sponsor, never the player. This sentence goes on the pricing page verbatim.

---

## 3 · Onboarding — the four doors, step by step

Instrumentation for every step already specced (GAP-6 event schema, live in `pickemEvents.js`). Funnel targets unchanged: invite→first pick ≥40%, ≤3 taps, ≤60s, 390×844.

### 3.1 · Door A — invited member (the primary door, ~70% of arrivals)

1. Tap WA link → `/g/:code` renders grup name + real member names + live standings. **No account, no interstitial.** (Track B screen 1 — built to this spec.)
2. "Mulai nebak" → **tonight's/this-week's single nearest match**, tap-the-team, instant confirm. Never the bracket, never 12 groups.
3. Post-pick: consensus reveal ("68% grup lo milih Persija"). Variable reward after commitment.
4. Swipe remaining fixtures, tap through. Completion ring visible from pick #1.
5. At "Kunci tebakan" (or pick #2 per current merge-guest gate): magic-link sheet — email, one tap, done. `merge-guest` migrates picks.
6. **NEW ticket ON-1 — nickname at merge:** the magic-link confirmation screen asks ONE thing: "Nama lo di leaderboard?" (pre-filled from email prefix, editable, 3–20 chars, banned-vocab checked). This closes the known truncated-user-id leaderboard gap. No avatar, no bio, nothing else. Supporter-team picker is offered on the NEXT visit, not here.
7. Land on grup leaderboard with own row highlighted. Push/email opt-in asked only after the first scored matchday (they've felt the product move).

### 3.2 · Door B — commissioner (the buyer)

1. Landing (root, post-Phase-A) → "Buat Grup — gratis".
2. **Step 1:** grup name + competition picker (live competitions with a "mulai kapan aja" note — par-score late join is a headline here).
3. **Step 2:** scoring template picker — 3 cards, not a form: **Santai** (1X2 only), **Standar** (1X2 + Tebak Skor + jagoan — default), **Sultan** (everything incl. underdog + nyaris). Paid commissioners see "Ubah nilai" to open the full `scoring_config` editor; free users see the padlock (soft upsell, no wall).
4. **Step 3:** share sheet — WA-first button with a pre-composed message + invite card PNG. The wizard's last screen IS the share action; grup home only after sharing (or "nanti aja" skip).
5. Registration: creating requires an account — the magic-link sheet appears between steps 1 and 2 for guests. Wizard state survives the round-trip (localStorage).
6. Commissioner panel (Track B screen 3): member list + `picked_current_matchday` + colek, pending-member sheet at cap, kick/rename, manual entries (paid), scoring lock indicator after first lock (409 rule, live), CSV export (paid).

### 3.3 · Door C — organic arrival (SEO, sponsor campaign, Tebak 6, hub backlink)

The current funnel has nothing for a poolless player; this fixes it:
1. Land on competition page or Tebak 6 → pick immediately as guest into the **official pool** (auto-join at registration).
2. At registration: auto-enrolled into **identity boards (D-8)** — province + supporter-club — so a solo player sees a meaningful rank ("#41 dari 312 fans Persib") before they have any grup.
3. Persistent nudge card after first scored matchday: "Serunya bareng temen — bikin grup lo" → Door B wizard, name pre-filled ("Grup [nickname]").

### 3.4 · Door D — rollover (retention door)

One tap re-creates the grup for the next competition (same name, commissioner, members re-invited via fresh WA link) — S0-6 builds it WC→EPL; the same action re-points AFF→EPL (Aug), EPL/Liga 1→NBA (Oct), season→season. **Komandan Rewards (D-4) hangs here:** rollover with ≥10 active members → next Season Pass free (one `grant-entitlement` rule + one congratulation sheet). Trophy case (GAP-4, `league_seasons` in 0021) renders the defended title on the rollover banner: "Juara AFF: Budi 🏆 — pertahanin di EPL?"

---

## 4 · Monetization — the full ladder, dated

**Principles (non-negotiable, restated):** players never pay to play · no real money, odds, or betting affiliates anywhere · prizes are goods/vouchers only · revenue = hosting fees + brand budgets. No display-ad network in year 1 — in the judol-anxiety market, *clean* is the positioning sponsors buy; don't sell it for CPM crumbs.

### 4.1 · B2C ladder

| Product | Price | Contents | Gate/trigger | Ships |
|---|---|---|---|---|
| Free player | Rp0 forever | everything playable | — | live |
| Free commissioner | Rp0 | 1 grup, 10 members, templates | — | live |
| **Season Pass** | **Rp79k / $19 per competition-season** | unlimited members+grups, multi-entry ×3, manual entries, scoring editor, CSV | **pending-member-#11 sheet** (the paywall IS the friend waiting) + "Ubah nilai" padlock | UI ~Oct (R3); **manual-grant + IDR transfer stopgap live NOW — sell it manually from Aug 15** |
| **Lifetime** | **Rp249k / $49** | all competitions forever | shown to 2nd-competition commissioners + at rollover | with R3 |
| **Gibol+** (player premium) | **Rp19k/mo · Rp99k/yr** | pre-pick consensus, win-prob overlay, form/H2H, multi-entry across grups, flair, ad-free-forever badge | premium chips on the pick sheet (visible, locked) | with R3 |
| Komandan Rewards | −Rp (COGS≈0) | rollover ≥10 active → next Season Pass free; Lifetime 50% for 3× rollover | D-4 rule | Aug 15 (rule only) |

Payments: **Midtrans (QRIS/GoPay/OVO/Dana/VA) — KYB is Ade's standing open item, chase it this week**; Stripe for USD; both webhook into `api/billing.js` (function slot freed by S0-5 consolidation). Entitlements table is provider-agnostic (built). If KYB slips past Oct, the manual rail is the product — it's how Indonesian micro-SaaS actually sells anyway.

### 4.2 · B2B ladder (sells against moments, per `11` §5)

| SKU | Price anchor | What the brand gets | First pitch |
|---|---|---|---|
| **SKU 1 — Sponsored Grup/Pool** | Rp15–50jt per moment | branded pool page + Kartu Bola frames, voucher prizes, opt-in join data (PDP-clean single checkbox), recap report | **Mandalika Oct 11** + Liga 1 matchweeks, pitched Sep with AFF+EPL WPP numbers |
| **SKU 2 — Tebak 6 title** | Rp150–300jt/season (anchor vs their one-off microsite spend; Telkomsel/Ultra Voucher/Indomaret all built throwaways for WC2026) | "Tebak 6 presented by X": jackpot prize funding + logo on the weekly narrative + entrant data | soft-launch Nov unsponsored → sell for Jan 2027 with real entrant numbers |
| **SKU 3 — White-label engine** | anchor = their build cost | brand-skinned embeddable pool, our engine + live data | H2 2027, consumer product is the demo |

Sales collateral = **D-9 one-pager** (Sep, before Mandalika pitch): 3 SKUs, the "stop building disposable microsites" pitch, Rp250/engaged-exposure math, WPP snapshot.

### 4.3 · Revenue sequencing (honest targets, not hockey sticks)

Aug–Sep: manual Season Pass sales (target: 20 paying grups = the cap-hit conversion data) → Oct: R3 self-serve + Mandalika SKU-1 (target: 1 sponsor, any size — the logo matters more than the number) → Nov–Dec: Tebak 6 numbers + BWF window (target: Dec gate = 1 signed sponsor per `11` §7) → Jan: Tebak 6 title + IBL/Proliga sponsored pools. Kill-signal unchanged: cap-hit→pay <5% = revisit free cap before revisiting price.

---

## 5 · Tech updates proposed (delta to the stack, all within constraints)

### 5.1 · Migrations (idempotent, additive, Ade applies; numbering continues)

| # | Contents | Feeds |
|---|---|---|
| **0021** | `league_seasons` snapshot table (GAP-4 — already planned) **+ `leagues.is_community boolean default false` + komunitas public fields (motto, badge_url) + `profiles.province text null` + `profiles.nickname` constraints if not present** | trophy case, D-7, D-8, ON-1 |
| **0022** | `league_phase_entries` (D-3 Babak Baru: second prediction set keyed by stage) + `fixtures.tiebreak_value numeric null` (D-6 golden-goal minute) + `predictions.tiebreak_guess numeric null` | Babak Baru, Tebak 6 |
| **0023** | streak-format support if 0017 tables need columns (likely none — verify first); `scoring_config` keys only: `close_miss`, `streak_game`, `second_chance` | D-1, D-5 |

### 5.2 · Dispatcher actions (api/pickem.js — NO new functions)

`set-community` (flag + fields) · `community-table` (aggregate view read) · `create-phase-entry` (Babak Baru) · `submit-tiebreak` (fold into `predict`) · `identity-board` (fold into existing leaderboard action with a filter param) · rollover already = `create-league` reuse (S0-6). Everything else exists.

### 5.3 · Scoring-core (pure functions + tests, the money math)

Add terms: `close_miss: 1` (D-1 — wrong result within 1 total goal) · streak-game evaluator (longest run, monthly window) · phase-entry scoring scope (stage-filtered) · tiebreak resolution (closest wins, ties split). **Each lands with exhaustive Vitest cases before any UI** — same discipline as the existing 105.

### 5.4 · Cards (satori/resvg static-PNG pipeline, existing pattern)

New templates: Grup Terbelah pre-match card (D-2) · Tebak 6 weekly slate card · Streak Nasional milestone card (7/14/30) · komunitas trophy-shelf card. All cron-generated or on-demand-cached; no runtime @vercel/og.

### 5.5 · Infra decisions (proposed, with triggers not dates)

1. **Stay on Vercel Hobby through EPL launch.** Upgrade to Pro ($20/mo) only when a trigger fires: (a) S0-5 consolidation still can't free a slot for `billing.js`, (b) bandwidth/image limits actually throttle a matchday, or (c) first sponsor signs (then it's a rounding error). Don't pre-pay for scale we haven't earned.
2. **GitHub Actions stays the cron engine** (S0-2 pattern) — one generic football workflow param'd per league covers AFF/EPL/Liga 1; NBA exists; MotoGP/badminton are ops-entry (a tiny admin dispatcher action `enter-result`, admin-token-gated, writes fixtures+scores — cheaper than any feed).
3. **Email digest: Resend free tier** (3k emails/mo) for the weekly grup digest (Sprint 3 item) — first "new dep" exception, server-side only, one `_lib` module. If Resend is rejected, Supabase SMTP.
4. **Ops-entry admin surface:** not a screen — a `scripts/enter-results.mjs` prompt-driven script (Mac) + the dispatcher action for emergencies. Building admin UI for 22 race days/yr is waste.
5. **Liveness alarm (S0-7) extended per sport** as each wave ships — `days_since_last_scored_fixture` per active competition is the never-again guarantee.
6. **No other changes.** No Next.js, no native apps (PWA W4 ≥35% remains the trigger), no new client deps, no WhatsApp Business API (share sheets + links do the job), no in-app chat.

### 5.6 · Function budget end-state (post S0-5)

Target: approve · auth/callback · cron/nba-close-game-scan · derby · health/data-sources · news · og (consolidated derby+recap) · pickem · proxy · recap/[gameId] · recap/page/[gameId] · **billing** = 12/12, done growing. Any future need = dispatcher action or GitHub Actions, forever.

---

## 6 · Master calendar (supersedes all prior calendars; 09's Sprint 0–1 embedded unchanged)

| Window | Ship | Source |
|---|---|---|
| **Jul 19** | S0-1: WC scored + final pickable (24-hour item) | 09 |
| **Jul 20–26** | Sprint 0: S0-2 cron → S0-3 EPL seed → **S0-3b AFF seed (before Jul 24)** → S0-4 CI gate → S0-5 function count → S0-6 rollover → S0-7 liveness · T0 repo rescue | 09 |
| **Jul 24–Aug 26** | **AFF 2026 live** — Timnas beachhead; Track B screens land mid-window, invite landing `/g/:code` FIRST | 09 §4 |
| **Jul 27–Aug 9** | Sprint 1 = Track B 1–6 + **ON-1 nickname-at-merge** + D-1 nyaris point (scoring-core term, migration 0023 key) | 09 + 14 |
| **Aug 8–9** | Closed beta: 5–10 real WA grups, funnel instrumented | 09 |
| **Aug 15** | **EPL launch + root swap (Phase A) + rollover banner + Komandan Rewards rule (D-4) + manual Season Pass sales open** | 09 + 14 |
| **Aug 17–Sep 3** | D-3 Babak Baru (before AFF semis) · D-2 Grup Terbelah card · Liga 1 seed + badges + gaul pass · email digest v1 · **R5 Phase B (hubs → skor.gibol.co) in quiet week Aug 25–Sep 1** | 14 + 09 §5 |
| **Sep 4** | **Liga 1 live at kickoff** | 09 |
| **Sep** | D-7 Komunitas pages · D-9 brand one-pager · migration 0021/0022 · **Midtrans KYB closed (Ade)** | 14 |
| **Oct** | R3 billing (self-serve tiers + Gibol+) · **NBA nightly slate** · **Mandalika event mode + SKU-1 pitch (Oct 11)** · **Streak Nasional (D-5)** · D-8 identity boards | 14 |
| **Nov** | **Tebak 6 soft launch (D-6, unsponsored)** · sponsor deck with AFF+EPL+Liga 1 WPP | 14 |
| **Dec** | BWF Finals ops pilot · BM locale + MY leaderboard · year-end sponsored window · **Dec gate check** | 11 §7 |
| **Jan 2027** | IBL + Proliga config rows (**the platform test: ≤2 weeks each**) · Tebak 6 title sponsorship · Indonesia Masters | 11 |
| Q1–Q2 2027 | Liga 1 Fantasy beta (mid-season break) · Indonesia Open | 11 |
| H2 2027 | SKU-3 white-label pilots ×2 | 11 |

**Gates (unchanged from `11` §7, restated as the contract):** AFF by Aug 26: ≥3k registered via AFF, rollover ≥25% of active AFF grups · mid-Sep: ≥8k blended, pool-member W4 ≥30%, K ≥0.3 · Dec: ≥60k registered, WPP ≥15k, ≥20% multi-sport, 1 signed sponsor · Jan–Feb: IBL/Proliga as config rows in ≤2 weeks. Standing kill-switch: Komdigi signal on free prediction games → prize layers pause, loop survives.

---

## 7 · Handover mechanics

1. **File this doc + 13 into the repo** as part of T0's `docs/pickem-flagship/` commit (they're written before T0 runs — include them).
2. **Kickoff prompt:** use 09 §9 verbatim for Sprint 0–1. Append one line: *"Also read docs/pickem-flagship/14-EXECUTION-HANDOVER.md — it is the product-scope authority from Sprint 2 onward and adds ticket ON-1 (nickname at merge-guest) and delta D-1 (nyaris scoring term) to Sprint 1."*
3. **Per-wave definition of done:** fixtures seeded + cron/ops path green 2 consecutive days + formats configured in registry + pick sheet renders + scoring verified on a real result + liveness alarm covers the competition + share card renders. A wave that misses any of these is not shipped.
4. **Weekly ritual (Ade, 15 min):** `pickem_kpi_daily` view vs the gate table + function count + KYB status + one decision logged in `docs/00-current-state.md`.
5. **Conflicts:** anything here vs 09 on Sprint 0–1 engineering → 09 wins. Anything here vs 11/13 on scope/priority → this doc wins (it's later and more specific). Mechanics math → 06 wins. UI/copy → design bundle wins.

---

## 8 · The plan in one paragraph (for the next fresh session)

Score the WC today, seed AFF before Jul 24 and EPL before Aug 15 on an autonomous cron, ship the Track B screens with the guest-first onboarding (invite landing → tap-pick → magic link + nickname), launch EPL Aug 15 with root = Pick'em and manual Season Pass sales, follow with Liga 1 Sep 4 + Komunitas, then October is the money month: billing self-serve, NBA nightly, Streak Nasional, Mandalika sponsored pool. Tebak 6 soft-launches Nov to be sold as a title sponsorship in Jan, when IBL and Proliga prove the platform claim as pure config rows. Players never pay; commissioners and brands do; nothing real-money, ever; every sport rides one grammar, one cron pattern, one dispatcher, twelve functions.
