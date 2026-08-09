# 15 · Competitive Landscape & Module Matrix — 2026-08-08

**Owner:** Ade · **Status:** research input to 13-DEVELOPMENT-PLAN (does not change the plan of record; proposals in §5 are candidates for R4+ slots only). Complements `07-side-by-side-playoffpickems.md` / `08-teardown-deltas.md` (deep PlayoffPickems teardown) with the full field, global + regional.

---

## 1 · Where the build actually is (repo read, Aug 8)

- **Mainline = v0.81.0** (shipped Jul 21): T0 repo rescue, R0-1 WC2026 fully scored (104 fixtures incl. ESP 1–0 ARG final), R0-2 generic football cron (`football-backfill.yml`, ESPN source).
- **Not visible in repo:** R0-3 EPL seed run (script is still the A8 skeleton), R0-3b AFF seed, R0-4 CI gate wiring, R0-5 budget verify, R0-6 rollover, R0-7 liveness alarm. **No `tokens-4a.css`, no `sportSkins.js`** → R1 (v0.82) not started; R2 (v0.83–0.85) not started.
- **Implication:** per 13's calendar we should today be finishing R2 on live AFF traffic with freeze on **Aug 13**. The AFF group-stage beta window (Jul 24–Aug 11) is nearly spent. **EPL MW1 is in 7 days.** See §5.0 triage.
- Known blockers on file: API-Football plan lapsed (ESPN fallback works; renewal owed by Ade); iCloud-dataless files still bite this working copy (git core-dumps — work from the fresh clone).

