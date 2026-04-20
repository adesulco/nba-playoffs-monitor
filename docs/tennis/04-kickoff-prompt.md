# Tennis Phase 1 — Kickoff Prompt

*Paste this into a fresh Claude Code or Cowork chat when you're ready to start tennis development. It's self-contained: no prior conversation needed.*

---

## Prompt — copy everything below this line

You are picking up Gibol tennis Phase 1 development. Gibol is the Bahasa Indonesia-first multi-sport media platform at `www.gibol.co` (Vite + React 18 SPA on Vercel, Supabase backend). The repo baseline is v0.4.0 (EPL Phase 1A shipped 2026-04-20; NBA + F1 + EPL all LIVE). Read `CLAUDE.md` at the repo root and `docs/01-architecture.md` before writing any code — they define the stack and operating principles that override any default behavior.

### Read these four specs first, in order

Before you write a single line of tennis code, read all four. They are the tennis contract — every decision below is derived from them:

1. `docs/tennis/00-brief.md` — why tennis, scope (Grand Slams + Masters 1000 + Finals), fan features by phase, ship calendar, success criteria, brand voice.
2. `docs/tennis/01-data-sources.md` — ESPN undocumented tennis API (verified live 2026-04-20), rankings shape, match shape, Grand Slam event IDs, Bahasa + English news sources, caching, rate limits.
3. `docs/tennis/02-architecture.md` — adapter pattern, file layout under `src/lib/sports/tennis/`, URL scheme, feature flags, prerender manifest shape, JSON-LD schemas, non-goals.
4. `docs/tennis/03-ui-spec.md` — complete page + component specs for `/tennis` hub, slam dashboard, match detail, player profile, rankings, Masters page. ASCII layouts, COLORS additions, build-order priority list.

If anything in those docs conflicts with what you think is right: the docs win. They're the result of a planning pass with Ade on 2026-04-20. If you genuinely think a doc is wrong, stop and ask before diverging.

### Phase 1 ship scope — what lands in this ship

Target: **tennis hub stub live by 2026-05-10**, ahead of Roland Garros (May 24 – Jun 7) which is the real Phase 2 launch.

What must be live at end of Phase 1:

- **`/tennis` hub page** — live-matches strip (from `/tennis/{atp,wta}/scoreboard`), current tournament cards, ATP + WTA top-10 rankings preview, countdown to Roland Garros, Bahasa tournament glossary link, Indonesian-player spotlight (Aldila, Priska, Rungkat if ranked).
- **`/tennis/australian-open-2026`** archive page — read-only, final draw with champions, past matches queried via `dates=20260126` etc. Validates the slam-dashboard template against real data we already know the answer to.
- **`/tennis/roland-garros-2026`** countdown stub — tournament hero with accurate start date, "DRAW KELUAR SEGERA", past champions list, link to AO archive.
- **`/tennis/rankings/atp`** and **`/tennis/rankings/wta`** — top 100 each with points, previous rank, points delta, trend arrow. Weekly Monday refresh. This is the highest-leverage SEO page in the whole Phase 1 drop.
- **Home card (`/`)** — new Tennis card slotted into the existing 5-card grid. "LIVE" if a slam or Masters is running, otherwise "COUNTDOWN" showing days to next major.
- **Feature flag `TENNIS_LIVE`** gating the whole nav entry. Default on in Phase 1 but we want the kill-switch wired from day one.
- **Sitemap + `llms.txt`** updated with tennis URLs. Sitemap adds `/tennis` at priority 0.9, 4 slam archive URLs + 10 Masters URLs at 0.7, rankings URLs at 0.8, player URLs at 0.6. Budget: ~250 new URLs for Phase 1, well under the 1,100-URL post-slam estimate.

What is explicitly OUT of Phase 1 (deferred to Phase 2 at RG):

- Head-to-head, recent form, surface win%, Catatan Match share PNGs, bilingual news column, watchlist, draw path preview — all Phase 2 per `00-brief.md`.
- Live point-by-point scrape — Phase 3, Wimbledon only, behind `TENNIS_LIVE_SCRAPE` sub-flag.

