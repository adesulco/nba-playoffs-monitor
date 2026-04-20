# Tennis UI spec

*Terminal-style Bloomberg-dense dashboard, matching the visual language already shipped for NBA and F1. This spec exists so whoever builds tennis doesn't relitigate font sizes, panel borders, or color roles — they're decided.*

## Visual system — reuse, do not reinvent

- **Palette:** `COLORS` constant in `src/lib/constants.js`. Tennis uses existing roles (bg, panel, text, muted, dim, line, lineSoft) plus two additions defined below.
- **Type:** Space Grotesk (headings + labels), JetBrains Mono (numbers, scores, timestamps), system sans for body.
- **Grid:** 12-column desktop, stacks to 1-column below 1024px.
- **Borders:** 1px solid `C.line` on primary panels, 1px solid `C.lineSoft` between rows.
- **Corner radius:** 3px on panels, 2px on chips, 0 on tables.
- **Spacing:** 8/12/14/16/20/24/32 px scale. Dense — no marketing-website air.

## Tennis color additions (add to COLORS)

```js
// Surface colors — map to existing tournaments
TENNIS_CLAY:   '#D2691E',   // terracotta, Roland Garros + Rome + Madrid (clay)
TENNIS_GRASS:  '#4A8F3C',   // grass green, Wimbledon
TENNIS_HARD:   '#1F6FB4',   // hard-court blue, AO + US Open + Masters hard
TENNIS_INDOOR: '#6B3FA0',   // indoor purple, ATP Finals + Paris Masters indoor

// Tier accents — how important a tournament is
TENNIS_SLAM_GOLD:    '#D4A13A',   // Grand Slam tier
TENNIS_MASTERS_SILV: '#9DA6AD',   // Masters/WTA 1000 tier
TENNIS_FINALS_RED:   '#C83030',   // Year-end finals tier

// Score state
TENNIS_LIVE:      '#D13D44',   // pulsing dot, live match indicator
TENNIS_SET_WIN:   C.text,       // set winner (existing text color)
TENNIS_SET_LOSS:  C.dim,        // set loser (existing dim)
TENNIS_TIEBREAK:  '#7E7E7E',    // tiebreak superscript
```

## Page: `/tennis` (hub)

The hub is the tennis front door. Goal: a fan lands here and within 2 seconds knows (1) is anything live right now, (2) which slam is next, (3) who's world #1.

