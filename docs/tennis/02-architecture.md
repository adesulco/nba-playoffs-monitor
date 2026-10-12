# Tennis architecture

*How tennis plugs into Gibol's existing Vite + Vercel stack. Nothing here introduces new infrastructure — tennis reuses every pattern NBA and F1 already ship.*

## Core principle: tennis is an adapter, nothing more

Gibol's sport adapter pattern (established by F1) encapsulates a sport's data fetchers, hooks, page components, and prerender entrypoints inside `src/lib/sports/{sport}/` and `src/pages/{sport}/`. A new sport should not touch `api/proxy.js`, `src/lib/AppContext.jsx`, the home layout engine, the prerender runner, or the sitemap generator — except to register itself.

## File layout

All paths relative to repo root. Nothing here is new infrastructure; everything mirrors F1.

```
api/
  tennis-news.js                    # bilingual RSS aggregator (copy of f1-news.js pattern)
  # proxy.js — NOT modified; tennis uses the existing provider=espn route

src/
  lib/
    sports/
      tennis/
        index.js                    # adapter registry entrypoint
        constants.js                # colors, terminology, tour metadata
        glossary.js                 # Bahasa ↔ English tennis vocabulary
        tournaments.js              # 2026 tournament registry (ID, slug, dates, tier, surface)
        player-seed.json            # static top-200 player bios (one-time scrape from Wikipedia)
        scrapers/                   # Phase 3 only — per-slam point-by-point
          australian-open.js        # deferred to AO 2027
          roland-garros.js          # deferred to Phase 3
          wimbledon.js              # deferred to Phase 3
          us-open.js                # deferred to Phase 3
    hooks/
      useTennisScoreboard.js        # live today scoreboard, polling
      useTennisScoreboardDate.js    # arbitrary-date scoreboard (bracket backfill)
      useTennisRankings.js          # ATP + WTA rankings
      useTennisNews.js              # bilingual news (copy useF1News pattern)
      useTennisPlayer.js            # single player aggregate (bio + rank + form)
      useTennisTournament.js        # tournament page data
  pages/
    Tennis.jsx                      # /tennis — hub (all 22 tournaments visible)
    TennisTournament.jsx            # /tennis/{slug}-{year}
    TennisMatch.jsx                 # /tennis/{slug}-{year}/match/{matchId}
    TennisPlayer.jsx                # /tennis/player/{slug}
    TennisRankings.jsx              # /tennis/rankings/{tour}  (atp|wta)
  components/
    tennis/
      TennisHub.jsx                 # hub grid of tournament cards
      TournamentCard.jsx            # tier-colored card (slam = gold, masters = silver)
      DrawViewer.jsx                # bracket SVG
      ScoreLine.jsx                 # set-by-set score with tiebreak superscripts
      MatchRow.jsx                  # one match in a list (players + score + status)
      LiveMatchTicker.jsx           # "LIVE · 3 matches" banner
      RankingsTable.jsx             # ATP/WTA table with trend arrows
      PlayerCard.jsx                # Follow button (localStorage), career high
      H2HBadge.jsx                  # "Sinner leads 4-2" pill on match pages
      SurfaceChip.jsx               # Clay/Grass/Hard/Indoor colored chip
      IndonesianSpotlight.jsx       # panel highlighting Indonesian players' live matches
      TennisNews.jsx                # bilingual news sidebar (copy F1News.jsx)

scripts/
  generate-tennis-recap.mjs         # static PNG generator (copy generate-f1-recap.mjs)
  prerender.mjs                     # MODIFIED: register tennis routes in the generic list
  tennis-backfill-players.mjs       # one-off: fetch top-200 ranking + link ESPN IDs to slugs

public/
  og/
    tennis/
      2026-AO-champion.png          # generated per slam
      2026-RG-M-SF-sinner-alcaraz-og.png   # per match (og/story/square variants)
      ...

docs/
  tennis/
    00-brief.md
    01-data-sources.md
    02-architecture.md              # this file
    03-ui-spec.md
    04-kickoff-prompt.md
```

## Registering the adapter

In `src/lib/sports/index.js` (the sport registry created in v0.2.0 multi-sport milestone), append:

```js
import { tennis } from './tennis/index.js';

export const sports = {
  // ...existing nba, f1, epl, liga1, fifa...
  tennis,
};
```

The adapter's `index.js` exports:

