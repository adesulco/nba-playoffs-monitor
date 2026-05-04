# HANDOVER — v0.13.0 Indonesian Super League Phase 1A

**Date:** 2026-04-26
**Author:** Cowork agent, handing off to Claude Code on Ade's Mac
**Branch:** `main` (uncommitted on the Mac local copy at the time of this writeup)
**Predecessor:** v0.12.5 (shipped 2026-04-25 — home audit response)
**Goal of this ship:** Bring the Indonesian Super League (the league formerly known as BRI Liga 1) live on gibol.co at parity with the EPL Phase 1A pattern, in the smallest viable cut. Ship within the same week.

---

## TL;DR for the next agent

Every file required to make `gibol.co/super-league-2025-26` go live with real ESPN data is **already written and on disk**. They have not been committed or pushed yet. Your job is to:

1. Run `npm run build` locally on the Mac, catch any compile errors I couldn't catch in the Cowork sandbox.
2. Visually QA at `localhost:5173/super-league-2025-26` and `/super-league-2025-26/club/persib`.
3. Decide which uncommitted-since-v0.6.9 files belong in this ship vs. earlier ones (the working tree is 138 modified files deep).
4. Commit, push via `gibol-ship`, smoke-test prod.

If the build is green and the data renders, you can ship in under 30 minutes. **Persib vs Borneo are tied at 66 points with games to play — there is a real title race happening right now and we want to be live for it.**

---

## 1. State of work

### What's done (on disk, not committed)

| Layer | File | Purpose |
|---|---|---|
| Sport registry | `src/lib/sports/liga-1-id/clubs.js` | NEW. 18 clubs source of truth: ESPN id, slug, name, nameId, city, stadium, founded, accent, X handle, Bahasa bio. Mirrors EPL `clubs.js` shape. |
| Adapter | `src/lib/sports/liga-1-id/adapter.js` | REWRITTEN. `status: 'soon' → 'live'`. Route `/super-league-2025-26`. Emits 19 prerender routes (1 hub + 18 clubs) with full SEO meta + JSON-LD. |
| Hooks | `src/hooks/useSuperLeagueStandings.js` | NEW. Clones `useEPLStandings` against `soccer/idn.1`. SWR-cached, 60s refresh. |
| Hooks | `src/hooks/useSuperLeagueFixtures.js` | NEW. Clones `useEPLFixtures` against `soccer/idn.1`. ±7-day window. |
| Hooks | `src/hooks/useSuperLeagueTeam.js` | NEW. Per-club fetch (team meta + schedule). Used by SuperLeagueClub.jsx. |
| Components | `src/components/SuperLeagueClubPicker.jsx` | NEW. 18-club picker, mirrors `EPLClubPicker`. |
| Components | `src/components/SuperLeagueDayScoreboard.jsx` | NEW. Lean day-swipe scoreboard. No Polymarket integration — drop-in replacement of EPLDayScoreboard for IDN context. |
| Pages | `src/pages/SuperLeague.jsx` | NEW. Hub at `/super-league-2025-26`. Hero + toolbar + day scoreboard + 18-club standings table + zone legend + SEO body. |
| Pages | `src/pages/SuperLeagueClub.jsx` | NEW. Per-club page. Hero, season record card, form pills, upcoming/recent fixtures, About, Key Accounts. Includes Breadcrumbs + PeerNav (linter-added — keep). |
| SEO | `src/components/SEOContent.jsx` | EDITED. Added `super-league` sport pack with full Bahasa + English content (intro, sections, FAQ). |
| Flags | `src/lib/flags.js` | EDITED. `LIGA_1_ID` default → `true`. Comment updated. |
| Routing | `src/App.jsx` | EDITED. Added `/super-league-2025-26` and `/super-league-2025-26/club/:slug` routes. Old `/liga-1-2026` route still mapped to LigaIndonesia ComingSoon as fallback (defense in depth — vercel.json should redirect first). |
| Routing | `vercel.json` | EDITED. Added `redirects` block: 308 from `/liga-1-2026` → `/super-league-2025-26` (also the `/:path*` form for any deep links). |
| Home | `src/pages/Home.jsx` | EDITED. Restored Liga 1 card to the DASHBOARDS array as LIVE (was removed in v0.5.1). Title: "Indonesian Super League 2025-26" / "Super League Indonesia 2025-26". |

