# Pick'em Game Mechanics Review — Game Designer × Fantasy Sports × CPO

**Date:** 2026-06-11 · Companion to `01-strategy.md` / `02-wireframes.html` · Feeds `04-claude-code-design-prompt.md`

Three lenses applied to the same mechanism. Where they disagree, the resolution is stated.

---

## A. Game designer lens

### The core loop (one sentence)

> **Tap your picks before lock → watch the match with skin in the game → see your rank move on the grup leaderboard → trash-talk in WA → pick again tomorrow, smarter.**

Loop cadence during WC2026 group stage = **daily** (4–6 matches/day). That's the cadence of a habit, not an event — this is structurally better than PlayoffPickems' NFL product (1 matchday/week). The design job is to never break the daily rhythm.

### The verb

**Tap-the-team.** One thumb, one tap, instant green confirm. The whole product must be operable with the right thumb on a 6.1" screen on a motorbike-taxi ride. Bracket dragging, long-presses, and pinch interactions are banned from the hot path.

### The one feeling (pick two, sell two)

1. **Social signal** — beating people you know. The leaderboard row with your name above your friend's IS the product.
2. **Agency** — "I called that upset." Surprise belongs to the sport; the game's job is to make the player feel their call mattered.

Explicitly NOT selling: mastery-grind, collection, expression. (Kartu Bola recaps serve social signal, not collection.)

### The 90-second teach (current flow fails this — fix in design)

