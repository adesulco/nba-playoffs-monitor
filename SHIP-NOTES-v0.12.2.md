# SHIP-NOTES — v0.12.2

**Ship date:** 2026-04-25 (Sprint 1, Day 8 — closes Sprint 1)
**Theme:** B — Pick'em Home hero + persistent League chip
**Predecessor:** v0.12.1.1 (Moment-of-the-Day hotfix)

> **What this ship does in one line.** Adds personalized bracket state
> to Home for logged-in users (hero above the sport grid showing
> bracket score, league rank, and quick-action button) and a persistent
> League chip in the V2 TopBar's actions row. Logged-out users see a
> CTA banner that names the BI differentiator and routes to the magic-
> link sign-in flow.

---

## What shipped

### 1. `useUserBracketSummary` hook

```js
const { status, user, bracket, primaryLeague, rank, totalMembers } = useUserBracketSummary();
//   status: 'anon' | 'loading' | 'no-bracket' | 'no-league' | 'ready' | 'error'
```

Single-fetch hook outside the AuthProvider context tree (per the
existing AuthContext design that gates Supabase auth subscription to
Pick'em pages only). Reads the auth session ONCE on mount via
`supabase.auth.getSession()` — localStorage-backed, no live channel.

**Cost guards:**
- Anon visitors fire **0 Supabase queries**. Hook short-circuits at
  `status: 'anon'`.
- Logged-in users fire **3 round-trips** bundled via `Promise.all`:
  bracket (most-recent), league memberships (first joined), league
  members for rank computation. Total wall ~80–120 ms from Mumbai.

### 2. `PickemHomeHero` component (`src/components/PickemHomeHero.jsx`)

Renders ABOVE the sport grid on `HomeV1`. Three branches by status:

| Status | Render |
|---|---|
| `anon` | "Pick'em playoff sama temen lo. Bahasa Indonesia. Live score." + `Masuk dengan email →` button → `/login?next=/bracket/new` + secondary `Cara kerjanya →` link |
| `no-bracket` | "Bracket lo belum jadi. Yuk mulai sekarang." + `Bikin bracket →` button → `/bracket/new` |
| `ready` / `no-league` / `error` | 3-column desktop / 1-line mobile: **Score** · **League** (with rank) · **Action** (open bracket). Each cell links to the relevant page. |

Renders nothing during `loading` to keep first paint clean (typical
visitor is anon, ~5 ms localStorage read).

### 3. `LeagueChip` component (`src/components/LeagueChip.jsx`)

Persistent chip in the V2 TopBar actions row (between search pill and
lang toggle). Shows `RT Family · #47/183` style label + green dot.
Click expands a 240-px popover with:

- League name (full)
- 2-stat row: Rank (with "of N members") + Score (with bracket name)
- Two CTAs: `Open leaderboard` (primary, blue) + `Your bracket` (secondary)

**Visibility rules:**
- Hidden for `status !== 'ready'` — anon, no-bracket, no-league all
  skip render entirely (the PickemHomeHero handles those affordances)
- Hidden on viewports `< 768 px` via inline media query — the actions
  row is already tight on mobile; PickemHomeHero on Home covers
  logged-in mobile users
- Click-outside + Escape both close the popover

### 4. Mount points

```
src/pages/HomeV1.jsx               ← <PickemHomeHero /> above the 3-rail sport grid
src/components/v2/TopBar.jsx       ← <LeagueChip /> in actions row, between search + lang toggle
```

---

## Files added

```
src/hooks/useUserBracketSummary.js     ← single-fetch hook with 0-cost anon path
src/components/PickemHomeHero.jsx      ← branched hero (anon / no-bracket / ready)
src/components/LeagueChip.jsx          ← TopBar chip + 240px popover
SHIP-NOTES-v0.12.2.md
```

## Files modified

```
src/pages/HomeV1.jsx                   ← +import + <PickemHomeHero />
src/components/v2/TopBar.jsx           ← +import + <LeagueChip />
src/lib/version.js                     ← APP_VERSION 0.12.1.1 → 0.12.2 + changelog
package.json                           ← 0.3.2 → 0.3.3
```

## Files NOT touched

- `src/lib/AuthContext.jsx` — kept as-is per its existing design (auth
  subscription scoped to Pick'em pages, not app-wide)
- Supabase schema — no migrations; uses existing `brackets`,
  `league_members`, `leagues` tables
- `src/lib/i18n.js` — copy is inline in the components (Bahasa + English
  literal strings) since the new keys would be 12+ entries and most are
  one-off CTAs. Future consolidation to i18n is a v0.13.x cleanup.

---

## Verify after deploy

```sh
# Anon Home — CTA hero present, league chip hidden
curl -s https://www.gibol.co/ | grep -o "Pick'em playoff\|Bracket pick'em with your friends" | head -1
# Expected: "Bracket pick'em with your friends" (default EN per F.2 stayed-default)
```

**Anon flow (logged out, viewport ≥ 768 px):**
- CTA hero renders above sport grid: "Bracket pick'em with your
  friends. In Bahasa. Live scores."
- `Sign in with email →` button routes to `/login?next=/bracket/new`
- `How it works →` secondary link routes to `/about#pickem`
- League chip is **NOT** present in the TopBar actions row

**Logged-in flow (with bracket + league, viewport ≥ 768 px):**
- 3-column hero on HomeV1: Score · League · Action
- Each cell is a Link to the relevant page
- League chip in TopBar shows `{league name (16 chars)} · #{rank}/{total}`
- Click chip → 240-px popover with rank + score + 2 CTAs
- Click outside or Escape closes popover

**Mobile (< 768 px):**
- League chip hidden
- PickemHomeHero collapses to single-column layout (sub-text dimmed)

Verified live at: 2026-04-25 (anon path confirmed via Chrome MCP).
Logged-in path requires a real account — manual test parked for
Sprint 1 retro Day 9.

---

## Sprint 1 closed — three ships delivered

| Day | Version | Theme | Status |
|---|---|---|---|
| 1–4 | v0.12.0 | A part 1 — Dynamic OG endpoint | ✓ |
| 5 | v0.12.1 | A part 2 — Share button wiring + Theme J seedling | ✓ |
| 5 | v0.12.1.1 | Hotfix — Moment-of-the-Day attribution bug | ✓ |
| 6–8 | v0.12.2 | B — Pick'em Home hero + League chip | ✓ (this) |
| 9–10 | — | Buffer / retro / Sprint 2 prep | next |

**Theme F.2 — DROPPED at kickoff** per amendments §10.3 (Ade's call:
English default stays, BI as opt-in via toggle).

**Cumulative net change vs the v0.11.28 baseline:**
- New endpoint: `/api/recap/:gameId` — Satori + ESPN, 3 variants, cache-by-state
- New route: `/nba-playoff-2026/game/:gameId` — per-game canonical share target
- New components: `PickemHomeHero`, `LeagueChip`, `CopyLinkButton` (carried from audit)
- New hook: `useUserBracketSummary`
- Three-layer IG-Story share fallback in `ShareButton`
- All NBA share buttons rewired to per-game canonical URLs
- Moment-of-the-Day headlines no longer mis-attribute loss-side performances

---

## Known limitations parked for Sprint 2+

| Item | Sprint | Notes |
|---|---|---|
| **Per-game route prerender** | S4 (Theme J full) | WhatsApp unfurl bots see SPA shell HTML on `/nba-playoff-2026/game/:gameId`; SPA users get correct meta via Helmet. Needs `scripts/prerender.mjs` extension. |
| **F1 / EPL / Tennis per-event canonical URLs** | S4 (Theme J full) | NBA-only seedling shipped today. |
| **Editorial verdict in OG card** | S2/S3 (Theme D) | White card text in OG card stays empty until `articles` table ships. |
| **Mobile bottom-bar Pick'em tab** | S2 (Theme C) | Mobile NBA refactor adds sport-aware bottom nav; Pick'em integration is a follow-up. |
| **Real iPhone walkthrough** | Day 9–10 buffer | League chip + Pick'em hero need a real-device pass before Sprint 2 kickoff. |
| **i18n consolidation** | v0.13.x | Inline BI/EN strings in PickemHomeHero + LeagueChip → `lib/i18n.js` keys. |

---

## Next ship

**v0.12.3 (optional Day 9 polish) or Sprint 2 v0.13.0 — Theme C
(Mobile-first NBA dashboard + sport-aware MobileBottomNav).** Sprint 2
kickoff Mon 2026-05-04.
