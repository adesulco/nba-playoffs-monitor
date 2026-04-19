# SHIP NOTES — v0.1.2

**Date:** 2026-04-20
**Baseline:** v0.1.1 (`de42d39`)
**Theme:** Multi-sport readiness. Schema generalization + UX polish for i18n + share + timezone.

## What this ship includes

Four things. One is a DB migration, three are UI.

### 1. Supabase migration `0002_multi_sport.sql` (NBA → any sport)

Committed at `supabase/migrations/0002_multi_sport.sql`. Idempotent — safe to re-run.

Six schema changes:

1. Adds `league` column (default `'NBA'`, NOT NULL) to `teams`, `series`, `pickem_rules`; backfills existing rows; adds `league`-scoped indexes.
2. Drops the NBA-only `teams_conference_check` constraint and relaxes `conference` to nullable so it can hold IBL divisi, football group, F1 constructor, etc.
3. Converts `series.playoff_round` from a typed enum to `text`. Drops the enum type. Adds a non-empty sanity check.
4. Relaxes `series.winner_games/loser_games` constraints — best-of-3 (IBL finals), best-of-5 (early rounds historically), best-of-7 all valid. New rule: `winner_games >= loser_games` and both ∈ [0,4].
5. Makes `pickem_rules` per-league instead of a singleton. Old PK dropped dynamically; new PK = `(league)`.
6. Rewrites `pickem_score_series(p_series_id)` to look up rules by the series' league (falling back to 'NBA' then to any row). Scoring logic unchanged for NBA.

Ends with a verification `SELECT` block — paste the whole file into Supabase SQL Editor at `https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new` and the result rows confirm (a) league columns present+backfilled, (b) `playoff_round` is now text, (c) `pickem_rules` PK is `league`.

### 2. Threads share added to live game + Catatan Playoff

- **Recap page (`/recap/:date`)** — the horizontal ShareBar now offers `Threads` alongside WhatsApp, X, and Telegram. Uses `https://www.threads.net/intent/post?text=…` which deep-links to the native Threads app on iOS/Android and falls back to threads.net on desktop.
- **DayScoreboard (per-game share)** — the `Bagikan`/`Share` chip now opens a mini popover with WA / X / Threads / Copy buttons when `navigator.share` isn't available (desktop browsers). Mobile still hits the native OS share sheet first (which already surfaces Threads if the app is installed).
- **LiveGameFocus** — now has its own `↗ Bagikan` chip in the header next to `× CLOSE FOCUS`. Same cascade: native share → WA/X/Threads/Copy menu.

### 3. "Catatan Playoff" now translates to English

- `Home.jsx` — the Catatan Playoff card shows `Playoff Notes` in EN and `Catatan Playoff` in ID.
- `About.jsx` — already lang-aware, no change needed.
- `Recap.jsx` + `TeamPage.jsx` — already lang-aware, no change needed.
- `YesterdayRecap.jsx` — date label now respects `lang` (was hardcoded en-US). Added a `Baca catatan → / Read recap →` link into the header that deep-links to `/recap/:yesterday`.
- `src/lib/i18n.js` — added `catatanPlayoff`, `catatanPlayoffSub`, `catatanPlayoffLead`, `catatanTodays`, `catatanYesterdays`, `catatanDaily`, `readRecap` keys in both EN + ID dicts so any future surface can use `t('catatanPlayoff')` instead of hardcoding.

### 4. DayScoreboard timezone fix

Line in `DayScoreboard.jsx` that rendered raw `g.status` (ESPN's "FRI 7:30 PM ET" string) for upcoming games now calls `localizeGameStatus(g.status, g.date, g.statusState, lang)`. Result: pre-game status strip shows "22:30 WIB" for a Jakarta viewer instead of "FRI 7:30 PM ET". Live/final states are pass-through (they contain the game clock, not a TZ-anchored time). Day tabs were already DD/MM — unchanged.

### Bonus: docs/07-multi-sport-flexibility.md

New doc outlining what's now unlocked by the migration, quick-win refactors for this week (sport directory convention, provider adapter pattern, universal `Game` type, per-league share text), and deeper refactors for next month (dynamic routing, per-league rate limiting, richer pickem schema). Lives at `docs/07-multi-sport-flexibility.md`.

## Files touched

- `supabase/migrations/0002_multi_sport.sql` (new)
- `src/components/DayScoreboard.jsx` — timezone fix + share menu (WA/X/Threads/Copy)
- `src/components/LiveGameFocus.jsx` — share chip + menu in header
- `src/components/YesterdayRecap.jsx` — locale-aware date, recap link
- `src/pages/Recap.jsx` — Threads button in ShareBar
- `src/pages/Home.jsx` — Catatan Playoff English title
- `src/lib/i18n.js` — new Catatan Playoff i18n keys
- `src/lib/version.js` — APP_VERSION → 0.1.2
- `package.json` — version → 0.1.2
- `docs/07-multi-sport-flexibility.md` (new)
- `SHIP-NOTES-v0.1.2.md` (this file)

## Verification

- Build in Cowork sandbox: see deploy section below. `vite build` should transform ~87+ modules cleanly.
- Manual checks post-deploy (after Ade pushes + deploys from Mac):
  - `curl -s https://www.gibol.co/nba-playoff-2026 | grep -o 'v0\.1\.2'`
  - Open https://www.gibol.co in EN mode, confirm Home card reads "Playoff Notes" not "Daily Recap" or "Catatan Playoff".
  - Open https://www.gibol.co/nba-playoff-2026 on desktop. An upcoming game card's status strip should show "HH:MM WIB" (or user's local zone), not "FRI 7:30 PM ET".
  - Click Bagikan on a LIVE game card on desktop → popover with WA / X / Threads / Salin.
  - Open `/recap/2026-04-19` → confirm Threads button in ShareBar.

## Deploy (from Ade's Mac)

```bash
cd /Users/user/Documents/Claude/Projects/Gibol/nba-playoffs-monitor

# 1. Apply migration (Supabase SQL Editor — fastest)
#    Paste the contents of supabase/migrations/0002_multi_sport.sql into
#    https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
#    → Run. The verification SELECT at the bottom should return sensible rows.

# 2. Verify remote
git remote -v
# origin → https://github.com/adesulco/nba-playoffs-monitor

# 3. Commit
git add -A
git commit -m "v0.1.2: multi-sport migration, Threads share, EN Catatan Playoff, tz fix

- supabase/migrations/0002_multi_sport.sql: league column + free-text round + per-league pickem_rules.
- DayScoreboard: localize upcoming-game status strip via localizeGameStatus.
- DayScoreboard + LiveGameFocus: share menu adds Threads alongside WA/X/Copy.
- Recap ShareBar: Threads button added.
- Home + i18n: Playoff Notes (EN) / Catatan Playoff (ID); new i18n keys.
- YesterdayRecap: locale-aware date + recap deep-link.
- docs/07-multi-sport-flexibility.md: plan for F1/soccer expansion."

# 4. Push
git push origin main

# 5. Deploy
npx vercel --prod --yes

# 6. Smoke test
curl -s https://www.gibol.co/nba-playoff-2026 | grep -o 'v0\.1\.2'
# Should return: v0.1.2
```

## Next

With v0.1.2 out, backlog priority order stays:

1. **Pick'em UI port** — P0. Schema is per-league now, ready for IBL from day one.
2. **IBL data pipeline** — start in a fresh chat using `docs/06-adding-a-sport.md` + `docs/07-multi-sport-flexibility.md`.
3. **Provider adapter pattern** — the refactor described in `docs/07` §2.2. Do this *before* wiring IBL, not after.