### Build order — follow this sequence, do not freestyle

Phase 1 breaks into five sub-phases. Complete each before starting the next. Each ends in a visible checkpoint you can smoke-test.

**1. Foundation — no UI yet.** Create the tennis adapter and the scaffolding the rest of Phase 1 depends on. No user-visible route.

- `src/lib/sports/tennis/constants.js` — tour enum, surfaces, tournament tiers.
- `src/lib/sports/tennis/glossary.js` — Bahasa term map (draw → undian, seed → unggulan, tiebreak → tiebreak, walkover → walkover, bye → bye, set → set, break point → break point, service → servis, first round → babak 1, quarter-final → perempat final, semi-final → semi final, final → final, champion → juara, runner-up → runner-up). Export as `{ en: { … }, id: { … } }`.
- `src/lib/sports/tennis/tournaments.js` — full 2026 calendar with ESPN event ID, start/end dates, tour, tier, surface, city, country, prize pool (hard-coded at build time per doc 01 section "What ESPN does NOT provide"). 4 slams + 9 ATP M1000 + 10 WTA 1000 + 2 year-end = ~25 entries.
- `src/lib/sports/tennis/player-seed.json` — top 200 ATP + top 200 WTA bio data (hand, height, turned-pro year, birthdate, city, country). Build this from Wikipedia scrape as a one-time offline step — write `scripts/seed-tennis-players.mjs`, run locally, commit the JSON.
- `src/lib/sports/index.js` — register tennis alongside nba / f1 / epl / fifa / liga1. Follow the exact F1 registration shape.
- `src/lib/flags.js` — add `TENNIS_LIVE = true`, `TENNIS_LIVE_SCRAPE = false`.

Smoke test: `npm run build` succeeds, no new warnings, bundle size delta under 20 KB gz.

**2. Data hooks.** Build the read paths before any component consumes them.

- `src/lib/sports/tennis/hooks/useTennisScoreboard.js` — polls `/api/proxy/espn/apis/site/v2/sports/tennis/{atp,wta}/scoreboard` every 15s when any match is `In Progress`, every 5 min otherwise. Uses existing `/api/proxy` (already edge-cached). Follow `useF1Session` as the reference hook.
- `src/lib/sports/tennis/hooks/useTennisRankings.js` — 6 h TTL, returns normalized `{ rank, prev, delta, points, trend, athlete }` array.
- `src/lib/sports/tennis/hooks/useTournament.js` — accepts `{ tournamentId, year }`, returns draw + schedule + past matches for the tournament. Under the hood issues the scoreboard query with the right `dates=YYYYMMDD` range.
- `src/lib/sports/tennis/hooks/useTennisNews.js` — calls `/api/tennis-news?lang={id|en}`. Phase 2 feature — stub the hook now returning `[]` so the component can ship with an empty state.
- `api/tennis-news.js` — mirror `api/f1-news.js` shape exactly. RSS sources per doc 01, tennis keyword regex per doc 01. Phase 1 commits the endpoint but the UI consumer lands in Phase 2.

Smoke test: `curl https://www.gibol.co/api/proxy/espn/apis/site/v2/sports/tennis/atp/rankings | python3 -c 'import json,sys;d=json.load(sys.stdin);print(len(d["rankings"][0]["ranks"]))'` returns ~500.

**3. Components — build in the order listed in `docs/tennis/03-ui-spec.md` components priority list.** Minimum for Phase 1:

- `ScoreLine.jsx` — per-set scoreline rendering with tiebreak superscript, winner underline, in-progress highlight. The atomic tennis primitive; every other component consumes it.
- `LiveMatchCard.jsx` — one live match with players, flags, sets, status chip. Use on hub live strip.
- `TournamentCard.jsx` — tier-tinted (slam gold / masters silver / finals red), status chip, start/end dates, "LIHAT DRAW" CTA.
- `RankingsTable.jsx` — 3-column layout (rank+trend, player+country, points+delta). Mono font for all numeric columns. Sticky header on scroll.
- `PlayerChip.jsx` — flag + shortname + seed, three size variants (sm/md/lg). Used in draw cells and live cards.
- `CountdownToSlam.jsx` — reuse logic from F1 next-race countdown; copy tightened for tennis.