### Layout — desktop (≥1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NAV (existing global nav with sport toggle)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  PAGE HEADER                                                              │
│    TENIS · GRAND SLAM & MASTERS    [EN/ID] [THEME] [SHARE]                │
│    Sub: "Empat slam, sembilan belas masters, semua dalam satu dashboard" │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌── LIVE NOW (only if any match in progress) ─────────────────────────┐ │
│  │  • MADRID OPEN · R2 · Stadium 3                                      │ │
│  │     Sinner 6⁷ 4 · Djokovic 5 6  →  match page                        │ │
│  │  • MADRID WTA · R2 · Manolo Santana                                   │ │
│  │     Sabalenka 6 3 1 · Swiatek 4 6 4  →  match page                   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌── NEXT GRAND SLAM ─────────┐  ┌── WORLD #1 ───────────────────────┐  │
│  │ ROLAND GARROS 2026          │  │ ATP   Jannik Sinner    13,350 pts │  │
│  │ Paris · Clay                │  │ WTA   Aryna Sabalenka  10,895 pts │  │
│  │ Mulai 24 Mei (34 hari)      │  │ Trend: ▲ 2 · ▼ 0 · = 3 vs last wk │  │
│  │ [Countdown timer]           │  │                                   │  │
│  │ "Catatan bracket kamu →"    │  │ [Lihat Rankings →]                │  │
│  └─────────────────────────────┘  └───────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│  TOURNAMENTS  (tier-grouped)                                              │
│    GRAND SLAM              [year nav: 2026 ▼]                             │
│      [AO Gold card]  [RG Gold card]  [Wim Gold card]  [USO Gold card]    │
│    MASTERS 1000 / WTA 1000                                                │
│      [IW]  [Miami]  [Monte-Carlo]  [Madrid LIVE]  [Rome]  [Canada]        │
│      [Cincy]  [Beijing]  [Wuhan]  [Shanghai]  [Paris M]                  │
│    YEAR-END FINALS                                                        │
│      [WTA Finals Riyadh]   [ATP Finals Turin]                             │
├──────────────────────────────────────────────────────────────────────────┤
│  INDONESIAN SPOTLIGHT (always visible)                                    │
│    Aldila Sutjiadi (WTA Dbl #42) · next match: Madrid R1 vs ... · Sel 14:00 │
│    Priska Madelyn Nugroho  · WTA Sgl #... · on break                     │
│    Christopher Rungkat     · ATP Dbl #...                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  3-column: RANKINGS MOVERS  |  RECENT RESULTS  |  TENNIS NEWS              │
│    top 5 ATP movers        last 10 matches    TennisNews component        │
│    top 5 WTA movers                           (same pattern as F1News)    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layout — mobile (<1024px)

Same content, stacked. LIVE NOW + NEXT SLAM + WORLD #1 always above the fold. Tournaments grid collapses to a horizontal scroll carousel per tier.

### Component breakdown

| Component | File | Notes |
|-----------|------|-------|
| PageHeader | `components/tennis/TennisHeader.jsx` | Bahasa subtitle defaults; EN toggle swaps subtitle |
| LiveNowBanner | `components/tennis/LiveMatchTicker.jsx` | Polls `useTennisScoreboard('atp')` + `('wta')`, shows only matches with status "In Progress" |
| NextSlamCountdown | `components/tennis/NextSlamCard.jsx` | Reads `tournaments.js`, picks next Grand Slam by date |
| World#1Panel | `components/tennis/WorldNumberOne.jsx` | `useTennisRankings('atp')[0]` + `('wta')[0]` |
| TournamentGrid | `components/tennis/TournamentGrid.jsx` | Calls `TournamentCard` for each tournament, groups by tier |
| TournamentCard | `components/tennis/TournamentCard.jsx` | Tier-accented border-top (gold/silver/red), surface chip, status dot (LIVE/DONE/UPCOMING) |
| IndonesianSpotlight | `components/tennis/IndonesianSpotlight.jsx` | Seed list of Indonesian players with live ESPN rank lookup |
| RankingsMovers | `components/tennis/RankingsMovers.jsx` | Filters `useTennisRankings` by `Math.abs(current - previous) >= 5` |
| RecentResults | `components/tennis/RecentResults.jsx` | Last 10 completed matches from scoreboard across ATP + WTA |
| TennisNews | `components/tennis/TennisNews.jsx` | Copy of `F1News.jsx`, swap endpoint to `/api/tennis-news` |

## Page: `/tennis/{slam-slug}-{year}` — Grand Slam dashboard

The signature tennis page. Mirror of `/formula-1-2026` but for tennis.

### Hero band

- Tournament name, year, location, surface chip, tier badge (Grand Slam)
- Start → end date in Bahasa: "24 Mei – 7 Juni 2026"
- Status: "14 hari lagi" / "DAY 3 of 14" / "SELESAI · Juara: Sinner"
- Winner photo + score line when complete; logo + countdown when pending

### Body tabs (horizontal tab nav, mobile: drawer)

1. **JADWAL** — daily schedule with WIB times. Filter by court. Filter by draw (M Singles / W Singles / M Doubles / W Doubles / Juniors).
2. **DRAW** — DrawViewer (SVG bracket). Separate toggle for ATP Singles / WTA Singles / Doubles. Each leaf links to `/tennis/{slam}/match/{id}`.
3. **LIVE** — real-time scoreboard across all live matches (only visible when tournament is in progress).
4. **JUARA** — past champions table. 20-year history, bahasa captions.
5. **STATS** — (Phase 2) per-player progression tracker, aces leaderboard, etc.

### Sidebar (right, desktop only)

- **NEWS column** (TennisNews, limit 8, filtered to current slam)
- **WATCHLIST** — your followed players currently playing in this slam
- **SHARE BUTTON** — ShareButton reused from F1, generates Bahasa text based on status

### Bahasa copy examples

Status: "SELESAI · Juara Sinner (3-1 vs Alcaraz)"
Countdown: "Mulai Jumat, 24 Mei · 14 hari lagi"
Draw label: "Undian — Tunggal Putra"
Match rowLabel: "R16 · Lap 4"
Schedule row: "14:00 WIB · Court Philippe-Chatrier"

## Page: `/tennis/{tournament}/match/{id}` — Match detail

One match. Bracket position, score line, per-set detail, player bios.

### Sections (top to bottom)

1. **MATCH HEADER**
   - Tournament name → tournament page (breadcrumb)
   - Round label ("R1" → "Semifinal")
   - Court, start time (WIB), surface chip
   - Status dot (LIVE pulsing red / FINAL / SCHEDULED) 

2. **SCORE PANEL**
   - Two player rows, large flags + names (shortName)
   - Per-set scores with tiebreak superscripts: `7⁷ 6 6`
   - Running total chip: "Set 3-0" or live "Set 2-1 · 4-3 *Sinner"
   - Match duration (if finished or live)

3. **PLAYER CARDS** (two, side by side)
   - Photo (ESPN CDN)
   - Rank, country flag, career high
   - Recent form (last 5 matches as W/L chips with opponent hover)
   - Head-to-head badge vs opponent
   - Link to `/tennis/player/{slug}`

4. **PATH TO FINAL** (if tournament is in progress)
   - Draw slice showing each player's past opponents in this tournament + next match if they win

5. **SHARE** — ShareButton wired with Bahasa text, og:image = Catatan Match PNG if final

6. **RELATED** — other matches same round, same court

### Mobile collapses

Sections 3–6 stack as accordions.

## Page: `/tennis/player/{slug}` — Player profile

Evergreen SEO page. Must look good whether the player is in a live tournament or off-season.

### Sections

1. **HERO**
   - Flag + full name + shortname
   - Tour badge (ATP / WTA)
   - Current rank + points + weekly trend arrow
   - Career high rank + date
   - Nationality + birth year + plays (right/left handed)

2. **RIGHT NOW** (conditional)
   - "🟢 LIVE · Round 2 vs Alcaraz · Set 2-1" → links to match page
   - OR "📅 Next: Madrid R2 · Selasa 22 Apr 14:00 WIB"
   - OR "📅 Not currently in a tournament"

3. **SEASON 2026**
   - W-L record, slam results so far, titles this year
   - Clay / Grass / Hard / Indoor mini-bar (Phase 2)

4. **RECENT FORM**
   - Last 10 match rows — tournament, opponent, round, score, W/L chip

5. **HEAD-TO-HEAD** (Phase 2, requires H2H computation)
   - Top 5 most-frequent opponents with record

6. **CAREER SLAM RESULTS**
   - 5-year grid: AO / RG / Wim / USO × year, cell = best round reached

7. **NEWS SIDEBAR** — TennisNews filtered to player name

### Mobile

All sections stack. Hero stays big (it's the share-worthy part).

### JSON-LD

Emit `Person` schema with `nationality`, `birthDate`, `memberOf`, `image`, career high as `award`.

## Page: `/tennis/rankings/{tour}` — Rankings

Dense, sortable table. This is utility, not theater.

### Layout

- Toggle ATP / WTA at top
- Table columns: Rank · Trend · Player · Country · Points · Points This Week · Next Tournament
- 100 rows minimum, expandable to 500
- Click row → player page

### Visual

Mono font for numbers. Trend arrow: ▲ green, ▼ red, − gray. Delta in points colored same. Indonesian players highlighted row (`background: C.panel + 10% tint`).

## Page: `/tennis/{masters-slug}-{year}` — Masters 1000 / WTA 1000

Lighter than a slam. Must ship fast.

### Sections

1. Hero — same as slam, tier badge = Masters 1000 in silver
2. Tabs: JADWAL · DRAW · JUARA
3. News sidebar
4. No per-player pages generated per Masters — all player links jump to shared `/tennis/player/{slug}`

Explicitly no: no live court ticker, no bracket stats, no Catatan Match for every round (only Final).

## Components — inventory checklist

When Claude Code kicks off Phase 1, these are the components to scaffold. In priority order:

1. `ScoreLine.jsx` — the atomic score display. Needed everywhere.
2. `MatchRow.jsx` — uses `ScoreLine`, renders a match in a list.
3. `SurfaceChip.jsx` — reused across pages.
4. `TournamentCard.jsx` — hub grid building block.
5. `RankingsTable.jsx` — hub + rankings page.
6. `DrawViewer.jsx` — the bracket SVG. Biggest piece of UI work. Test with AO 2026 128-draw.
7. `TennisHeader.jsx` — reused across tennis pages.
8. `PlayerCard.jsx` — reused in match + player pages.
9. `TennisNews.jsx` — lift from `F1News.jsx`.
10. `LiveMatchTicker.jsx` — hub + tournament pages.

## Interaction / motion

- Live-match dot: 1.5s pulse (opacity 1.0 → 0.4), reduced-motion fallback = static dot
- Tournament card hover: 1px border color shift to `C.text`, 120ms
- Rankings trend arrows: static, no animation
- Score updates: no flash animation. We poll at 15s cadence, state just swaps. Users who want live frenzy have TV.

## Accessibility

- All score tables have `<caption>` with Bahasa descriptor
- DrawViewer SVG has `<title>` + `<desc>` per match node
- Flag images have `alt={country}`
- Tab nav uses `role="tablist"`, arrow-key nav
- Live dot has `aria-label="Live sekarang"`
- Color contrast: all score text ≥ 4.5:1 on panel background

## What we're NOT doing visually

- **No bouncy/swoopy animations.** This is a Bloomberg terminal for tennis fans, not a brand website.
- **No hero video or big imagery.** Player portraits are small, inline. No giant player faces except on share cards.
- **No dark/light toggle retheming of tennis-specific palette.** Clay stays terracotta in both modes.
- **No carousels on desktop.** Desktop users scan grids; carousels hide information.

## Reference pages to study before building

When you open the new chat and start development, READ THESE FIRST so tennis feels native:

- `src/pages/F1.jsx` — closest spiritual sibling for structure
- `src/pages/F1Race.jsx` — pattern for per-entity deep page (like TennisMatch)
- `src/pages/F1Driver.jsx` — pattern for per-person deep page (like TennisPlayer)
- `src/components/F1News.jsx` — directly clone for TennisNews
- `src/components/ConstructorPicker.jsx` — pattern for PlayerFollow / watchlist
- `src/components/ShareButton.jsx` — already tennis-compatible, no changes needed

Tennis should feel like another room in the same house — not a new house.
