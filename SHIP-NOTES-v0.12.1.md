# SHIP-NOTES — v0.12.1

**Ship date:** 2026-04-25 (Sprint 1, Day 5)
**Theme:** A part 2 (share button wiring) + Theme J seedling (per-game canonical URL)
**Predecessor:** v0.12.0 (Theme A part 1 — dynamic OG endpoint)

---

## What shipped

### 1. Three-layer IG-Story share fallback in `ShareButton.jsx`

The `Bagikan ke IG Story` button now has an explicit fallback chain so
**every user gets something useful** regardless of platform:

| Layer | Trigger | Behavior |
|---|---|---|
| **1 · file share** | `navigator.canShare({ files }) === true` (Android Chrome) | Fetches the 1080×1920 PNG, wraps in `File`, calls `navigator.share({ files })`. Native sheet → IG → Story in 2 taps. |
| **2 · url share** | Layer 1 unavailable but `navigator.share` exists (iOS Safari + non-file Androids) | `navigator.share({ url, text })` — share sheet posts the link. User taps IG, paste into Story. |
| **3 · download + clipboard** | Desktop / no `navigator.share` | Fetches PNG → blob → `<a download>`. Copies share URL to clipboard. Toast: "PNG di-download — buka IG dari HP, post ke Story." |

Each layer that fires emits a `share_layer` PostHog event with
`layer ∈ {file, url, download, open_tab}` so we can read conversion-by-tier
across the next NBA Playoffs week and adjust the fallback strategy if
needed.

### 2. New share helpers in `src/lib/share.js`

```js
buildPerGameOgUrl(gameId, variant)       // /api/recap/:gameId?v={og|story|square}
buildPerGameDeepLink(gameId, { sport })  // /nba-playoff-2026/game/:gameId
```

Replaces the verbose `buildNBARecapPngUrl(...)` in new call sites
(legacy helper stays exported). The new endpoint (v0.12.0) fetches
fresh ESPN data, so URL-encoded params (winner / loser / scores /
top scorer) are no longer needed.

### 3. Theme J seedling: `/nba-playoff-2026/game/:gameId`

New React route + page (`src/pages/NBAGameDeepLink.jsx`):

- **Per-game OG meta** — `og:image` points at `/api/recap/:gameId?v=og`,
  `og:title` reflects the actual matchup + score + status, `og:url`
  matches the canonical share URL
- **Inline content** (no redirect, no URL flash) — renders the per-game
  OG preview as a hero image, plus action buttons: Open NBA Dashboard,
  Daily Recap, Copy Link, Share
- **Telemetry** — `nba_game_deeplink_view` fires on mount with `gameId`
  + `gameStatus` (pre / in / post / null)

Why minimal: full Theme J (prerender + sitemap + JSON-LD + F1/EPL/Tennis
variants) lands in S4. This seedling exists so the v0.12.0 per-game OG
images have a canonical share URL to live behind, today.

### 4. Wired share buttons across NBA surfaces

| File | Change |
|---|---|
| `src/components/DayScoreboard.jsx` | `GAME_SHARE_URL(g)` returns `/nba-playoff-2026/game/:gameId` instead of `/nba-playoff-2026?game={id}` |
| `src/components/LiveGameFocus.jsx` | Header chip share URL → per-game canonical |
| `src/pages/Recap.jsx` | `igStoryPngUrl = buildPerGameOgUrl(game.id, 'story')`. Share + Copy Link both target the per-game canonical. Helmet OG meta on the recap page is unchanged (still date-level). |

---

## Files added

```
src/pages/NBAGameDeepLink.jsx     ← Theme J seedling, NBA-only canonical URL
SHIP-NOTES-v0.12.1.md
```

## Files modified

```
src/App.jsx                       ← register /nba-playoff-2026/game/:gameId BEFORE /:teamSlug
src/components/ShareButton.jsx    ← three-layer fallback in saveIGStory()
src/components/DayScoreboard.jsx  ← per-game canonical URL in GAME_SHARE_URL
src/components/LiveGameFocus.jsx  ← per-game canonical URL in share helper
src/pages/Recap.jsx               ← buildPerGameOgUrl + per-game share target
src/lib/share.js                  ← buildPerGameOgUrl + buildPerGameDeepLink exports
src/lib/version.js                ← APP_VERSION 0.12.0 → 0.12.1 + changelog
package.json                      ← 0.3.0 → 0.3.1
```