Each component lands as its own PR-sized commit with a storybook-style smoke test in `src/components/tennis/__demo__/` (render it against fixture JSON so we can eyeball without waiting on live data).

**4. Pages + routes.** All of Phase 1's user-visible URLs land here.

- `src/pages/Tennis.jsx` — the hub.
- `src/pages/TennisTournament.jsx` — single page handles both AO archive and RG countdown, branches on `status: 'completed' | 'upcoming' | 'live'`.
- `src/pages/TennisRankings.jsx` — tour-parameterized page.
- Routes wired into `src/App.jsx` exactly like F1 routes. Add `<SportErrorBoundary sport="tennis">` wrapper per `02-architecture.md`.

Smoke test, in this order:
1. `npm run dev`, visit `/tennis` — hub renders, live strip populates (or cleanly shows "Tidak ada pertandingan live" if no match), rankings preview shows real ATP + WTA top 10.
2. Visit `/tennis/australian-open-2026` — champions shown correctly (Sinner, Sabalenka for AO 2026), draw loads.
3. Visit `/tennis/roland-garros-2026` — countdown shows correct days-until (May 24).
4. Visit `/tennis/rankings/atp` — 100 rows render, mono font for numerics, trends visible.

**5. SEO + prerender + Home integration.**

- Update `scripts/prerender-sport-routes.mjs` to emit tennis routes. Confirm prerender produces clean HTML for every tennis URL (run locally, inspect one output file).
- Add Tennis card to `src/pages/Home.jsx` grid. Reuse `ComingSoon` style if the current timeframe has no live slam/Masters; switch to a LIVE variant when `tournaments.js` says one is running.
- `public/sitemap.xml` — tennis URLs at the priorities above.
- `public/llms.txt` — new tennis section matching the F1 facts block shape; list live hubs + data sources + Bahasa glossary note.
- JSON-LD: `SportsEvent` on tournament pages, `ItemList` on rankings pages, `Person` on player pages (only Phase 2 generates player pages — Phase 1 emits the schema via the hub's `itemListElement` for visible players only).

Smoke test before committing:
- `curl https://www.gibol.co/tennis | grep -c '<title>'` returns 1.
- `curl https://www.gibol.co/sitemap.xml | grep -c '/tennis'` returns at least 16 (hub + 4 slams + ~10 masters + 2 rankings tour).
- `curl https://www.gibol.co/api/proxy/espn/apis/site/v2/sports/tennis/atp/rankings` returns 200 with JSON body.
- Lighthouse on `/tennis` — CLS < 0.05, LCP < 2.5s, mobile perf > 85.

### Version bump

Phase 1 tennis is a new-sport milestone, same class as v0.2.0 (multi-sport infra), v0.3.0 (brand refresh), and v0.4.0 (EPL Phase 1A). Per `src/lib/version.js` convention, this is a **minor bump: v0.4.0 → v0.5.0**.

Write the `v0.5.0` changelog entry in `src/lib/version.js` covering: tennis adapter registration, `/tennis` hub + 4 slam stubs + ~10 Masters stubs, ATP + WTA rankings pages, TENNIS_LIVE flag, `/api/tennis-news` endpoint (no UI consumer yet), prerender additions, sitemap + llms.txt updates, player-seed JSON, Bahasa glossary. Mention anything explicitly deferred to v0.5.x (Catatan Match, head-to-head, bilingual news column wiring, watchlist, draw-path preview, point-by-point scrape).

### Commit + ship

Follow the gibol-ship workflow per memory:

```bash
cd ~/Documents/Claude/Projects/Gibol/nba-playoffs-monitor

# Stage + commit Phase 1 tennis work
git add src/ public/ scripts/ api/ docs/tennis/

git commit -m "$(cat <<'EOF'
feat: tennis Phase 1 — hub, slam archive, rankings, countdown

Registers tennis as Gibol's sixth sport, ahead of Roland Garros 2026.

- `/tennis` hub with live scoreboard strip, ATP+WTA rankings preview,
  current tournament cards, RG 2026 countdown, Indonesian-player
  spotlight, Bahasa glossary link.
- `/tennis/australian-open-2026` archive (completed slam, validates
  the dashboard template against known-answer data).
- `/tennis/roland-garros-2026` countdown stub (pre-draw).
- `/tennis/rankings/{atp,wta}` top-100 pages with points delta +
  trend arrows. Weekly Monday refresh via 6h TTL on proxy.
- Tennis adapter at src/lib/sports/tennis/ — constants, glossary,
  2026 tournament calendar, player-seed JSON (top 200 per tour),
  hooks for scoreboard/rankings/tournament/news.
- Feature flag TENNIS_LIVE gates the nav entry.
- /api/tennis-news endpoint shipped (no UI consumer yet, lands
  with bilingual news column in v0.5.x at Roland Garros).
- Sitemap + llms.txt updated with ~250 new tennis URLs.
- SportsEvent + ItemList JSON-LD on tournament and rankings pages.

Bumps to v0.5.0 per new-sport-milestone convention in version.js.
Does not touch NBA / F1 / Supabase / any other sport's code path.
Phase 2 (Catatan Match share cards, bilingual news UI, head-to-head,
watchlist, draw-path preview) targets Roland Garros open, May 24.
EOF
)"

# Bump version + push (gibol-ship handles the version write + push + poll)
gibol-ship 0.5.0
```

### What you should NOT do

- **Do not add new runtime dependencies.** Tennis reuses existing infra: `/api/proxy`, edge cache, `SportErrorBoundary`, `COLORS`, `ShareButton`, `SportAdapter` shape. Zero net-new npm deps in Phase 1.
- **Do not touch NBA, F1, IBL, EPL, FIFA, Liga 1, Supabase, Pick'em schema, or Polymarket code paths.** Tennis is additive.
- **Do not adopt Tailwind or migrate away from CSS-in-JS.** `COLORS` constant + inline styles is the Gibol way.
- **Do not hit ESPN or any upstream from the browser.** Everything routes through `/api/proxy` per `02-architecture.md`.
- **Do not scrape anything in Phase 1.** Scraping is Phase 3, Wimbledon only, behind a flag. If data's not in ESPN, accept "not available" for now.
- **Do not generate player pages for Phase 1.** The top 200 player profile pages (`/tennis/player/{slug}`) land in Phase 2 — Phase 1 only reads from `player-seed.json` to enrich rankings + match displays.
- **Do not translate English news articles.** When bilingual news lands in Phase 2, native sources per language, no MT (per `feedback_news_bilingual` memory rule, same policy as F1).
- **Do not use `[...catchall].js` file patterns** — Vercel classic routing doesn't support them (v0.2.3 cautionary tale). If you need multi-segment API routing, use `vercel.json` rewrite + bracket-free filename.

### Expected output + handoff

When Phase 1 is shipped and verified:

- Reply with the production URLs that work (hub + 2 slams + 2 rankings), the count of tennis URLs now in the sitemap, and a one-line readout of `/api/proxy/espn/apis/site/v2/sports/tennis/atp/rankings` latency.
- Post a short "Phase 1 done, Phase 2 starts at Roland Garros draw day" note for Ade.
- Save a `gibol_v050_shipped.md` memory to your Cowork auto-memory folder (path will be `/sessions/{your-session-id}/mnt/.auto-memory/`) summarizing what landed. Mirror the pattern in existing `gibol_v020_shipped.md`, `gibol_v022_shipped.md`, `gibol_v025_shipped.md`, `gibol_v040_shipped.md`. Add a pointer line to `MEMORY.md`.

Any blocker you can't resolve in < 30 min: stop, write the one-sentence diagnosis + the fastest unblock option, and ask Ade. Don't burn cycles flailing on an infra question.

---

## End of prompt

*Paste everything above the "End of prompt" line into the new chat. The chat will have full context from the four referenced docs plus CLAUDE.md without any further back-and-forth.*
