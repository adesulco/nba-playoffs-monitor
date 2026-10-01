# Gibol Platform Strategy v2 — Indonesia's Multi-Sport Play Layer

**Date:** 2026-07-18 · Owner: Ade · Status: supersedes the strategy spine of the Jul-18 plan and `01-strategy.md` where they conflict; the engineering recovery plan (`09-HANDOVER-EPL-RECOVERY.md`) stays valid except for the calendar correction in §2
**Companion:** `audits/2026-07-18-distance-to-launch-audit-and-plan.md` (state of the build) · `10-DESIGN-RESEARCH-PLATFORM.md` (design grammar) · `12-REDESIGN-PROPOSAL.md` (the ground-up redesign) · repo `docs/06-adding-a-sport.md`, `docs/sports-ibl-brief.md`

---

## 0 · The one-paragraph strategy

Gibol is **the play layer for Indonesian sports fans** — pick'em and fantasy first, with live scores (*Skor*) and news (*Kabar*) as the supporting layers that feed the game. One loop across every sport: pick → match night → scored & ranked → brag card into WhatsApp → friend joins the grup → pick. **Local and regional sports are the moat** (Timnas/AFF, Liga 1, IBL, Proliga, badminton, Mandalika — nobody else builds play products for these); **global sports are the magnets** (EPL, NBA, MotoGP/F1 — huge audiences, cheap data, instant credibility). Free to play forever, sponsor-funded, never real money — in a market where *judol* is the national anxiety, being the clean game between friends is the brand. North star: **WPP** (weekly picking players in pools), blended across sports, with **% of WPP active in ≥2 sports** as the platform-health metric.

## 1 · Why multi-sport-local is the right spine (the research)