**Modules already in the codebase** (live at v0.81.0, pre-redesign): outcome picks, Tebak Skor, WC bracket, jagoan ★×2, **Survivor** (`Survivor.jsx` + `list-survivor.js` — built, but absent from R2's five surfaces), private grups + commissioner (settings, tiers, entries CSV, banned-vocab guard), leaderboards w/ belum-pick, share cards v1 (satori), live hubs (NBA/F1), Kabar content engine, guest→auth merge, entitlements/Gibol+ plumbing, GA4 funnel events.

---

## 2 · The field — global

| Player | Model | One-line read |
|---|---|---|
| **PlayoffPickems** | Freemium SaaS ($19/tournament, $79 lifetime) | Commissioner-first pool manager; added FIFA WC + **EPL table-predictor pools 2026-27**. Small (~30k players). No social layer, no leaderboard-public, no fantasy. Already torn down in 07/08. |
| **ESPN games** | Free, sponsor-funded | Category king of brackets (Tournament Challenge), Streak, Eliminator/survivor, confidence pick'em. Media flywheel. |
| **Yahoo** | Free + Commissioner Plus | Pick'em (straight/spread/confidence), Survival, brackets, strong commissioner tools. |
| **CBS OPM** | Free, ad + prize contests | The enterprise office-pool manager: confidence, survivor, brackets, deep custom scoring. |
| **RunYourPool/OFP → Splash** | Real-money pivot (rake) | 2.2M users migrated to real-money peer-to-peer in 2025; documented free-user churn/complaints. **Cautionary tale + churn pool.** |
| **Sleeper** | Free fantasy + $ prop picks | **The social benchmark**: chat-first leagues, GIFs, league feed. Retention via banter, monetization via props. |
| **Superbru** | Free, sponsor/ad-funded | **Closest template to Gibol.** 2.9M players, 80+ free predictor games, 12 sports, graded closeness scoring, private pools + Clubs + badges. Runs the sponsored **unifi Piala Malaysia** predictor — proof of the sponsored-pool business in SEA. No Bahasa, no Liga 1/AFF. |
| **Kicktipp** | Free + ad-free premium | German tipping OG: exact-score + configurable rules + **bonus questions** ("who wins the league") + combined competitions. Ugly, durable. |
| **FPL / UCL Fantasy** | Free, league-owned | 11M+ players; the fantasy grammar Indonesian fans already know. 2025/26: dual chip sets, **FPL Challenge** (casual one-week mode). **No chat — social lives on WhatsApp/Twitter** (the gap Gibol's WA-first design exploits deliberately). |
| **Sorare** | NFT/real-money fantasy | Retrenched; moved to Solana; pivoted to daily missions/progression. Copy the **missions layer**, nothing else. |
| **OneFootball/FotMob/LiveScore** | Score apps, bet funnels | Solo predictors only (LiveScore 6 jackpot, UK-only). **No score app anywhere offers social pools** — the Skor+pick'em combination is open. |
| **PrizePicks/Underdog** | Real-money props | Regulator-battered but the **higher/lower player-stat mechanic** is the decade's most engaging pick format — works fine points-only (R6 props). |
| **Sky Super 6** | Free jackpot (bet funnel) | The archetype 6-fixture exact-score jackpot + play-vs-pundit. Liftable as a sponsor-funded event mode. |
| **Dream11 (post-ban)** | **F2P, ad/sponsor-funded** | India's Aug-2025 RMG ban forced the 230M-user giant to Gibol's exact model overnight; signed Swiggy/Tata Neu etc.; expanding F2P to 11 markets **incl. Malaysia — not Indonesia (yet)**. The existence proof for the sponsor pitch, and the medium-term threat. |

## 3 · The field — regional / Indonesia

| Player | Status | One-line read |
|---|---|---|
| **PredictPlay (predictplay.io)** | Live, tiny (~500 actives) | Closest local competitor: Bahasa, free, exact-score + streak bonus + levels + OVO-balance rewards. **No Liga 1, no private groups, no chat.** (A user named "Gibol" is #4 on their leaderboard.) |
| **Telkomsel Pojok Pildun** | Live, WC-scoped | Tebak Skor + MOTM vote + trivia + stamp economy inside MyTelkomsel. Campaign, will sunset. Proves telcos fund prediction mechanics. |
| **detiksport / DANA / GoPay / Shopee games** | Ephemeral | Tournament promo mechanics (tebak skor berhadiah). Marketing, not products. |
| **Vidio (WC2022 precedent)** | Dormant | 4-game interactive suite (quiz, live guess, predictor, per-match fantasy XI) at Rp-billions prize scale. No evergreen product; lost WC2026 rights. |
| **Indosat × Virtualness Liga 1 Fantasy** | Dead (silent since 2024 launch) | Web3 season fantasy in myIM3/bima+. Telco distribution + Web3 framing failed. Liga 1 slot is open. |
| **ASEAN United FC predictor** | Live, tournament-windowed | Official free exact-score game (4/3/3/2/0 scoring), Bahasa localization, merch prizes. No pools, no social. AFF audience overlaps ours **right now**. |
| **PSSI Garuda ID / RCTI+ / Mola** | No predictor products | Fan-ID loyalty only. Open slot for timnas. |
| **Superbru in SEA** | Live | unifi-sponsored Piala Malaysia predictor + Asian Cup game; EPL flagship has ID/MY users. No Bahasa, no local leagues. |
| **FanXT (MY)** | B2B shell | SEA fantasy OG, now low-visibility white-label. |
| **ZujuGP (SG)** | Dead | Ronaldo-backed super-app ambition, gone quiet. |
| **Official siloed games** | Live | NBA Pick'em (props, EN, US prizes), MotoGP Fantasy (free, leagues, 2026 live), **BWF/badminton: nothing exists anywhere** — total whitespace for Indonesia's #2 sport. |
| **Regulatory** | Hardening | Komdigi: 3.4M+ judol blocks, pivot to cutting payment rails w/ OJK/BI. F2P prediction is mainstream-safe (telcos/media run it openly), but **"hadiah saldo" e-wallet rewards sit in judol-adjacent SEO territory — avoid** (validates the no-money-vocab guard; don't copy PredictPlay's OVO vault). |

## 4 · Module matrix — field vs Gibol plan

✓ = has it · ◐ = partial · – = none. Gibol column = status per 13-DEVELOPMENT-PLAN (live = in codebase at v0.81.0).

| Module | ESPN/Yahoo/CBS | RYP/Splash | Superbru | Kicktipp | FPL | Sleeper | PredictPlay | ASEAN UTD | **Gibol** |
|---|---|---|---|---|---|---|---|---|---|
| Outcome picks | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | **Live** |
| Exact score (Tebak Skor) | ◐ | ◐ | ✓ graded | ✓ | ◐ | – | ✓ | ✓ | **Live** |
| Brackets | ✓ | ✓ | ◐ | – | ◐ | ◐ | ✓ (PP) | – | **Live** (WC template → AFF) |
| Survivor/eliminator | ✓ | ✓ | – | – | – | – | – | – | **Live in code, unplanned surface** ⚠️ |
| Confidence/star | ✓ | ✓ | – | ◐ | ◐ (captain) | – | ◐ (stake pts) | – | **Live** (jagoan ★×2, frozen) |
| Streak game | ✓ ESPN | ◐ | ◐ | – | – | – | ✓ (login streak) | – | ◐ share-card moment only → **gap** |
| Bonus questions (season/event) | ◐ | ◐ | ◐ | ✓ | – | – | – | – | – → **cheap R6-props precursor** |
| Player props (higher/lower) | ◐ | ✓ | – | – | – | ✓ $ | – | – | R6 parked (layout ready) |
| Season fantasy | ✓ | – | ◐ | – | ✓✓ | ✓ | – | – | R6 scoping (Liga 1 beta) |
| Private pools + commissioner | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | **–** | **–** | **Live** (tiers, CSV, vocab guard) |
| Public/global leaderboards | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | ✓ | ✓ | ◐ grup-scoped only → **gap** |
| Chat / social feed | ◐ | ◐ | ✓ Clubs | ◐ | **–** | ✓✓ | – | – | ◐ by design: WA-first (colek, nudge→WA) |
| Share cards / virality | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | – | – | Live v1 → **R2 v2** (4 moments, 1080²) |
| Live scores surface | ✓ | ✓ | ◐ | ◐ | ✓ | ✓ | – | – | **Live hubs** → Skor tab R2/R4. **No competitor pairs score-app + social pools** |
| News/content | ✓✓ | ◐ | ◐ | – | ✓ | ◐ | ◐ blog | – | Live engine → Kabar v1 R4 |
| Badges/achievements | ◐ | – | ✓ | – | ◐ | ✓ | ◐ levels | – | – → **gap** |
| Premium tier | ◐ | ✓ rake | ◐ | ✓ ad-free | – | ✓ | – | – | R5 (Gibol+/commissioner, KYB-gated; manual grants live) |
| Sponsored/branded pools | ✓ | ◐ | ✓ (unifi MY) | – | ✓ | ✓ | – | ✓ (is one) | R5 pitch (Mandalika); schema door open (0020 `sponsor_pool`) |
| Multi-sport in one app, Bahasa | – | – | ◐ (multi, EN) | – | – | – | – | – | **The wedge** (Bola/Basket/MotoGP/Voli skins) |
| Badminton anything | – | – | – | – | – | – | – | – | R6 pilot — **globally uncontested** |

**Net position:** Gibol's planned stack already covers more of the matrix than any single competitor. The wedge (Bahasa + local leagues + private-pool social + multi-sport + WA-virality) is empty: PredictPlay has no groups/Liga 1, ASEAN UTD has no social, Superbru has no Bahasa/local leagues, score apps have no pools, FPL has no chat. The matrix gaps that are *real*: streak game, badges, public leaderboards, bonus questions. The strategic threats: Dream11's F2P export (Malaysia live), PredictPlay adding grups+Liga 1, a telco making campaign mechanics permanent.

---

## 5 · Proposals (sequenced — nothing enters before its release slot)

### 5.0 · This week (triage, not features) — decide by Aug 10
The plan is ~2.5 weeks behind its own calendar with the EPL freeze set for Aug 13. Three honest options:
- **A. Slip the flag-flip to MW2 (Aug 22)** and use MW1 live data as the beta AFF never gave us. Costs a week of launch PR; protects the ≤3-taps/≤60s exit gate.
- **B. Launch Aug 15 on the v0.80 shell** (engine is ready once R0-3 EPL seed runs) and ship Sistem 4a route-by-route behind flags through Aug–Sep. Redesign becomes R4-adjacent. Aliased-token plan already supports this.
- **C. Compress:** R0-3 + R0-4/5/7 immediately, R1 fonts/tokens/primitives only (skip theme engine + icon completeness), R2 cut to invite landing + pick sheet + grup home; Skor tab v1 and share-cards v2 trail post-launch. Highest risk, keeps the date and the look.
Recommendation: **B with C's R0 subset** — the scored-fixture engine is the product; the redesign has no calendar deadline, EPL MW1 does. Either way: run `preseed-epl-2026-27.mjs` and R0-7 liveness alarm **before anything visual** (the WC incident's lesson), and skip AFF seed if the remaining knockout window (SF/F, ~Aug 19–26) isn't worth the two-leg verification cost — the AFF beta's purpose is now better served by EPL MW1 itself.

### 5.1 · R4 window (Aug 17–Sep 4) — additions that fit existing seams
1. **Surface Survivor.** It's built and tested, absent from the five surfaces. An EPL survivor pool ("Gugur" — pick one winner/MW, no repeats) is the US-pool staple no football-first platform has (Superbru/Kicktipp/FPL all lack it) and costs UI only. Slot it as a grup game-type toggle, not a new surface.
2. **Public national leaderboard** (per-competition, opt-in, page not endpoint — dispatcher `?_action=leaderboard-national`). PredictPlay and ASEAN UTD both prove solo players engage without grups; it's also the acquisition surface share cards link to.
3. **Kabar pick-hooks stay as planned** — the OneFootball/FotMob read confirms no score/news app pairs content with pools; Skor+Kabar with pick CTAs is differentiation, not decoration.

### 5.2 · R5 window (Sep–Oct) — monetization & the sponsor deck
4. **Streak game as retention mechanic** (correct-pick streak with a "Streak Gibol" leaderboard + share moment — the share card already exists in R2's spec; add the counter). ESPN Streak is the model; PredictPlay's login-streak shows the local audience responds.
5. **Sponsor pitch: lead with Dream11 + Superbru/unifi evidence.** The Mandalika deck writes itself: India's ban converged the world's largest fantasy market on Gibol's exact model (230M users, Swiggy/Tata sponsors); Superbru's unifi Piala Malaysia predictor is the SEA sponsored-pool precedent. Position sponsored pools (schema already open via 0020 `sponsor_pool`) as always-on brand inventory no Indonesian platform sells.
6. **Do NOT copy PredictPlay's e-wallet rewards vault.** Komdigi's payment-rail crackdown makes "hadiah saldo" judol-adjacent. Prizes stay merch/tickets/gengsi — consistent with the vocabulary guard and the "Semua demi gengsi" frame.

### 5.3 · R6 window (Nov–Jan) — mechanics
7. **Bonus questions before player props.** Kicktipp-grade season/event questions ("Juara EPL? Top skor Liga 1? Berapa podium Indonesia di Mandalika?") need no player-level data feed — ops-scored, question-card layout already reserved. Ship as the props warm-up; real props (pencetak gol, higher/lower stat picks à la PrizePicks, points-only) follow only when the player-data path is proven.
8. **Badges/achievements** (Superbru model: badges as "talking points" feeding share cards) — cheap gengsi loop, pairs with the streak mechanic.
9. **Graded closeness scoring** (Superbru's 3/1.5/1 exact/close/result) as an *optional grup scoring preset* — mechanics are frozen now; this is the one scoring idea from the field worth a future preset, not a rewrite.
10. **Badminton pilot stays** — the research confirms BWF fantasy/prediction is whitespace globally, not just locally. Indonesia's #2 sport with zero products anywhere is the platform-proof story for R6.

### 5.4 · Watch list
- Dream11 F2P entering Indonesia (Malaysia already live) — quarterly check.
- PredictPlay shipping private groups or Liga 1 — their gap today is our moat; monitor.
- ASEAN Hyundai Cup 2026 predictor traffic during AFF SF/F — their audience is ours; the invite-landing share cards should be live before Aug 26 to intercept it.
- Splash/RYP free-user churn continues — PlayoffPickems is farming it; nothing actionable for ID.

---

*Sources: agent research Aug 8 2026 — superbru.com, playoffpickems.com, fantasy.espn.com, splashsports.com PR, sleeper.com, kicktipp, premierleague.com, predictplay.io, telkomsel.com/mytelkomsel/pojokpildun, aseanutdfc.com, fantasy.motogp.com, picks.nba.com, Gaming Intelligence / TechCrunch / Al Jazeera (India RMG ban), liputan6/suara/uzone (Komdigi enforcement). Full citations in the research transcript.*
