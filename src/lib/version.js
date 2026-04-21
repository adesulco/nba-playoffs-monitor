// Single source of truth for the app's displayed version + build date.
// Update APP_VERSION when cutting a new release. BUILD_DATE is stamped
// at import time; for production we rely on CI/Vercel build time to be
// close enough.
//
// Convention:
//   - Treat post-recovery from origin/main (Apr 2026) as the true v0.1.0 baseline.
//   - Patch bumps for bug-fix-only ships (0.1.x).
//   - Minor bumps for new-feature / infra milestones (0.2.0, 0.3.0…).
//   - Major bump when the first non-NBA sport goes live to users (1.0.0).
//
// v0.2.0 — multi-sport infra milestone. Home now shows NBA + F1/EPL/FIFA/Liga 1
// as coming-soon cards. Adapter pattern, /api/proxy edge cache, feature flags,
// SportErrorBoundary, generic prerender, /api/health/data-sources all landed.
// NBA stack itself is untouched — live hooks still hit ESPN/Polymarket directly
// until each sport adapter migrates through the proxy in its phase.
//
// v0.2.1 — SEO cleanup. IBL references in index.html (Organization + WebSite
// JSON-LD, noscript block, meta keywords), public/llms.txt tagline, sitemap.xml,
// About.jsx bullet list, and SEOContent.jsx FAQ all updated to reflect the new
// 5-sport lineup (NBA live + F1/EPL/FIFA/Liga 1 coming soon, IBL deferred).
// Each coming-soon sport page now emits a SportsEvent JSON-LD via ComingSoon's
// new jsonLd prop. Sitemap added /formula-1-2026, /premier-league-2025-26,
// /liga-1-2026 at priority 0.7.
//
// v0.2.2 — F1 Phase 1A live. Real /formula-1-2026 dashboard replaces the
// coming-soon stub: Jolpica-F1 powered driver + constructor standings and
// 23-GP calendar with WIB start times. 23 per-GP SEO routes at
// /formula-1-2026/race/:slug, each with its own SportsEvent JSON-LD nested
// under the championship superEvent. Home F1 card flipped COMING SOON → LIVE.
// Phase 1B (next ship) adds OpenF1 live session mode, telemetry, Polymarket
// championship odds, and per-driver / per-team SEO pages.
//
// v0.2.3 — F1 hotfix + UX pivot. Attempted proxy fix by flattening to
// api/proxy/[...slug].js + UX pivot (NBA-style round scroller). The UX
// shipped fine but the proxy fix FAILED in production: endpoint returned
// HTTP 404 NOT_FOUND because Vercel classic (non-Next.js) Serverless
// Functions don't support `[...catchall].js` filename patterns at all —
// that's a Next.js pages-router-only feature. Diagnosed post-deploy.
//
// v0.2.4 — real proxy fix. Moved handler to bracket-free api/proxy.js and
// added a vercel.json rewrite `/api/proxy/:path*` → `/api/proxy?path=:path*`
// so Vercel's deterministic routing hits a real file and the tail path
// arrives as a query parameter. Browser URL shape is unchanged — all hooks
// keep calling /api/proxy/<provider>/<upstream-path>. Unblocks F1 standings
// + calendar, and unblocks every future proxied provider (API-Football,
// football-data, ESPN, Polymarket) before their hooks migrate through it.
//
// v0.2.5 — F1 feature parity with NBA surface. Three big compounding wins:
//   1. ConstructorPicker (the F1 equivalent of the NBA team picker) lets
//      fans "Follow" a team; selection persists in localStorage and tints
//      the dashboard chrome + highlights that team's rows in both driver
//      and constructor standings. Tracks `f1_constructor_select`.
//   2. Per-constructor pages at /formula-1-2026/team/:slug (11 URLs, one
//      per 2026 team) and per-driver pages at /formula-1-2026/driver/:slug
//      (22 URLs) — each with team-accent-tinted hero, standing summary,
//      line-up grid (teams) or season stats + per-race podium finishes
//      (drivers). Emits SportsTeam and Person JSON-LD.
//   3. ShareButton component on F1Race pages — native navigator.share on
//      mobile, falls back to WhatsApp / X / Copy-link popover on desktop.
//      Share text recaps the podium if the race has run, otherwise shares
//      the schedule. The component is reusable for every future "share a
//      match" surface across sports.
// SEO: sitemap.xml adds 11 team + 22 driver URLs (34 net-new indexable
// pages) and bumps /formula-1-2026 to priority 0.9; llms.txt moves F1 from
// "Coming soon" to "Live dashboards" with a dedicated F1 facts block so
// GPT/Claude/Perplexity crawlers understand the structure.
//
// v0.2.6 — F1 storyshare + bilingual news. Two compounding wins for the
// F1 window:
//   1. Catatan Race — static share-card PNG generator at
//      scripts/generate-f1-recap.mjs produces og (1200×630), story
//      (1080×1920), and square (1080×1080) variants per completed GP.
//      Design mirrors the NBA recap card (dark gradient, gibol.co
//      wordmark, team-color podium chips, Bahasa hook quote, F1-red
//      footer accent). Fonts (Bebas Neue + Space Grotesk) are base64-
//      embedded in the SVG via `scripts/fonts/` for reproducible
//      runs — no network, no @vercel/og runtime dependency. PNGs ship
//      to public/og/f1/2026-R{nn}-{slug}-{variant}.png. F1Race.jsx
//      wires og:image when the race date has passed so WhatsApp /
//      X / IG share previews show the podium card automatically.
//      CLI: `node scripts/generate-f1-recap.mjs --all-past` regenerates
//      every completed GP; `--round N` does a single round; `--dry-run`
//      previews without writing. Rounds 1-3 shipped (9 PNGs).
//   2. Bilingual F1 news — /api/f1-news accepts ?lang=id|en and
//      returns a 15-item feed curated natively in that language. ID
//      sources: detikSport, Bola.com, CNN Indonesia, Kompas. EN
//      sources: Autosport, Motorsport.com, BBC Sport, Formula1.com.
//      Native regex-based RSS 2.0 + Atom parser (no xml2js dep),
//      8s AbortController timeout across all fetches, URL dedup,
//      sort newest-first. Cache: s-maxage=900, stale-while-revalidate=
//      1800. Per feedback_news_bilingual: NO machine translation —
//      the ID dashboard shows real Bahasa articles, the EN dashboard
//      shows real English articles. useF1News hook + F1News component
//      (terminal-style list with source chips + relative timestamps)
//      drop into the F1 dashboard as a third column alongside driver
//      and constructor standings.
//
// v0.2.7 — same-day hotfix for v0.2.6 bilingual news. Three of the
// four Bahasa RSS URLs we shipped were dead:
//   - rss.detik.com/index.php/sport → connection refused (subdomain
//     was retired; detik moved per-vertical to sport.detik.com/rss)
//   - bola.com/feed/rss2/otomotif → 301 → feed.bola.com 404 (Bola's
//     feed endpoint was removed entirely)
//   - kompas.com/tag/formula-1/rss → 404 (Kompas moved tag-scoped
//     RSS to indeks.kompas.com subdomain)
// All three URLs swapped to verified-live alternatives + added
// detikOto (motorsport vertical) and Antara (national wire) so the
// ID source pool is 5 deep and can absorb 1-2 failures silently.
// Also tightened the fetch User-Agent to a feed-reader-style string
// (some publishers 403 unknown UAs). EN feed was already working
// and is unchanged.
//
// v0.2.8 — Bahasa news filter quality. v0.2.7 shipped with live ID
// URLs but the keyword regex was too loose, so detikOto returned
// "Yamaha F1ZR" motorbike reviews and "Ferrari Kuning" taxi stories
// as "F1 news." Two fixes:
//   1. Keyword now requires word boundaries (\bf1\b excludes F1ZR)
//      and matches only F1-unique terms: "formula 1", "grand prix",
//      or a 2026 driver's surname. Bare team names removed (too
//      ambiguous in general-news contexts).
//   2. Dropped Kompas entirely — every Kompas RSS variant returns
//      an empty body despite 200 status. Pool is now 4: detikSport,
//      detikOto, CNN Indonesia, Antara.
// Also: empty feed is now 200 (not 503). In the Indonesian news
// landscape F1 gets sparse coverage outside race weekends — an
// empty feed is a legitimate state, not a failure. The F1News
// component already renders "Belum ada berita F1 terbaru" on empty.
// Short-TTL (60s) on empty responses so we don't cache stale-empty
// when a race weekend starts and coverage resumes.
//
// v0.2.9 — EN news feed one-line URL fix. Post-v0.2.8 smoke test showed
// Formula1.com contributing zero items to /api/f1-news?lang=en
// (Motorsport.com 25, Autosport 3, BBC Sport 2, Formula1.com 0 at
// limit=30). Root cause: the shipped URL
// https://www.formula1.com/content/fom-website/en/latest/all.xml
// 301-redirects to https://www.formula1.com/en/latest/all.xml.
// Node's fetch() should follow, but CloudFront is flaky on the redirect
// path from Vercel's IPs — silently returns 0 bytes ~half the time, so
// our parser sees an empty body and drops the source. Canonical URL
// returns the same 10-item feed reliably. One-liner in api/f1-news.js
// SOURCES block; no behavior change elsewhere.
//
// v0.2.10 — dropped Formula1.com from the EN source pool. The canonical
// URL landed in v0.2.9 but production still returned 0 items from F1.com
// while my sandbox got 3/3 reliable 200s with the exact same UA. That
// isolated the failure: CloudFront is blocking Vercel's AWS IP ranges
// specifically for formula1.com, not our URL or UA. Same call as Kompas
// in v0.2.8 — stop pretending the source works. Motorsport.com +
// Autosport + BBC Sport together already return 30 items at limit=30 so
// there's no product loss. Updated F1News footnote and llms.txt to drop
// the Formula1.com mention.
//
// v0.2.11 — Phase 1 revamp step 6: hero refresh. Three dashboard heroes
// re-proportioned to a single consistent spec:
//   - Title swaps Bebas Neue (44–56px, letterSpacing -0.5 to -1) for
//     Space Grotesk 36/700/-0.025em with text-wrap: balance. Matches the
//     step-1 body font stack and reads tighter above the fold.
//   - Accent tints dialed to <12%: F1 keeps accent14 (~8%) when a team
//     is picked + adds a soft F1_RED 0d wash otherwise; ComingSoon drops
//     from accent20 (~12.5%) → accent14 (~8%); Recap collapses a 2-layer
//     (linear50 + radial60) wash into a single linear1a (~10%).
//   - Status chip moves to the top-right corner via <Chip> (replaces
//     "F1 2026 · LIVE" baked into title text on F1; replaces centered
//     COMING SOON pill on ComingSoon; replaces top-left MOMENT OF THE
//     DAY solid block on Recap).
//   - Recap topPerformer pill is lifted out of the hero into its own
//     sibling row (still with winner accent) so the hero body is purely
//     {kicker, chip, title, caption} — consistent across all three.
// Touched: src/pages/F1.jsx, src/pages/ComingSoon.jsx, src/pages/Recap.jsx.
// No behavioural or routing changes. Step 6 of the 9-step design revamp.
//
// v0.2.12 — Phase 1 revamp step 7: a11y sweep. Three small but load-bearing
// fixes to the keyboard / screen-reader / reduced-motion surface:
//   - :focus-visible outline-offset tightened 3px → 2px to match the
//     step-1 "2px/2px" spec. Ring color (var(--amber)) unchanged.
//   - @media (prefers-reduced-motion: reduce) gains an explicit
//     `transform: none !important` override on every hover-lift selector
//     landed in steps 4-5 (.home-card-live/soon:hover, .gibol-card:hover
//     + featured/secondary variants, .btn-primary/secondary:hover,
//     .toolbar-btn:hover). The existing wildcard zeros animation and
//     transition durations but not static transforms, so the 1px nudge
//     was still firing for users who opted out of motion.
//   - Decorative glyphs hidden from assistive tech:
//       · ShareButton trigger's ⤴ arrow wrapped in aria-hidden="true"
//         (VoiceOver was announcing "Share up-right arrow"; now says
//         "Share, menu pop-up" per the existing aria-haspopup="menu").
//       · ContactBar card-variant's → arrow wrapped in aria-hidden
//         (AT already reads the mailto label; the arrow was noise).
// Touched: src/index.css, src/components/ShareButton.jsx,
// src/components/ContactBar.jsx. No visual change for sighted users
// without reduced-motion enabled. Step 7 of the 9-step design revamp.
//
// v0.2.13 — Phase 1 revamp step 8: platform consistency pass. Propagates
// the Step 6 hero spec (Space Grotesk 36 / weight 700 / letter-spacing
// -0.025em / line-height 1.05 / text-wrap: balance) into every secondary
// page header that was still using the old Bebas Neue 44-58px display
// pattern. Also dials F1 driver + team hero tint from accent26 (~15%) →
// accent14 (~8%) to match the <=12% ceiling established on Home / F1 /
// ComingSoon / Recap.
//   - About.jsx: h1 Bebas Neue 48 → Space Grotesk 36/700. No tint change.
//   - Glossary.jsx: h1 Bebas Neue 44 → Space Grotesk 36/700. No tint.
//   - F1Driver.jsx: the two-div {#number, name} display collapses into a
//     single <h1> (Space Grotesk 36/700, inline flex, -0.025em), with
//     #number in team accent and name in C.text. Hero tint 26 → 14.
//   - F1Team.jsx: h1 Bebas Neue 52 → Space Grotesk 36/700. Tint 26 → 14.
//   - F1Race.jsx: div Bebas Neue 52 → <h1> Space Grotesk 36/700. Tint
//     already at F1_RED1a (~10%) from earlier passes; left alone.
//   - TeamPage.jsx: h1 Bebas Neue 58 → Space Grotesk 36/700 / color #fff
//     preserved. Saturated team-color wash + 220px abbr watermark are
//     intentional brand-moment design and stay as-is — this is a type
//     swap, not a hero rewrite.
// Every edited page now exposes exactly one <h1> at the top of the
// primary content (F1Driver + F1Race gain a semantic h1 they did not
// previously have).
// Touched: src/pages/About.jsx, src/pages/Glossary.jsx,
// src/pages/F1Driver.jsx, src/pages/F1Team.jsx, src/pages/F1Race.jsx,
// src/pages/TeamPage.jsx. No routing, data, or behavioural change.
// Step 8 of the 9-step design revamp; only Step 9 (mockup QA) remains.
//
// v0.3.0 — Brand v1 refresh (minor milestone bump). Full supersede of the
// Phase 1 visual direction per the "Gibol — Brand Handoff v1" PDF:
//   - Palette: #0A1628 / #0E1E36 / #13253F navy surfaces, #E6EEF9 ink,
//     #3B82F6 interactive blue, #F59E0B amber accent, #EF4444 LIVE, new
//     #10B981 / #EF4444 up/down semantics. All legacy tokens aliased onto
//     the new primitives (--panel, --text, --dim, --green, --red, etc.)
//     so no component code had to change to pick up the new palette.
//   - Typography: Inter Tight 400-900 (replaces Inter / Space Grotesk /
//     Bebas Neue for both display and body) + JetBrains Mono 400-700 for
//     every numeric UI. Google Fonts URL in index.html swapped in one
//     shot. All inline `font-family` references mass-replaced across 24
//     src/ files (.jsx/.js) from "Space Grotesk" / "Bebas Neue" →
//     var(--font-sans).
//   - Logo: new src/components/Logo.jsx exports <Glyph> (target-mark SVG
//     using currentColor) + <Logo> (Glyph + "gibol." Inter Tight 900
//     wordmark with amber final dot). TopBar masthead swaps the PNG
//     favicon for inline <Glyph size=28/> + typographic wordmark.
//   - Favicons + PWA icons: regenerated from gen_favicons.py — 13 PNGs
//     (favicon 16/32/64, apple-touch 180, gibol-logo 512/1024, icons/
//     icon 192/512, icon-maskable 192/512, apple-touch, badge-72) plus
//     multi-size favicon.ico.
//   - Meta theme-color updated #08111f → #0A1628. The <noscript> SEO
//     fallback div in index.html also takes the new navy.
//   - Sanity cleanup: last runtime #ffb347 / #08111f literals in
//     ContactBar, App.jsx RouteFallback, Sparkline (up/down trend),
//     NBADashboard, About, Glossary, TeamPage all replaced with token
//     refs (C.amber, C.bg, var(--amber), var(--bg)).
//   - .gitignore broadened from `dist/` → `dist*` to ignore Finder " 2"
//     duplicates and timestamped dist.old-* archives.
// Accessibility: primary ink on bg = 15.9:1, secondary 8.8:1, muted 4.7:1,
// amber 8.1:1, live 4.9:1 — all AA+ on every surface in use.
// No component structure, route, data-fetch, state, or backend edits.
// Full changelog + QA checklist: v0.3.0-SHIP-NOTES.md at repo root.
//
// v0.3.1 — Remove stale "MALAM INI · FINAL PLAY-IN" widget from Col 4 of the
// NBA dashboard (src/pages/NBADashboard.jsx ~L667-696). The block hardcoded
// 2026-04-17/18 kick-offs and the ORL vs CHA / PHX vs GSW matchups, so two
// days into Round 1 it read as stuck. Playoff Stories + Status sections in
// Col 4 are preserved. i18n keys (tonightPlayIn, winnersFace, primeNote) left
// in place as harmless dead keys for a future date-gated reintroduction.
// No routing, data, or styling changes.
//
// v0.4.0 — EPL Phase 1A live (minor milestone bump, third sport LIVE). Real
// /premier-league-2025-26 dashboard replaces the coming-soon stub plus 20
// per-club SEO pages. Compounding wins:
//   1. Klasemen 20 klub — ESPN apis/v2/sports standings (proxied via new
//      'espn-v2' provider in api/proxy.js) with rank, points, W-D-L,
//      goals for/against, goal difference, and a 5-match form guide.
//      Qualification zones tinted on the row background: 1-4 UCL (blue),
//      5 UEL (amber), 6 UECL (green), 18-20 relegation (red). Legend
//      row explains the zones. Row tint uses 0d alpha (~5%) so stays
//      well under the Phase 1 <12% accent ceiling.
//   2. Jadwal + Hasil — ESPN scoreboard endpoint scoped to a 14-day
//      window (7 back, 7 forward) then split into upcoming vs post
//      by status.type.state. Kickoff times shifted UTC → WIB in
//      clubs.js::formatFixtureDate (no ICU dep). Club slugs on both
//      sides link to the per-club SEO pages — internal link graph.
//   3. Top skor — ESPN apis/common/v3/sports leaders endpoint (new
//      'espn-common' proxy provider), goals category, limit=10.
//      Each entry team-coloured via CLUBS_BY_ESPN_ID lookup.
//   4. Per-club SEO pages at /premier-league-2025-26/club/:slug —
//      20 indexable Bahasa-first URLs, each with its own SportsTeam
//      JSON-LD (adapter.clubSchema + EPLClub.jsx useMemo both emit).
//      Sections per club: hero with stadium + city + founded, current
//      standing summary (rank, points, W-D-L, GD), last-5 form,
//      upcoming 5 fixtures, last 5 results, top scorers from this
//      club, and one Bahasa "Tentang" paragraph from clubs.js bio.
//      Promoted trio (Leeds, Burnley, Sunderland) included.
//   5. ClubIndex grid on dashboard — all 20 clubs as cards linking
//      to their pages. Closes the internal link graph: every crawl
//      from / → /premier-league-2025-26 → club/:slug is one hop.
// Data layer: four new hooks (useEPLStandings, useEPLFixtures,
// useEPLScorers, useEPLTeam), all proxied so client-side CORS + rate
// limits are never hit. api/proxy.js gains 'espn-v2' (60s cache) and
// 'espn-common' (300s cache) on top of existing 'espn' (60s) + 'espn-
// core' (300s) providers.
// Routing: EPL route lazy-loaded + new /:slug subroute both wrapped
// in SportErrorBoundary. Home card flipped COMING SOON → LIVE, blurb
// rewritten to match v0.4.0 surface.
// SEO: sitemap.xml adds 20 club URLs at priority 0.6 and bumps
// /premier-league-2025-26 from 0.7 → 0.9 (matching F1 / NBA). Adapter
// prerenderRoutes returns 21 routes (1 dashboard + 20 clubs) — the
// prerender script now emits 21 net-new HTML files.
// No NBA, F1, FIFA, Liga 1, or Recap changes. Status for Liga 1 +
// FIFA WC unchanged (still 'soon').
// Full changelog + QA checklist: v0.4.0-SHIP-NOTES.md at repo root.
//
// v0.5.0 — Tennis Phase 1A live (minor milestone bump, fourth sport LIVE). Hub
// at /tennis plus 18 per-tournament SEO pages and 2 per-tour rankings pages —
// the biggest single surface expansion since the EPL ship. Compounding wins:
//   1. Tennis adapter + registry — src/lib/sports/tennis/ drops a full sport
//      module in the same shape as NBA / F1 / EPL: adapter.js registers the
//      sport in the SPORTS array, constants.js owns SEASON / TOURS /
//      TOUR_LABEL / INDONESIAN_PLAYERS / date + WIB helpers, tournaments.js
//      holds the 18-tournament registry (4 Slams, 2 combined-1000s, 7 ATP
//      Masters, 3 WTA 1000, 2 year-end Finals, 2 early-500s), with
//      nextSlam() + tournamentPath() exported for UI. Tennis-specific color
//      tokens — tennisSlamGold (#D4A13A), tennisClayRust, tennisGrassGreen,
//      tennisHardBlue, tennisMastersSilv, tennisLive, tennisAccent, and
//      surface chips tints — live on the COLORS constant so every component
//      renders token-driven (no hardcoded hex).
//   2. Hub at /tennis — 36/700/-0.025em Inter Tight hero (matches the v0.3.0
//      brand spec), CountdownToSlam block with venue + date + LIVE pulse
//      when a Slam is in-progress, LiveTicker merging ATP + WTA scoreboard
//      priority-sorted (live > pre > post, limit 8), TierSection per tier
//      (slam / combined1000 / masters / wta1000 / finals) with
//      TournamentCard previews, RankingsSnapshot showing top 10 ATP + top 10
//      WTA side-by-side, IndonesianSpotlight (Aldila Sutjiadi / Priska
//      Madelyn Nugroho / Christopher Rungkat), TennisNewsList, and the
//      standard disclaimer + footer pattern.
//   3. 18 per-tournament pages at /tennis/{slug}-2026 — each parses slug via
//      useTennisTournament hook → {tournament, year, phase} then branches on
//      phase: UpcomingBody renders CountdownToSlam + TournamentFactSheet +
//      humanRelativeDays countdown, LiveBody renders TournamentFactSheet +
//      scoreboard filtered to matches matching the tournament name, and
//      CompletedBody renders TournamentFactSheet + archive note. Fact sheet
//      exposes venue / city / dates / tours / organizer / web as Fact cards.
//      RelatedTournaments chip strip at the bottom closes the internal link
//      graph. Every page emits JSON-LD SportsEvent schema via adapter
//      prerenderRoutes().
//   4. Rankings at /tennis/rankings/:tour — TourSwitcher pill toggle between
//      ATP and WTA, TopPodium top-10 grid (cards with rank / country code /
//      name / points), inline Indonesian-players-in-top-500 highlight when
//      any IDN / INA / ID code matches, then full RankingsTable limit=100
//      with weekly up/down trend chips. Invalid :tour values redirect to
//      /tennis/rankings/atp.
//   5. Data layer — four new hooks (useTennisScoreboard, useTennisRankings,
//      useTennisNews, useTennisTournament) all route through the existing
//      edge-cached /api/proxy/espn/* provider; no new proxy provider
//      needed. Bilingual tennis news at /api/tennis-news?lang=id|en
//      aggregates Bahasa (detikSport + Antara + CNN Indonesia) and English
//      (ESPN + BBC Sport + Tennis.com) RSS feeds with the same parser and
//      cache strategy as /api/f1-news.
//   6. 8 new components under src/components/tennis/ — SurfaceChip, TierChip,
//      ScoreLine (per-set with tiebreak superscripts + server dot),
//      PlayerChip (seed · name · CC, indonesian tint), LiveMatchCard,
//      TournamentCard, RankingsTable (5-col grid, trend arrows,
//      Indonesian-CC row tint), and CountdownToSlam (full + compact
//      variants, null post-US-Open).
// Routing: App.jsx adds three lazy-loaded routes — /tennis, /tennis/rankings/
// :tour, /tennis/:slug — all wrapped in SportErrorBoundary. Order matters:
// /tennis/rankings/:tour must precede /tennis/:slug so "rankings" doesn't
// match the slug parameter.
// SEO: sitemap.xml adds 21 tennis URLs (1 hub at priority 0.9, 2 rankings at
// 0.8, 18 per-tournament at 0.6-0.9 weighted by prestige — Roland Garros 0.9,
// other slams 0.8, finals 0.7, 1000s 0.6). llms.txt moves Tennis to "Live
// dashboards" with a dedicated Key facts block mirroring the F1 block so
// GPT / Claude / Perplexity crawlers understand tournament slugs, surfaces,
// ranking URLs, and Indonesian-player hooks. Adapter prerenderRoutes emits
// 21 route metadata objects (title / description / keywords / jsonLd) that
// the generic scripts/prerender.mjs auto-iterates — no prerender script
// edits needed.
// Home: 6th dashboard card at #D4A13A accent flipped LIVE between EPL and
// FIFA WC, blurb "4 Grand Slams · Masters 1000 · WTA 1000 · Year-End Finals.
// Live sets, ATP + WTA rankings, Indonesian player spotlight." Home SEO
// keywords extended with tenis / atp / wta / grand slam / roland garros /
// peringkat terms.
// No NBA, F1, EPL, FIFA, Liga 1, or Recap changes. Status for FIFA WC +
// Liga 1 unchanged (still 'soon'). Ships ahead of Roland Garros (May 24,
// 2026) so the 34-day pre-tournament SEO indexing window is live.
// Full changelog + QA checklist: v0.5.0-SHIP-NOTES.md at repo root.
//
// v0.5.8 — EPL club pages: Key Accounts (X) + per-club top scorers,
// assisters, and injury report via ESPN roster endpoint. Phase B ship
// 3 of 3.
//
// Per-club pages (/premier-league-2025-26/club/:slug — 20 URLs) now
// gain three new data-backed sections:
//
//   1. AKUN RESMI · X / TWITTER — four-row card at the top of each
//      club page. First row is the club's own handle (accent-tinted
//      using club.handle populated in v0.5.4), followed by
//      @premierleague · @ESPNFC · @BBCSport. Outbound <a> links,
//      no tracking widgets. Mirrors the NBA "KEY ACCOUNTS" pattern
//      on the main NBADashboard.
//
//   2. TOP SKOR TIM (roster-derived) — replaces the previous "Top skor
//      klub" section which filtered the league top-20 scorers down to
//      this club (often empty for mid/bottom-table clubs). New section
//      pulls the full squad from ESPN's /teams/{id}/roster endpoint,
//      sorts by totalGoals, and shows top 5 with goals + assists +
//      appearances + position. Works for every club, not just the
//      league leaders.
//
//   3. TOP ASIS — parallel ranking by goalAssists, top 5 players with
//      assists > 0. Surfaces playmakers (Ødegaard, De Bruyne, Mac
//      Allister, etc.) who don't lead the goal charts.
//
//   Plus conditional CEDERA (INJURY REPORT) section that renders only
//   when ESPN populates a player's injuries[] array — currently empty
//   for all EPL clubs but the structure is there for live injury
//   reporting when a manager confirms + ESPN picks it up.
//
// New hook: src/hooks/useEPLTeamRoster.js polls /teams/{id}/roster at
// 5-minute cadence (roster + season stats don't change mid-matchday;
// proxy already edge-caches 20s on top). Returns players[], topScorers[],
// topAssisters[], injured[]. Flattens ESPN's nested
// statistics.splits.categories[] tree into a client-friendly shape per
// player (goals, assists, appearances, yellowCards, redCards, saves,
// etc.).
//
// Cleanup: removed now-unused useEPLScorers import from EPLClub.jsx
// (the league-top-20 filter is replaced by the richer roster-based
// approach). EPL dashboard itself still uses useEPLScorers for the
// Golden Boot card — that caller is untouched.
//
// No routing, no API endpoint change, no schema change. Proxy
// /api/proxy/espn/soccer/eng.1/teams/{id}/roster was already
// whitelisted — just wasn't being called.
//
// Files touched:
//   A src/hooks/useEPLTeamRoster.js   (+112 LOC, new hook)
//   M src/pages/EPLClub.jsx            (+197 / -47 LOC, sections
//     added + old club-scorer section replaced)
//
// EPLClub chunk: 16.37 → 23.25 KB / 5.10 → 6.37 KB gzipped.
// NBA dashboard chunk: byte-identical (zero change).
//
// v0.5.7 — Polymarket CORS fix (NBA odds revived + EPL odds now live).
//
// ROOT CAUSE: browser review of v0.5.6 revealed Peluang Juara + per-match
// odds chips were invisible because every direct fetch to
// gamma-api.polymarket.com throws TypeError: Failed to fetch — the Gamma
// API sends no Access-Control-Allow-Origin header, so browsers block
// the response from being readable. OPTIONS preflight returns 405.
// This is a hidden pre-existing bug: NBA's fetchChampionOdds +
// fetchMvpOdds + fetchPriceHistory have been silently failing since
// they were written, and the NBA dashboard has been rendering
// FALLBACK_CHAMPION from constants.js (hardcoded stale snapshot)
// for every user, every page load, forever.
//
// FIX: route all Polymarket calls through our existing edge-cached
// proxy api/proxy.js which already had polymarket-gamma + polymarket-
// clob providers registered but the hooks never used them. Three one-
// line swaps:
//   - src/lib/api.js POLY_BASE: https://gamma-api.polymarket.com
//     → /api/proxy/polymarket-gamma
//   - src/lib/api.js POLY_CLOB_BASE (new): /api/proxy/polymarket-clob
//   - src/hooks/useEPLMatchOdds.js POLY_ENDPOINT: direct → /api/proxy/
//     polymarket-gamma/events?tag_slug=epl...
//
// IMPACT: three user-visible fixes:
//   1. NBA title-odds column goes from stale hardcoded fallback to
//      LIVE every 30s (OKC 48.5% · SAS 14.8% · BOS 13.8% · DEN 9.5% ·
//      CLE 5.1% as of 2026-04-21). The price-history sparklines also
//      fill in (fetchPriceHistory was also direct + broken).
//   2. EPL Peluang juara section now renders with Man City 58% /
//      Arsenal 43% instead of the empty-array-hides-section state.
//   3. EPL per-match odds chips (HOME · DRAW · AWAY) now appear on
//      every fixture where Polymarket has a market (~15 fixtures over
//      the 14-day window).
//
// Proxy was already there; the hooks just weren't using it. Edge
// cache s-maxage=20s means even 100 concurrent viewers cost 1 upstream
// request per 20s window — way safer than direct hits. Verified via
// curl on live prod: both slugs return correct JSON with 200 status.
//
// NO NBA STRUCTURAL CHANGE. fetchChampionOdds() body is byte-identical
// except for the base URL. All existing callers keep working — they just
// start getting real data for the first time.
//
// Files touched:
//   M src/lib/api.js                    (POLY_BASE url + new POLY_CLOB_BASE)
//   M src/hooks/useEPLMatchOdds.js      (POLY_ENDPOINT url)
//
// v0.5.6 — EPL per-match Polymarket odds + schedule-first layout revamp.
// Phase B, ship 2 of 3.
//
// Two merged changes:
//
// 1. Per-match Polymarket odds on every upcoming + live EPL fixture.
//    New hook useEPLMatchOdds({ upcomingMatches }) batch-fetches
//    Polymarket's tag_slug=epl event index (100 events per request,
//    60s poll) and matches by slug pattern epl-{home3}-{away3}-
//    {YYYY-MM-DD} → our ESPN event id via polyAbbr lookup added
//    to each entry in clubs.js. Renders a compact 3-cell mono chip
//    (HOME% · DRAW% · AWAY%) under each LiveSpotlight card + each
//    Jadwal upcoming row when a market exists for the fixture. Null
//    when Polymarket has no market (most far-future matches). Single
//    batched request, not per-match probes — zero extra API cost vs
//    champion-odds ship.
//    Polymarket uses `mac` for Man City (not `mci`) and `wes` for
//    West Ham (not `whu`). The 20-club polyAbbr mapping discovered
//    empirically via their live event index 2026-04-21.
//
// 2. Layout revamp — NBA-pattern schedule-first ordering.
//    Before: Hero → LiveSpotlight → PeluangJuara → full-width
//      Klasemen (20 rows, ~500px) → Jadwal + Hasil side-by-side →
//      TopSkor → ClubIndex.
//    After:  Hero → LiveSpotlight → Jadwal + Hasil side-by-side
//      (prime real estate) → [PeluangJuara | Klasemen-compact |
//      TopSkor] three-col sidebar → ClubIndex.
//    Klasemen compressed to top 6 + bottom 3 + dashed divider
//    ("… 10 mid-table clubs …"). Expand toggle reveals full 20
//    rows + the form pill column. Zone legend trimmed to abbreviations
//    (UCL / UEL / UECL / REL). Schedule now dominates above the fold;
//    table becomes a compact reference card.
//
// No routing, no hook refactor, no API endpoint change. EPL chunk
// 26.84 → 30.52 KB / 7.05 → 8.57 KB gzipped (+1.52 KB gzip). NBA,
// F1, Tennis, Home chunks byte-identical — only src/pages/EPL.jsx,
// src/hooks/useEPLMatchOdds.js (new), src/lib/sports/epl/clubs.js
// (polyAbbr field + doc update) touched.
//
// Full changelog: v0.5.6-SHIP-NOTES.md at repo root.
//
// v0.5.5 — EPL Polymarket champion odds. Phase B, ship 1 of 3.
// Adds a "Peluang juara" (Title odds) section to the EPL dashboard
// showing live Polymarket 2025-26 Premier League champion odds.
//
// Zero-risk refactor approach: existing fetchChampionOdds() (NBA)
// left untouched to guarantee no NBA regression. A NEW
// fetchPolymarketEventOdds(slug, { validateName }) function added
// alongside it — sport-agnostic, accepts any Polymarket event slug
// and an optional name filter. NBA's hot path is byte-identical.
//
// Files:
//   - src/lib/api.js          — add fetchPolymarketEventOdds() (+60 LOC)
//   - src/hooks/useEPLChampion Odds.js — new hook (+109 LOC), polls 60s,
//     aliases Polymarket shortnames (Man City / Nottm Forest / etc.) to
//     our canonical CLUBS_BY_NAME keys, joins with club metadata
//     (slug, accent, handle) so UI can link through to club pages and
//     tint with the right brand color.
//   - src/pages/EPL.jsx        — new PeluangJuara section (+108 LOC),
//     renders top 6 clubs with accent-tinted bar, % mono 13px, and
//     delta-vs-last-poll chip. Renders nothing when odds array is empty
//     (error state, off-market, etc.) — zero dead chrome.
//
// Polymarket event: 'english-premier-league-winner' (active, $4.2M
// liquidity, $230K 24hr volume, ends 2026-05-27). Per 2026-04-21:
// Man City 58%, Arsenal 43%, everyone else <1%.
//
// Pre-refactor NBA Polymarket baseline saved + re-verified post-refactor:
// fetchPolymarketEventOdds('2026-nba-champion') returns the same top-5
// teams at the same percentages as the baseline (OKC 49%, SAS 15%,
// BOS 14%, DEN 9%, CLE 5%). NBA fetchChampionOdds() itself untouched.
//
// No routing, no UI structure change. No existing hook edited. NBA,
// F1, Tennis, Home untouched.
// Full changelog: v0.5.5-SHIP-NOTES.md at repo root.
//
// v0.5.4 — EPL X/Twitter handle data. Pure data addition, zero code path
// touched. Adds a `handle` field to every entry in src/lib/sports/epl/
// clubs.js (20 clubs). Parallel to the NBA TEAM_META.handle pattern in
// src/lib/constants.js. Ready for per-club "Key Accounts" panels to
// consume via CLUBS_BY_SLUG[slug].handle — no component wiring yet; the
// data just sits there for the next ship.
// Handles verified against official club X profiles 2026-04-21.
// No routing, hook, data-fetch, UI, or behavioral change.
//
// v0.5.3 — EPL dashboard Phase A: live spotlight + share + Fangir.
// Pure-reuse polish — no new APIs, no schema changes, no shared-component
// refactor (NBA untouched). Three additive wins:
//   1. Live match spotlight — useEPLFixtures already tracks statusState
//      ('pre'|'in'|'post'). We split upcoming[] into live[] (in-progress) +
//      scheduled[]. New LiveSpotlight card renders at top of EPL dashboard
//      when any match is live; disappears cleanly on off-days. Score,
//      clock, team accents, and a prominent SHARE button per live match.
//   2. ShareButton wired onto every fixture + result row — Jadwal,
//      Hasil, and LiveSpotlight. Bahasa-casual share copy:
//         Live:     "ARS 2 – 1 MCI · 67' · live-update-nya di gibol.co ⚽"
//         Upcoming: "Arsenal vs Man City · Sab 26 Apr · 21:00 WIB · jadwal di gibol.co ⚽"
//         Final:    "FINAL · ARS 2 – 1 MCI · recap di gibol.co ⚽"
//      Cascading share: navigator.share → WhatsApp / X / Copy popover.
//      Analytics events: epl_share_live / epl_share_upcoming /
//      epl_share_final (channel breakdown auto-tagged).
//   3. FangirBanner (live 2026 IBL Trading Cards Pack — Rp 37.500)
//      rendered in the EPL footer. Same banner NBA already ships; zero
//      new code for the component, just an import + mount. Partner funnel
//      now runs off the EPL window too.
// Bundle impact (positive): Vite extracted FangirBanner + ShareButton
// into shared chunks because they now have multiple importers. FangirBanner
// 10.62 KB → 2.89 KB standalone; ShareButton emerges as a 4.04 KB shared
// chunk (previously inlined in F1 + NBA). F1Race chunk dropped 12.24 →
// 8.31 KB in the reshuffle. EPL chunk 19.31 → 23.25 KB (+3.94 KB raw for
// live-spotlight + share helpers + LiveSpotlight component).
// NBA dashboard chunk: 98.49 → 98.53 KB (+40 bytes, natural Vite drift).
// All 137 prerender routes still 200; no routing, no hook, no API
// change. Touched only src/pages/EPL.jsx (+162 LOC).
// Verified no shared-component source file was modified (git diff
// --name-only returns only src/pages/EPL.jsx).
//
// v0.5.2 — Fangir pack-variant commercial update + v2 redesign Phase 1
// foundation (no visible change). Two commercial + two infrastructure
// changes in one ship:
//   1. FangirBanner pivots from Set variant (Rp 2.500.000) to Pack variant
//      (Rp 37.500) — https://fangir.com/products/2026-ibl-trading-cards?
//      variant=45045111783600. Title becomes "2026 IBL Trading Cards ·
//      Pack"; copy updated BI + EN to reflect 5 random Season 2026 cards
//      from 167 base + insert & parallel chase. Hero image + Fangir
//      wordmark URLs unchanged (same Fangir CDN assets). Lower price
//      point = materially better funnel conversion during the playoff
//      window.
//   2. v2 redesign Phase 1 foundation — tokens already ship in index.css
//      (Brand v1 matches v2 spec) so no CSS work. Added:
//      - src/lib/flags.js gains a `UI` namespace with 9 flags (ui_v2,
//        cmd_center, terminal_home, pickem, xg_per_shot, tennis_pbp,
//        f1_tyre_pit, wc2026_teaser, liga1_teaser) — all default FALSE.
//        Env override via VITE_FLAG_* (same pattern as existing VISIBLE/
//        LIVE). Flags coexist; no existing flag renamed or removed.
//      - src/lib/AppContext.jsx extended: theme gains 'auto' value
//        (follows OS, live-updates via matchMedia listener);
//        effectiveTheme derived for callers that need the concrete
//        applied value. New setTheme('auto'|'dark'|'light') method for
//        v2 top-bar popover; toggleTheme preserved for back-compat.
//        New accent state bridges per-user hex override to the --accent
//        CSS var (validated as /^#[0-9A-F]{6}$/i). Lang storage keeps
//        internal 'en'|'id' — 'bi' accepted as read synonym mapped to
//        'id' so v2 UI can label the toggle "BI" without breaking any
//        existing user's stored pref. All persistence via localStorage;
//        one-time migration costs nothing to first-load users.
//      - src/lib/i18n.js gains 34 v2 keys in both en + id blocks
//        (home, liveNow, followingNav, addToBoard, multiMatch, aiRecap,
//        championshipOdds, topPerformers, etc. + state + share-card +
//        theme-popover labels). No existing key renamed or removed.
//   3. Vocabulary guard — new scripts/check-vocab.mjs greps src/ for
//      the forbidden-vocabulary list defined in docs/v2-design-gaps.md
//      §D8 (Indonesian wagering terms + English equivalents). Runs as
//      the first step of `npm run build` so regressions can't land.
//      Tested both directions (passes clean source, fails on test
//      regression with exit 1). `npm run check:vocab` exposes it
//      standalone.
//   4. Glossary copy scrub — 'Peluang juara' definition updated so
//      "pergerakan pasar" describes the prediction-market movement
//      rather than the prior phrasing. Only user-facing instance of
//      the forbidden list anywhere in src/.
// No routing, data-fetch, hook, or component rendering changes visible
// to users (Fangir price + copy excepted). Every v2 flag defaults off
// so ui_v2 remains entirely dormant until Phase 3 ships the feature-
// flagged Home V1 variant. Rollback path: clear VITE_FLAG_* env vars
// (already the default), revert the commit, or just kill the Fangir
// pivot by editing FangirBanner back to the set-variant URL.
// Full changelog: v0.5.2-SHIP-NOTES.md at repo root.
//
// v0.5.1 — Tennis Home-card hotfix + Liga 1 temporary remove. Two symptoms
// in the v0.5.0 prod build:
//   1. The tennis dashboard card never rendered on Home. Root cause: three
//      shared lookups still had hardcoded sport-id whitelists that didn't
//      include `tennis` — SportIcon PATHS + BG_BY_ID, sportColor
//      SPORT_COLOR_DARK + SPORT_COLOR_LIGHT, and the `--sport-*` CSS vars
//      in index.css. SportIcon returned null for unknown id which broke
//      the Chip accent resolution and prevented the card from prerendering.
//   2. The 6-card layout wrapped awkwardly (4+1 in the secondary row).
// Fix:
//   - Added `tennis` to SportIcon PATHS (ball + seam curves, same viewBox
//     pattern as nba/pl) and BG_BY_ID (`rgba(212,161,58,.22)`).
//   - Added `tennis` to sportColor dark (`#e6c47a`) + light (`#d4a13a`).
//     Lightened dark hex passes AA on --ink-1 parchment.
//   - Added `--sport-tennis: #D4A13A` to both dark + light root tokens.
//   - Dropped Super League Indonesia (`liga_1_id`) from Home DASHBOARDS so
//     the secondary row is a clean 4-wide: f1 · epl · tennis · fifa_wc.
//     The /liga-1-2026 route stays live in App.jsx for direct-link access;
//     entry restored when Liga 1 data ships.
// No routing, data-fetch, or other page changes. NBA/F1/EPL/tennis/FIFA
// cards all render with their own icon + accent now.

export const APP_VERSION = '0.5.8';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
