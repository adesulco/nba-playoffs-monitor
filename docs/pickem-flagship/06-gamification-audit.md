# Gamification Variables Audit — Fantasy-Sports CPO Review

**Date:** 2026-06-11 · Audits `01`–`05` for completeness of the gamification system. Verdict up front: **the competitive/comeback layer is strong; the identity/legacy layer and the instrumentation layer were missing.** Six gaps found, three of them cheap and high-leverage. Deltas at the bottom merge into `05-development-plan.md` (this doc wins on conflict; `05` §0 now points here).

---

## 1. Coverage matrix

Every variable a fantasy-sports product needs, checked against the doc set:

| # | Variable | Status | Where / gap |
|---|---|---|---|
| 1 | Points & scoring escalation | ✅ | `03` §B — escalating knockout, 5/3/2 tebak skor |
| 2 | Leaderboards (relative, social) | ✅ | Grup board + me-row; global deliberately excluded (CPO stop list) |
| 3 | Comeback mechanics | ✅ | Underdog bonus, escalating points, Survivor reset, par-score late join |
| 4 | Variable reward | ✅ | Post-pick consensus reveal (`03` §A teach) |
| 5 | Loss aversion (healthy) | ✅ | Survivor lives; streak resets clean (non-compounding by design) |
| 6 | Social proof & signal | ✅ | WA artifacts, colek, standings cards |
| 7 | Appointment mechanic | ✅ | Daily matchday cadence + per-match lock |
| 8 | Onboarding / FTUE | ✅ | 90-second teach (`03` §A) |
| 9 | Anti-gaming / fairness | ✅ | Consensus-at-lock audit, edit history, multi-entry cap |
| 10 | **Captain / double-down ("Jagoan")** | ❌ **GAP-1** | `--p-jagoan` tokens already exist in `pickem-tokens.css` — the mechanic was designed at token level and never specced. Nothing in `03`/`05` |
| 11 | **Urgency surfacing (lock countdown)** | ⚠️ **GAP-2** | Lock *behavior* specced; lock *countdown UI* and T-2h state never specced beyond one push notification |
| 12 | **Completion mechanic (matchday)** | ⚠️ **GAP-3** | Nothing pulls a user from pick #1 to pick #6 of a matchday |
| 13 | **Identity & career legacy** | ❌ **GAP-4** | No trophy case, no grup history, no career stats. This is the season-over-season retention asset and it's absent |
| 14 | **Eliminated-fan reactivation** | ❌ **GAP-5** | The biggest churn event in any WC product (your team goes out → you stop picking) has no designed response |
| 15 | **KPI instrumentation** | ❌ **GAP-6** | `03` names kill criteria and the north star but no event schema, no funnel definition, no targets. Unmeasured gamification is decoration |
| 16 | Virtual currency / economy | ✅ correctly absent | Make it explicit: **no coins, ever** — a soft currency adds tuning burden and drags the product toward judi-adjacent optics |
| 17 | Quests/missions system | ✅ correctly absent | GAP-3's completion ring is enough; a quest system is F2P-treadmill machinery that doesn't fit a pool product |
| 18 | XP levels / battle pass | ✅ correctly absent | Career stats (GAP-4) give progression without grind |

## 2. The six gaps, specced

### GAP-1 · Jagoan (captain pick) — P0, ship in R2

One pick per matchday can be starred as **Jagoan**: ×2 points if right, **−25% of its base points if wrong** (penalty makes it a real decision, not free upside; floor at 0 for the matchday). One per member per matchday, set/moved until that fixture locks. Replaces "confidence mode" in `03` §B (delete it from P1 — full 1–N confidence ranking is desktop-brain; jagoan is one thumb tap and the tokens already exist). Why it matters: it's the agency feeling concentrated into a single dramatic moment, it generates the best WA trash-talk artifact ("Budi pasang jagoan di Maroko 💀"), and it's the differentiation lever for trailing players *within* a matchday. Schema: `predictions.is_jagoan boolean` + uniqueness `(user_id, league_id, matchday, is_jagoan=true)`; scoring in `scoring-core.js`; stacks with underdog (×1.5 then ×2 — cap a single pick's total at 4× base).

### GAP-2 · Lock countdown urgency — P0, ship in R1 (UI-only)

"Malam Ini" cards show countdown chips from T-3h (`--p-live` amber: "🔒 2j 14m"); the sticky CTA inherits the soonest lock ("Kunci 3 tebakan — 1j 02m lagi"). Push at T-2h only if ≥1 fixture unpicked (already in R4-2 — move to R2). Deadline conversion is THE pool-product funnel metric; it needs a visible deadline.

### GAP-3 · Matchday completion ring — P1, ship in R2

Header ring on "Malam Ini": `4/6 dipilih`. Completing all picks = "Full Squad ✓" flair on your leaderboard row for that matchday (cosmetic only — **no points**, completion-for-points incentivizes blind tapping and pollutes consensus data). Endowed progress: the ring renders from pick #1, never from zero.

### GAP-4 · Trophy case & grup legacy — P1, build in R4 (rollover dependency)

Three read-mostly surfaces, no new mechanics: (a) **Grup history** — past competitions, champions, final tables ("Juara WC2026: Budi 🏆" pinned on grup home); (b) **Career stats** on Profile — accuracy %, underdog hit rate, jagoan record, best finish, grups won; (c) **Head-to-head** — lifetime me-vs-member record, surfaced as one line on tap. Why P1 not P2: the EPL rollover prompt (R4-4) converts because the grup has something to defend — "grup lo, gelar lo." Legacy is the moat PlayoffPickems genuinely lacks (their pools are disposable per season). Schema: `league_seasons` snapshot table written at competition close (`0021`).

### GAP-5 · Eliminated-fan reactivation — P1, ship before R32 (Jun 28 hard deadline)

When a member's favorite team (TeamPicker exists in the hub shell — wire it into Pick'em profile) is knocked out, trigger once: **"Musuh Bersama"** flow — pick the team you're now *against*; beating them anywhere in the bracket pays a small bonus (+2 per correct pick against them) and flavors copy ("Brasil keok, misi balas dendam ✓"). Cheap (one column `profiles.nemesis_team`, copy variants, one scoring term), and it re-frames elimination from exit-moment to new-game-moment. The knockout stage is where pools die; this is the counter.

