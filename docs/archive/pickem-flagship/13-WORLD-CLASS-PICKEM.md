# World-Class Pick'em — Competitive Research Synthesis & Methodology Upgrades

**Date:** 2026-07-19 · Owner: Ade · Status: research synthesis + approved-delta proposal
**Position in the doc set:** builds ON `03-game-mechanics.md` + `06-gamification-audit.md` + `11-PLATFORM-STRATEGY.md`. Nothing here reverses those docs; everything is a delta. Where this doc adds a mechanic, it slots into the existing `scoring_config` / dispatcher / config-row architecture — no new functions, no new deps.

---

## 1 · The global landscape, compressed

Full research across PlayoffPickems, ESPN, Yahoo, CBS, RunYourPool/Splash, Superbru, Kicktipp, FPL, Sky Super 6, FotMob Predict, and the Indonesian tebak-skor campaign scene. What matters:

### 1.1 Three monetization archetypes exist. We already picked the right two.

| Archetype | Who | Economics | Gibol verdict |
|---|---|---|---|
| **Commissioner SaaS** | PlayoffPickems ($19/tournament, $79 lifetime, ~30k players) · RunYourPool (tiered hosting fees) · Kicktipp (€4.99/yr ad-free + B2B white-label) | Buyer = pool admin; players free | ✅ Already our model ($19/Rp79k + $49/Rp249k). Validated three times over. |
| **Free + sponsor-stacked media** | ESPN Tournament Challenge (**26.6M brackets 2026**, "presented by Allstate + Molson Coors + Chick-Fil-A"; $125k prizes = acquisition cost) · CBS OPM (made the commissioner tool **free** to buy registered users) · Sky Super 6 (2M weekly entrants, £250k jackpot, pure acquisition funnel) | Free game, sponsors pay for the audience + first-party data | ✅ This is the sponsored-pool layer in `11` §5 — the research says it scales further than we planned (§4 below). |
| **Real-money rake** | Splash (10% rake P2P) · PrizePicks/Underdog (forced out of house-banked pick'em by regulators in 2025, now P2P-only) | Highest ARPU, highest legal burn — radioactive even in the US | ❌ Stop list. The US regulatory arc *confirms* the judi-online line: house-banked pick'em died legally even there. |

### 1.2 The retention mechanics scoreboard (proven elsewhere, mapped to us)

| Mechanic | Proven by | Gibol status |
|---|---|---|
| Survivor elimination | ESPN Eliminator, Splash, CBS | ✅ live (0017) |
| Captain/double-down | (our own) Jagoan | ✅ specced GAP-1 — nobody else has the penalty design; ours is better |
| Round-by-round picking + series-length bonus | PlayoffPickems | ✅ live / bracket-lock mode landed |
| Underdog/contrarian reward | DFS leverage theory; Kicktipp rarity-weighting | ✅ specced (consensus-at-lock) |
| **Closeness scoring** (near-miss still scores) | **Superbru** (1 / 1.5 close / 3 exact — its signature; keeps casuals scoring every round) | ⚠️ partial — our 5/3/2 has it; §3.1 tightens it |
| **Streak with monthly reset** | **ESPN Streak** ($25k/mo; loss = reset; monthly re-entry) | ❌ gap — §3.2 |
| **Second Chance / mid-event re-entry** | ESPN Second Chance brackets | ❌ gap — §3.3 |
| **Pick distribution as trash-talk surface** | Yahoo Pick Distribution, ESPN Group Forecast | ⚠️ consensus exists post-pick; §3.4 upgrades it to an artifact |
| **Persistent clubs with cross-season hall of fame** | **Superbru Clubs** (since 2013 — their strongest moat) | ⚠️ GAP-4 trophy case ≈ this; §3.5 extends grup → komunitas |
| **Auto-enrollment into identity leaderboards** | FPL (country + club-supporter leagues at signup, zero effort) | ❌ gap — §3.6 |
| **Curated 6-match slate + tiebreaker jackpot** | Sky Super 6 (5 pts exact/2 result + Golden Goal minute; one weekly narrative) | ❌ gap — §4.2 (this is the sponsor product) |
| Commissioner revshare (turns superusers into salesforce) | Splash (5% kickback to commissioners) | ❌ gap — §5.3 (non-cash version) |

### 1.3 The two structural gaps in the market (our openings)

1. **SEA/Bahasa:** Superbru is the only real multi-sport prediction platform on earth (~2.9M users) — English-only, Africa/UK-centric, dated UI, no WhatsApp-native flow, no live-data layer. FotMob/Sofascore treat prediction as a bolt-on. **Nobody has built Superbru-for-SEA.** Every Indonesian implementation (Telkomsel Pojok Pildun, Ultra Voucher, detiksport, bola.com tebak skor) is a one-tournament *campaign* that dies at the final — no persistent identity, no pools, no cross-sport account. The gap is not "a pick'em product"; the gap is **persistence**.
2. **Brand demand already exists locally, unserved by a platform.** Telkomsel, Indosat, Ultra Voucher, Indomaret each *built throwaway tebak-skor campaigns* for WC2026 — i.e., they already spend on exactly what we sell, but rebuild it from scratch each time with zero retained audience. McDonald's WC predictor drew 5.5M players globally; Coca-Cola's sticker album 27M signups. The pitch writes itself: *"stop building disposable microsites; run a branded pool on the platform where the grups already live — and keep the audience."*

---

## 2 · The one-sentence thesis (unchanged, now evidence-backed)

> Gibol Pick'em = **Superbru's persistence + PlayoffPickems' commissioner model + ESPN's sponsor economics + Sky Super 6's jackpot narrative**, delivered WhatsApp-first in Bahasa, with a live-data layer none of them have — free to play forever, monetized on hosting fees and brand pools, never stakes.

Everything already in `03`/`06`/`11` survives contact with the research. The deltas below are additive.

---

## 3 · Methodology upgrades (player layer)

### 3.1 · Tebak Skor closeness — formalize the "close" band · P0, costs one scoring term

Superbru's data-backed lesson: **casuals must score nearly every round or they churn**; its 1.5-pt "close" band is the single most-defended feature in its community. Our 5/3/2 already has the shape. Tighten the definition and surface it:
- 5 = exact score · 3 = correct result **+ correct goal margin** · 2 = correct result · **1 = wrong result but within 1 total goal of the scoreline** (the "nyaris" point — new, config key `close_miss: 1`, commissioners can zero it).
- UI copy names the band: **"Nyaris!"** — the near-miss becomes a positive event, not a silent loss. Screenshot value: "gue nyaris banget 😤" is a WA message.
- Rationale: in a 30-person grup the median member gets ~1 exact score per matchday-week. The nyaris point keeps their number moving daily, which is what protects the D3 kill-metric in `03` §A.

### 3.2 · Streak Nasional — the daily-open engine · P1, ship with NBA nightly slate (Oct)

ESPN Streak is the purest daily-retention machine in the genre: one pick anywhere across any sport, longest streak wins, one loss = reset, **monthly reset re-invites the lapsed**. We have the one asset it needs that no local player has: a **multi-sport nightly slate** (EPL weekend + Liga 1 + NBA nightly + MotoGP biweekly = something pickable ~340 days/yr).
- Format: official Gibol-run competition (fits "official competitions only" in `11` §8 — this is not a public prize pool). One curated pick per day minimum, streak counter, **monthly reset + monthly winner**.
- Prize: sponsor-funded voucher (this is literally a sponsor product — "Streak Nasional bulan Oktober presented by X"), or pure bragging + Kartu Bola until a sponsor signs.
- Why it matters strategically: Streak is the *cross-sport bridge*. The platform-health metric in `11` §0 is % of WPP active in ≥2 sports; Streak manufactures that behavior — an EPL-only user's streak survives only if they pick Wednesday's NBA game. Schema: it's a `league` row with `format: streak`; streak tables exist (0017). Scoring term: `streak_game: {reset_monthly: true}`.

### 3.3 · Babak Baru (Second Chance) — mid-event re-acquisition · P1, one-line-per-tournament ops

ESPN re-acquires busted brackets with Second Chance at the Sweet 16. Ours: at each knockout boundary of a tournament mode (AFF semis, WC R16), auto-open a **fresh parallel entry scored from that stage only**, ranked on its own tab in the grup. Copy: "Babak baru, papan baru — semua mulai dari 0."
- Complements (not replaces) Musuh Bersama (GAP-5): Musuh Bersama re-frames the *emotion* of elimination; Babak Baru resets the *scoreboard*. Together they cover the two churn causes at knockouts.
- Cost: `league_phase_entries` = a second prediction set keyed by stage; the bracket engine already knows stages. One commissioner toggle: `second_chance: on|off` (default on for tournaments).

### 3.4 · Consensus as a shareable artifact — upgrade, not new mechanic · P1

Yahoo's Pick Distribution and ESPN's Group Forecast prove the crowd-split is a *content surface*, not just a stat. We already snapshot consensus-at-lock (R1). Add one satori card: **"Grup Terbelah"** — auto-generated when a fixture splits the grup 40–60% or tighter ("14 orang Persija, 11 orang Persib 👀"), pushed as the pre-match WA artifact. This is the *anticipation* artifact; the standings card is the *result* artifact. Zero schema, one card template, one cron branch.

### 3.5 · Grup → Komunitas — the Superbru Clubs move · P2, extends GAP-4, ship with Liga 1 window

Superbru's deepest moat is Clubs: persistent communities whose pool results accrue to a **permanent cross-season hall of fame**. GAP-4's trophy case is the single-grup version. The extension: let a grup flag itself as **Komunitas** (fan club, kampus, kantor, komunitas nobar) with a public page (name, badge, motto, trophy shelf, member count) and a standing "komunitas vs komunitas" table per competition — Viking Persib Fanbase vs Jakmania on aggregate picks accuracy is a *rivalry content engine*.
- This is also the **sponsor inventory unit** (§4): brands don't want to sponsor 40 strangers; they want to sponsor *Komunitas Nobar Bandung*.
- Cost: `leagues.is_community boolean` + public page route + one aggregate view. The hall-of-fame table is GAP-4's `league_seasons` — already planned in 0021.

### 3.6 · Auto-enrollment identity boards — FPL's zero-effort social context · P2

At signup (or team-pick), every player is silently in: **(a) their province/city board, (b) their club-supporter board** ("Fans Persija se-Indonesia"), on top of their grups. No UI investment beyond two filtered leaderboard tabs. Guardrail from the CPO stop list stands: these are *identity* boards (bounded, meaningful cohorts), not a whale-rewarding global board; the grup remains the product. Why: it gives solo/organic arrivals (SEO, sponsor campaigns) a reason to exist before they join a grup — the current funnel has nothing for a poolless player. Cost: `profiles.province` (optional, one picker) + supporter team already exists via TeamPicker.

### 3.7 · What we deliberately do NOT import

- **Confidence 1–N ranking** (Yahoo's signature) — already deleted in `06`; jagoan is the one-thumb version. Confirmed right: confidence is desktop-brain, our medium is a phone on a motorbike.
- **Compounding streak multipliers** — ESPN Streak stays a *separate game*; in-grup streaks stay +3 garnish (per `06` §3).
- **Player-prop pick'em** (PrizePicks grammar) — the US regulatory arc killed it even there; in ID it's indistinguishable from judi. Never.
- **Real-money anything, coins, quests, battle passes** — stop list stands.

---

## 4 · The brand layer — productize what Telkomsel already pays for

The research reframes sponsored pools from "later, needs traffic" (`01` §2C) to **a productized B2B offering with local proof of demand**. Three SKUs, one engine:

### 4.1 · SKU 1: Sponsored Grup (entry product, ~Rp15–50jt/moment)
A branded pool inside a moment (Mandalika, Liga 1 matchweek, BWF Finals): sponsor logo on the pool page + Kartu Bola frames, voucher prizes to top-N, opt-in data capture at join (name, email/WA, consent — PDP-law-clean, single checkbox). Sold against the calendar in `11` §9. The comp set isn't ads — it's the Rp-hundreds-of-millions one-off microsites brands build today for less reach and zero retention.

### 4.2 · SKU 2: "Super 6" jackpot game (the acquisition machine, sponsor-funded)
Sky Super 6's model, localized: **Tebak 6** — six curated matches per week (cross-competition: 3 Liga 1 + 2 EPL + 1 Timnas when live), exact-score picks, **golden-goal-minute tiebreaker**, one headline jackpot prize funded by the title sponsor (voucher/umroh-ticket/motor scale — never cash-from-entry; entry always free). Sky gets 2M weekly entrants and pays the jackpot ~monthly; the jackpot *narrative* does the marketing. This becomes the TOP of the whole funnel: Tebak 6 player → "bawa grup lo" → grup → commissioner. Engineering: it's a 6-fixture curated `league` with tebak-skor scoring + one tiebreaker field — the engine exists; the tiebreaker is one column.

### 4.3 · SKU 3: White-label engine (H2-2027, per `11` §5 — unchanged, now with comps)
Kicktipp's "professional" tier proves the shape: brand-skinned, embeddable pool on the client's own surface (telco app, broadcaster site), our engine + scoring + live data underneath. Telkomsel/Indosat already built in-app prediction features with vendors — we become the vendor with a consumer product as the live demo. Price anchor: their current build cost, not SaaS-per-seat.

**Brand-layer guardrails (all copy, all SKUs):** prizes are goods/vouchers only, entry always free, no odds anywhere, "tanpa taruhan · gratis selamanya" stamped on every sponsored surface. In the judol-anxiety market, *being visibly clean is the brand* — sponsors need that assurance as much as regulators do.

---

## 5 · Seamless for groups & communities — the friction ledger

Research-validated friction points, and where we stand:

1. **Join without account** — ✅ guest picks exist; the 90-sec teach (`03` §A) is ahead of everyone including PlayoffPickems.
2. **Late join without humiliation** — ✅ par-score is specced; *no competitor headline-features this*. Make it the #2 marketing line after "gratis": **"Telat gabung? Tetep bisa menang."**
3. **Offline members** — ✅ manual entries (commissioner acts for the uncle who won't install anything) — paid-tier feature, parity with PlayoffPickems.
4. **The commissioner as salesforce** — Splash pays commissioners 5% cash; our non-cash version: **Komandan Rewards** — a commissioner whose grup rolls over to a 2nd competition with ≥10 active members earns the next Season Pass free (or Lifetime at 50%). Cost of goods ≈ zero, distribution value ≈ everything. One entitlement grant rule.
5. **Dead-air between rounds** — ✅ D3 in `08` (both-formats default) + Streak Nasional (§3.2) + Kabar hooks. The multi-sport slate is the structural answer no single-sport product has.
6. **Disputes** — ✅ edit-history + consensus-at-lock audit. Keep.

---

## 6 · Regional path — sharpened by the research

`11` §6 stands (AFF cross-border now → BM locale Q4 → SEA tournaments 2027). Three sharpenings:

1. **The regional benchmark is Superbru, and it's beatable.** ~2.9M users built on rugby windows + clubs + closeness scoring, from South Africa. SEA's equivalent emotional windows: AFF (now), SEA Games 2027, badminton majors, MotoGP. Same playbook, bigger population, zero incumbent.
2. **Malaysia first, and it's a locale not a product** — 314k FPL managers (vs ID's 179k) proves prediction-literate demand; BM strings + MYR-less free tier + AFF cross-border pools = complete market entry. Vietnam/Thailand only behind a partner/sponsor (V-League data + language are real costs).
3. **Tebak 6 travels.** The Super 6 format is country-agnostic and sponsor-funded per market — a Malaysian title sponsor funds the Malaysian jackpot. The regional expansion unit is *a sponsor + a locale*, not an office.

---

## 7 · Delta summary — what actually changes in the plan

| # | Delta | Priority | Window | Cost shape |
|---|---|---|---|---|
| D-1 | Nyaris point (`close_miss: 1`) in tebak-skor config + copy | **P0** | with scoring-core (R1/R2 — already in flight) | 1 scoring term + copy |
| D-2 | "Grup Terbelah" pre-match consensus card | P1 | AFF knockouts / EPL early weeks | 1 satori template + cron branch |
| D-3 | Babak Baru (second-chance stage entries) | P1 | before AFF semis (~Aug 17) | 1 toggle + phase-entry keying |
| D-4 | Komandan Rewards (rollover → free Season Pass) | P1 | with AFF→EPL rollover banner (Aug 15) | 1 entitlement rule |
| D-5 | Streak Nasional (monthly, multi-sport, official) | P1 | with NBA slate (Oct) | 1 league format on 0017 tables |
| D-6 | Tebak 6 jackpot game (sponsor SKU 2) | P1 | pitchable with Liga 1/Mandalika numbers (Oct–Dec) | curated league + tiebreaker column |
| D-7 | Komunitas pages + komunitas-vs-komunitas table | P2 | Liga 1 window (Sep–Oct) | 1 bool + public route + view |
| D-8 | Identity auto-boards (province + supporter) | P2 | post-EPL-launch | 1 profile column + 2 leaderboard filters |
| D-9 | Brand one-pager: 3 SKUs, comps (Telkomsel/Ultra Voucher/McD/Sky), Rp250/engaged-exposure math | P1 (doc, not code) | before Mandalika pitch (Sep) | sales collateral |

**Constraint check:** every delta rides the existing dispatcher (`api/pickem.js` actions), `scoring_config`, satori cards, and 0017/0019/0021 tables. Zero new Vercel functions (`api/billing.js` stays reserved as #12). Nothing above blocks Sprint 0 or the AFF beachhead — D-1 is the only item that touches code currently in flight.

**Sequencing rule (unchanged from `03` §C):** nothing in this doc ships before the loop it feeds exists. AFF live + rollover + EPL launch remain the critical path; these deltas are the compounding layer on top.

---
### Sources (key)
Superbru scoring & clubs: superbru.com/about · superbru.reamaze.com/kb/points · ESPN Tournament Challenge 26.6M: espnpressroom.com (Mar 2026) · ESPN Streak: fantasy.espn.com/streak · Yahoo confidence/pick-distribution: help.yahoo.com SLN6640/SLN6626 · PlayoffPickems pricing/formats: playoffpickems.com · Splash rake + commissioner rewards: intercom.help/splashsports-helpcenter · CBS OPM free model: cbssports.com/fantasy/games · Sky Super 6: super6.skysports.com/faq · Kicktipp B2B: kicktipp.com/info/professional · PrizePicks/Underdog P2P forced shift: sbcamericas.com (Aug 2025) · FPL scale: en.wikipedia.org/wiki/Fantasy_Premier_League · ID campaigns: telkomsel.com/mytelkomsel/pojokpildun · blog.ultravoucher.co.id · bola.com · ID gambling law: gamblinglawasia.com/guides/is-online-gambling-legal-indonesia
