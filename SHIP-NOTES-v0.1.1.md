# SHIP NOTES — v0.1.1

**Date:** 2026-04-20
**Baseline:** v0.1.0 (`df92d9f`)
**Versioning rule (new):** +0.0.1 per live ship from here on. Minor bumps for new big surfaces (Pick'em, IBL). Major bump (1.0.0) when a sport beyond NBA ships.

## What this ship includes

Five user-facing improvements on top of v0.1.0. All are in the NBA dashboard path (`/nba-playoff-2026`) and the top-of-page scoreboard.

### 1. Live-game share link (per-game)

Every LIVE and FINAL card in `DayScoreboard` gets a `Bagikan` / `Share` button. Cascading fallback so Indonesian fans on mobile WhatsApp hit the native share sheet first:

1. `navigator.share({ title, text, url })` — native on Android/iOS
2. WhatsApp deep-link — `https://api.whatsapp.com/send?text=…` (the working variant from F12 audit; `wa.me` is blocked by some clients)
3. `navigator.clipboard.writeText(…)` — with `✓ Tersalin` confirmation

Copy (Bahasa-casual with English slang, per Ade):

- Live: `"LAL 92 – 88 DEN · Q3 07:24 · live-update-nya di gibol.co 🏀"`
- Final: `"FINAL · LAL 118 – 104 DEN · recap + bracket di gibol.co 🏀"`

URL deep-links back to `https://www.gibol.co/nba-playoff-2026?game={id}` so a future commit can auto-focus the shared game.

**Files:** `src/components/DayScoreboard.jsx` (new `ShareBtn`, `buildLiveShareText`, `buildFinalShareText`, `GAME_SHARE_URL` helpers).

### 2. Live win odds per game (on scoreboard)

Every in-progress game now shows a two-tone progress bar labeled `WIN ODDS · ESPN` directly on its card:

- Source: ESPN's public probabilities endpoint (same stream powering the `LiveGameFocus` chart). Reused `fetchWinProbabilities(eventId)` in `src/lib/api.js`.
- Decision: **ESPN over Polymarket for per-game**. Polymarket's per-game markets are thin / inconsistent; ESPN gives us a reliable win-probability tick every possession on an edge-cached endpoint. Polymarket stays for the *championship* ticker on the left rail.
- Polling: 30s cadence, synced with the main scoreboard refresh. Only events with `statusState === 'in'` are polled — at most ~4 concurrent live games in an NBA day → ~8 req/min at peak. Well inside polite-use.
- Rendering: progress bar width = live win % for each side, colored with team primaries. Label shows the leading team + pct (e.g. `LAL 62%`). Hidden on upcoming/final.

**Files:** `src/hooks/useLiveWinProbs.js` (new), `src/components/DayScoreboard.jsx` (new `OddsBar` component), `src/pages/NBADashboard.jsx` (wire-up).

### 3. Full box score (every player who played)

`LiveGameFocus` BoxScoreTable used to `slice(0, 6)`. It now renders all non-DNP players, starters first (by PTS), then bench (by PTS). Deep rotations, garbage-time bench, and off-the-bench heroes all visible.

**Files:** `src/components/LiveGameFocus.jsx` (`BoxScoreTable.leaders`).

### 4. DD/MM date tabs

Day tabs in `DayScoreboard` switched from locale month-names to zero-padded DD/MM. Keeps `YESTERDAY / TODAY / TOMORROW` on top.

Before: `KEMARIN · MIN · 19 APR`
After:  `KEMARIN · MIN · 19/04`

**Files:** `src/components/DayScoreboard.jsx` (`intlShort`).

### 5. Single-surface scoreboard (no redundant date row)

Removed the duplicate "today-only" GameCard row that sat below `DayScoreboard` in `NBADashboard.jsx`. Day tabs already cover every day, and the swipe cards are now the sole clickable surface for both browsing (any day) and focusing (today's live games). Active card gets an accent left-border + darker bg; fav-team card shows colored left-border always.

**Files:** `src/pages/NBADashboard.jsx` (removed `games.slice(0, 6).map(GameCard)` block, added `onGameClick/activeMatchId/favTeam/accent` props to `DayScoreboard`).

## Audit status (what else was checked)

- `docs/00-current-state.md` — updated for v0.1.1. Versioning convention documented.
- `docs/02-roadmap.md` — no scope changes this ship. Pick'em UI still the top P0.
- `docs/05-known-issues.md` — #10 (Tailwind unused devDeps) still open; not a user-facing bug. #4 (static recap cards) still open; out of scope for this ship.
- F12 audit fix (WhatsApp URL) — applied correctly in the new `ShareBtn` (`api.whatsapp.com/send` form).

## Verification

- Local build succeeded in sandbox: `vite build` transformed 87 modules, no errors. Bundle sizes:
  - `index-*.js` 208.66 KB → gzip 68.93 KB
  - `NBADashboard-*.js` 90.29 KB → gzip 25.72 KB (no regression vs v0.1.0's ~26 KB)
  - `Recap-*.js` 18.72 KB → gzip 6.46 KB
- Build in `/mnt/Gibol/nba-playoffs-monitor/` itself fails with `EPERM` because Cowork sandbox can't delete files in the existing `dist/` (previous builds were written by Ade's Mac). This is expected and does NOT affect Vercel deploys.

## Deploy (from Ade's Mac — NOT from Cowork)

```bash
cd ~/Downloads/Cowork/Gibol/nba-playoffs-monitor  # or wherever your local clone sits

# 1. Confirm remote (orphan check — see docs/05-known-issues.md)
git remote -v
# Must show origin → https://github.com/adesulco/nba-playoffs-monitor
# If not: git remote add origin https://github.com/adesulco/nba-playoffs-monitor.git && git fetch origin

# 2. Stage + commit
git add -A
git commit -m "v0.1.1: live share, live win odds, full box score, DD/MM tabs, single scoreboard

- DayScoreboard: per-game Bagikan button (navigator.share → WhatsApp → clipboard).
- useLiveWinProbs hook: ESPN per-game win-probability polled at 30s for live games.
- LiveGameFocus BoxScoreTable: show all non-DNP players (was top 6).
- Day tabs in DD/MM format (zero-padded), keeping YESTERDAY/TODAY/TOMORROW.
- Removed duplicate today-only GameCard row; DayScoreboard is the sole clickable surface."

# 3. Push
git push origin main

# 4. Deploy (no automatic GitHub→Vercel integration yet)
npx vercel --prod --yes

# 5. Verify live
curl -sI https://www.gibol.co | grep -i 'x-vercel-cache\|x-matched-path'
curl -s https://www.gibol.co/nba-playoff-2026 | grep -o 'v0\.1\.1'
# Or just open https://www.gibol.co/nba-playoff-2026 and confirm:
#   - Version chip in footer shows "v0.1.1 · 2026-04-20"
#   - Day tabs show DD/MM format (e.g. 20/04)
#   - No duplicate game row below the swipe scoreboard
#   - A live game's card shows a WIN ODDS bar
#   - "Bagikan" button opens the native share sheet on mobile
```

## Next

With v0.1.1 out the door, the top P0 remains Pick'em UI port (magic-link login → bracket editor → leaderboards). Schema is already live in Supabase. Budget ~4 hours in a fresh chat.