- **Football is #1 but not alone.** Indonesian survey data consistently ranks football first, badminton second (the achievement sport), with volleyball, basketball and esports rising fast among the young ([GoodStats](https://data.goodstats.id/statistic/ragam-olahraga-terpopuler-menurut-publik-ri-apa-favoritmu-jAkG5), [indonesiabaik.id](https://indonesiabaik.id/infografis/top-10-olahraga-paling-digemari-orang-indonesia-ada-favoritmu)). A football-only product competes with everyone; a multi-sport play layer competes with no one.
- **Women's volleyball is a genuine boom** — Proliga's Megawati/Red Sparks effect made it appointment TV ([Proliga](https://www.proliga.co.id/), [Sofascore coverage](https://www.sofascore.com/volleyball/tournament/indonesia/proliga/22357)); zero play products exist for it.
- **MotoGP outdraws F1 in Indonesia** and has a home race: **Mandalika, Oct 11, 2026** ([calendar](https://www.motogp-indonesia.com/en/calendar-2026-38)). Event-weekend pick'em (podium order) is cheap to run and highly shareable.
- **The calendar hedge is real:** EPL+Liga 1 carry Aug–May weekly; NBA carries Oct–Jun nightly; IBL (~Jan–Jul) and Proliga (~Jan–May) carry the local new-year window; badminton is year-round with three home-emotion peaks (Indonesia Masters Jan, Indonesia Open Jun, BWF Finals Dec); MotoGP Mar–Nov biweekly; AFF/SEA tournaments spike everything. A user who picks in two sports has no off-season — that is the retention model.
- **Regional = Bahasa-adjacent first.** Malaysia has 314k FPL managers (more than Indonesia's 179k); the AFF Championship is inherently pan-SEA. Regional expansion is a locale toggle + AFF cross-border pools, not a new product.

## 2 · ⚠ CALENDAR CORRECTION — AFF is NOW, not December

Every prior doc assumed AFF in December. **Wrong: the 2026 ASEAN Championship (Hyundai Cup) runs 24 July – 26 August 2026** — first-ever mid-year edition, 10 teams, two groups of five, Indonesia in Group A, two-legged semis and final ([Wikipedia](https://en.wikipedia.org/wiki/2026_ASEAN_Championship), [AFF official](https://www.aseanfootball.org/v3/competitions-2/aff-championship/asean-hyundai-cup-2026/)). It kicks off **six days from today** and its knockout rounds overlap EPL MW1 (Aug 15).

Implications, in order of force:
1. **The Timnas mass moment — Indonesia's strongest acquisition event — happens during our launch window, not in December.** The WC2026 tournament template (group picks + bracket, schema and scripts already built) re-points to AFF with a seed script + registry row. This becomes **R-AFF, the new first beachhead**, shipping into the group stage even if a few matchdays late.
2. **The funnel inverts beautifully:** AFF grups (Timnas emotion, pan-SEA trash talk) roll over into EPL grups at MW1 — the rollover banner now points *from* AFF *to* EPL, exactly when both are live.
3. **December's sponsored-pool slot doesn't vanish** — it moves to the badminton BWF Finals + year-end window, and the *first* sponsorship conversation moves to Liga 1 season + **Mandalika (Oct 11)**, both with real WPP numbers behind them by then.
4. Sprint 0 (the recovery plan) gains one ticket: **S0-3b — seed AFF 2026** (API-Football carries it; same generic football cron). Everything else in `09` stands.

## 3 · The sport portfolio (magnets fund the moat)

| Tier | Sport / competition | Role | Window | Pick grammar | Data path |
|---|---|---|---|---|---|
| **Moat (local)** | Timnas / **AFF 2026** | acquisition spike + national identity | **Jul 24–Aug 26** | match + bracket (WC template) | API-Football ✅ |
| | **Liga 1 / Super League** | the home league claim, sponsor story | Sep 4 → May | 1X2 + Tebak Skor + jagoan | API-Football ✅ |
| | **IBL 2027** | local basketball pride | ~Jan–Jul 2027 | nightly winner slate (NBA grammar) | API-Sports basketball or ops pilot |
| | **Proliga 2027** | the volleyball boom, women's-sport audience | ~Jan–May 2027 | match winner + set-count Tebak Skor variant | ops-entry pilot (≤4 matches/day) → feed later |
| | **Badminton (BWF)** | the achievement sport; home peaks Jan/Jun/Dec | year-round bursts | round winners + seed-upset bonus | ops pilot Dec → Sportradar if WPP justifies |
| **Magnet (global)** | **EPL 2026/27** | biggest steady audience, best data | Aug 15 → May | 1X2 + Tebak Skor + jagoan | API-Football ✅ live |
| | **NBA 2026-27** | nightly cadence, urban youth | Oct → Jun | winner slate + playoff bracket | ESPN ✅ (already live) |
| | **MotoGP** (Mandalika Oct 11) | bigger than F1 locally, home race | Mar–Nov, biweekly | podium-in-order + pole | needs feed decision (API-Sports MotoGP / ops per race weekend — 22 events/yr is ops-cheap) |
| | F1 | already integrated in hubs | Mar–Nov | podium order | Jolpica ✅ |
| **Deferred** | esports (MPL), tennis slams, volleyball nations | optionality, not year-1 | — | — | esports parked: audience is huge but brand-adjacency to in-game betting culture needs a separate risk read |

**Portfolio rules (the practicality contract):** a sport ships only as a config row on the shared grammar (see `10` §2 — if it needs a new layout, fix the pattern); its data path must be autonomous (cron) or explicitly ops-budgeted per event-day; and it must have a calendar moment within ~6 weeks of shipping. Solo-dev + 12-function-limit reality: **never more than one *new* sport integration in flight at a time.**

## 4 · Product architecture — Main · Skor · Kabar

Three layers, one loop. All three already exist in code; the strategy names them and ranks them:

1. **Main (the play layer — the product):** grups, pick sheets, standings, brag cards, tournament modes, later salary-cap fantasy. Owns gibol.co root (Phase A flag exists). Everything else exists to feed this.
2. **Skor (live layer — the heartbeat):** the existing hubs, re-pointed at pick state ("Pilihanmu: unggul 1-0"), provisional points live, match center. Moves to skor.gibol.co in Phase B (post-EPL-launch, per the audit plan). Skor is why match night belongs to Gibol — the live-data layer PlayoffPickems/Superbru can't copy.
3. **Kabar (news layer — the return visit):** the existing content engine + `api/news` (EPL/F1/tennis feeds already wired) becomes the multi-sport Bahasa news digest: short, mobile, every story ending in a play hook ("Timnas menang — udah pick semifinal?"). Kabar is SEO + retention surface, never a newsroom: automated digests + ops curation, no editorial hiring in year 1.

**Fantasy (the second game):** pick'em is the wedge (zero learning cost); salary-cap fantasy is the depth product for the FPL-literate — **Liga 1 Fantasy** beta at the Liga 1 mid-season break (per the Jul-18 plan), full 2027/28 season launch; IBL fantasy only after Liga 1 fantasy proves the pattern. Fantasy never blocks a pick'em ship.

## 5 · Monetization (unchanged mechanics, re-dated calendar)

Commissioner tiers ($19/Rp79k season · $49/Rp249k lifetime) + **Gibol+** (Rp19k/mo) ship ~Oct behind Midtrans KYB (stopgap: manual grants + IDR transfer, already built). Sponsored pools sell against *moments*, and the moments moved: **Mandalika (Oct 11)** and **Liga 1 season** are the first pitches with real numbers; **badminton Dec window** replaces the AFF-Dec assumption; AFF-now is too close to sell — it *generates* the numbers instead. Sponsor unit economics and the Rp250/engaged-exposure pitch stand from the Jul-18 plan. White-label (the pick'em engine for telcos/broadcasters) remains the H2-2027 conversation — the multi-sport consumer product is its live demo. **Never:** paid entry, odds display, betting affiliates, tokens, real-money anything.

## 6 · Regional (SEA) path — earn it, don't build for it

1. **Now:** AFF cross-border pools are naturally regional — invite links don't check passports. EN strings already the default locale; nothing to build.
2. **Post-EPL-launch (Q4):** Bahasa Melayu locale + Malaysia leaderboards (string files, no product change) → the 314k-FPL-manager market gets EPL+badminton pick'em in a near-native product.
3. **2027:** regional tournaments (SEA Games 2027, AFF U-23, BWF events in KL/BKK) as tournament-mode instances; V-League/Thai League only if a partner or sponsor pulls us in. Regional is a locale + calendar play on the same platform — never a second codebase.

## 7 · Gates (kill/pivot criteria, re-dated)

- **AFF window (by Aug 26):** tournament mode live during group stage; ≥3k registered via AFF alone; AFF→EPL grup rollover ≥25% of active AFF grups. Misses → the tournament template or the rollover mechanic is broken; fix before Liga 1.
- **EPL MW1 +4 weeks (mid-Sep):** ≥8k registered blended; pool-member W4 return ≥30% vs solo ≤15%; invite K ≥0.3.
- **Dec:** ≥60k registered; WPP ≥15k blended; ≥20% of WPP multi-sport; one signed sponsor (Mandalika/Liga 1/badminton window). No sponsor at 60k = packaging problem, not demand.
- **Jan–Feb 2027:** IBL or Proliga ships as a pure config-row (≤2 weeks eng effort) — the platform claim is tested here; if a "local sport" still costs a bespoke build, the grammar failed.
- Standing kill-switch: if Komdigi signals free prediction games are in a blocking wave, prize layers pause; the loop never depended on prizes.

## 8 · What we do NOT build (re-affirmed, platform edition)

Paid entry / real money (KUHP 303 — non-negotiable) · odds UI or betting affiliates · native apps before PWA W4 ≥35% · in-app chat (WhatsApp is the chat) · a newsroom/CMS arm beyond automated Kabar digests · esports year 1 (risk read first) · FPL-clone EPL fantasy (pick'em only for EPL; fantasy is for *local* leagues where no FPL exists) · user-generated public prize pools (private pools + official competitions only) · a second codebase for anything — no Next.js rewrite, no per-sport apps; every sport is a config row on the stack we have (Vite + React 18, Supabase, the 12-function dispatcher, API-Football/ESPN/Jolpica feeds, satori cards — all kept).

## 9 · Sequenced roadmap (one table, supersedes all prior calendars)

| When | Ship | Layer |
|---|---|---|
| **Jul 19** | WC final scored + pickable (Sprint 0 S0-1 — already urgent) | Main |
| **Jul 20–26** | Sprint 0 (cron autonomy, CI gate, EPL seed) **+ S0-3b: AFF 2026 seeded, tournament mode re-pointed from WC template** | Main/infra |
| **Jul 24–Aug 26** | **AFF 2026 live — the Timnas beachhead**; Track B screens land mid-window (invite landing first) | Main |
| **Aug 15** | **EPL 2026/27 launch + root home swap (Phase A)**; AFF→EPL rollover banner during AFF semis | Main |
| **Sep 4** | **Liga 1 / Super League** at kickoff — the home-league claim | Main |
| Sep–Oct | Skor → skor.gibol.co (Phase B); Kabar multi-sport digest v1; Gibol+ / commissioner tiers (KYB-gated) | Skor/Kabar/$ |
| **Oct 11** | **Mandalika MotoGP event pick'em** — first sponsored-pool target | Main/$ |
| Oct–Nov | NBA 2026-27 nightly slate ("Malam Ini" surface); sponsor deck with AFF+EPL+Liga 1 numbers | Main/$ |
| **Dec** | Badminton BWF Finals pilot (ops-scored) + year-end sponsored window; Bahasa Melayu locale | Main/$ |
| **Jan 2027** | IBL 2027 + Proliga 2027 as config rows — the platform test; Indonesia Masters badminton | Main |
| Q1–Q2 2027 | Liga 1 Fantasy beta → Indonesia Open badminton (Jun, data contract if pilot passed) | Main |
| H2 2027 | White-label pilots ×2; native wrappers only if PWA ceiling proven | B2B |

---
### Sources
[2026 ASEAN Championship — Wikipedia](https://en.wikipedia.org/wiki/2026_ASEAN_Championship) · [AFF official — ASEAN Hyundai Cup 2026](https://www.aseanfootball.org/v3/competitions-2/aff-championship/asean-hyundai-cup-2026/) · [MotoGP Indonesia 2026 calendar — Mandalika Oct 11](https://www.motogp-indonesia.com/en/calendar-2026-38) · [Proliga official](https://www.proliga.co.id/) · [Sofascore — Proliga](https://www.sofascore.com/volleyball/tournament/indonesia/proliga/22357) · [GoodStats — olahraga terpopuler RI](https://data.goodstats.id/statistic/ragam-olahraga-terpopuler-menurut-publik-ri-apa-favoritmu-jAkG5) · [indonesiabaik — top-10 olahraga](https://indonesiabaik.id/infografis/top-10-olahraga-paling-digemari-orang-indonesia-ada-favoritmu) · [2026 IBL — Wikipedia](https://en.wikipedia.org/wiki/2026_Indonesian_Basketball_League) · [LiveFPL country counts](https://plan.livefpl.net/countries)