### What's NOT done (deferred to v0.13.x)

- **Top scorer / Golden Boot leaderboard.** ESPN's `idn.1` does not expose per-player scoring stats (verified). Needs API-Football Pro at $19/mo to power. Defer until you decide it's worth the cost.
- **Persija ↔ Persib "El Clasico Indonesia" derby page.** A dedicated `/super-league-2025-26/derby/persija-persib` page with H2H history, last meeting, next meeting countdown, ticket info — this is potentially our biggest organic SEO magnet. v0.13.1 candidate.
- **Polymarket title odds.** No IDN markets exist. Skipped entirely.
- **News feed (Bola.com / detikSport syndication).** No Bahasa football news API wired yet. Could clone the EPL news ticker pattern if you find a feed.
- **Hub OG image at `/og/hub-superleague.png`.** The adapter references this path but no PNG exists yet. Not blocking — it falls back to `/og-image.png`. Generate via `scripts/generate-hub-og.mjs` when you have time.

---

## 2. Decisions log

These are the choices I made; flag any you disagree with and we can rework.

1. **League name + branding: "Super League"**, not "Liga 1" or "BRI Liga 1". Rationale: ESPN officially names the league "Indonesian Super League" for 2025-26, that's the new commercial branding. Old names kept as `alternateName` in JSON-LD and as keywords in SEO meta so search traffic still lands.

2. **Route is `/super-league-2025-26`**, not the legacy `/liga-1-2026`. Rationale: matches the season-pattern of every other sport (`/premier-league-2025-26`, `/formula-1-2026`, `/tennis`). Old route `/liga-1-2026` is 308-redirected in `vercel.json` so any prior crawl still resolves.

3. **Adapter ID stays `liga_1_id`**, not `super_league_id`. Rationale: flags.js, sports/index.js, Home.jsx, the prior `LigaIndonesia.jsx` ComingSoon page, `routes.json`, and the old prerender output all reference `liga_1_id`. Renaming would balloon the diff for zero user-visible benefit.

4. **Data source: ESPN `soccer/idn.1`** via the existing `/api/proxy/espn` and `/api/proxy/espn-v2` proxies. **No new env vars, no new API key, no new $19/mo subscription.** Verified live 2026-04-26: standings + scoreboard + per-team schedule all return clean data with the same shape as `eng.1`. The only thing ESPN doesn't expose is per-player scoring (so no Golden Boot in this ship).

5. **18 clubs, not 17 or 19.** ESPN's `/teams` endpoint returns exactly 18, matching the official PSSI 2025-26 league composition: Persija, Persib, Persebaya, Arema FC, Bali United, Borneo, Dewa United, Madura United, Malut United, PSBS Biak, PSIM Yogyakarta, PSM Makassar, Persijap, Persik Kediri, Persis Solo, Persita Tangerang, Semen Padang, Bhayangkara Surabaya. `clubs.js` is in this exact order alphabetized.

6. **Slug shape: nickname-first when fans search by it.** `persib` not `persib-bandung`, `persija` not `persija-jakarta`. But `bali-united` (no nickname), `madura-united` (no nickname), `psm-makassar` (city-name disambiguation). Slugs are stable across seasons — when a club is relegated, its entry leaves `clubs.js` but the slug never gets reused.

7. **No FangirBanner on the Super League page.** FangirBanner is hardcoded for IBL (basketball) Trading Cards. Wrong product on a football page. If/when Fangir adds a football product, drop the banner back in.

8. **Lean SuperLeagueDayScoreboard, not a clone of EPLDayScoreboard.** EPL's component is 922 lines because of Polymarket per-match odds. We don't have IDN odds, so a 270-line minimal version is the right cut.

9. **Bahasa register: casual but data-respectful.** "Macan Kemayoran", "gue/lo", "el classico indonesia" in body copy and bios. Tables stay formal (POIN, M, S, K). Matches the existing EPL/F1/Tennis voice on the site.

