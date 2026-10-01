# 16 · Module Expansion — CPO × BD Proposal & Development Plan

**Date:** 2026-08-08 · Owner: Ade · Status: **approved 2026-08-08** (all four §7 decisions taken as recommended) — extends `13-DEVELOPMENT-PLAN.md` (which remains plan of record through R3); this doc supersedes doc 15 §5 for R4+ and adds the BD workstream. Steps 1–3 of the review workflow (existing state, industry research, analysis) live in `15-COMPETITIVE-LANDSCAPE-2026-08-08.md`; this doc is steps 4–6.

---

## 0 · The CPO frame (read this before the module list)

**Wedge statement.** Gibol is the only place an Indonesian fan can play tebak-tebakan with their real WhatsApp group across the sports they actually watch — and every grup created makes the next sponsor, the next sport, and the next member cheaper to acquire.

**One number at the top: WPP — Weekly Picking Players.** (Already the Dec target: 15k.) Causal chain to revenue: WPP → grup density → share-card impressions → registered reach → sponsor CPM/pool pricing → Rp. Every module below must move WPP or directly monetize it; anything that doesn't is decoration and got cut.

**The loop we staff against:**

```
invite (WA) → pick (≤60s) → matchday tension → result + share card → banter/nudge → re-invite
                                      ↑                                        ↓
                              sponsor pool money  ←  reach + consensus data  ←─┘
```

**The compounding asset** is not the code — it's (a) the grup graph (who plays with whom), (b) per-competition consensus data ("what do 60k Indonesian fans predict"), and (c) the sport-generic engine that makes sport #7 a config row. BD sells (b) against (a); engineering protects (c).