| Second | What happens |
|---|---|
| 0–5 | Tap WA invite link → see grup name + live leaderboard with friends' real names. No signup wall. |
| 5–15 | "Mulai nebak" → **today's single match** appears first — NOT the full bracket, NOT 12 groups. One tap = one pick = instant confirm animation. |
| 15–45 | After the pick: consensus bar reveals ("68% grup lo milih Jepang") — variable reward *after* commitment, never before (anchoring kills independent picks; premium users can see it pre-pick, that's what they pay for). |
| 45–90 | "3 match lagi malam ini" → swipe through, tap, done. Login (magic link) requested only at "Kunci tebakan." |
| First mistake | First wrong pick → show "Kalau bener: +10. Streak lo aman — yang penting menang grup." Recoverable, informative, never punishing. |

**Rule: the full bracket and the 12-group ranking are *power-user* surfaces, never the first-touch surface.** PlayoffPickems leads with the bracket because US pool culture starts there; Indonesian WA-group culture starts with "tebak match malam ini."

### The four multiplayer problems

| Problem | Answer |
|---|---|
| **Downtime** (between pick and result) | **Live provisional points.** During a live match, the leaderboard shows poin-sementara ticking ("lo +10 kalau gini terus") using the existing ESPN/API-Football live layer. This is the moat PlayoffPickems cannot copy cheaply — they have no live-data layer. Watching the leaderboard *during* the match is the addon becoming the product glue. |
| **Runaway leader** (pool decided by week 2) | Three rubber-bands, none of which punish the leader: (1) escalating knockout points (R32 10 → Final 30) keep ~60% of total points alive after groups; (2) **underdog bonus** (see fantasy lens) rewards trailing players for differentiating; (3) Survivor runs as a parallel reset game — dead in the main board ≠ dead in the grup. |
| **Kingmaker** | Structurally absent (no player-vs-player interaction). Keep it that way — no pick-blocking or sabotage mechanics, ever. |
| **Talk vs solitaire** | This is a **conversation game whose table is WhatsApp.** Design the conversation artifacts as first-class features: matchday standings card (PNG), "colek" nudge for non-pickers, auto-generated matchday recap line ("Budi nyalip lo gara-gara Maroko 😂"). The app is the scoreboard; WA is the table. |

### Difficulty curve

- **Onboarding cliff (day 1):** today's matches only, 1-tap picks, generous early scoring.
- **First wall (day 2–3):** first wrong pick + first leaderboard drop. Must coincide with discovering the comeback tools (knockout points ahead, underdog bonus, Survivor).
- **Mastery slope (week 2+):** group-ranking permutations, bracket modes, confidence allocation, multi-entry. Depth by *content* (new modes per stage), not by numbers.

### Kill criteria (playtest signals that mean redesign, not polish)

1. Invite-link tap → first pick conversion < 40% (teach is broken).
2. Members who pick on day 1 but not day 3 > 50% (daily loop not forming).
3. Grups where the leader at end-of-groups wins the pool > 75% (rubber-bands failing — knockout points too small).

---

## B. Fantasy sports expert lens (inline — scoring & format design)

### Format menu (per-grup, commissioner picks; one new format ships per stage, not all at once)

| Format | Status | Notes |
|---|---|---|
| **Round-by-round pick'em** | live (match predictions, 0015) | The default. PlayoffPickems calls this "pick'em mode" — matches open as they're set. |
| **Full bracket** | live (0016) | Power users. Auto-fill-from-group-picks toggle = parity gap to close. |
| **Survivor** | live (0017) | Parallel reset game. Keep. |
| **Tebak Skor (exact score)** | NEW — P0 for football | THE Indonesian football mechanic — every WA group already plays "tebak skor" manually. Scoring: exact score 5 · correct result + goal margin 3 · correct result 2 · miss 0. The `predictions` table already stores match picks; add `predicted_home/away_score` columns. This is the localization moat — no US product will ever build it. |
| **Confidence mode** | NEW — P1 | Classic NFL-pool mechanic, absent from PlayoffPickems: rank your matchday picks by confidence (stack 1–N points). Adds depth for mature grups without new data. |
| ~~Daily fantasy rosters / salary cap~~ | never | See CPO stop list. |

### Scoring design principles (encode in `scoring_config` templates)

1. **Escalate with stakes** — group pick 4 / perfect group +8 / R32 10 / R16 12 / QF 15 / SF 20 / Final 30. Keeps ≥55% of available points after the group stage (comeback math).
2. **Underdog bonus** — if your correct pick had <30% pool consensus at lock: +50% points on that pick. This is leverage theory from DFS applied to pools: trailing players *should* go contrarian; reward it explicitly. Consensus % is computed at lock time (store it on the prediction row — auditable, no retro-fudging).
3. **Streak garnish, not engine** — 3 correct in a row = small flat bonus (+3), resets clean, never compounds. Compounding streaks create loss-aversion anxiety and reward luck twice. (Streak tables exist via 0017.)
4. **Late join = par score** — joiner after matchday N starts at the pool *median* for missed rounds (commissioner toggle: median / zero). Removes the #1 reason WA-group members refuse to join mid-tournament. PlayoffPickems buries this in an FAQ; make it a headline feature: "Telat gabung? Tetep bisa menang."
5. **Lock at kickoff, per match** (already live) — never per matchday; late lockers are the growth audience.
6. **NFL-style reseeding** — irrelevant for WC/EPL but required for NBA/IBL brackets; the bracket engine already derives matchups live (play-in resolution exists), keep it sport-generic.

### Anti-gaming rules

- Consensus visible **pre-pick only for premium**, post-pick for everyone (premium sells information, not advantage — consensus is a crowd signal, not an answer key).
- Multi-entry capped at 3/user/grup even on paid (uncapped multi-entry lets one user brute-force the bracket space and demoralizes the grup).
- Pick edits allowed until lock; edit history visible to commissioner (kills "I totally picked Maroko" disputes — the #1 WA-group fight).

---

## C. CPO lens

### Wedge statement

> **The WhatsApp-group commissioner running a WC2026 tebak-skor pool for 8–40 friends, who today does it in a spreadsheet (or memory), and whose grup becomes our compounding asset — every pool seeds the next competition's pools.**

### North-star: **Weekly Active Pools (WAP)** — grups with ≥3 members making ≥1 pick in the last 7 days.

Causal chain: WAP → members hit the 10-cap → commissioner pays (Season Pass) → grup persists to next competition (EPL Aug 2026) → multi-competition grups buy Lifetime. Players inside active pools see premium chips daily → Gibol+ conversion. Every other metric (picks/user, D7, share-card sends) must trace into WAP or it's decoration.

### Prioritization (leverage × reversibility)

| | Reversible | Irreversible |
|---|---|---|
| **High leverage** | Ship now: 90-sec teach flow · tebak skor · live provisional points · underdog bonus · par-score late join · WA artifacts | Decide carefully, then ship: root-domain inversion (Phase A now / B post-final — already decided) · pricing ladder · `scoring_config` schema shape |
| **Low leverage** | Defer: confidence mode · badges surfacing · EN landing polish | Never: see stop list |

### Stop list (what we will NOT build)

1. **Real-money anything** — no pots, no entry fees, no prize escrow. Legal cliff (judi online), product trap.
2. **Daily-fantasy rosters / salary caps** — 10× scoring complexity, legal gray zone in ID, off-wedge.
3. **In-app chat** — WA is the chat. We build artifacts *for* WA, not a worse WA.
4. **Native iOS/Android apps** — PWA is live; app stores add review latency during shipped-in-the-window seasons.
5. **Odds/betting content** — Komdigi lesson already paid for (Polymarket removal).
6. **Public global leaderboard as a focus** — global boards reward whales and bots; the grup board is the product.

### Pricing note (free tier as product surface)

The 10-member free cap is the *conversion event*, so the approach to the cap must be visible and warm ("9/10 — 1 slot lagi"), never a hard error at member #11. Member #11 joining triggers the commissioner upgrade sheet with the joiner held in a pending state — the social pressure of a friend waiting is the strongest paywall in the product. Keep Free at 10 (not 15 as floated in 01-strategy §7.4) precisely because WA grups run large — cap-hit rate IS the funnel. Revisit only if cap-hit→pay conversion < 5%.

### Loop the org/agent-work is staffed against

```
WA invite → guest pick (90-sec teach) → daily pick habit → live provisional leaderboard
   ↑                                                              ↓
next-competition rollover ← paid commissioner ← cap hit ← grup grows (WA artifacts)
```

Every ship must point at one edge of this loop. The hubs (skor.gibol.co) feed the "daily pick habit" edge and are now judged by that contribution.

---

## D. Resulting enhancement delta (what changes vs 01-strategy)

1. **P0 adds:** Tebak Skor format · live provisional points · underdog bonus · par-score late join · first-touch = today's match (not bracket).
2. **P1 adds:** confidence mode · edit-history audit · multi-entry cap of 3.
3. **Pricing change:** keep Free cap at 10 (reverses 01-strategy §7.4 suggestion of 15); pending-member upgrade sheet.
4. **Premium clarification:** pre-pick consensus + win-prob + form is the Gibol+ core; post-pick consensus free for all.
5. **Schema impact (migration 0019):** `leagues.scoring_config jsonb` + `max_members` + `tier` (unchanged) · `predictions.predicted_home_score/away_score int` · `predictions.consensus_at_lock numeric` · entitlements table.