10. **`status: 'live'` in the adapter from day one of this ship.** No "feature flag dark launch" — once committed and deployed, the dashboard is on. Mitigation: if ESPN downgrades or breaks, set `VITE_FLAG_LIGA_1_ID=0` in Vercel env to hide from Home (route still works direct).

---

## 3. Data source — ESPN `soccer/idn.1`

### Endpoints in use

| Hook | URL | Purpose |
|---|---|---|
| `useSuperLeagueStandings` | `/api/proxy/espn-v2/soccer/idn.1/standings?season=2025` | League table |
| `useSuperLeagueFixtures` | `/api/proxy/espn/soccer/idn.1/scoreboard?dates=YYYYMMDD-YYYYMMDD` | Day window of fixtures + results |
| `useSuperLeagueTeam` | `/api/proxy/espn/soccer/idn.1/teams/{espnId}` | Per-club meta |
| `useSuperLeagueTeam` | `/api/proxy/espn/soccer/idn.1/teams/{espnId}/schedule` | Per-club fixtures + results |

### Sample standings response (verified 2026-04-26)

```
#1 Persib            66 pts  (20-6-3)
#2 Borneo FC         66 pts  (21-3-5)
#3 Persija           59 pts  (18-5-6)
#4 Bhayangkara       47 pts  (14-5-10)
#5 Malut United      46 pts  (13-7-9)
... etc, 18 entries
```

Stats names returned by ESPN: `gamesPlayed`, `wins`, `ties`, `losses`, `pointsFor` (goals for), `pointsAgainst` (goals against), `pointDifferential`, `points`, `rank`. Same shape as `eng.1`, so the EPL hook's stat-resolver code worked verbatim.

### Sample scoreboard response (recent matches)

```
2026-04-20 FT  Semen Padang 0–2 Persijap
2026-04-20 FT  Dewa United 2–2 Persib
2026-04-22 FT  Persis Solo 2–1 Bhayangkara Surabaya
2026-04-22 FT  PSIM Yogyakarta 1–1 Persija
2026-04-23 FT  Persita Tangerang 0–1 Bali United
```

### What ESPN does NOT expose for `idn.1`

- Per-player stats (no top scorer leaderboard).
- Match commentary, lineups, in-match events. Box score data is goal totals only.
- Historical seasons before 2024-25 (the 2025-26 season is queryable via `?season=2025`).

If you ever need any of the above, the path forward is API-Football (`api-football.com`) Pro plan at $19/mo. They cover Liga 1 Indonesia comprehensively. Wire it up as a sibling proxy in `api/proxy.js` (whitelist key `apifootball` mapping to `https://v3.football.api-sports.io`) and pass the API key via env `APIFOOTBALL_KEY`.

---

## 4. File-by-file map

### NEW · `src/lib/sports/liga-1-id/clubs.js`

The 18-club registry. Each entry has `slug`, `espnId`, `name`, `nameId`, `city`, `founded`, `stadium`, `accent`, `handle` (X/Twitter, no `@`), `bio` (Bahasa one-paragraph). Exports `CLUBS`, `CLUBS_BY_SLUG`, `CLUBS_BY_ESPN_ID`, `CLUBS_BY_NAME`, plus `SEASON`, `SEASON_START`, `SEASON_END`, `LEAGUE_NAME`, `LEAGUE_NAME_FULL`, `LEAGUE_NAME_ID`. Also a `formatFixtureDate(iso, lang)` helper that converts UTC to WIB (UTC+7) — same logic as the EPL helper.

### REWRITTEN · `src/lib/sports/liga-1-id/adapter.js`

Was a 50-line stub flagged `status: 'soon'` waiting on API-Football. Now mirrors the EPL adapter: `status: 'live'`, full `prerenderRoutes()` returning 19 entries (1 hub + 18 clubs), each with title/description/keywords/jsonLd. Emits a `SportsEvent` JSON-LD for the league and a `SportsTeam` schema for each club. The `id` field stays `liga_1_id` so existing flag references don't break; `name`, `nameId`, and `routeBase` are updated to Super League branding.

