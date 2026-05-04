# SHIP-NOTES — v0.12.0

**Ship date:** 2026-04-25
**Sprint:** Sprint 1 of `docs/12-product-improvement-plan.md`
**Theme:** A part 1 — Dynamic per-game OG card endpoint (the "Bagikan ke
WhatsApp / IG Story" pipeline that has been hand-generated since v0.9.x).
**Predecessor:** v0.11.28 (audit-response final).

> **What this ship does in one line.** Replaces the hand-cranked Python
> recap-card pipeline with a live serverless endpoint that fetches
> per-game ESPN data and renders three share-card variants (OG / Story /
> Square) on demand, with five visual enhancements on top of the static
> template. Closes Theme A part 1 of the Sprint 1 amendments.

---

## What shipped

### `/api/recap/:gameId` — live, ESPN-driven, three variants

```
GET /api/recap/:gameId           → 1200×630 (og default — Twitter/FB unfurl)
GET /api/recap/:gameId?v=og      → 1200×630
GET /api/recap/:gameId?v=story   → 1080×1920 (IG/WhatsApp Story)
GET /api/recap/:gameId?v=square  → 1080×1080 (IG feed)
```

Replaces the previous `@vercel/og` URL-encoded-params endpoint with a
Satori-driven layout that pulls real game data from the ESPN summary
proxy. Backward-compat: legacy callers that still pass `?winner=…&
loser=…&winScore=…` get a card from those params when ESPN fetch fails.

### Pipeline

1. **Fetch** — `/api/proxy/espn/basketball/nba/summary?event={gameId}`
2. **Normalize** (`api/og/_game.js`) — ESPN `summary` → normalized object
   - Top-level `j.leaders[]` array (NOT per-competitor `leaders`) — this
     was the bug that hid the top-3 strip on the first deploy
   - Linescores read both `value` and `displayValue` (ESPN ships the
     latter; older endpoints used `value`)
   - `header.notes[0].headline` → `seriesRecord` for playoff games
     ("Lakers lead 2-1")
3. **Layout** (`api/og/_layout.js`) — pure-object JSX tree (no transform
   needed at function runtime), three variant geometries
4. **Render** — `@vercel/og` `ImageResponse` (Edge runtime; reuses the
   same Satori internals as `@vercel/og`)
5. **Cache by game state** (amendment §10.4):
   - `live` → `s-maxage=10, stale-while-revalidate=30`
   - `post` → `s-maxage=300, stale-while-revalidate=86400`
   - `pre`  → `s-maxage=60, stale-while-revalidate=300`

### Five visual enhancements (A–E) all landing live

| # | Enhancement | Verified on |
|---|---|---|
| A | Fixed contrast on verdict body, top-3 stat-line, footer tagline (was rendering as ~10% opacity ghost text on the static template) | OG / Story / Square |
| B | Quarter-by-quarter score row (`Q1 39-32 · Q2 24-20 · …`) — auto-detects OT (5+ rows) | OG / Story / Square |
| C | Smarter status pill: `FINAL · LAL leads 2-1` (post + playoff), `LIVE · Q3 5:23` (in-progress, with red pulse), `TIPOFF · SAT 22:30 WIB` (pre) | OG / Story / Square |
| D | Top-3 stat-leaders strip filling the formerly-empty right half of the OG variant. Pass-1: top points-leader per team; Pass-2: fill 3rd slot from best assists / rebounds leader | OG (right column), Story / Square (below verdict) |
| E | Win-probability bar — horizontal gradient under scores. Live ESPN `pickcenter[].homeTeamOdds.winPercentage` when in-progress; falls back to outcome-based 100/0 for FINAL games | OG / Story / Square |

Verified on `LAL 112 – HOU 108 (OT)` — see screenshots in the verification
log. All five enhancements visible.

---

## Files added

```
api/og/_fonts.js                          ← font registration (Node version, kept for future)
api/og/_theme.js                          ← color tokens (lifted contrast values + brighten/hexa helpers)
api/og/_layout.js                         ← pure-object JSX tree (single h() helper auto-injects display:flex on every <div>)
api/og/_game.js                           ← ESPN summary normaliser
api/og/_fonts/InterTight-Bold.ttf         ← static-weight TTF (latin subset, 58 KB)
api/og/_fonts/InterTight-SemiBold.ttf
api/og/_fonts/InterTight-Medium.ttf
api/og/_fonts/JetBrainsMono-Bold.ttf
api/og/_fonts/JetBrainsMono-Medium.ttf
public/og/_fonts/                         ← duplicate of api/og/_fonts/ for Edge HTTP fetch
SHIP-NOTES-v0.12.0.md
```

## Files modified

```
api/recap/[gameId].js                     ← rewritten: Satori + ESPN fetch + 5 enhancements; backward-compat with URL-encoded legacy callers
package.json                              ← +satori, +@resvg/resvg-js (kept as deps for future Node-runtime variants); 0.2.37 → 0.3.0
src/lib/version.js                        ← APP_VERSION 0.11.28 → 0.12.0 + per-version changelog
```

## Files preserved (not deleted)

- `ops/generate_recap.py` — kept as fallback per amendments §3.7 risk register
- `public/og/2026-R1-LAL-DEN-G3-{og,story,square}.png` — kept as the static
  example; existing URLs still work

---

## Constraints encountered (and how they shaped the build)

### Vercel Hobby plan: 12-function deployment limit

Initial attempt added `api/og/game/[gameId].js` as a new route — pushed
total Vercel functions to 16 and blocked the deploy. Resolution:
**replaced** the existing `api/recap/[gameId].js` (already a route, was
Edge runtime) with the new Satori implementation. Net function count
unchanged.

### Satori font validation

First deploy crashed with `Cannot read properties of undefined (reading
'272')` — caused by registering a variable-axis Inter Tight TTF with
five different weight slots all pointing at the same buffer. Resolution:
swap to **static per-weight TTFs** from fontsource CDN (Inter Tight
Medium / SemiBold / Bold + JetBrains Mono Medium / Bold). 58 KB each,
latin subset. Five files instead of two; total ~290 KB shipped to
`public/og/_fonts/`.

### Satori display-flex requirement

Second deploy crashed with `Expected <div> to have explicit "display:
flex", "display: contents", or "display: none" if it has more than one
child node`. Satori's HTML-to-SVG layer requires every `<div>` with >1
children to set explicit display. Resolution: the `h()` hyperscript
helper in `api/og/_layout.js` now **unconditionally injects `display:
flex` on every `<div>` that doesn't already specify a display**. Caller's
explicit display always wins. Bonus: makes the layout safer to edit
without remembering the constraint.

---

## Verify

```sh
# Real NBA game (regular season — no series record, no playoff series)
curl -sI "https://www.gibol.co/api/recap/401869400?v=og" | grep -E "x-game-status|x-card-variant|cache-control"
curl -s "https://www.gibol.co/api/recap/401869400?v=og" -o /tmp/og.png && file /tmp/og.png   # 1200×630 PNG
curl -s "https://www.gibol.co/api/recap/401869400?v=story" -o /tmp/story.png && file /tmp/story.png  # 1080×1920
curl -s "https://www.gibol.co/api/recap/401869400?v=square" -o /tmp/sq.png && file /tmp/sq.png  # 1080×1080

# Cache-by-state — finished game, expect post-cache header
curl -sI "https://www.gibol.co/api/recap/401869400?v=og" | grep -i cache-control
# Expected: public, s-maxage=300, stale-while-revalidate=86400
```

Deploys verified at: 2026-04-25 17:30 WIB (the v0.12.0 cut).

---

## Known limitations (parked for v0.12.1+)

- **Theme A part 2** — share buttons (`Bagikan ke IG Story` etc.) still
  point at the legacy static-image URL. v0.12.1 will wire them to the
  new endpoint and to `navigator.share({ files })` for the IG Story
  flow.
- **Per-entity OG** for non-NBA sports (EPL match, F1 race, Tennis match)
  is parked for v0.13+ per amendments §10.1 (NBA-only for v1).
- **Editorial verdict** in the white card stays empty until Theme D
  (`articles` table) ships in S2/S3.
- **Series record on `header.notes`** — appears for playoff games only.
  Regular-season games show "FINAL" without the second clause.

---

## Next ship

**v0.12.1 — Theme A part 2: share button wiring.** Day 5 of Sprint 1.
- `src/lib/share.js` — new helper `buildPerGameOgUrl(gameId, variant)`
- `src/components/DayScoreboard.jsx` + `LiveGameFocus.jsx` — Bagikan
  button passes per-game URL, fires native share with the 1080×1920 PNG
  blob via `navigator.share({ files: [...] })`
- `src/pages/Recap.jsx` — recap card OG meta points at the new endpoint

Targeted ship: 2026-04-26 EOD.