```js
export const tennis = {
  id: 'tennis',
  labelId: 'Tenis',
  labelEn: 'Tennis',
  tagline: { id: 'Grand Slam, Masters 1000, live scores', en: 'Grand Slams, Masters 1000, live scores' },
  status: 'live' | 'coming-soon',     // toggle per phase
  homeCard: {...},                     // props for the Home card
  routes: [
    { path: '/tennis',                              component: () => import('../../../pages/Tennis.jsx') },
    { path: '/tennis/:tournamentSlug',              component: () => import('../../../pages/TennisTournament.jsx') },
    { path: '/tennis/:tournamentSlug/match/:matchId', component: () => import('../../../pages/TennisMatch.jsx') },
    { path: '/tennis/player/:playerSlug',           component: () => import('../../../pages/TennisPlayer.jsx') },
    { path: '/tennis/rankings/:tour',               component: () => import('../../../pages/TennisRankings.jsx') },
  ],
  prerender: () => import('./prerender-manifest.js'),
  featureFlag: 'TENNIS_LIVE',
};
```

## Feature flag

Use the existing feature-flag infrastructure (`src/lib/flags.js`, added in v0.2.0). Flag name: `TENNIS_LIVE`. Default `false`. Flip to `true` Phase 1 ship cutoff (May 10).

Phase 2 gets a sub-flag `TENNIS_LIVE_SCRAPE` (default `false`) so the Phase 3 point-by-point scrape can ship dark and be flipped mid-slam without a deploy.

## URL scheme

Flat, year-explicit, sport-prefixed. Same pattern as F1.

```
/tennis                               → hub (2 tiers of tournaments + rankings + news)
/tennis/rankings/atp                  → ATP rankings top 100
/tennis/rankings/wta                  → WTA rankings top 100
/tennis/australian-open-2026          → Grand Slam page (completed, archive mode)
/tennis/roland-garros-2026            → Grand Slam page
/tennis/madrid-2026                   → Masters 1000 page (light)
/tennis/atp-finals-2026               → Year-end finals
/tennis/australian-open-2026/match/404120   → individual match page
/tennis/player/jannik-sinner          → player profile
/tennis/player/aldila-sutjiadi        → Indonesian player profile
```

All tournament slugs live in `src/lib/sports/tennis/tournaments.js`. Slug is canonical; tournament ID is the ESPN lookup key.

### Why this shape

- Year in the URL (`-2026`) prevents link rot — `roland-garros-2026` always means that year's tournament.
- Match ID uses ESPN's competition ID verbatim (no re-slugging) so our routes map to the source of truth.
- Player slug is `{first-name}-{last-name}` lowercased and dash-separated — derived deterministically from ESPN's `displayName`. Conflicts resolved in `tournaments.js` with a manual override table.

## JSON-LD schema per page

| Route | Schema type |
|-------|-------------|
| `/tennis/{tournament}` | `SportsEvent` with `subEvent[]` of individual `SportsEvent`s per round. Each includes `location`, `startDate`, `endDate`, `organizer`. |
| `/tennis/{tournament}/match/{id}` | Nested `SportsEvent` with `competitor[]` of two `Person`s, `superEvent` pointing at the tournament event. |
| `/tennis/player/{slug}` | `Person` with `nationality`, `birthDate`, `memberOf` (ATP or WTA), `hasOccupation`, `image`, `url`. Optionally `award[]` for slam wins. |
| `/tennis/rankings/{tour}` | `ItemList` of `ListItem` pointing at player profiles. |

Use the existing JSON-LD emitter pattern from F1 (the `jsonLd` prop on `ComingSoon` and per-page inline scripts — see `src/components/SEOContent.jsx` and `src/pages/F1.jsx` for the pattern).

## Prerender integration

The generic prerender runner (landed in v0.2.0) iterates all registered sports. Tennis adds to it by exporting a manifest:

```js
// src/lib/sports/tennis/prerender-manifest.js
export default async function tennisManifest() {
  const tournaments = await import('./tournaments.js');
  const players = await fetchTop200Players();  // cached ranking snapshot
  return [
    '/tennis',
    '/tennis/rankings/atp',
    '/tennis/rankings/wta',
    ...tournaments.all.map(t => `/tennis/${t.slug}-${t.year}`),
    ...players.map(p => `/tennis/player/${p.slug}`),
  ];
}
```

Expected URL count for v1:
- 1 hub + 2 rankings + 22 tournaments = 25 tournament-level URLs
- 200 player URLs (top 100 ATP + top 100 WTA, minus overlaps)
- ~220 per-match URLs per Grand Slam (singles main draw only) × 4 slams = 880 match URLs

Total: ~1,100 tennis URLs after all 4 slams. Prerender budget fits on Hobby plan; F1 already ships ~96 routes without issue.