### NEW · `src/hooks/useSuperLeagueStandings.js`

Near-clone of `useEPLStandings`. Differences: cache key `superleague-standings` (independent from EPL cache); fallback club accent `#E2231A` (Persija red); URL `soccer/idn.1`. Same SWR pattern, same 60s polling, same stat-name resolution.

### NEW · `src/hooks/useSuperLeagueFixtures.js`

Near-clone of `useEPLFixtures`. Same ±7-day window, same `bucketByDay` semantics, same return shape (`upcoming`, `recent`). Cache key `superleague-fixtures-{back}-{fwd}`.

### NEW · `src/hooks/useSuperLeagueTeam.js`

Mirrors `useEPLTeam` exactly, swapping `eng.1` → `idn.1` and the lazy import path to `liga-1-id/clubs.js`. Returns `{ info, fixtures, loading, error }`.

### NEW · `src/components/SuperLeagueClubPicker.jsx`

Drop-in clone of `EPLClubPicker` retargeted to Super League's 18 clubs. Listbox header reads "18 KLUB · 2025-26".

### NEW · `src/components/SuperLeagueDayScoreboard.jsx`

A leaner scoreboard. Day tabs (-7 to +7, 15 total), buckets fixtures by WIB calendar day, one card per match showing home/score/away, status (LIVE/FT/upcoming time), and a ShareButton. No Polymarket per-match chips. About 270 lines.

### NEW · `src/pages/SuperLeague.jsx`