**What we will NOT build** (as binding as the build list):
1. Real-money anything, e-wallet/saldo rewards, odds display — Komdigi payment-rail crackdown makes even "hadiah saldo" judol-adjacent (doc 15 §3). Prizes stay merch/tickets/gengsi.
2. In-app chat — WhatsApp IS our chat; colek + nudge deep-links stand. Sleeper's lesson is "social wins", not "build chat". Revisit only if grup owners demand it in research.
3. Video/streaming/watch-along with media — rights money we don't have; Nobar mode (M6) is picks-and-polls only.
4. Native iOS/Android apps — PWA stands until a sponsor pays for store presence.
5. Season fantasy before pick'em wins its window — FPL owns that grammar; we ship Fantasy Liga 1 only where FPL doesn't exist (R7, unchanged from 13's R6 intent).
6. Self-serve ads / programmatic — sponsor pools are sold, not self-served, until there's a sales pipeline that clears Rp 100jt/quarter.

---

## 1 · What exists (step 1 — summary; detail in doc 15 §1)

v0.81.0 mainline: engine + scoring autonomous (WC scored, football cron), Pick'em loop proven on NBA+WC, Survivor **built but unsurfaced**, grups + commissioner tiers + entitlements plumbing live, share cards v1, content engine, GA4 funnel. R1/R2 (Sistem 4a) unstarted; EPL MW1 in 7 days; 12/12 Vercel functions; solo bandwidth; mechanics frozen; API-Football lapsed (ESPN fallback working).

## 2–3 · Research + analysis (steps 2–3 — distilled; full field in doc 15 §2–4)

Five patterns matter for module selection:
- **Superbru** proves free + sponsor-funded + pools/Clubs/badges monetizes SEA football attention (unifi Piala Malaysia). **Dream11 post-ban** proves the model at 230M-user scale — and is exporting F2P to Malaysia.
- **US pool platforms** (ESPN/Yahoo/CBS/RYP) show the retention formats football-first platforms lack: survivor, streak, confidence. We already own confidence (jagoan) and survivor (built).
- **Sleeper** shows social-first beats feature-first; **FPL** shows a chat-less product wins anyway when the social layer lives off-platform — validating WA-first.
- **Score apps** (FotMob/LiveScore/OneFootball) monetize via betting funnels and have zero social pools — Skor+pools remains an uncontested pairing.
- **Local campaigns** (Telkomsel Pojok Pildun, Vidio WC2022, DANA) prove Indonesian brands fund prediction mechanics at Rp-billions scale — but always as 4-week campaigns that die. Nobody sells them an always-on home. That's the BD product.

## 4 · Fit against Gibol's context (step 4)

| Practice from the field | Fit verdict | Why |
|---|---|---|
| Superbru sponsored predictor (unifi) | **Adopt** | Same model, same region; our grup layer is stronger than theirs |
| Sponsor-funded prize pools (Telkomsel/Vidio scale) | **Adapt** | Take the money, keep prizes merch/tiket/gengsi — never saldo |
| ESPN Streak / survivor formats | **Adopt** | Cheap, differentiating vs every football platform; survivor already built |
| Kicktipp bonus questions | **Adopt** | Props-lite with zero player-data dependency; ops-scored |
| Sleeper chat | **Reject** | WA-first is the moat, not a gap (see not-build #2) |
| PrizePicks higher/lower props | **Adapt later** | Points-only, R7, only after player-data path proven |
| Dream11 watch-alongs / Vidio live quiz | **Adapt as Nobar Lite** | Polls + live consensus, no video, no real-time infra beyond existing feeds |
| Splash real-money pivot | **Reject** | Illegal here, and their churn is our recruiting pool |
| FanXT white-label B2B | **Adapt later** | Real revenue path, but only after own-brand proof (R7+) |
| PredictPlay OVO rewards vault | **Reject** | Judol-adjacent; regulatory brand risk |

## 5 · The modules (step 5)

Prioritised by reversibility × leverage. Effort in solo-dev days with Claude Code, honest est. All UI ships in Sistem 4a primitives; all endpoints are dispatcher `?_action=` cases (function budget stays 12 until R0-5 verifies).

### Tier 1 — high leverage, reversible → ship in R4/R5

**M1 · Gugur (Survivor, surfaced).** EPL survivor: pick one winner per matchday, no team twice, wrong = out; last standing wins the grup. Engine + `Survivor.jsx` exist — this is UI surfacing + a grup game-type toggle + copy. No football-first competitor has it. *Effort: 3–4d. Moves: WPP (weekly appointment), grup re-engagement of eliminated players via "pantau" mode.*

**M2 · Papan Nasional (public per-competition leaderboard).** Opt-in national leaderboard + "peringkat nasional kamu" on every share card. PredictPlay/ASEAN UTD prove solo players engage without grups; this is also the landing surface for share-card traffic that has no grup yet. *Effort: 2–3d (view + page + dispatcher action). Moves: registration conversion, solo→grup upgrade.*

**M3 · Tantang 1v1 (head-to-head challenge).** A WA-shareable duel link: "Tantang temanmu — siapa lebih jago tebak MW ini?" Same picks, one opponent, one result card. It's the smallest possible social loop — no grup creation friction — and the sharpest share-card moment we don't have. *Effort: 4–5d (reuses picks + share pipeline; new `challenge` table, additive migration). Moves: K-factor, invite→pick conversion.*

**M4 · Streak Gibol.** Rolling correct-pick streak counter, per-sport and global, with a streak share card (card spec already in R2's four moments) and a "streak terpanjang" national board (rides M2). ESPN Streak model, points-only. *Effort: 2–3d on top of M2 (computed from existing scored picks — no schema change). Moves: daily/weekly return visits.*

### Tier 2 — high leverage, less reversible (pricing/brand/partner commitments) → R5/R6, with BD

**M5 · Pool Sponsor (the BD product, v1 managed).** A sponsored competition instance: sponsor logo on pick sheet + share cards + leaderboard, branded prize (merch/tiket), and a monthly reach report (participants, picks, share-card impressions, consensus splits). Schema door already open (0020 `sponsor_pool`). v1 is ops-managed (we configure; no sponsor dashboard). Anchor pricing (est., to validate in first 3 pitches): event pool (e.g. Mandalika weekend) Rp 25–75jt; season pool (Liga 1 rest-of-season) Rp 100–250jt; benchmarks: Superbru sponsored games, Astro fantasy-as-ad-inventory, Telkomsel/Vidio campaign spend at Rp-billions. *Effort: 5–7d eng (branding slots + report query pack) + BD cycle. Monetizes: reach. This is the revenue line that isn't Gibol+.*

**M6 · Nobar Lite (live match companion).** During a live match: existing LiveTile + your pick status + live consensus bar ("62% grup kamu pegang Persija") + one mid-match poll (MOTM vote at HT, ops-defined). No video, no chat, no websocket — polls piggyback the existing feed polling. Made for nobar culture and second-screen EPL nights; the Vidio WC2022 suite proves local appetite. *Effort: 5–6d. Moves: matchday session depth, colek volume.*

**M7 · Pertanyaan Bonus (season/event questions).** Kicktipp-grade: "Juara EPL 2026/27? Top skor Liga 1? Podium Indonesia di Mandalika?" Ops-scored (no player-data feed), question-card layout already reserved by the frozen pick-sheet design. Doubles as sponsor inventory ("Pertanyaan bonus minggu ini oleh ___"). *Effort: 4–5d incl. additive `bonus_questions`/`bonus_answers` migration + scoring RPC extension (additive, jagoan untouched). Moves: WPP between matchdays; warms up R7 props.*

**M8 · Lencana (badges).** Superbru-style achievement badges as share-card fuel: Juara Grup, Streak 5+, Perfect Matchday, Pendiri Grup, Hadir Semua MW. Computed from existing data, rendered into cards; profile shelf. *Effort: 3–4d. Moves: gengsi loop, share volume.*

### Tier 3 — platform bets (irreversible-ish, debate then ship) → R6/R7

**M9 · Komunitas (creator/community mega-pools).** Fan accounts, futsal komunitas, kampus orgs as commissioners of open mega-grups (100+ members, join via public link), with a komunitas leaderboard and (later) a revenue-share on sponsored komunitas pools. Superbru Clubs analog; our answer to cold-start in each new sport. Requires moderation posture + pending-member tier rework — that's why it's Tier 3. *Effort: 8–10d + ops. Moves: acquisition at community scale.*

**M10 · Konsensus & Fan-Intel layer (data product).** Productize the consensus data: (a) public "Suara Publik" widgets on Kabar/skor pages (SEO + shareable), (b) the sponsor report pack from M5 hardened into a repeatable deliverable, (c) an eventual feed into Kultura's Fan Intelligence portfolio (Kiprah 4Rs Resonance input — Gibol becomes the behavioral fandom-measurement source the portfolio memo says Indonesia lacks). *Effort: 4–5d for (a)+(b); (c) is a portfolio decision, not a Gibol ticket. Monetizes: data, differentiates sponsor pitch.*

**M11 · Toko Gengsi (rewards bridge → fangir).** Points/badges redeem into sponsor merch vouchers and, when fangir.com stands up, shoppable fan products. This is the CLAUDE.md endgame (gibol = top-of-funnel for fangir) made concrete — and the lawful answer to PredictPlay's OVO vault. Gated on: a merch partner or fangir MVP. *Effort: 6–8d when gated-on exists. Monetizes: affiliate/commerce.*

**M12 · Props (pencetak gol, higher/lower) + Fantasy Liga 1.** Unchanged from 13's R6 parking: props when player-data path proven (API-Football renewal is the dependency); Fantasy Liga 1 beta only where FPL doesn't exist. M7 is the deliberate stepping stone.

**M13 · White-label ("Gibol untuk Media") — pilot only.** One media partner (detik/Bolanet tier) runs a co-branded predictor powered by our engine on a subdomain. FanXT/Splash-creator pattern. Only after M5 has 2+ paying sponsors — otherwise it cannibalizes the scarce asset (our own audience) before it exists. *R7+, scope on demand.*

## 6 · Development plan

**Decided 2026-08-08: option B** — EPL launches Aug 15 on the current shell; Sistem 4a ships route-by-route behind flags after. Cadence rules, seam rule (`src/pickem/api.js` only), voice rules, and migration rules from `14-HANDOVER-CLAUDE-CODE.md` §3 apply to every ticket.

### R3′ — EPL launch week · Aug 8–15 · v0.82 *(recovery, no new modules)*
| # | Ticket | Exit |
|---|---|---|
| R3′-1 | Run `preseed-epl-2026-27.mjs` (finish A8 TODOs), registry row, cron pointed | 380 fixtures live, MW1 pickable |
| R3′-2 | R0-7 liveness alarm (`days_since_last_scored_fixture`) | alarm fires on stale data in staging test |
| R3′-3 | R0-4 CI gate (105 tests block deploy) + R0-5 function-budget verify | red build blocks; slot count confirmed |
| R3′-4 | AFF decision: seed SF/F only if two-leg verified in <½ day, else skip (window nearly spent) | decision logged |
| R3′-5 | Launch push: WA-ready invite cards for MW1, rollover banner | curl-verified live Aug 15 |

### R4a — Retention formats on live EPL · Aug 17–Sep 4 · v0.83–0.85 *(runs beside 13's R4 platform-split tickets; Sistem 4a route-by-route port continues in parallel behind flags)*
| # | Module | Tickets | Exit gate |
|---|---|---|---|
| R4a-1 | **M1 Gugur** | game-type toggle in grup settings → survivor sheet UI → eliminated "pantau" state → share card "Gugur di MW_" | one real grup completes 3 MWs; zero scoring disputes |
| R4a-2 | **M2 Papan Nasional** | leaderboard view (opt-in flag on profile) → `?_action=leaderboard-national` → public page + OG | national rank appears on share cards; page indexed |
| R4a-3 | **M3 Tantang 1v1** | `challenge` migration (additive+RLS) → create/accept via `?_action=` → duel result card → OG on `/t/:code` | tap→accepted duel ≤2 taps; ≥20% of duel cards re-shared (GA4) |
| R4a-4 | **M4 Streak** | streak computation (pure fn + tests) → profile + national streak board → streak share card | streak card ships; DAU/WAU delta measured |

**R4a exit:** WPP measurable ↑ vs MW1 baseline; K-factor instrumented on M3.

### R5 — Money + Mandalika · Sep 8–Oct 18 · v0.86–0.88
| # | Module | Tickets | Exit gate |
|---|---|---|---|
| R5-1 | Billing (13's R5, unchanged) | `api/billing.js` in freed slot + Midtrans QRIS, KYB-gated; manual grants remain stopgap | first paid Gibol+ or documented KYB blocker |
| R5-2 | **M5 Pool Sponsor v1** | branding slots (logo on sheet/card/board) → report query pack (participants, picks, shares, consensus) → rate card 1-pager | demo pool live; pitch deck w/ Dream11+unifi evidence out to ≥5 prospects |
| R5-3 | **M7 Pertanyaan Bonus** | migration + ops scoring path → question cards on pick sheet → 3 launch questions per competition | ≥40% of active pickers answer ≥1 bonus Q |
| R5-4 | Mandalika event mode (13's R5) + **M6 Nobar Lite** | podium picks + grid tile (existing plan) + live consensus bar + HT poll | live during Oct 11 race weekend; sponsored if R5-2 converts |
| R5-5 | NBA nightly slate (13's R5, unchanged) | Basket skin, Edisi Malam prime | opening week live |

### R6 — Community + platform proof · Nov–Jan · v0.89–0.92
| # | Module | Tickets | Exit gate |
|---|---|---|---|
| R6-1 | **M8 Lencana** | badge rules (pure fns + tests) → profile shelf → badge share cards | badges appear in ≥10% of shared cards |
| R6-2 | **M9 Komunitas** | open mega-grup type → join-link page → komunitas board → moderation runbook | 3 real communities ≥50 members each |
| R6-3 | **M10 Suara Publik** | consensus widgets on Kabar/skor pages + hardened sponsor report | widgets live on 2 surfaces; report repeatable in <1h |
| R6-4 | Badminton pilot + IBL/Proliga config rows (13's R6, unchanged) | ops-scored BWF Finals; config-row test ≤2 weeks/sport | the platform-grammar acceptance test passes |
| R6-5 | Scoring preset: Superbru closeness (optional, per-grup) | additive preset, jagoan/core math untouched | opt-in only; default unchanged |

### R7 — Expansion bets · Q1 2027 · v1.x *(scope in Dec, don't pre-commit)*
M12 props (needs API-Football renewal) → Fantasy Liga 1 beta → M11 Toko Gengsi (gated on merch partner/fangir MVP) → M13 white-label pilot (gated on 2 paying sponsors) → Melayu locale + MY boards (13's R6 item, rides Dream11-in-Malaysia timing).

### BD workstream (parallel, Ade-led; eng cost already inside M5/M10)
| When | Motion |
|---|---|
| Aug | Rate-card 1-pager + demo sponsored pool (self-branded "Gibol Cup" on EPL MW1–4 as the portfolio piece) |
| Sep | Pitch wave 1 — 5 prospects with proven appetite for prediction mechanics: telco (Telkomsel MAXStream/by.U), bank sport sponsor (BRI/BCA), energy/FMCG (Extra Joss, Indomie), e-commerce (Shopee/Tokopedia sport verticals) — evidence: Pojok Pildun, Vidio WC2022, Dream11 sponsor roster, Superbru/unifi |
| Oct | **Mandalika is the forcing function**: sell the Oct 11 event pool with AFF+EPL+early-Liga-1 numbers; even one Rp 25–50jt event pool validates the line |
| Nov–Dec | League/rights relations (LIB, PSSI/Garuda ID, IBL, SPORTFIVE/ASEAN UTD) for official-predictor conversations — partnership, not scraping, is the IBL unlock 13 already wants |
| Ongoing | Quarterly watch: Dream11 F2P entering ID; PredictPlay shipping grups/Liga 1; a telco making campaign mechanics permanent |

### Risk deltas (beyond 13 §3)
| Risk | Mitigation |
|---|---|
| Module creep vs solo bandwidth | Tier 1 = 11–15 dev-days total; every R4a ticket is droppable without breaking the loop; Sistem 4a port keeps priority on contested weeks |
| Sponsor pitch fails cold | Self-branded Gibol Cup makes the deck concrete; price anchors marked est. and adjusted after 3 pitches |
| Bonus-question ops scoring doesn't scale | Cap at 3 questions/competition/window; content engine drafts, Ade approves |
| Komunitas moderation burden | Launch invite-only with 3 hand-picked communities; runbook before open link |
| M2/M3 public surfaces attract judol SEO spam | banned-vocab guard extended to challenge names + komunitas names at creation (server-side, same pattern as 0020 D2) |

## 7 · Decisions (step 6 — taken 2026-08-08)
1. **Launch triage: B.** EPL Aug 15 on current shell; redesign behind flags after.
2. **Sponsor GTM: managed-only + Gibol Cup demo.** Ops-configured pools; self-branded Gibol Cup on EPL MW1–4; Mandalika = first paid pitch.
3. **Komunitas: yes, invite-only pilot.** 3 hand-picked communities Nov–Dec, moderation runbook before any open link.
4. **Toko Gengsi: gated on first sponsor.** Redemption built only when a sponsor funds merch vouchers; no speculative work.
