# 02 · Platform contract

Extracted verbatim from doc 17 §1–2.5 (`docs/pickem-flagship/17-PLATFORM-RESET-2026-10-01.md`) on 2026-10-01; doc 17 stays the plan of record and wins on conflict. Implementation status lives in `00-STATE.md`.

**Where it lives in code:** Spec v1 = `supabase/migrations/0021_scoring_v1.sql` (the only writer) mirrored by `api/_lib/pickem/scoring-core.js`, both driven by `api/_lib/pickem/scoring-vectors.json`. Registry = `src/pickem/competitions.js` → `competitions.json` (`npm run registry`, drift fails the build). RLS posture = `supabase/migrations/0022_rls_close.sql`, proven by `scripts/rls-attack.mjs`. Seam = `src/pickem/api.js`.

## 1 · Scoring Spec v1 (canonical)

Every scoring writer and every reader resolves the same config: `leagues.scoring_config ?? competition template ?? Spec v1 defaults`. The SQL RPC is the only writer of `awarded_points`; `scoring-core.js` must produce identical numbers and is the client's provisional engine. One shared test vector file feeds both (`api/_lib/pickem/scoring-vectors.json`).

| Rule | Spec v1 | Today in prod (SQL) | Change |
|---|---|---|---|
| Tebak Skor ladder | exact **5** · result + goal difference **3** · result **2** · Nyaris **1** (wrong result, within 1 total goal; `close_miss`, zero-able) · else 0 | 8 / 5 / 3 / — | migration 0021 + `pickem_rules` defaults |
| Score judged on | end of play (90' or 120'); draw is a result; pens never enter the score; bracket advancement uses the advancer | cron writes advancer as outcome, admin path derives D | admin `score-fixture` accepts `outcome` + `advancer` |
| Jagoan ★ | one per (user, competition, matchday); **×2 in every stage**; miss penalty −25% of stake, floor 0 per matchday, **off by default** (`jagoan_penalty: 0`) until the Standar template flips it; single pick capped at 4× base | ×2 group / ×3 KO, no penalty, no cap; matchday index unenforced because `predict.js` never writes `matchday` | 0021 + `predict.js` writes `matchday` |
| Underdog | correct pick on a side with **<30 %** of the fixture's pickers at lock → **×1.5**; consensus snapshotted at lock (global per fixture); no probability curve | curve on `fixtures.p_*` that is always NULL → ×1 | consensus snapshot in the scoring path from pre-lock rows (equivalent since edits are blocked after lock); drop `p_*` curve |
| Bracket | group position 4 per correct slot, perfect group +8; KO R32 10 / R16 12 / QF 15 / SF 20 / Final 30; champion = final winner | group 0 (deferred), KO 10/20/40/80/160/200 | applies from the next tournament; `group_rank` scoring implemented |
| Streak | 3 **correct** picks in a row → +3, counter resets | `streaks` = consecutive matchdays with a submission, no points | repurpose: `streaks.kind` (`correct` / `submission`); only `correct` pays |
| Gugur (Survivor) | one team per matchday, no reuse, loss **or draw** = out, no pick = out, life is **per grup**, runs only when `enabled_modes.survivor` is on | per competition, draw = out, no pick survives, runs regardless of grup toggle, changing pick does not release old team | 0021 + `upsert-survivor.js` |
| Late-join par | `late_join_policy` median (default) or zero, materialised as `league_members.base_points` at first pick | column stored, nothing reads it | 0021 + `join-league.js` |
| Lock | per fixture at kickoff; edits until lock; `postponed` status; `lock_at` follows the new kickoff on reschedule | `lock_at` frozen at seed time, no `postponed` | backfill scripts drift `lock_at` and `kickoff_at` on matched rows |
| Tiebreak | points → exact count → nyaris count → earliest last pick; **shared ranks** on ties | SQL `rank()`, but `league-detail` and GrupHome give array-index ranks; `last_predicted_at` never written; `base_points = 8` hardcoded in four places | `tier` column on predictions (`exact` / `margin` / `result` / `nyaris`), `last_predicted_at` written by `predict.js` |
| Grup bonus | removed (was +2 to closest scoreline per grup, incremented on every re-run, never shown) | exists, double-counts on re-score | drop column |
| Badges | Juara Grup, Streak 5+, Perfect MD, Pendiri, Hadir Semua (doc 16 M8) | nostradamus / berani / konsisten, two can never fire | re-seed in 0021; award in the scoring RPC |
| Templates | Santai (ladder only), Standar (ladder + jagoan + underdog), Sultan (+ penalty + streak); paid tiers edit values; frozen after first lock | none; `scoring_config` always NULL | `GrupCreate` template step |
| Transition | competitions already scored under 8/5/3 (WC2026, AFF2026, NBA-Playoffs-2026) keep their rows as history. **EPL-2026-27 has zero scored fixtures, so it goes straight onto Spec v1 at the catch-up run.** Liga 1, NBA 2026-27 and everything after are Spec v1 from day one | | per-competition `pickem_rules` row carries the template |

