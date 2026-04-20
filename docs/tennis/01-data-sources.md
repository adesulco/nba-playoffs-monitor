# Tennis data sources

*All endpoints below were verified live on 2026-04-20. Expect drift — re-verify before you start Phase 1.*

## Primary source: ESPN undocumented tennis API

All endpoints are free, no auth, no key. Pattern matches the NBA endpoints already wired through `/api/proxy` in the Gibol codebase.

### Base host
```
https://site.api.espn.com/apis/site/v2/sports/tennis/{tour}/{resource}
```
Where `{tour}` is `atp` or `wta`.

### Endpoints verified working

| Purpose | Path | Notes |
|---------|------|-------|
| **Live scoreboard (today)** | `/tennis/atp/scoreboard` and `/tennis/wta/scoreboard` | Returns the CURRENT tournament as one event. `event.groupings[]` splits by draw type (Men's Singles, Women's Singles, Men's Doubles, Women's Doubles). Each grouping has `competitions[]` which are the actual matches. |
| **Scoreboard for a specific date** | `/tennis/atp/scoreboard?dates=YYYYMMDD` | Same shape as above, for any date. Use this to query historical slam data (e.g. `dates=20260126` = AO 2026 men's final). |
| **Rankings — ATP singles** | `/tennis/atp/rankings` | `rankings[0].ranks[]` with `current`, `previous`, `points`, `trend`, `athlete{displayName, shortname, id, links[]}`. Covers top ~500. |
| **Rankings — WTA singles** | `/tennis/wta/rankings` | Same shape. |
| **News articles** | `/tennis/atp/news` | Returns `articles[]` with `headline`, `description`, `published`, `byline`, `images[]`, `links.web.href`. Useful for English news sidebar. |
| **Tournaments list** | `/tennis/atp/tournaments` | Unreliable — only returns 8 tournaments in my probe; use scoreboard queries by date instead. |

### Data shape per match (inside `event.groupings[].competitions[]`)

```
{
  id: "176715",                 // ESPN competition ID — our match primary key
  date: "2026-04-20T08:00Z",    // ISO, UTC
  status: {
    period: 1,                  // current set number
    type: {
      description: "In Progress" | "Scheduled" | "Final" | "Retired" | "Walkover",
      completed: bool,
      detail: "Mon, April 20th at 4:00 AM EDT",
      shortDetail: "4/20 - 4:00 AM EDT"
    }
  },
  venue: { fullName: "Madrid, Spain", court: "Stadium 3" },
  format: { regulation: { periods: 5 } },   // 3 for best-of-3, 5 for best-of-5 slams
  competitors: [
    {
      id: "13871",
      order: 1,                 // 1 = home, 2 = away (arbitrary at neutral venues)
      homeAway: "home",
      athlete: {
        id: "13871",
        displayName: "Rei Sakamoto",
        shortName: "R. Sakamoto",
        flag: { href: "...jpn.png", alt: "Japan" }
      },
      linescores: [            // per-set scores
        { value: 7.0, tiebreak: 8, winner: true },
        { value: 4.0, winner: false },
        { value: 7.0, winner: true }
      ],
      winner: true              // only present when match is final
    },
    // ... second competitor
  ]
}
```

### Grand Slam event IDs

ESPN events are keyed as `{tournamentId}-{year}`.

| Slam | Tournament ID | Full event ID pattern |
|------|---------------|-----------------------|
| Australian Open | `154` | `154-2026` |
| Roland Garros | `172` | `172-2026` |
| Wimbledon | `188` | `188-2026` |
| US Open | `189` | `189-2026` |

### Masters 1000 + WTA 1000 event IDs (to be verified per season)

ESPN assigns new IDs each season — don't hard-code. Instead, resolve at build time by querying `/tennis/{tour}/scoreboard?dates=YYYYMMDD` with the known start date of each tournament and grabbing the returned event ID. Cache the mapping in `src/lib/sports/tennis/tournaments.js` and update at the start of each tennis season (Jan + at the Asian swing).

Start-date reference for 2026 (verify against ATPTour.com before committing):

| Tournament | Start date | Tour |
|------------|-----------|------|
| Indian Wells | 2026-03-05 | ATP M1000 + WTA 1000 |
| Miami Open | 2026-03-18 | ATP M1000 + WTA 1000 |
| Monte Carlo | 2026-04-12 | ATP M1000 |
| Madrid Open | 2026-04-20 | ATP M1000 + WTA 1000 |
| Italian Open | 2026-05-06 | ATP M1000 + WTA 1000 |
| Canadian Open | 2026-08-03 | ATP M1000 + WTA 1000 |
| Cincinnati | 2026-08-10 | ATP M1000 + WTA 1000 |
| China Open Beijing | 2026-09-24 | WTA 1000 |
| Wuhan Open | 2026-10-05 | WTA 1000 |
| Shanghai Masters | 2026-10-04 | ATP M1000 |
| Paris Masters | 2026-10-27 | ATP M1000 |
| WTA Finals Riyadh | 2026-11-01 | Year-end |
| ATP Finals Turin | 2026-11-08 | Year-end |

## What ESPN does NOT provide

These are missing from the free ESPN tennis API. Any feature that depends on them needs a different source.

| Missing | Impact | Fallback |
|---------|--------|----------|
| Match summary endpoint (`/summary?event=...`) | No per-match breakdown page data from ESPN | Build match page entirely from scoreboard competition record — it has enough. |
| Point-by-point / rally log | No live point score (15-30-40-deuce) mid-match | Scrape Grand Slam official site (Phase 3 only, show courts only). See below. |
| Service / return stats (aces, 1st serve %) | No mid-match stat bar | Scrape Grand Slam site (Phase 3). Accept "not available" during Masters. |
| Head-to-head | No direct h2h endpoint | Compute from historical scoreboard queries. Cache per player-pair. |
| Player profile bio (hand, height, turned pro, birth) | No rich player page content from ESPN | Seed `src/lib/sports/tennis/player-seed.json` with top 200 from Wikipedia/ATPTour scrape (static, offline, one-time). Keep current rank + form from ESPN. |
| Prize money | No prize breakdown per match | Hard-code per tournament from ATPTour announcement at build time (updated once per tournament). |

## Phase 3 scrape: Grand Slam official sites

Only activated during an actual Grand Slam, for the 2-3 primary show courts. Per project rule #6:

- **Respect robots.txt.** Re-check at the start of each slam — terms change.
- **Rate-limit per court:** one poll per 5 seconds per court, max 3 courts in parallel. Total outbound = ~36 requests/min during a slam session.
- **Cache aggressively:** edge cache 5s on live match data, 60s on match-list data.
- **Fail gracefully:** if the scrape returns anything we don't recognize, fall back to ESPN set-score data on the same page.

Each slam runs its own stack — our scraper abstraction must support all four.

| Slam | Live scoreboard endpoint (as of 2026, internal JSON) |
|------|------------------------------------------------------|
| Australian Open | `ausopen.com/api/scoring-server/...` — verify at AO 2027 (Jan) |
| Roland Garros | `rolandgarros.com/en-us/api/v1/scoreboard/...` — verify pre-RG 2026 |
| Wimbledon | `wimbledon.com/en_GB/scores/...` — internal JSON under `/scores/` |
| US Open | `usopen.org/en_US/scores/...` — similar pattern |

**Do NOT hard-code these paths in Phase 1.** They shift between slams. Verify via browser dev-tools the week before each tournament, log the real URLs in `src/lib/sports/tennis/scrapers/{slam}.js` with a dated comment, and wrap behind a feature flag so a broken scraper never takes down the dashboard.

**Pursue official partnerships in parallel.** A partnership with Tennis Australia, FFT, AELTC, or USTA beats scraping forever — but we ship on scrape now, negotiate after we have traffic.

## Indonesian / Bahasa news sources

Same pattern as F1 news (`api/f1-news.js`). Create `api/tennis-news.js` on the same regex-RSS model.

### Bahasa (verify each before Phase 2 — detik subdomain instability is a known issue, see v0.2.7/0.2.8)
- **detikSport** — `https://sport.detik.com/rss` — broad, filter with keyword regex
- **CNN Indonesia** — `https://www.cnnindonesia.com/olahraga/rss` — broad, filter
- **Antara** — `https://www.antaranews.com/rss/olahraga.xml` — broad, filter
- **Kompas Olahraga** — try `https://olahraga.kompas.com/rss` (was dead for F1, probe again for tennis)

Keyword regex for tennis filter (tight, word-boundary, player-name-based like F1):
```
\b(tenis|grand slam|wimbledon|roland garros|australian open|us open|atp|wta|
  sinner|alcaraz|sabalenka|swiatek|djokovic|medvedev|rublev|tsitsipas|zverev|
  gauff|rybakina|pegula|keys|aldila|priska|christopher rungkat)\b
```
Maintain the 2026 player whitelist in the regex. Bare "atp"/"wta" safe because they're not common non-tennis terms in Indonesian.

### English
- **ATPTour.com official feed** — `https://www.atptour.com/en/media/rss-feed/xml-feed` (verify UA handling)
- **Tennis.com** — `https://www.tennis.com/feed/`
- **BBC Sport tennis** — `https://feeds.bbci.co.uk/sport/tennis/rss.xml`
- **Reuters tennis** — `https://www.reutersagency.com/feed/?best-topics=tennis` or subscribe to dedicated tennis RSS

**Do NOT include Formula1-style CloudFront-blocked sources.** Test every source from a Vercel deployment before committing — the v0.2.10 F1.com lesson applies here too.

## Rankings endpoint detail

ESPN ranking response shape (verified):

```
{
  rankings: [
    {
      id: "1",
      name: "ATP",
      type: "atp",
      ranks: [
        {
          current: 1,
          previous: 1,
          points: 13350.0,
          trend: "-",           // "up" | "down" | "-"
          athlete: {
            id: "3623",
            firstName: "Jannik",
            lastName: "Sinner",
            displayName: "Jannik Sinner",
            shortname: "J. Sinner",
            links: [...]
          }
        },
        // ... ~500 players
      ]
    }
  ]
}
```

Points delta vs `previous` rank is a share-worthy datapoint in Bahasa ("Sinner naik 340 poin minggu ini"). Build a weekly ranking-move ticker at `/tennis/rankings/movers`.

## Caching strategy (follow Gibol's established pattern)

All tennis ESPN traffic goes through `/api/proxy` — already exists, already edge-cached. Set per-endpoint TTLs:

| Data | s-maxage | stale-while-revalidate | Rationale |
|------|----------|------------------------|-----------|
| Live scoreboard (a match is in progress) | 15 | 60 | Tennis matches move slower than basketball; 15s feels live enough. |
| Non-live scoreboard (between sessions) | 300 | 900 | 5 min is plenty. |
| Rankings | 21600 | 43200 | Rankings refresh Mondays only; 6h is safe. |
| Tournament history / champions | 86400 | 172800 | Changes once per slam. |
| News feed | 900 | 1800 | Match F1 news pattern. |

## Rate limit posture

ESPN's scoreboard hasn't rate-limited Gibol under NBA load — we should be fine. But set a belt-and-suspenders:

- One proxied fetch per endpoint per 15s max, enforced by edge cache.
- No direct browser → ESPN calls; always via `/api/proxy/espn/...`.
- If ESPN ever 429s, fall back to cached data and log — don't retry in tight loop.

## Data source doc maintenance

This file is the tennis data contract. Update it whenever an endpoint shape changes, a source dies (v0.2.7 F1-news pattern), or a new slam's internal API is discovered. Do not let it go stale — it's the single thing a future Claude needs to start or repair tennis work.