**Do not prerender non-Grand-Slam match pages** (Masters matches are too many and too short-lived). Render them client-side with a fallback 404 link if the match ID isn't currently live.

## Hooks shape (example)

```js
// useTennisScoreboard.js — pattern-matches useNBAScoreboard and useF1Standings
import { useEffect, useState } from 'react';
import { fetchViaProxy } from '../lib/proxy.js';

export function useTennisScoreboard(tour = 'atp', date = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const dateParam = date ? `?dates=${date}` : '';
    const poll = async () => {
      try {
        const r = await fetchViaProxy(`espn/apis/site/v2/sports/tennis/${tour}/scoreboard${dateParam}`);
        if (!alive) return;
        setData(r);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    poll();
    const iv = setInterval(poll, 15000);    // 15s live; respect edge cache
    return () => { alive = false; clearInterval(iv); };
  }, [tour, date]);

  return { data, loading, error };
}
```

All hooks follow this skeleton. Don't invent new patterns.

## Share cards — "Catatan Match"

Same generator pattern as `scripts/generate-f1-recap.mjs`. One script: `scripts/generate-tennis-recap.mjs`.

Per completed match, generate 3 PNG variants:
- `og` (1200 × 630) — WhatsApp/Twitter preview
- `story` (1080 × 1920) — Instagram Story
- `square` (1080 × 1080) — Instagram feed

Output path: `public/og/tennis/2026-{slam}-{round}-{winner}-{loser}-{variant}.png`

Content: winner photo (ESPN CDN), final score line with tiebreak superscripts, tournament + round, Bahasa hook quote ("Sinner ke Final RG 2026"), gibol.co wordmark.

Fonts: reuse `scripts/fonts/` — Bebas Neue + Space Grotesk base64-embedded, same as F1. No network calls at generate time.

Wire `og:image` on match pages via `react-helmet-async`, same as F1 race pages.

## Sitemap + llms.txt updates

Append to `public/sitemap.xml`:
- 22 tournament URLs at priority 0.8 (slams 0.9, masters 0.7)
- 200 player URLs at priority 0.6
- 2 ranking URLs at priority 0.7
- `/tennis` hub at priority 0.9

Append to `public/llms.txt`:
- Tennis section under `## Live dashboards` with tournament count, tier structure, feature summary
- Key facts block like the F1 one — 4 slams + 20 masters, data sources (ESPN), share cards, news pipeline

## Home page card

Add a 6th `SportCard` to `src/pages/Home.jsx` for tennis. Status logic:
- "AKTIF" when a tournament is currently running (Madrid, RG, etc.)
- "COMING SOON · Roland Garros Mei 24" otherwise
- Click target `/tennis`

## Error boundary

Wrap all tennis pages in `<SportErrorBoundary sport="tennis">` (already exists, landed in v0.2.0). If ESPN goes down or rankings endpoint 500s, the tennis subtree fails independently without taking down NBA, F1, or the home page.

## Non-goals for the architecture

- **Do not introduce a new state manager.** AppContext is enough. Tennis context state (selected player watchlist) follows the F1 ConstructorPicker pattern — localStorage + useState.
- **Do not add a DB table.** All tennis data is read-through. Pick'em for tennis is a later sprint that will use the existing Supabase `series` / `picks` tables with `series.sport='tennis'`.
- **Do not add new Node dependencies.** Regex-RSS for news (no xml2js), native fetch, sharp already in devDeps for PNG generator.
- **Do not add tailwind.** CSS-in-JS with `COLORS`, same as everywhere else.
- **Do not edge-runtime any tennis functions.** Node runtime only; matches the pattern after the @vercel/og Edge-bundler pain from v0.2.x.

## Testing checklist (before each phase ship)

- [ ] `curl https://www.gibol.co/api/proxy/espn/apis/site/v2/sports/tennis/atp/scoreboard` returns 200 with events
- [ ] `curl https://www.gibol.co/tennis/australian-open-2026` returns 200 with prerendered HTML (view-source for JSON-LD)
- [ ] `curl -s https://www.gibol.co/sitemap.xml | grep tennis | wc -l` returns expected count
- [ ] Rankings table renders without layout shift (Core Web Vitals — Gibol is on Hobby plan, every LCP ms counts)
- [ ] Bahasa glossary applied consistently (bracket = undian, bye = bye, seed = unggulan)
- [ ] Home card renders new status correctly
- [ ] SportErrorBoundary catches a forced 500 from `useTennisScoreboard` without taking down the page