## Files NOT touched

- `api/recap/[gameId].js` — endpoint stays as v0.12.0 (Edge runtime,
  Satori, ESPN-driven, three variants, cache-by-state). Still deployed.
- `api/og/_layout.js` / `_game.js` / `_theme.js` / `_fonts.js` — same.
- `ops/generate_recap.py` — kept as fallback per amendments §3.7.

---

## Verify after deploy

```sh
# Per-game canonical route — returns 200 with full SPA shell
curl -sI "https://www.gibol.co/nba-playoff-2026/game/401869400" | head -3
# Expected: HTTP/2 200 + content-type: text/html

# OG image endpoint still alive
curl -s "https://www.gibol.co/api/recap/401869400?v=og" -o /tmp/og.png \
  -w "Status: %{http_code}\nSize: %{size_download}b\n"
file /tmp/og.png    # PNG image data, 1200 x 630

# All three variants
for v in og story square; do
  curl -s "https://www.gibol.co/api/recap/401869400?v=$v" -o /tmp/$v.png
  file /tmp/$v.png
done
```

**Share-flow verification (manual, mobile):**
1. Open `https://www.gibol.co/nba-playoff-2026` on Android Chrome
2. Tap the BAGIKAN button on a live or final game card
3. Native share sheet opens with the 1080×1920 PNG attached as a file
4. Pick IG → IG Stories opens with the image pre-loaded
5. Verify `share_layer = 'file'` in PostHog within ~30 s

iOS Safari fallback path (Layer 2):
1. Same sequence, expect the share sheet WITHOUT a file preview
2. URL goes to IG → user pastes into a Story
3. Verify `share_layer = 'url'`

Desktop fallback path (Layer 3):
1. Click BAGIKAN on `/nba-playoff-2026` → BAGIKAN popover opens
2. Click "Save to IG Story"
3. PNG downloads + URL copied to clipboard
4. Verify `share_layer = 'download'`

---

## Known limitations (parked for S4 Theme J full treatment)

- **Crawler unfurls of `/nba-playoff-2026/game/:gameId`** — the Vite SPA
  prerender script doesn't generate per-game static HTML, so unfurl
  bots that don't run JS (most of them) get the SPA shell's homepage
  meta instead of the per-game meta. **Mitigation**: in-app SPA users
  see correct per-game meta via Helmet. Direct shares to WhatsApp /
  X / Threads still produce a usable preview (homepage card vs
  per-game card — both gibol.co content). Theme J in S4 adds prerender
  support to make the per-game meta visible in unfurls.
- **No JSON-LD `SportsEvent` schema** — also parked for S4.
- **No sitemap.xml entries** for per-game URLs — same.
- **No F1 / EPL / Tennis per-event variants** — Theme J full S4.
- **Recap page OG meta still date-level** — `/recap/:date` unfurls show
  the daily recap card, not per-game. Acceptable: that URL pattern is
  the existing v0.9.x share target and changing it now would risk
  breaking inbound shares.

---

## Sprint 1 status — Day 5 of 8

| Day | Version | Theme | Status |
|---|---|---|---|
| 1–4 | v0.12.0 | A part 1 | ✓ Shipped |
| 5 | v0.12.1 | A part 2 + J seedling | ✓ Shipped (this) |
| 6–8 | v0.12.2 | B (Pick'em Home hero + league chip) | — Next |
| 9–10 | — | Buffer / retro / S2 prep | — |

---

## Next ship

**v0.12.2 — Theme B: Pick'em Home hero + league chip on HomeV1 + TopBar.**
Targeted: 2026-04-28 EOD (Day 8).
- New `PickemHomeHero.jsx` + `useUserBracketSummary.js` Supabase query
- New `LeagueChip.jsx` in TopBar
- Logged-in: hero above sport grid on HomeV1
- Logged-out: CTA "Bikin bracket lo. Tag-team sama teman di WhatsApp grup."
- Mobile collapse to single-line chip