The hub. Sections in order: SEO + JSON-LD → Hero → Toolbar (club picker, lang toggle, share) → Spotlight strip when a club is picked → Day scoreboard → Standings table (18 rows, form pills, zone legend) → SEOContent block (sport='super-league'). Uses `useQueryParamSync('club')` so share URLs like `?club=persib` restore the picked-club state. Wired to `useApp().toggleLang` for the lang toggle button (NOT `setLang` — that doesn't exist on the context).

### NEW · `src/pages/SuperLeagueClub.jsx`

The per-club page. Sections: Breadcrumbs → Hero (with club accent gradient + zone chip) → Season record card (rank, points, M-S-K, GD) → Form pills (last 5) → Upcoming fixtures (next 5) → Recent results (last 5) → Tentang (`club.bio`) → Key Accounts (club X handle + league + Bola.com + detikSport) → optional ESPN error banner. PeerNav appended by the linter — leave it; it gives prev/next nav between clubs alphabetically.

### EDITED · `src/components/SEOContent.jsx`

Added `superLeagueIdContent` and `superLeagueEnContent` content blocks (intro + 6 sections + 8 FAQs each), then registered them in the `CONTENT` map under key `super-league`. The hub page passes `sport="super-league"` to render them.

### EDITED · `src/lib/flags.js`

One-line change: `liga_1_id: envFlag('VITE_FLAG_LIGA_1_ID', false)` → `... true`. Comment updated to "v0.13.0 ships live (Phase 1A)". Vercel env var `VITE_FLAG_LIGA_1_ID=0` will still hide the dashboard if you need a kill-switch.

### EDITED · `src/App.jsx`

Two new lazy imports: `SuperLeague` and `SuperLeagueClub`. Two new `<Route>` entries inserted just above the legacy `/liga-1-2026` route. The old route stays as a fallback in case the vercel redirect ever misses.

### EDITED · `src/pages/Home.jsx`

The v0.5.1 comment block in the DASHBOARDS array (which removed the Liga 1 card) is replaced with a new card entry: id `liga_1_id`, status `live`, accent `#E2231A`, icon `id`, href `/super-league-2025-26`. Title and blurbs are bilingual.

### EDITED · `vercel.json`

New `redirects` array added between `rewrites` and `headers`:

```json
"redirects": [
  { "source": "/liga-1-2026", "destination": "/super-league-2025-26", "permanent": true },
  { "source": "/liga-1-2026/:path*", "destination": "/super-league-2025-26/:path*", "permanent": true }
]
```

`permanent: true` = HTTP 308 (preserves method, signals canonical move to crawlers).

---

## 5. Verification checklist

Run these BEFORE you commit, in this order. Each should pass cleanly.

### 5.1 Local build

```bash
cd ~/Documents/Claude/Projects/Gibol/nba-playoffs-monitor
npm run build 2>&1 | tail -50
```

Expect: build success, prerender step emits 19 new HTML files under `dist/super-league-2025-26/`. If `npm run build` fails, the most likely causes are:

- An import path I got slightly wrong. Read the error, find the offending file, fix the import.
- A linter modification I didn't account for. Read the diff for the modified file.
- A missing component I assumed exists (Breadcrumbs, PeerNav, SEO, ContactBar, ShareButton, SEOContent). All were verified to exist on disk; if any errors, the most likely cause is a prop signature mismatch.

### 5.2 Local dev server smoke

```bash
npm run dev
```

Open in browser:

- `localhost:5173/` — Home grid should show 6 LIVE cards: NBA, F1, Premier League, Tennis, Super League Indonesia, FIFA WC (the last one stays "COMING SOON"). Super League card uses red accent `#E2231A`.
- `localhost:5173/super-league-2025-26` — Hero, club picker, day scoreboard with real fixtures (today is 2026-04-26 so the recent-matches list should include the 4-23 results), 18-row standings table with Persib at #1.
- `localhost:5173/super-league-2025-26/club/persib` — Hero with Persib blue gradient, season record card (66 pts, rank 1, +XX GD), form pills, upcoming/recent fixtures lists, Tentang block, Key Accounts row.
- `localhost:5173/super-league-2025-26/club/persija` — Same shape, red accent, currently 3rd.
- `localhost:5173/liga-1-2026` — Should still render via the LigaIndonesia ComingSoon route locally (Vercel redirect only fires in prod).

### 5.3 Static analysis

The Cowork sandbox already verified:

- 19 prerender routes emitted from the adapter (1 hub + 18 clubs).
- All 30+ imports across the new files resolve to real on-disk modules.
- ESPN `idn.1` standings + scoreboard endpoints return clean data with the expected shape.

You don't need to re-run those checks — but if you add new files, you do.

### 5.4 Post-deploy curl checks

After `gibol-ship` finishes:

```bash
curl -sI https://www.gibol.co/super-league-2025-26 | head -5
curl -sI https://www.gibol.co/super-league-2025-26/club/persib | head -5
curl -sI https://www.gibol.co/super-league-2025-26/club/persija | head -5
curl -sI https://www.gibol.co/liga-1-2026 | head -5
```

Expected:

- First three: `HTTP/2 200` with `content-type: text/html`.
- Last one: `HTTP/2 308` with `location: /super-league-2025-26` (or 301 — both fine).

### 5.5 SEO sanity

```bash
curl -s https://www.gibol.co/super-league-2025-26 | grep -E "<title>|<meta name=\"description\"|application/ld\+json" | head -5
```

Expected: title contains "Super League Indonesia 2025-26", description mentions "klasemen", at least one `application/ld+json` script tag.

---

## 6. Build + ship commands

If everything in §5.1–§5.2 passes, ship:

```bash
cd ~/Documents/Claude/Projects/Gibol/nba-playoffs-monitor
git add src/lib/sports/liga-1-id src/hooks/useSuperLeague*.js src/components/SuperLeague*.jsx src/pages/SuperLeague*.jsx src/components/SEOContent.jsx src/pages/Home.jsx src/App.jsx src/lib/flags.js vercel.json
git status
git commit -m "v0.13.0 — Indonesian Super League Phase 1A: hub + 18 per-club pages, ESPN idn.1 data"
gibol-ship
```

Notes:

- The repo working tree has 138 modified files relative to commit `98717d8` (v0.6.9). Don't blindly `git add -A` — that pulls in `dist 2/` and `dist.old-*/` cruft (memory: gibol_dist_finder_duplicates). Stage only the Super League surface.
- `gibol-ship` will only bump `version.js` and push (memory: gibol_ship_function_behavior). The actual feature commit must happen first; the line above does that.
- If a previous uncommitted batch of work belongs in a separate ship, decide commit ordering before running the staged add.

---

## 7. Known issues + watch-fors

### 7.1 The `info` variable in SuperLeagueClub.jsx is unused

`useSuperLeagueTeam` returns `info` (team meta with logo URL etc.) but the page currently doesn't render it. Linter shouldn't complain (it's destructured and just not used downstream), but if you want, either drop it from destructure or render the ESPN logo on the hero.

### 7.2 Hub OG image is missing

`src/lib/sports/liga-1-id/adapter.js` references `${SITE}/og/hub-superleague.png`. That file doesn't exist. Currently falls back to `/og-image.png` so social embeds still work — just generic. Generate a proper one:

```bash
node scripts/generate-hub-og.mjs --sport=super-league
```

(The script may need a small extension to add a `super-league` template — check `scripts/generate-hub-og.mjs` to confirm. Not blocking.)

### 7.3 ESPN downtime affects both EPL and Super League

Both leagues now share the same upstream. If ESPN goes down, both dashboards will show the SWR cache or empty states. Existing EPL hooks already retry; Super League hooks inherit the same behavior. Acceptable risk.

### 7.4 PSSI rules for relegation in 2025-26 — confirm

I assumed the 18-club format with: 17–18 direct relegation, 16 plays a play-off. This is what PSSI's most recent published rules say but **double-check against the latest PT LIB regulations** before claiming it in the FAQ. If the format changed (e.g. only 2 teams relegated, no play-off), update both:

- `src/components/SEOContent.jsx` — search "relegation" / "degradasi" in the super-league pack.
- `src/pages/SuperLeague.jsx` — `zoneFor()` function.
- `src/pages/SuperLeagueClub.jsx` — same `zone` calc near top.

### 7.5 League name in hero — ESPN strips "FC" / "Bandung"

ESPN returns `Persib` (not `Persib Bandung`), `Persija` (not `Persija Jakarta`). I matched ESPN's `name` field but added `nameId` for the long form. UI shows `name` in standings (compact) but uses `nameId` on the per-club hero subtitle. If you want long form everywhere, swap `r.clubName` → `(CLUBS_BY_SLUG[r.slug]?.nameId || r.clubName)` in the standings table.

### 7.6 X handles — verified, but not all of them are very active

Some clubs have minimal X presence (PSIM, Persijap especially). The handles I included are the official ones per public profiles. If a handle is dead or wrong, just edit `clubs.js` — no other file references handles.

### 7.7 Linter additions to SuperLeagueClub.jsx

A linter / agent post-ran on `SuperLeagueClub.jsx` and added `Breadcrumbs` + `PeerNav` imports and the corresponding render blocks. Both components exist in `src/components/`. Keep the additions — they improve UX (breadcrumb back to hub, prev/next nav between clubs).

---

## 8. Deferred work — v0.13.x roadmap

In rough priority order:

### 8.1 Persija ↔ Persib derby page (v0.13.1, biggest SEO win)

`/super-league-2025-26/derby/persija-persib` with H2H history, last 10 meetings, next meeting countdown, total goals, biggest wins, ticketing info if available. Keyword target: "el clasico indonesia" (low-comp, high-intent searches in Bahasa). This is the single biggest organic-search opportunity in this league.

### 8.2 Hub OG image (v0.13.1, quick win)

Generate `/og/hub-superleague.png` so social shares of `/super-league-2025-26` show a proper Bahasa hero, not the generic gibol OG.

### 8.3 Top scorer / Golden Boot leaderboard (v0.13.2 if you pay for API-Football)

Wire API-Football as a third-party proxy:
- Add `apifootball` upstream in `api/proxy.js`
- Add `APIFOOTBALL_KEY` to Vercel env
- New hook `useSuperLeagueScorers` mirroring `useEPLScorers`
- New section on the hub between standings and SEOContent

Cost: $19/mo. Verify it's worth that vs. derby page traffic potential.

### 8.4 East Java derby page (v0.13.2)

`/super-league-2025-26/derby/persebaya-arema` and/or `/super-league-2025-26/derby/persebaya-madura-united`. Lower priority than the Persija-Persib one but high passion among regional fans.

### 8.5 Match-day recap PNG generator (v0.13.3)

Mirror the NBA recap card pattern: `/api/recap/super-league/{matchId}` → 1080×1920 IG Story PNG. Probably wait until you have a stable cadence of viral-worthy results to justify.

### 8.6 Bahasa news ticker (v0.13.3+)

If we can wire a Bola.com or detikSport feed (RSS or scrape with Bahasa regex extract), bring back a news ticker similar to `useEPLNews`. No public API exists today for either source.

### 8.7 Fangir crossover product

If/when Fangir adds a Liga 1 / Super League trading-card product, drop a `<FangirBanner pack="super-league" />` onto the hub page (will require updating FangirBanner to actually accept a pack prop). Top-of-funnel from gibol.co → fangir.com is the long-term commercial play.

---

## 9. Open questions to confirm with Ade

1. **OK to ship the legacy `/liga-1-2026` redirect as 308 (permanent)?** A 308 tells crawlers the URL has moved permanently, dropping the old URL from indexes within ~weeks. If you'd rather keep `/liga-1-2026` indexable for a few months as a hedge, change `permanent: true` → `permanent: false` (302) in `vercel.json`.

2. **Bilingual or Bahasa-only?** All other sports have an EN toggle. Super League has it too. If you'd rather force Bahasa-only on this dashboard (it IS the Indonesian league), remove the toggle button from the toolbar and have `lang` always = `'id'`. Smaller footprint, less translation maintenance.

3. **Which uncommitted changes belong in the v0.13.0 commit vs. earlier ships?** The Mac local repo has 138 modified files relative to commit `98717d8`. Some of those are post-v0.6.9 work that should logically be earlier ships (v0.7.x – v0.12.5 are all in SHIP-NOTES files but not committed). Decide commit ordering before running the staged `git add` command in §6.

---

## 10. Quick-reference: paths and numbers

- Live URL when shipped: https://www.gibol.co/super-league-2025-26
- Per-club URL pattern: https://www.gibol.co/super-league-2025-26/club/{slug}
- Legacy redirect source: https://www.gibol.co/liga-1-2026
- Total prerendered pages added: 19 (1 hub + 18 clubs)
- Total clubs in registry: 18
- ESPN league code: `idn.1`
- Adapter ID (kept stable for legacy): `liga_1_id`
- League accent: `#E2231A` (Persija red — most recognizable color in the league)
- Estimated lines added to repo: ~2,400 across 8 new files + edits to 6 existing files
- Estimated build size impact: ~25 KB gzipped (lazy-loaded chunk)

---

## 11. If something goes sideways post-ship

| Symptom | Likely cause | Fix |
|---|---|---|
| `/super-league-2025-26` returns 404 | `npx vercel --prod --yes` ran without `npm run build` first; prerender step skipped | Re-run `gibol-ship` from a clean working tree, or push a no-op commit to trigger Vercel auto-build |
| Standings load empty | ESPN's `/standings?season=2025` flipped its response shape | Inspect raw response; the hook tries `children[0].standings.entries` AND `standings.entries` — if neither, log the keys and update the resolver |
| Day scoreboard shows wrong day | WIB conversion off-by-7-hours from a server-side render | Verify `bucketByDay` adds `+ 7 * 3600 * 1000` before extracting the calendar date |
| 308 redirect from `/liga-1-2026` not firing | `redirects` block missing or syntactically wrong in `vercel.json` | Validate JSON; check Vercel build logs for redirects parse errors; redeploy |
| Liga 1 card hidden from Home | env override `VITE_FLAG_LIGA_1_ID_VISIBLE=0` set in Vercel | Remove or set to 1 in Vercel env → redeploy |
| Lighthouse complains about `og:image` | Missing hub-superleague.png | Generate via `scripts/generate-hub-og.mjs` (see §8.2) |

---

That's everything. The cut is intentionally minimal — hub + per-club, real ESPN data, no waiting on a paid API. Ship it, see how the SEO compounds, layer in derby pages and Golden Boot in the next two ships if traffic justifies the effort.

Good luck. Persib vs Borneo at 66 each — a real title race to be live for.