### GAP-6 · Instrumentation spec — P0, lands with R1 (events ship with the features)

GA4 events (snake_case, `pickem_` prefix): `pickem_invite_open`, `pickem_first_pick` (params: taps_from_landing, is_guest), `pickem_pick` (competition, format, has_jagoan), `pickem_lock_complete` (picked_n, total_n), `pickem_grup_create` (template), `pickem_grup_join` (pending), `pickem_share_card`, `pickem_upgrade_view` / `_start` / `_success` (trigger: cap|multi|premium), `pickem_rollover_accept`.

| Funnel / metric | Target | Kill threshold (per `03` §A) |
|---|---|---|
| Invite open → first pick | ≥ 40% | < 40% = teach broken |
| Deadline conversion (members picking before lock, per matchday) | ≥ 70% | < 50% = urgency layer failing |
| Matchday completion (all fixtures picked) | ≥ 55% | — |
| D1 / D7 (member, in-window) | 45% / 30% | day1→day3 drop > 50% = loop not forming |
| K-factor (joins per created grup) | ≥ 4 | < 2 = WA artifacts not landing |
| Cap-hit → paid conversion | ≥ 5% | < 5% = revisit free cap (per `03` §C) |
| Eliminated-fan day+3 retention vs baseline | ≥ 70% of baseline | < 50% = GAP-5 mechanic insufficient |

One Supabase view (`pickem_kpi_daily`) + a weekly metrics-review ritual; no new analytics vendor.

## 3. Balance notes (fantasy-CPO judgement calls, decided)

1. **Jagoan penalty** (−25%) over pure upside — pure-upside captains are auto-applied to the safest favorite and stop being a decision. Penalty + underdog stack makes "jagoan on an underdog" the hero play of the whole system (max 4× cap).
2. **No completion points** (GAP-3) — protects consensus integrity, which underdog bonuses depend on.
3. **Nemesis bonus small** (+2) — it's a narrative device, not a scoring strategy; large values would distort knockout picks.
4. **Streaks stay garnish** — confirmed against `03` §B; do not let streak UI (GAP-2/3 surfaces) imply compounding.
5. **All new variables live inside `scoring_config`** (jagoan_multiplier, jagoan_penalty, nemesis_bonus, caps) — commissioners can zero any of them; templates default sane.

## 4. Deltas to merge into `05-development-plan.md`

| Release | Change |
|---|---|
| R1 | **R1-6 (new):** lock-countdown UI (GAP-2) · **R1-7 (new):** GA4 event schema + `pickem_kpi_daily` view (GAP-6). Migration 0019 adds `predictions.is_jagoan boolean default false` |
| R2 | **R2-7 (new):** Jagoan mechanic, scoring + UI + WA copy (GAP-1) · **R2-8 (new):** completion ring (GAP-3) · move T-2h unpicked push here from R4-2 |
| R2/R3 boundary | **R2-9 (new, hard date Jun 28):** Musuh Bersama eliminated-fan flow (GAP-5); `profiles.nemesis_team` in `0020` |
| R3 | `03` §B "confidence mode P1" is **deleted** (superseded by jagoan) |
| R4 | **R4-5 (new):** trophy case + grup history + H2H (GAP-4); `league_seasons` in `0021`; rollover prompt copy references the defended title |
| All | Exit criteria gain: "instrumentation events visible in GA4 for every shipped surface" |

**Net scope check:** +2 tickets R1, +3 R2, −1 R3 (confidence deleted), +1 R4 — fits the release windows because jagoan/countdown/ring are UI + one scoring term each, on infrastructure R1 already builds.
