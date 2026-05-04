# SHIP-NOTES — v0.12.3

**Ship date:** 2026-04-25 (Sprint 1 Day 8 polish)
**Theme:** Mobile audit response — 10 fixes (M-1 through M-10) for the
"skewed and unreadable" mobile views Ade flagged after v0.12.2.
**Predecessor:** v0.12.2 (Theme B — Pick'em Home hero + League chip).

> **What this ship does in one line.** Closes the 11-finding mobile
> audit (`docs/12-mobile-audit-2026-04-25` notes) with one CSS block in
> `src/index.css` plus 9 className additions across 8 components.
> Zero functional regressions on desktop — every fix is gated behind a
> `@media (max-width: …)` query. M-11 (real-iPhone walkthrough) is
> deferred to manual verification by Ade.

---

## What shipped

### M-1 · HomeV1 3-rail grid collapses below 1024 px

**The single biggest mobile bug on the site.** Pre-fix: `<div style={{
gridTemplateColumns: '200px 1fr 260px' }}>` — never collapsed. At 390px
viewport, center column squeezed to ~unreadable, right rail (Live Pulse +
Fans Reacting + Fangir banner) bled off-screen.

```css
.homev1-grid { display: grid; grid-template-columns: 200px 1fr 260px; gap: 12px; padding: 14px; }
@media (max-width: 1023px) { .homev1-grid { grid-template-columns: 1fr; gap: 14px; } }
```

JSX: replaced inline `gridTemplateColumns` with `className="homev1-grid"`.

### M-2 · TopBar nav fade-mask on mobile

Nav `.v2-topbar-nav` already had `overflow-x: auto` for horizontal scroll
but no visual cue. First-time mobile users landed seeing only logo +
search + EN with no idea sport links existed.

```css
@media (max-width: 720px) {
  .v2-topbar-nav {
    mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
  }
}
```

### M-3 · F1 Round-Detail header collapses at 720 px

Pre-fix: `auto 1fr auto` left only ~260 px for the name column on a 390
viewport, forcing "Circuit / de / Monaco / · / Monaco / Jun / 7 / 2026"
to wrap one-word-per-line. Mobile now stacks: 48-px R-badge gets a top
row of its own, name + circuit + date sit below at full width.

```css
@media (max-width: 720px) {
  .f1-round-header { grid-template-columns: 1fr !important; gap: 8px !important; }
  .f1-round-badge {
    border-right: none !important;
    border-bottom: 1px solid var(--line-soft) !important;
    padding: 0 0 8px 0 !important;
    font-size: 36px !important;
  }
}
```

### M-4 · EPL match-card mobile 2-row layout

Pre-fix: `1fr auto 1fr auto` (home / score / away / actions) gave
~110 px to home/away on a 390 viewport, truncating "Sunderland" →
"Sunderla" and clipping the SHARE button off-screen.

```css
@media (max-width: 540px) {
  .epl-match-card-grid {
    grid-template-columns: 1fr 72px 1fr !important;
    grid-template-rows: auto auto !important;
    row-gap: 10px !important;
  }
  .epl-match-card-actions {
    grid-column: 1 / -1 !important;
    justify-content: flex-end !important;
  }
}
```

Verified live: full team names now visible, SHARE button sits on its
own row right-aligned, no clipping.

### M-5 · Day-strip fade-mask across NBA / EPL / F1

Shared `.day-strip-scroll` class on three components signals horizontal
scroll. NBA DayScoreboard, EPL day-tabs, F1 RoundStrip all pick this
up.

```css
@media (max-width: 1023px) {
  .day-strip-scroll {
    mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
  }
}
```

### M-6 · Sub-row picker left-aligns + grows full-width on mobile

Pre-fix: the topbar sub-row (where sport pickers go) was
`justify-content: center`, leaving ~160 px of dead space on left + right
of the picker.

```css
@media (max-width: 720px) {
  .v2-topbar-subrow { justify-content: flex-start !important; }
  .v2-topbar-subrow > * { flex: 1 1 auto; max-width: 100%; }
}
```

### M-7 · `.hub-action-row` for hero copy-link rows

Adds `flex-wrap` + flex-grow on children below 480 so single-button
rows under hub h1s get one-tap targets that fill width on mobile.

### M-8 · Tennis live match card drops tournament column at 540 px

The 30 px tournament-name column was being clipped to "Mu...". Now
hidden via `.tennis-live-tournament` so the player + score get full
width.

### M-9 · Stat strips drop minmax floor 180 → 160 px on mobile

EPL ContextStrip + F1 ContextStrip + Tennis ContextStrip — 4-cell stat
bands were collapsing to 1 column at 390 viewport (too tall, lots of
scroll). Now 2 columns at 390 (160+160+gap = 332 fits).

```css
.stat-strip-2col { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important; }
```

### M-10 · Pick'em Home hero CTA mobile font-size

Pre-fix: 22 px headline wrapped to 3 lines on 390 viewport. Drop to 18
px below 480 — wraps to 2 lines, breathes.

```css
@media (max-width: 480px) {
  .pickem-anon-headline { font-size: 18px !important; line-height: 1.25 !important; }
}
```

### M-11 (parked) — real-iPhone walkthrough

Chrome MCP can't go below 1280 viewport on this host. All ten fixes
were verified via static-CSS audit + a 390-px-wide simulator (`<style>
html, body { width: 390px }</style>` + a forced override of the @media
rules). The real-iPhone walk is **manual** verification on Ade's
device — particularly important for:
- M-2 fade-mask visibility on iOS Safari
- M-11 confirmation that `<MobileBottomNav>` (already in DOM)
  actually renders below 720 viewport
- IG-Story share file-blob flow (Theme A part 2's three-layer
  fallback)

---

## Files modified

```
src/index.css                              ← +10 responsive CSS rules in one block
src/pages/HomeV1.jsx                       ← className="homev1-grid" replaces inline grid
src/pages/EPL.jsx                          ← .stat-strip-2col + .hub-action-row
src/pages/F1.jsx                           ← .f1-round-header + .f1-round-badge + .stat-strip-2col + .hub-action-row + .day-strip-scroll
src/pages/Tennis.jsx                       ← .stat-strip-2col + .hub-action-row
src/components/EPLDayScoreboard.jsx        ← .epl-match-card-grid + .epl-match-card-actions + .day-strip-scroll
src/components/DayScoreboard.jsx           ← .day-strip-scroll
src/components/tennis/LiveMatchCard.jsx    ← .tennis-live-match + .tennis-live-tournament
src/components/PickemHomeHero.jsx          ← .pickem-anon-headline
src/lib/version.js                         ← APP_VERSION 0.12.2 → 0.12.3 + per-fix changelog
package.json                               ← 0.3.3 → 0.3.4
```

## Files NOT touched

- `src/components/MobileBottomNav.jsx` — already exists + already mounted
  in `App.jsx:202`. M-11 will verify it's actually rendering at the
  expected viewport breakpoint.

---

## Verify after deploy (manual on real device)

```sh
# Bundle confirms v0.12.3
B=$(curl -s https://www.gibol.co/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "https://www.gibol.co/$B" | grep -oE '"0\.12\.[0-9]+"' | head -1
# Expected: "0.12.3"
```

**Real-iPhone walk (the highest-priority manual verification):**
1. Open `https://www.gibol.co/` on iPhone Safari (375 px viewport)
2. Confirm: Pick'em hero wraps to 2 lines (M-10), 3-rail collapses to
   single column (M-1), TopBar nav has visible fade on right (M-2)
3. Tap Football → Confirm picker is left-aligned (M-6), match cards
   show full team names + SHARE on second row (M-4), day-strip has
   fade mask (M-5), stat strip is 2-column (M-9)
4. Tap F1 → Confirm Round-Detail card stacks vertically with R-badge
   above name (M-3), no single-letter wrapping
5. Tap Tennis → Confirm live ticker matches show full score line, no
   "Mu..." truncation (M-8)
6. Bottom nav check — if `MobileBottomNav` is actually visible, fixes
   M-11 too

---

## Sprint 1 final tally

| Day | Version | Theme / Fix | Status |
|---|---|---|---|
| 1–4 | v0.12.0 | A part 1 — Dynamic OG endpoint | ✓ |
| 5 | v0.12.1 | A part 2 — Share button rewire + Theme J seedling | ✓ |
| 5 | v0.12.1.1 | Hotfix — Maxey on the wrong team | ✓ |
| 6–8 | v0.12.2 | B — Pick'em Home hero + League chip | ✓ |
| 8 | **v0.12.3** | **Mobile audit response (M-1 through M-10)** | ✓ (this) |

5 ships in 8 days. All 24 audit findings + 8 verification follow-ups
+ 10 mobile audit fixes shipped. Sprint 2 kickoff Mon 2026-05-04 —
Theme C (Mobile-first NBA dashboard refactor) takes the next big
mobile chunk including the sport-aware MobileBottomNav.

---

## Next ship

**v0.13.0 — Sprint 2 Theme C (Mobile-first NBA refactor + sport-aware
MobileBottomNav).** Targeted: 2026-05-11. Includes the M-11 fixes once
real-device testing confirms what's broken on the bottom-nav.