Copy that must change with it: PickSheet points line ("Skor tepat 5 · hasil + selisih 3 · hasil 2 · nyaris 1 · ★ ×2"), GugurSheet ("seri = gugur"), `share4a.js` streak card ("pick tepat beruntun"), GrupHome tiles (add Nyaris), legacy `src/lib/pickemScoring.js` retired.

Edge cases that become tests: postponed fixture (lock follows new kickoff), score correction re-run (idempotent, survivor `out` reverted when the result flips), 1–1 KO won on pens (D 1–1 scores exact 5, bracket advances the winner), jagoan on a void match (no penalty), leaderboard tie (shared rank), guest merge after scoring (locked rows skipped), one user in two grups with Gugur (independent lives).

---

## 2 · Platform contract

### 2.1 One competition registry
`src/pickem/competitions.js` becomes the single source, exported as ESM and mirrored to `competitions.json` for scripts and the workflow matrix (a check script fails the build if they drift). Required fields per row:

```
key                      'EPL-2026-27' (fixtures.league, pickem_rules.league)
sport                    'bola' | 'basket' | 'motogp' | 'voli'   (skin key; no second map)
season                   '2026-27'
label                    { en: 'Premier League', id: 'Liga Inggris' }
labelShort               { en: 'EPL', id: 'EPL' }
structure                'league' | 'tournament' | 'playoff-series'
rounds                   { unit: 'MW' | 'MD' | 'R', count }
features                 { match, score, jagoan, bracket, survivor }
window                   { opensAt, closesAt }
lock                     { policy: 'kickoff', offsetMin: 0 }
feed                     { provider: 'espn', code: 'eng.1', mode: 'rolling' | 'window', roundMap?, tricodeOverrides, seedSource? }
teamsLeagueKey           'EPL'            (teams.league)
scoringTemplate          'standar'        (pickem_rules row seeded from it)
```
Consumers that must read it instead of their own copy: `sportSkins.js` (`COMPETITION_SPORT`), `api/g/[code].js` labels, `create-league.js` key regex, `list-profile.js` / `list-survivor.js` / `api.js` `'WC2026'` defaults, `backfill-fixtures-football.mjs` registry, `backfill-fixtures-nba.mjs` constants, `football-backfill.yml` matrix.

Adding a sport = one row + a feed adapter if the provider is new. `docs/06-adding-a-sport.md` (referenced, never written) becomes the checklist.

### 2.2 Modes and tiers
`enabled_modes` is the one mode system (`formats` dropped). `tier` is flipped by `grant-entitlement` and by the future webhook. Gates in `entitlements.js` are called by `create-league` (1 free grup), `join-league` (cap 10 → pending), `approve-member` (402 → upgrade sheet). Prices live in one place (`src/pickem/pricing.js`: season Rp79k, lifetime Rp249k, Gibol+ Rp19k/mo) and are displayed, not hardcoded in copy.

### 2.3 Seam and identity
Screens call only `src/pickem/api.js`; a lint rule bans `lib/supabase` imports under `src/pickem/` except `api.js`. New dispatcher actions: `get-fixture`, `get-prediction`, `update-profile`, `enter-result` (ops entry), `leaderboard-national`. Guest flow: device id + invite code stored in `guestStore`; on login `AuthCallback` runs `mergeGuest` then `joinGrup` for the stored invite; nickname is asked once at merge (ON-1), the nudge is the fallback.

### 2.4 Glossary (EN key / ID key; bold = fixed in both locales)
grup / grup (never league, liga) · pick / pick · **Tebak Skor** · **jagoan ★** ("star" only as the glyph, never "pasang") · **colek** · standings / klasemen · MW (league), MD (tournament), R (playoffs) from `rounds.unit` · Premier League / Liga Inggris · ASEAN Cup / Piala AFF · NBA Playoffs · Tonight / **Malam Ini** · **Edisi Malam** · Lock my pick / Kunci pick · commissioner / komisioner · Nyaris (both). Register kamu/-mu. No money vocabulary. `check-vocab.mjs` extends to `api/` and enforces the glossary.

### 2.5 Flags and routes
`UI.pickemHome` default **true** (prod already is). Delete the nine dead flags. Legacy `/pickem/*` navy screens unmount once the 4a create-grup wizard and 4a profile ship; `/bracket*`, `/league/*`, `/leaderboard*` unmount with them. Hubs stay at their canonical URLs; `/beranda` stays as the scores home.

### 2.6 Docs collapse
Keep four: `docs/00-STATE.md` (from HANDOVER), `docs/01-PRODUCT.md` (doc 11 + 14 §1–4 + 16 §5–7), `docs/02-PLATFORM-CONTRACT.md` (this §1–2.5), `docs/03-DESIGN.md` (4a README). Everything else to `docs/archive/`, including `handover-2026-07-18/`, root ship notes, three of the four design-handoff dirs, `version.js` changelog → `CHANGELOG.md`. Repo `CLAUDE.md` rewritten to point at these four.

---
