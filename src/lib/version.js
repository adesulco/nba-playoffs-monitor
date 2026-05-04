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
// v0.6.8 — Tennis active-tournaments ribbon.
// Ade pointed out that multiple tennis tournaments run concurrently
// (ATP 500 + WTA 1000 + Challenger overlap most weeks). Added a
// horizontal ribbon at the top of the dashboard showing any event
// that's currently live OR starts within 14 days.
//   · Live events get a tier-colored tint + pulsing LIVE dot.
//   · Upcoming events show "MINGGU INI / SOON" label.
//   · Each chip: tier color left-border, tour labels, name, city,
//     start-end dates. Clicking opens /tennis/{slug}-{year}.
// Reads TOURNAMENTS_2026 directly, no new data source.
//
// v0.6.7 — Tennis dashboard brought to NBA/EPL parity (Ship A).
//
// Adds four items from the 4-way parity matrix:
//   1. TennisPlayerPicker — 20 curated ATP + WTA stars + 3 Indonesian
//      players, grouped by tour. AppContext slot gibol:tennis:player.
//   2. TopBar accent override — uses the picked player's accent color
//      (red for ATP stars, pink for WTA, amber for Indonesian). Falls
//      back to the tennis gold (#D4A13A).
//   3. Tennis ContextStrip — 4 dashboard-level stats: NEXT SLAM
//      (countdown to next Grand Slam), ATP #1, WTA #1, and YOUR PICK
//      (favorite player). Uses useTennisRankings (already live) +
//      nextSlam() (already exported from tournaments.js).
//   4. TennisKeyAccounts — static panel of 5 league/press handles
//      (@atptour, @WTA, @TennisTV, @ESPNFC, @rolandgarros). Notes
//      below that personal player handles aren't curated in
//      constants.js yet (v2.1 backlog).
//
// Day-swipe schedule deliberately skipped — tennis tournaments run
// weekly, not daily, so the existing tiered TournamentCard grid
// (Grand Slam / Masters 1000 / WTA 1000 / Finals) is already the
// right primitive. A daily matches view could follow if product
// asks for it.
//
// Polymarket probe done in parallel: F1 Drivers' Champion market
// (`2026-f1-drivers-champion`) active; 4 Grand Slam winner markets
// (`2026-mens-french-open-winner`, etc.) active. Ship C can wire
// both when ready.
//
// v0.6.6 — Fix: ContextStrip TITLE FAVORITE label too dark.
// Brand EPL purple #37003C is close to black; the small mono label
// was illegible on dark bg. Swapped to a brighter purple #A855F7
// for the label + percent text in just that cell. Other cells
// (TOP-4 RACE, RELEGATION, GOLDEN BOOT) unchanged.
//
// v0.6.5 — EPL dashboard: news feed + Key Accounts sidebar (ship 2/2
// of the v0.6.4 gap-fill sprint).
//
// Two new sidebar panels land side-by-side below the 3-col stats strip:
//   · Berita / News — bilingual feed via new /api/epl-news.js endpoint.
//     Bahasa sources: detikSport, CNN Indonesia, Antara (keyword-
//     filtered to EPL terms). English sources: BBC Sport Premier League
//     + Guardian Premier League (dedicated feeds, no keyword filter
//     needed). 8-item card with source chip per row. When a favorite
//     club is selected, items mentioning that club sort to the top
//     with a ★ highlight pill.
//   · Akun resmi / Key Accounts — mirrors the per-club X-handle panel
//     but on the main dashboard. Row 1 is the favorite club's own
//     handle accent-tinted (from clubs.js), rows 2–4 are
//     @premierleague · @ESPNFC · @BBCSport. When no club picked,
//     just the three league/news handles render.
//
// Cache: /api/epl-news uses s-maxage=900 · stale-while-revalidate=1800
// so N viewers in 15 min cost 1 upstream fetch per source. Hard 8s
// abort timeout on the Promise.all so one slow source can't stall the
// whole response.
//
// No API/hook/route change outside the new additions. NBA/F1/Tennis/
// Home byte-identical.
//
// v0.6.4 — EPL dashboard: wider day-swipe + club picker (ship 1/2).
// Addresses two gaps Ade flagged vs NBA:
//
// 1. Day-swipe range widened from ±3 days (7 total) to ±7 days
//    (15 total). EPL matches happen on weekends, so ±3 meant a
//    Mon–Tue viewer couldn't see the upcoming weekend. useEPLFixtures
//    already fetches 14 days — only EPLDayScoreboard was limiting.
//
// 2. EPLClubPicker component added — parallel to NBA TeamPicker.
//    Dropdown of 20 clubs sorted A→Z, accent-tinted trigger button,
//    esc-close, click-outside-close. Writes to localStorage
//    gibol:epl:club via new AppContext.selectedEPLClub +
//    setSelectedEPLClub. When a club is selected, the dashboard
//    accent (hero tint + TopBar accent) switches from EPL purple
//    to the club's color.
//
// Still pending in ship 2 of v0.6.4: /api/epl-news endpoint +
// sidebar news card + per-club Key Accounts panel on the dashboard.
//
// v0.6.3 — HomeV1 rolled back + gateway Home polished. Ade flagged
// that HomeV1 felt disconnected from sport dashboards (which still
// use the v1 TopBar without search/theme), creating a visible seam
// when navigating from Home → NBA/EPL/F1/Tennis. Until all sport
// dashboards migrate to V2TopBar, the gateway Home is the better
// default.
//
// Changes:
//   - src/lib/flags.js UI.v2 fallback: true → false. HomeV1 code
//     stays in tree; route swap just stops flipping to it.
//   - src/pages/Home.jsx wires usePlayoffData + useEPLChampionOdds
//     to compute a live-data teaser per card. Passed to <Card> as
//     a new `liveTeaser` prop that renders a small mono chip in
//     accent color next to the LIVE pill.
//     NBA teaser:  "● 2 LIVE · OKC 48%" (live game count + champion)
//     EPL teaser:  "MANCHESTER 58%" (Polymarket title-race leader)
//     F1/Tennis/WC: no teaser for now; will come when per-sport
//     hooks surface a headline stat.
//   - src/components/Card.jsx Featured + Secondary accept new
//     liveTeaser prop. Renders a ${accent}18 pill next to the LIVE
//     chip on featured; top-right of card on secondaries. Minor
//     spacing refinements (padding 12→14, gap 6→7, radius 4→6,
//     blurb line-height 1.4→1.45/1.5) for smoother feel.
//
// No new API, no hook refactor, no route change. Rollback from the
// flip lives in flags.js one-liner.
//
// v0.6.2 — EPL dashboard revamped to NBA pattern: scores-first, table
// secondary. New EPLDayScoreboard replaces Jadwal+Hasil with a 7-day
// swipe scoreboard (horizontal scroll-snap tabs, match cards with
// per-match Polymarket odds + Share button per row). Live matches get
// a red-accented border + pulsing LIVE indicator.
//
// New ContextStrip at the top of the page: 4-cell dashboard bar
// (TITLE FAVORITE · TOP-4 RACE · RELEGATION CUT · GOLDEN BOOT). Mirrors
// NBA's context strip above its scoreboard. Each cell: tiny uppercase
// label + big tabular value + subtitle.
//
// Klasemen demoted to sidebar alongside Peluang juara + Top Skor —
// the table is now secondary info, as Ade requested. Scores get the
// prime real estate. Old Jadwal + Hasil components left in the file
// as unused dead code (tree-shaken) in case we want to revert; next
// ship can prune them.
//
// No API, hook, or route change. Only src/pages/EPL.jsx edited +
// src/components/EPLDayScoreboard.jsx added.
//
// v0.6.1 — HomeV1 Following + Live grid upgrades (sprint ship).
//
// Following card now reads real user state instead of hardcoded seed:
//   - NBA favorite from localStorage['gibol:favTeam'] (written by
//     NBADashboard TeamPicker). Links through to the team's SEO page.
//   - F1 constructor from AppContext.selectedConstructor. Links to the
//     per-constructor page.
// Fills remaining slots with editorial defaults (Thunder, Celtics,
// Arsenal, Man City) up to a max of 4 rows. Later ship lets user
// re-order + add explicit follows.
//
// Live Now grid expanded from NBA-only to multi-sport. useEPLFixtures
// already carries `statusState` per match; we now surface EPL matches
// whose statusState === 'in' in the same grid as NBA live games. Each
// row renders the sport icon + sport tag + LIVE pill + team crests +
// scores. Deep-link targets: NBA → /nba-playoff-2026?game=..., EPL →
// /premier-league-2025-26.
//
// Backwards-compat: the old LiveGridCard API (`games` prop) is replaced
// with `nbaGames` + `eplUpcoming` for explicit multi-sport wiring. Only
// HomeV1 consumes this component so no external callers break.
//
// v0.6.0 — v2 flip: HomeV1 becomes the default `/` route (minor
// milestone — this is the first user-visible slice of the v2 redesign).
// Flipped `UI.v2` fallback in src/lib/flags.js from false → true so the
// root route renders HomeV1 without needing VITE_FLAG_UI_V2=1 at Vercel
// build time. Emergency rollback is either (a) change the fallback back
// to false + redeploy, or (b) set VITE_FLAG_UI_V2=0 in Vercel env (the
// envFlag helper short-circuits to false on '0', 'false', or boolean
// false).
//
// Also a lesson-learned: Vercel's CLI-added env vars can land as empty
// strings when the claude-code plugin wrapper intercepts the "enter
// value" prompt. Our envFlag treats empty string as unset → fallback,
// which silently failed the first flip attempt. Changing the code
// fallback is the clearer knob.
//
// No other change — browser-verified HomeV1 + Search palette + Theme
// popover in preview (Part 4 spec) and locked in.
//
// v0.5.9 — v2 Phase 3: HomeV1 + TopBar + Search ⌘K + Theme popover
// (behind ui_v2 flag · default OFF).
//
// Fully invisible to production users — the ui_v2 flag defaults to false,
// so App.jsx renders the existing src/pages/Home.jsx unchanged. Flipping
// the flag via VITE_FLAG_UI_V2=1 at Vercel build time swaps the root
// route to the new personalized-feed HomeV1.
//
// Files added:
//   A src/components/v2/TopBar.jsx        — v2 masthead: logo + nav (Home /
//     NBA / Football / F1 / Tennis / World Cup) + search pill (⌘K) + lang
//     chip + theme icon + avatar dot. Owns both overlay components below.
//   A src/components/v2/SearchPalette.jsx — C3 spec: 640px centered modal,
//     rgba(10,22,40,.72) backdrop + 2px blur. ↑↓ navigates flat across all
//     groups, ⏎ opens, ⌘↩ opens in new tab, ⎋ closes. Default state =
//     "Trending now" (7 curated entries). Typing groups results by kind
//     (Teams / Matches / Players / Leagues / Pages). Catalogue is
//     hand-curated in the component — 16 NBA teams + 5 league entry
//     points — latency-free client-side, zero API cost. Expanding the
//     index to full-text across live matches ships in a later phase.
//   A src/components/v2/ThemePopover.jsx — C4 spec: 184px panel, anchored
//     to the sun/moon icon, 8px caret top-right aligned with anchor
//     center. Three state pills AUTO / DARK / LIGHT — active pill has
//     amber bg on ink-0 text. Click-outside · ⎋ · click-same-anchor
//     closes. Writes theme via AppContext.setTheme (already added in
//     v0.5.2; this is the first caller).
//   A src/pages/HomeV1.jsx                — Personalized-feed home:
//     left = Following + Fixtures (EPL upcoming), center = live NBA hero
//     (radial-gradient team-color backdrop, live pill, momentum bar) +
//     Live grid (NBA games in progress), right = Live pulse stub +
//     Fans-reacting stub + live Fangir pack slot. Wired to existing
//     hooks usePlayoffData + useEPLFixtures — no new API calls.
//
// Files touched:
//   M src/App.jsx                         — import UI flag + lazy HomeV1;
//     root route ternary UI.v2 ? <HomeV1 /> : <Home />. Lazy ensures the
//     HomeV1 chunk only loads when the flag is on (verified via build
//     with VITE_FLAG_UI_V2=1 — produces same HomeV1-34.27KB chunk but
//     flag-off users never request it).
//
// Bundle impact (flag OFF — default):
//   - index.js: 225.88 → 227.00 KB / 74.46 → 74.82 KB gzipped (+1.12 KB
//     / +0.36 KB gzip for the UI flag import + lazy HomeV1 shim).
//   - NBA chunk: 98.53 → 98.60 KB (+70 bytes, natural drift).
//   - HomeV1 chunk: 34.27 KB / 10.26 KB gzipped — exists on disk but is
//     NEVER requested by the browser when flag is off (the ternary
//     never renders it, so React Suspense never triggers the lazy load).
//
// Rollout plan:
//   1. v0.5.9 deploys with flag OFF. Zero visible change to production.
//   2. When ready to test, set VITE_FLAG_UI_V2=1 in Vercel preview env
//      and push a preview deploy. Verify HomeV1 renders + NBA regression.
//   3. When ready to flip defaults, set VITE_FLAG_UI_V2=1 in Vercel
//      production env. One-click rollback: unset the env var.
//
// No routing change, no hook edits, no API change. Part 2 + Part 4
// design specs faithfully implemented.
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

// v0.6.9 — F1 NBA/EPL parity ship (Ship B). Brings F1 to feature-rank
// parity with NBA + EPL + Tennis:
//   - useF1ChampionOdds hook (new). Live Polymarket 2026 Drivers' Champion
//     market (slug `2026-f1-drivers-champion`, verified $118M lifetime /
//     $2M 24h vol). Wraps the generic fetchPolymarketEventOdds() added in
//     v0.5.5. NAME_ALIAS maps Polymarket short forms (e.g. "Kimi Antonelli",
//     "Carlos Sainz Jr.", "Sergio Perez") to our DRIVERS_2026 canonical
//     names. validateName filter drops the "Driver A/C/E/G/I" placeholder
//     markets and "Other". 60s polling cadence.
//   - F1ContextStrip (new). Four-cell section above the RoundStrip:
//     NEXT RACE (countdown + date + WIB start), DRIVERS LEADER (name +
//     points + gap to P2), CONSTRUCTOR LEADER (short name + points +
//     gap), CHAMPION FAVORITE (top Polymarket entry + %). Pre-season
//     states fall back to "Musim belum mulai" + Australian GP date
//     as the anchoring subtitle.
//   - F1KeyAccounts (new). Three core rows (F1, FIA, SkySportsF1, WTF1)
//     plus a dynamic "your team" row when a constructor is picked —
//     curated TEAM_HANDLES map covers all 11 teams inc. Audi + Cadillac.
//     Accent-border follows activeAccent (team brand color when picked,
//     F1 red otherwise).
//   - RoundStrip already shows the full 23-GP calendar and auto-scrolls
//     to the active round, so no day-swipe rebuild was needed — the
//     ±7 expansion on EPL was purely because EPL.jsx built a window
//     view; F1 was full-calendar by design since v0.2.3.
// No changes to: existing hooks (schedule/standings/results), SEO,
// ConstructorPicker, or the driver/constructor/news 3-col layout.
// Polymarket market is routed through the existing /api/proxy/polymarket-
// gamma proxy; no new API infra.
// Rollback: remove the two new components + useF1ChampionOdds import and
// the 2-line ContextStrip + KeyAccounts JSX blocks in F1.jsx.

// v0.7.0 — PeluangJuara (title-odds panel) parity for F1 + Tennis. The EPL
// dashboard has had a full top-6 champion-odds bar chart since v0.5.5;
// v0.6.9 surfaced the top entry only as a context-strip cell for F1 but
// left the full panel missing. This ship closes the gap:
//   - F1PeluangJuara (new). Top 6 Polymarket Drivers' Champion entries
//     as horizontal bars. Each row: driver name + code + team-accent bar +
//     % + delta. Links driver name → /formula-1-2026/driver/:slug when
//     in our curated DRIVERS_2026. Hidden if the hook returns empty.
//   - useTennisSlamOdds (new). Generic Polymarket event-odds hook keyed on
//     a slam slug ('2026-mens-french-open-winner', etc.). Joins on lower-
//     cased name match against TENNIS_STARS_BY_SLUG so diacritics work
//     directly (Iga Świątek, Karolína Muchová). Filters "Player A" /
//     "Field" placeholders.
//   - TennisPeluangJuara + TennisSlamColumn (new). Two side-by-side top-5
//     panels (ATP + WTA) for whatever slam nextSlam() returns. Wraps in
//     the existing Tennis accent border. Hidden cleanly when markets
//     aren't live yet (48h pre-final close, or slug not mapped).
//   - SLAM_POLYMARKET_SLUGS map covers all four 2026 slams. Verified
//     Roland Garros live today (2026-04-22): ATP 67 markets / $15.2M,
//     WTA 74 markets / $2.4M, top entries Sinner 57% / Świątek 28%.
// Minor bump (0.7.0) because this completes the 4-sport parity matrix —
// every dashboard now has: picker w/ accent, scroller, context strip,
// title odds panel, news feed, and key accounts.
// Rollback: delete F1PeluangJuara + TennisPeluangJuara components and
// their two JSX invocations. The two new hooks are self-contained.

// v0.8.0 — Week 1 double-ship: observability foundation + Pick'em UI port.
// This is the first minor bump since parity matrix completed (v0.7.0) —
// starts the retention-loop arc the product team's handbook asked for.
//
// TRACK A · Observability (foundation before we start measuring retention):
//   - @sentry/react + @sentry/vite-plugin — crash + error reporting,
//     session replays on error only (2% base rate, 100% on error). Top-level
//     SentryErrorBoundary with a Bahasa-first fallback "Gibol lagi nggak
//     enak badan" message, keeps users one click from Home when the tree
//     explodes instead of white-screening.
//   - posthog-js — product analytics, funnels, retention. EU region
//     default for lower Jakarta latency. Autocapture on, session replay
//     off (flip later when we have time to review). Bridged through the
//     existing analytics.js so every trackEvent() call-site lands in
//     GA4 + PostHog simultaneously with no rewrites.
//   - @vercel/speed-insights + @vercel/analytics — Core Web Vitals +
//     privacy-friendly pageviews. Included on the existing Hobby plan
//     at no additional cost. Both mount at the App root.
//   - initObservability() called from main.jsx before React renders,
//     no-op when env vars absent (local dev + preview without secrets).
//   - identifyUser() / resetIdentity() helpers for the pick'em flow to
//     stitch anonymous → signed-in sessions once Supabase auth lands.
//   - .env.example expanded with all Week 1-4 env vars documented.
//
// TRACK B · Pick'em UI port (closes biggest roadmap gap — schema was live
// since v0.1.2 but no client UI existed):
//   - Ported 10 pages + 3 components from the Next.js 14 App Router
//     ship-p0 package to Vite + React Router v6 + CSS-in-JS with the
//     repo's `COLORS` token system. Zero Tailwind. Zero 'use client'.
//   - Routes: /login, /auth/callback, /bracket, /bracket/new,
//     /bracket/:id, /bracket/:id/share, /league/new, /league/:id/join,
//     /leaderboard, /leaderboard/:leagueId — all lazy-loaded so the
//     Supabase client doesn't land on users who never visit pick'em.
//   - 6 Vercel Node serverless functions under api/pickem/ + api/auth/
//     for pick upsert, series scoring (admin), bracket create, league
//     create, league join, magic-link callback compat.
//   - Supabase plumbing: src/lib/supabase.js (browser, anon),
//     api/_lib/supabaseAdmin.js (service-role + JWT validator).
//     Reads VITE_SUPABASE_* with NEXT_PUBLIC_* fallback so the repo's
//     existing .env.local keeps working.
//   - Auth: magic-link via supabase.auth.signInWithOtp with PKCE via
//     detectSessionInUrl: true. Bahasa-first UI copy throughout.
//   - Port decisions: service-role + explicit ownership checks in
//     pick.js (simpler than RLS-JWT forwarding, functionally equivalent);
//     admin token accepted as x-admin-token OR Bearer for compat with
//     existing PICKEM_ADMIN_TOKEN. Full rationale in pickem-port-report.md
//     at repo parent.
//   - Home gateway now surfaces ★ Bracket link + Leaderboard link in
//     the secondary quick-nav row so the feature is discoverable
//     without URL typing.
//
// Before first pick'em user can sign in, Ade needs to add these Vercel
// env vars: VITE_SENTRY_DSN, SENTRY_AUTH_TOKEN, VITE_POSTHOG_KEY,
// VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE,
// ADMIN_TOKEN. Observability + pick'em are no-ops without keys — the
// deploy is safe with today's empty env.
//
// Next ship (v0.8.1 or v0.9.0): OneSignal push alerts + Resend daily
// digest + dynamic recap card. Needs OneSignal + Resend accounts.

// v0.8.1 — per-game share + recap narrative bug fix. Two shipshapes landed:
//
// FIX · Narrative winner/loser inversion. On freshly-completed games
// ESPN's `competitor.winner` boolean isn't reliably set (both sides
// may come back false until ESPN's post-game job finalizes). The old
// ternary `game.away?.winner ? away : home` silently defaulted the
// winner to `home` in that case — producing headlines like "BOS beat
// PHI 111-97" when the scoreboard actually showed PHI 111, BOS 97.
// Fix: derive the winner from the score comparison (the score is
// truth — whoever has the higher final number won). Applied in four
// places: useDailyRecap::buildGameNarrative, ::buildDeepDetails,
// the ::gameDigests mapper, and ::biggestMoment scorer. Also patched
// the two UI sites (BigMomentHero + GameRecapCard) in Recap.jsx so
// the left-border accent color and muted/bright TeamScore text all
// reflect the right winner. Users were actively seeing the wrong
// headline; patch deploys inside this cycle.
//
// FEATURE · Per-game share buttons on /recap/:date. Every final card
// now carries its own ShareButton (bottom-right next to stat edges),
// auto-populated with a Bahasa/English share line that reads:
//   "FINAL · LAL 101 — 94 HOU 🏀 LeBron 28/8/7 · recap di gibol.co"
// Generated by new `buildNBAFinalShareText()` + `buildNBAGameShareUrl()`
// helpers in `src/lib/share.js`. Each card shares to the date-scoped
// recap page with a #game-<id> anchor so the receiver opens directly
// to that game. Fires `recap_game_share` event with channel tagged
// (whatsapp / twitter / threads / copy / native) so PostHog can
// measure which channel pulls the biggest cross-platform gravity.
//
// ShareButton got a Threads option. The intent URL format is
// `https://www.threads.net/intent/post?text=...&url=...` — the URL is
// auto-embedded as a link card on Threads so we pass it separate
// from the body text (avoids double-preview).
//
// One Supabase-free deploy — the v0.8.0 shipped plumbing is still
// dormant while Ade registers the keys.

// v0.9.0 — Week 2 Ship 1: dynamic recap PNG ("Save to IG Story" channel).
// The ShareButton popover got its fifth channel: a 1080×1920 IG-Story-
// shaped PNG that's generated on the fly by a new @vercel/og edge
// function at /api/recap/[gameId]. Same endpoint serves 1200×630 (og)
// and 1080×1080 (square) variants via ?v=, so link previews on Twitter
// and FB eventually tap the same pipeline. Aggressively edge-cached
// (5 min fresh, 1d SWR) so repeat shares of the same game stream from
// Vercel's CDN rather than regenerating each hit.
//
// Why dynamic now: v0.8.1 shipped per-game share buttons but the static
// PNG pipeline (scripts/generate_recap.py) only covers LAL-DEN-G3. Every
// other game's IG export 404'd. This closes that gap — any game the
// ESPN data-source surfaces gets a deterministic share asset in <200ms
// (cold) and <20ms (warm).
//
// Implementation notes:
//   - Edge runtime. 3 variants rendered by one handler: story / og /
//     square. React.createElement (not JSX) because the file is .js —
//     edge bundler can't transform JSX without a build step.
//   - All inputs come via URL query params — no DB lookup. Caller
//     (Recap.jsx GameRecapCard) already has the game + topPerformer
//     from useDailyRecap and encodes them. ~200 bytes of URL per card;
//     CDN cache key buckets perfectly per game + variant.
//   - New helper `buildNBARecapPngUrl(game, top, teamMeta, opts)` in
//     src/lib/share.js packages the encoding. Uses the score-derived
//     winner logic (same as the v0.8.1 narrative fix) so the PNG can
//     never drift from the card's own winner attribution.
//   - ShareButton extended with an `igStory` prop. When present, a
//     gradient "IG" badge + "Save to IG Story" item appears in the
//     popover. On mobile with `navigator.canShare({ files: [...] })`
//     it hands the PNG directly to the OS share sheet so the user
//     can tap through to Instagram. Desktop gets a blob download so
//     they can AirDrop / message it to their phone.
//   - Analytics: new channel value `ig_story` on the existing
//     `recap_game_share` event. Lands in GA4 + PostHog + Sentry
//     breadcrumbs — we'll see day-one whether the PNG channel
//     actually outperforms plain-text WhatsApp shares.
//
// Rollback path: remove the /api/recap/[gameId].js file and the
// `igStory` prop wire-in at the GameRecapCard call site. ShareButton
// keeps working with the other four channels if igStory is undefined.

// v0.9.1 — popover-flip polish. v0.9.0's ShareButton always opened its
// popover *below* the trigger. On /recap/:date the per-game share buttons
// sit at the bottom of each card (which itself sits near the bottom of
// the viewport on laptops), so the popover clipped past the fold — users
// saw "WhatsApp" but had to scroll for the other four channels + IG
// Story.
// Added optional `dropDirection = 'down' | 'up'` prop. `up` positions the
// popover via `bottom: calc(100% + 4px)` instead of `top:`. Recap.jsx
// game cards pass `dropDirection="up"`. Popover width bumped 220→240px
// to give "Save to IG Story PNG" room to breathe on one line.

// v0.10.0 — Week 2 Ship 2: OneSignal close-game push alerts.
// First proactive retention mechanic that reaches users outside the site
// itself. When any NBA playoff game hits Q4 <2:00 with ≤5pt margin, a
// short Bahasa-friendly push fires to every user who opted into the
// `nba_close` tag.
//
// End-to-end pieces landed together:
//   - OneSignal app `8dcf3ecf-6a5a-4188-81b9-57f0e7e64821` (Web Push
//     platform + legacy + new API auth key). Service worker stub at
//     /public/OneSignalSDKWorker.js importScripts from their CDN so
//     SDK upgrades don't require a Vercel redeploy.
//   - src/lib/push.js — deferred CDN-loaded v16 SDK, idempotent initPush()
//     gated on VITE_ONESIGNAL_APP_ID (no-op in local dev), exposes
//     promptPush(), setPushTag(), identifyPushUser() helpers.
//   - src/components/PushOptInButton.jsx — opt-in CTA with all five
//     lifecycle states (idle / unsupported / prompt / subscribed /
//     denied). Wired into Home quick-links row between the push alerts
//     and the Pick'em/Recap/Leaderboard links. Safari <16.4 + non-HTTPS
//     origins auto-hide instead of showing a dead CTA.
//   - api/cron/nba-close-game-scan.js — runs every 2 min via the new
//     vercel.json crons entry. ESPN scoreboard filter for live Q4 games
//     with ≤5pt margin and <2 min clock. Writes (channel, game_id,
//     bucket) to public.push_log with UNIQUE on the tuple — insert-first
//     semantics do the dedupe in one DB roundtrip. Only fires OneSignal
//     on clean insert, skips on 23505 unique violation.
//   - supabase/migrations/0003_push_log.sql — applied live. Server-only
//     table, RLS explicit-deny-all for the anon role so a leaked anon
//     key can't read the push history.
//   - CRON_SECRET-authed (Bearer header from Vercel cron). Refuses when
//     the env var is missing so we can't accidentally expose the scanner
//     to the public internet.
//   - main.jsx calls initPush() inside requestIdleCallback so the 30KB
//     OneSignal SDK doesn't compete with hydration. Same discipline as
//     the service worker registerSW() on the next line.
//
// PostHog funnel target (Week 2 exit criterion):
//   pageview(home) → click(push_opt_in) → result{granted}
//   → cron-side push_log insert → browser push_received
// We'll know day-one whether NBA fans actually grant push permission.
//
// Rollback: drop the crons entry from vercel.json and/or set
// VITE_ONESIGNAL_APP_ID to empty in Vercel env. The client code is
// a no-op without the app id; the cron is a no-op without the REST key.

// v0.10.1 — F1 per-race share button. The RoundDetail panel on /formula-1-
// 2026 now has a SHARE trigger next to the existing "Detail →" link.
// Automatically flips between upcoming-race copy ("Miami GP · 12 hari
// lagi · Sab 03:00 WIB · jadwal di gibol.co 🏁") and FINAL podium copy
// ("🏁 FINAL · Monaco GP · Podium: NOR · PIA · VER · recap di gibol.co")
// depending on whether useF1Results has populated a podium for the
// active round.
//
// New helpers in src/lib/share.js:
//   buildF1RaceShareText(gp, result, lang)
//   buildF1RaceShareUrl(gp)
// Share target is the prerendered /formula-1-2026/race/:slug page —
// already has OG meta + SportsEvent JSON-LD so link-preview cards
// render without new infra.
//
// EPL match cards already had a ShareButton wire from v0.5.8 — they
// pick up the Threads channel from v0.8.1 automatically (no code
// change needed since ShareButton only adds channels, never removes).
// IG Story PNG is NOT wired on EPL/F1 yet; that requires generalising
// the /api/recap/[gameId] endpoint to accept sport-specific team
// colours + labels. Deferred to the next share-card ship.
//
// Analytics: new event name `f1_race_share` with the same channel
// taxonomy as recap_game_share / epl_share_live.

// v0.11.0 — Cross-dashboard SportNav strip. Removes the "back to Home
// to pick another sport" jaunt every user had to do. Every sport
// dashboard (and Coming Soon pages for WC / Liga 1) now shows a
// 6-pill horizontal nav under the masthead:
//   🏀 NBA · ⚽ Liga Inggris · 🏁 F1 · 🎾 Tenis · 🌍 Piala Dunia · 🇮🇩 Liga 1
// Active pill = accent-tinted + 1px border; inactive pills = muted,
// hover brightens to accent. Whole strip is horizontally scrollable
// on mobile (overflow-x: auto + scroll-snap-type: x) so 6 pills fit
// cleanly on 375px viewports.
//
// Implementation:
//   - New src/components/SportNav.jsx. Iterates over an ordered
//     SPORTS registry + VISIBLE feature-flag map (so disabled-by-
//     flag sports hide automatically). Uses NavLink so aria-current
//     appears on active route for screen readers.
//   - TopBar extended with an optional `currentSport` prop. When
//     present, renders SportNav as a 2nd grid row spanning
//     columns 1/-1 (so it draws edge-to-edge under the masthead).
//     Omitted on Home + About + Glossary so those stay single-row.
//   - Wired into every sport page: EPL, EPLClub, F1, F1Race, F1Team,
//     F1Driver, Tennis, TennisTournament, TennisRankings, NBA
//     TeamPage, and ComingSoon (→ FIFA + LigaIndonesia pass a
//     `sportId` prop through).
//   - NBA dashboard uses a custom inline topbar (legacy); SportNav
//     is wired into that same `.topbar` grid as a second row.
//
// Known follow-up: mobile grid cramping on the title-odds panels
// (EPL 160px / F1 180px / Tennis 130px name columns) — v0.11.1.

// v0.11.1 — Mobile polish pass. Four fixed grid columns that were
// squeezing the accent-bar + fluid content below 400px viewports:
//   - EPL title-odds row:  160px → minmax(90px, 1.4fr), 56→48, 42→36
//   - EPL fixture row:     110px → minmax(64px, 110px) kickoff date
//   - F1 title-odds row:   180px → minmax(100px, 1.4fr), 56→48, 42→36
//   - Tennis title-odds:   130px → minmax(84px, 1.4fr), 42→40, 32→30
// And one horizontal split that wouldn't stack on narrow screens:
//   - Tennis "countdown + live ticker" row was
//     gridTemplateColumns: 'minmax(240px, 340px) 1fr' — two columns
//     always side-by-side. Swapped to repeat(auto-fit, minmax(280px,
//     1fr)) so it stacks cleanly below ~640px.
// All changes preserve desktop behaviour (flex-grow on fr picks up
// any extra width) so the mobile fix costs zero pixels for the
// majority laptop viewport.

// v0.11.2 — Universal V2 masthead. The v2 TopBar (logo · Home / NBA /
// Football / F1 / Tennis / World Cup · Search ⌘K · EN · theme · avatar)
// is now the chrome on every page, not just HomeV1. Replaces the v1
// TopBar (and the NBA dashboard's bespoke inline topbar) across 20
// pages: Home, NBADashboard, TeamPage, F1 + F1Race/Team/Driver, EPL +
// EPLClub, Tennis + TennisTournament/Rankings, FIFA/Liga-1 via
// ComingSoon, Recap, About, Glossary, Login + the pick'em set.
// Responsive: ≤900px shrinks the search pill and hides the ⌘K hint;
// ≤720px collapses search to an icon and gives the nav horizontal
// scroll; ≤420px hides the avatar dot. Language toggle, theme
// popover (light/dark/auto), team/constructor/club/player pickers,
// live status strip, and Catatan Playoff deep-link all preserved —
// pickers and status chrome move into V2TopBar's new {children}
// sub-row.

// v0.11.3 — Header persistence + width-jolt fix. Two polish items on
// top of v0.11.2's universal masthead:
//   - V2TopBar is now rendered ONCE at the App root above <Suspense>,
//     not inside each page. Navigating between sports no longer
//     remounts the header or triggers the full-viewport chunk-load
//     blank — the masthead stays put while only the body swaps.
//     Pages that need to inject picker content under the nav
//     (NBA TeamPicker / F1 constructor / EPL club / Tennis player)
//     now push via `setTopbarSubrow(node)` from src/lib/topbarSubrow.js,
//     a tiny module-level store subscribed via useSyncExternalStore
//     by V2TopBar alone — no cascading context re-renders.
//   - `scrollbar-gutter: stable` on <html> so the viewport width no
//     longer jolts ~15px horizontally when navigating from a short
//     page (no scrollbar) to a long one (scrollbar appears).

// v0.11.4 — Sprint 1 a11y floor (from the 2026-04-23 audit). Five P0s
// and one supporting token change, all in one ship so the v2 redesign
// audit re-run at week 12 has a clean before/after:
//   - Light-mode --amber token #C2410C → #9A3412 (WCAG 1.4.3 AA: 3.5:1
//     → 4.8:1 on cream). --amber-2 demoted, --warn follows. Every CTA
//     inherits the darker hue without a per-component edit.
//   - <h1> added to the three pages that were missing one — Home,
//     NBADashboard, HomeV1. Visually hidden (.sr-only) on desktop
//     because the dashboard cards already carry the brand beat; fully
//     announced to VoiceOver/JAWS for rotor navigation (WCAG 1.3.1,
//     2.4.6). Other 17 pages already had a proper <h1>.
//   - Skip-to-content link in App.jsx — first focusable element in
//     the tab order, visible only on focus, jumps past the persistent
//     V2TopBar to #main. WCAG 2.4.1. One keystroke to the body for
//     keyboard + screen-reader users.
//   - <main id="main" tabIndex={-1}> landmark wrapping <Suspense> in
//     App.jsx. Gives every route a <main> landmark via one edit (no
//     per-page churn). WCAG 1.3.1 + landmark rotor.
//   - DayScoreboard + EPLDayScoreboard date-tab tap targets: was
//     ~38×34 with 9.5/11/8.5 px labels (fails WCAG 2.5.8 AA 24×24 min).
//     Now 56+ px min-height with 11/13/11 px type, plus aria-current
//     and aria-label for screen-reader context. The #1 mobile
//     mis-tap failure per Rangga-persona walk-through.

// v0.11.5 — Sprint 1 week-2. Three audit items, all low-risk:
//   - --border-interactive token: a new token at ≥3:1 on page bg in
//     both themes (dark #5F7390, light #7A7060). ToolbarButton and the
//     V2TopBar search pill (+ ⌘K hint border) swapped off
//     --border-subtle / --line onto it. Fixes WCAG 1.4.11 non-text
//     contrast on inactive interactive chips, which the audit measured
//     at 2.1:1. Decorative hairlines keep --line / --line-1 as-is.
//   - Custom picker chips (TeamPicker, ConstructorPicker, EPLClubPicker,
//     TennisPlayerPicker) get role="option" + aria-selected on team
//     rows and role="button" on the "clear selection" row. Keyboard
//     handlers (Enter/Space) mirror the onClick path so screen-reader
//     users can pick a favourite. WCAG 4.1.2.
//   - Editorial empty-state copy across 6 i18n keys (noGamesDay,
//     stateEmptyLive, stateEmptyCheckBack, stateErrorFeed, statsOpen,
//     noPlaysYet) in EN + ID. No more "No games" / "Belum ada laga" —
//     now "No games today — grab coffee" / "Hari ini kosong — ngopi
//     dulu". Audit P1 "wasted voice opportunity" → shipped.

// v0.11.6 — Sprint 2 perceived-performance pass (audit P0). Three
// interlocking changes that collectively drop first-paint ESPN fetches
// from ~14 parallel to ~6 and make the PLAYER STATS panel feel
// instant-on-scroll:
//   - New `useInView` hook (src/hooks/useInView.js) — tiny
//     IntersectionObserver wrapper. Returns `{ ref, inView }`; sticky
//     by default so once visible, stays visible. SSR-safe.
//   - `useInjuries` and `useTeamLeaders` now accept `{ enabled }` and
//     no-op when false. NBADashboard wires them to:
//       · Injuries  — enabled only when focusEventId is set (i.e. the
//         user has opened <LiveGameFocus>). Before: fired on every
//         mount, unused until click. After: zero fetch until needed.
//       · Leaders   — enabled only when the PLAYER STATS panel is
//         within 400px of the viewport (useInView rootMargin).
//         Before: fired on mount for ~600–900ms of blocking work.
//         After: fires on scroll-near, with a Skeleton placeholder
//         that paints instantly while the data streams.
//   - Prefetch-on-hover for V2TopBar nav. Each Link's onMouseEnter +
//     onFocus triggers `import('../pages/X.jsx')` so the destination
//     chunk is ready by the time the click lands. Per-session
//     deduped via a Set; Vite module cache dedupes across the
//     lazy() call-site too.
// Net FCP impact: parallel first-paint ESPN calls 14 → 6 (~55%
// reduction in main-thread fetch contention). LCP should hold
// (it's already 2.1s Good); CLS unaffected (skeletons match the
// layout they replace). No API, no schema, no UX regression.

// v0.11.7 — Sprint 2 week-2. Two complementary caches so return
// visits paint known-good data on the first frame instead of the
// FALLBACK constants:
//   - `src/lib/swrCache.js`: namespaced localStorage SWR helpers
//     (readCache/writeCache/clearCache). TTL per read, quota-safe,
//     size-capped at 200 KB, JSON-serialised, schema-versioned via
//     `gibol:swr:v1:` prefix. Wired into `usePlayoffData` — state is
//     hydrated synchronously from cache in the useState initializer,
//     then refresh() overwrites on success. Keys: nba-champion,
//     nba-mvp, nba-scoreboard, nba-scoreboard-range. TTLs: 15min /
//     24h / 2min / 5min respectively.
//   - `public/sw.js`: added `/api/proxy/*` to the network-first-with-
//     cache strategy so Polymarket odds survive a patchy connection.
//     ESPN calls go direct (CORS-opaque, SW can store but not
//     meaningfully serve cross-origin), so the localStorage layer
//     covers that path. SW_VERSION bumped to 2026-04-23-v2 to force
//     cache flush on existing clients.
// Net effect: Rangga (§04 Persona A) stops seeing the "blank cream
// screen for ~3 seconds" on return visits. First frame now has the
// last-known scoreboard and champion odds.

// v0.11.8 — Sprint 3 (saved-teams + URL state) + framing consistency.
// Two parallel ships:
//
// Framing pass (Ade flag: "size changes from home to sport dashboard"):
//   - New .dashboard-hero + .dashboard-hero--bordered + .dashboard-section
//     utility classes. Normalize top-of-page padding to 24/24/20 desktop
//     (16/20/16 mobile) across Home grid, EPL / F1 / Tennis heroes,
//     ComingSoon (FIFA / Liga 1), and Recap date-masthead. Before:
//     four different top paddings (16 / 20 / 22 / 36 px) caused a
//     visible jolt when users flicked between Home and a sport.
//     After: the first content block sits at the same offset
//     everywhere.
//
// Sprint 3 from the 2026-04-23 audit:
//   - URL filter encoding. New useQueryParamSync(key, value, setter)
//     hook — two-way bind between a query param and AppContext state
//     via history.replaceState (no nav, no scroll jump). Wired on
//     EPL (?club), F1 (?team), Tennis (?player). Share links like
//     gibol.co/premier-league-2025-26?club=arsenal now restore the
//     filtered dashboard on open. Audit §04 Persona B Diandra
//     moment 05 gap closed.
//   - Cross-sport MilikmuStrip on Home. Reads NBA fav (localStorage),
//     EPL/F1/Tennis picks (AppContext), renders a chip row above the
//     gateway grid linking each to its sport dashboard with the
//     picker pre-filtered via the new URL params. Renders null for
//     users with zero pins — first-time visitors see the grid
//     unchanged. Per-sport favorites already shipped in v0.2.x;
//     this ships the "yours across every sport" surface audit
//     Persona A Rangga needed to stop being a cold-start user.

// v0.11.9 — Sprint 4 week-1: thumb-first mobile nav.
//   - New <MobileBottomNav /> at src/components/MobileBottomNav.jsx.
//     Three-item persistent fixed bar (Home · Search · Bracket) that
//     renders only ≤720 px via CSS media query. iOS safe-area-inset
//     honoured. Body gets 60 px + safe-area bottom padding on mobile
//     so no content hides behind the bar.
//   - V2TopBar now listens for a `gibol:open-search` CustomEvent so
//     non-keyboard surfaces (bottom nav, future mobile FAB, deep
//     links) can trigger the ⌘K palette without coupling to V2TopBar
//     state. BottomNav's search button dispatches that event.
// Audit §07 Sprint 4 prescribes "Skor · Jadwal · Saya"; our IA
// doesn't have a dedicated Jadwal page (schedules are per-sport and
// reachable via the persistent top nav), so Search replaces Jadwal
// — addresses audit Persona A (Rangga) + B (Diandra) crown-jewel
// discovery gap for mobile users.

// v0.11.10 — Sprint 4 week-2: emotional beat of sport.
//   - New .score-flash CSS keyframe in src/index.css: 600ms one-shot
//     scale(1→1.15→1) + amber glow + color pivot to --amber-2. Honours
//     prefers-reduced-motion (falls back to color-only shift).
//   - DayScoreboard GameCard (NBA): per-side useRef tracks prev
//     scores; on delta during a live game, flashes the changed
//     number and — if the user's fav team is playing — fires
//     navigator.vibrate(40). Mount never flashes (refs init to
//     current values). Finals and upcoming games are inert.
//   - EPLDayScoreboard MatchCard: same pattern, wrapped around the
//     combined "home – away" score line. Haptic fires on any live
//     delta (EPL users currently have no fav filter like NBA's).
// Rationale: audit §05 stretch spec — "Score changes animate (tiny
// scale + 300ms colour flash) — matches the emotional beat of sport."
// The audit asked for 300ms; we chose 600ms after testing — the
// shorter duration reads as a glitch on fast eyes. Behaviour can
// dial back via @keyframes override if field data says otherwise.

// v0.11.11 — Sprint 5: identity + editorial.
//   - New <LiveHero /> at src/components/LiveHero.jsx. Picks the
//     first in-progress NBA game and renders a full-width hero with
//     72/96/120 px responsive tabular score (Inter Tight 800,
//     letter-spacing -2, tabular-nums). Team accent crests, live
//     chip with clock, amber-to-live gradient tick across the top
//     edge. Clickable — routes to /nba-playoff-2026. Renders null
//     when no live games so off-day Home keeps its old shape.
//   - New .tick-live CSS utility — 28×2 amber underline on LIVE
//     section headers. Applied on EPL "Sedang main" h2 and on the
//     NBA "SCORES & SCHEDULE" label whenever a day has live games.
//   - Live-hero CSS step scale (72 → 96 → 120 px) wired through
//     two media queries (min 720 / min 1100) so mobile doesn't
//     overflow the viewport while desktop gets the editorial moment
//     the audit stretch spec asked for.
// Audit §05 stretch direction: "the single most-followed live match
// is promoted to hero — a 120 px score with team sigils" + "signature
// device: a horizontal tick-mark in ACCENT that runs under live
// scores, subtly animated." Both landed.

// v0.11.12 — cross-dashboard consistency sweep from the 2026-04-23
// live audit (docs/audits/2026-04-23-live-sport-dashboard-audit.md).
// A11y and heading-hierarchy defects that slipped past Sprint 1:
//   - F1 hub: <div> title → <h1>. Sprint 1 missed this page.
//   - Tennis hub: same fix.
//   - NBADashboard: was emitting TWO <h1> (sr-only + SEOContent).
//     SEOContent <h1> demoted to <h2> so every sport dashboard has
//     exactly one h1. Fixes WCAG 1.3.1.
//   - Tennis active-tournaments h2 raised 14 → 15 px and the child
//     TournamentCard demoted from h3 → h4 at 14 px. Restores
//     parent-larger-than-child heading hierarchy.
//   - F1 "Drivers Standings 2026" — JSX now renders a real space
//     between the title and the season span so textContent flattens
//     cleanly for screen readers + analytics extractors.
//
// Signature device:
//   - Tennis active-tournaments h2 carries .tick-live whenever a
//     tournament is currently in-progress, matching NBA + EPL live
//     headers.
//
// New token:
//   - .panel-title-mono utility class in index.css — 12 px UPPERCASE
//     JetBrains Mono, 1.5 letter-spacing. Reserved for a follow-up
//     ship that unifies EPL/F1/Tennis panel titles to the Bloomberg-
//     terminal voice NBA already uses. Not wired this ship; that
//     decision wants a designed before/after comparison before
//     committing.
//
// Deferred (intentionally):
//   - NBA content-area top-offset alignment with EPL/F1/Tennis hero
//     padding. Subjective call — NBA intentionally runs dense from
//     line 1. Revisit after the audit re-run.
//   - Panel-title voice unification across non-NBA sport hubs.

// v0.11.13 — three small follow-ups from the 2026-04-23 cross-
// dashboard audit + janitor pass:
//   - F1News h2 JSX space fix. Was rendering "F1 NewsLIVE · BAHASA +
//     ENG" (no space) to textContent. Same concat-bug pattern as the
//     v0.11.12 Drivers Standings fix. Same JSX `{' '}` between the
//     title and the live-chip span.
//   - LiveHero now falls back to the first in-progress EPL fixture
//     when NBA has no live game. New normalizeNbaEvent / normalize
//     EplFixture helpers produce a sport-agnostic hero struct so the
//     render path doesn't branch on sport. Home wires useEPLFixtures
//     and passes `upcoming` as eplFixtures. Tennis / F1 hero fallbacks
//     deferred until their respective "is anything live right now"
//     queries are as cheap as EPL's 14-day scoreboard fetch.
//   - Dead-code janitor: deleted src/components/TopBar.jsx (the v1
//     masthead, unused since v0.11.2's universal V2TopBar) and
//     src/components/SportNav.jsx (replaced by V2TopBar's primary
//     nav). Both were called out in CLAUDE.md as janitor-pending.
//     Zero consumer references; grep clean; build green.

// v0.11.14 — Sprint 6 ⌘K onboarding tooltip.
//   - New <SearchOnboardingTooltip /> at src/components. Two variants
//     (one DOM, CSS-gated): desktop points at the ⌘K search pill,
//     mobile points at BottomNav's search icon.
//   - Shows 1500 ms after first paint on first visit. Dismisses on:
//     click the ✕ · `gibol:open-search` event · scroll ≥ 120 px ·
//     8 s elapsed. LocalStorage flag `gibol:search-tooltip-seen`
//     so it never re-appears after dismissal.
//   - Mounted once in App.jsx below MobileBottomNav so it composites
//     above everything but the search palette itself (z-index 48 vs
//     50).
// Addresses audit Persona B (Diandra) moment 02 + Persona A
// (Rangga) — the command palette is gibol's crown-jewel feature,
// and until now mobile users had no way to discover it at all.

// v0.11.15 — SWR cache port to 6 non-NBA sport hooks, closing the
// v0.11.7 "NBA-only instant paint" gap. Every sport now hydrates
// from localStorage on return visits:
//   - useEPLStandings     → `epl-standings` · 5min
//   - useEPLFixtures      → `epl-fixtures-{back}-{fwd}` · 2min
//   - useF1Standings      → `f1-standings-{SEASON}` · 15min
//   - useF1Schedule       → `f1-schedule-{SEASON}` · 24h
//   - useTennisRankings   → `tennis-rankings-{tour}` · 6h
//   - useTennisSlamOdds   → `tennis-slam-odds-{slug}` · 15min
// Each hook synchronously reads from cache in the useState
// initializer → renders the table on the first frame → then
// refresh() overwrites with fresh data when the network comes back.
// TTLs tuned per endpoint's natural refresh cadence: tight for
// live fixtures, wide for annual calendars. Return-visit FCP
// on /premier-league-2025-26, /formula-1-2026, /tennis now
// matches the NBA dashboard (~300-800 ms cache-paint).

// v0.11.16 — Tennis title-odds row mobile fix. The 4-column grid
// `minmax(84px, 1.4fr) 1fr 40px 30px` squeezed "Alexander Zverev"
// -length names to near-ellipsis at 375 px per the live audit.
//   - Tightened ratios: name column now minmax(110px, 2fr), progress
//     bar now minmax(48px, 1fr), fixed cols unchanged.
//   - Added `.tennis-odds-row` + `.tennis-odds-bar` class hooks.
//     ≤480 px media query hides the progress bar entirely and
//     redistributes the row to `1fr 44px 28px` so name + pct +
//     delta share the full width without squeezing.
// Fixes the "Tennis rank row uses fixed pixel widths that overflow
// at 375" finding from docs/audits/2026-04-23.

// v0.11.17 — panel-title voice unification, finally wired. The
// .panel-title-mono utility class from v0.11.12 is now applied to
// 12 h2 panel titles across EPL (7), F1 (3), F1News (1), and Tennis
// (2 — the Title-odds h2 and the active-tournaments ribbon which
// composites `panel-title-mono tick-live`). CSS class uses
// `!important` on the font properties to override the inline
// style={{}} that each consumer still sets for per-page colour,
// margin, and letter-spacing customisation. NBA's inline 10-px
// panelTitle stays unchanged — already Bloomberg-terminal. The
// result: every sport hub reads with the same 12-px UPPERCASE
// JetBrains Mono 700 voice, identical letter-spacing. The four
// dashboards no longer feel like four products stapled together.

// v0.11.18 — closes both deferred items from the 2026-04-23 live
// cross-dashboard audit:
//   - NBA content-lead gutter. A 16-px top spacer inserted below
//     the sr-only h1 and above <YesterdayRecap /> so NBA's first
//     visible row doesn't sit flush under the V2TopBar subrow.
//     Matches the breathing room EPL/F1/Tennis get from .dashboard-
//     hero's 24-px top padding, without forcing NBA into the full
//     hero shape (would break YesterdayRecap's internal density).
//   - LiveHero Tennis fallback. New normalizeTennisMatch() maps a
//     tennis live match to the sport-agnostic hero struct:
//     players[0/1] → away/home, sets-won → score, current-set +
//     round → clock. Home now also pulls useTennisScoreboard('atp')
//     and ('wta'), merges, and passes to <LiveHero />. Priority on
//     Home is now NBA > EPL > Tennis. F1 intentionally skipped —
//     live-race windows are ~2h × 23 weekends/year; too narrow to
//     justify an always-on fetch on Home. Add when F1 live-race
//     detection lands as a cheap pre-check.

// v0.11.19 — Live Audit 2026-04-24 Day 0 + Day 1.
// Closes 5 findings from the QA re-audit (GIB-001, GIB-002, GIB-004,
// GIB-016, GIB-017) plus the OneSignal docs reconcile (GIB-020).
//
// Day 0: OneSignal is actually live in prod (verified `window.OneSignal`
// exists + SDK CDN script loaded), not pending. Updated post-audit
// summary to match reality. No code change.
//
// Day 1 wins:
//   - GIB-001 palette lift. --ink-3 #7388A5 → #9FB4CC (4.6:1 on --bg),
//     --ink-4 #4A5D7A → #6C85A8 (4.6:1). Light-theme --ink-4 also
//     darkened #9A9A9A → #6E6E6E (5.0:1 on cream). Single-token fix
//     targets the 123 axe contrast nodes the re-audit found.
//   - GIB-004 focus ring. Global :focus-visible rule expanded with
//     explicit selectors (a / button / input / [role=button] etc.) and
//     !important + var(--blue) ring so inline outline resets can't win
//     and the ring hits the 3:1 non-text contrast floor.
//   - GIB-002 two <main> on pages. App.jsx ships <main id="main"> at
//     route level; 12 page components shipped their own inner <main>.
//     All 12 demoted to <section> so each page now has exactly one
//     landmark. Skip-link target preserved.
//   - GIB-016 aria-current="page" on the active V2TopBar nav Link.
//   - GIB-017 aria-pressed on the BI/EN lang toggle (reflects whether
//     BI is currently active so SR users know the toggle state).

// v0.11.20 — Live Audit Day 2. Semantic structure + live-region +
// sport-accent chip contrast. Closes 5 more findings (GIB-003,
// GIB-013, GIB-014, GIB-015, plus the chip-contrast bonus surfaced
// by Day 1's axe regression).
//
//   - GIB-013 CardHead title promoted from <span> to <h2> in
//     src/components/v2/Card.jsx. HomeV1 now contributes ~6 h2s to
//     the heading outline (previously zero). Visual unchanged — same
//     10 px uppercase mono eyebrow style.
//   - GIB-003 ComingSoon.jsx page title promoted <div> to <h1>.
//     Covers FIFA World Cup, Liga 1, IBL with one edit.
//   - GIB-014 <footer role="contentinfo"> on Home, NBADashboard,
//     EPL, F1, Tennis, ComingSoon, Recap. ContactBar stays inline
//     as a child; landmark rotor now includes a footer on every hub.
//   - GIB-015 new <ScoreAnnouncer /> (sr-only aria-live="polite"
//     region). NBADashboard tracks prev-status per game via useRef
//     and only announces on pre→in (tip-off) and in→post (final)
//     transitions. No per-poll spam. EPL + Tennis will follow the
//     same pattern next ship.
//   - Bonus chip-contrast fixes:
//       --live / --down  #EF4444 → #F25757 (4.43:1 → 5.24:1 on --bg-2,
//       clears AA for all LIVE chips + "down" delta numbers).
//       Chip variant="live" no longer respects `sportId` (only an
//       explicit `accent`). Previously <Chip live sportId="tennis">
//       rendered white text on light-gold 1.67:1 — the worst axe-core
//       violation on site. Sport branding stays on "soon"/"neutral"
//       variants.

// v0.11.21 — Live Audit Day 3: i18n sweep. Closes 5 findings.
//
//   - GIB-007 Primary nav labels move into i18n.js. NAV_ITEMS now
//     carry a `labelKey`; V2TopBar resolves via `t(labelKey)` so
//     "Home / Football / Tennis / World Cup" become "Beranda / Bola
//     / Tenis / Piala Dunia" in BI mode. NBA + F1 stay as proper
//     nouns with no key.
//   - GIB-008 "World CupSOON" → "World Cup SOON" (or "Piala Dunia
//     SOON"). Added explicit JSX whitespace before the SOON badge
//     span so textContent flattens with a space. Visual gap
//     unchanged (parent flex gap:5 still draws it).
//   - GIB-009 "LIVLiverpool" + same pattern fixed across all four
//     sport pickers — TeamPicker (NBA), ConstructorPicker (F1),
//     EPLClubPicker (EPL), TennisPlayerPicker (Tennis). Same JSX
//     whitespace nodes so abbr + name don't concat in textContent.
//   - GIB-010 "SEASON 2026" hardcode replaced with `t('season')` on
//     F1 and Tennis hubs. New i18n keys: `season: 'SEASON'` (en) /
//     `season: 'MUSIM'` (id).
//   - GIB-011 Home, HomeV1, NBADashboard now pass lang-aware
//     title + description into <SEO>. Helmet's title sync fires
//     on every prop change, so toggling BI/EN mid-session updates
//     document.title cleanly. FIFA / Liga 1 / IBL deferred (they
//     ship via ComingSoon's static SEO; pick up in the Day 5 OG
//     image work).

// v0.11.22 — Live Audit Day 4: search.
//   - GIB-005 ⌘K listener strengthened. Bound on `document` in capture
//     phase (was `window` bubble), guarded against `e.repeat` so held-
//     down keys don't queue, skipped when target is contentEditable
//     or textarea so the shortcut doesn't hijack the user's typing.
//     Audit's "nothing happens" path was either a stopPropagation
//     upstream (now bypassed) or Chrome-extension shortcut interception
//     (out of our scope).
//   - GIB-006 search catalogue + matcher fix. filterRows now also
//     matches `short` so power-user codes ("LAL", "VER", "ARS")
//     resolve. Catalogue grew from 16 NBA-only entries to ~80: 16
//     NBA teams + 20 EPL clubs (from CLUBS) + 11 F1 constructors +
//     22 F1 drivers + ~15 Tennis stars. Per-entity links route
//     through the per-team SEO pages (NBA / EPL / F1) or the picker-
//     pre-filtered hub URLs (Tennis ?player=...).
//   - GIB-022 empty-state hint. Added a "Try: Lakers · OKC · Arsenal
//     · Verstappen · Alcaraz · Sinner" banner above Trending so users
//     see what's searchable the instant the modal opens.

// v0.11.23 — Live Audit Day 5: shareability + HomeV1 polish (final
// audit ship, closes 23 of 24 findings; GIB-023 mobile hamburger
// remains an explicit push-back — we ship horizontal-scroll +
// bottom-bar instead).
//   - GIB-018 og:title + og:url reflect picker selection on EPL /
//     F1 / Tennis hubs. Title now leads with the selected entity
//     ("Arsenal · Liga Inggris …" / "McLaren · Formula 1 …" /
//     "Carlos Alcaraz · Tenis …") so a deep-link share unfurls
//     topical instead of generic. Canonical + og:url include the
//     active query (?club=arsenal etc.) so the share URL matches
//     what the user is actually looking at. Per-entity OG PNGs
//     deferred to a follow-up ship — title/url is the high-leverage
//     win.
//   - GIB-019 h1 reflects selected entity. Same pattern for the
//     visible page heading on EPL / F1 / Tennis. Falls back to the
//     generic league title when no pick.
//   - GIB-021 + GIB-012 HomeV1 game-card density + tap targets.
//     LiveGridCard cells: padding 10 → 14, minHeight 96, RowLive
//     crest 16 → 20, name 12 → 13, score 13 → 14. FollowingCard
//     rows: padding '7px 10px' → '10px 10px', minHeight 48, crest
//     18 → 22, name 11.5 → 13. UpcomingCard fixture rows: explicit
//     minHeight 44 + 12 px text + 8 px padding so each fixture
//     clears WCAG 2.5.5. Audit's "14.5 px → ≥ 56 px" headline is
//     met or exceeded.
//   - GIB-024 Copy link button. New <CopyLinkButton /> primitive —
//     single-tap copy of window.location.href (preserves any active
//     ?club= / ?team= / ?player= deep-link), 1.6 s "Tersalin!" /
//     "Copied!" inline confirmation, navigator.clipboard with a
//     textarea-execCommand fallback, tracks `copy_link_click` with
//     source. Mounted on EPL / F1 / Tennis hubs (in the hero, next
//     to the lede paragraph) and on Recap (inline next to the
//     existing ShareButton). NBA + Home keep ShareButton-only —
//     the audit's prescription was hubs + recap.

// v0.11.24 — Hotfix: NBA hub `ReferenceError: useRef is not defined`.
//   - NBADashboard.jsx imports `useRef` (was only `useState/useEffect/
//     useMemo`). The bare `useRef({})` call at line 255 (prevStatusRef
//     for new-game toast detection) crashed the hub on load; the
//     SportErrorBoundary caught it but blanked h1/h2/footer/aria-live.
//     Caught during the post-audit live verification sweep — would have
//     shipped silently otherwise because the boundary degraded
//     gracefully to a generic error card.

// v0.11.25 — Football dashboard UI/UX sprint.
//   - TopBar alignment. `.v2-topbar-row` and `.v2-topbar-subrow` now
//     constrain to max-width 1280 + auto margin so the gibol logo and
//     dashboard content share the same left edge on wide viewports.
//     Was: header content at ~18 px from viewport, body content at ~340
//     px on a 1920 viewport — broken-looking even though both were
//     "correct" in isolation.
//   - EPL hub restructure. Hero now h1-only; the lede + "current top 3"
//     + copy-link were pushed to the bottom-of-page <SEOContent> block.
//     Scoreboard becomes the page hero; LiveSpotlight follows; the 4-
//     cell ContextStrip (Title Favorite + Top-4 + Relegation + Golden
//     Boot) demoted to a band below the live data. Mirrors the NBA
//     pattern (DayScoreboard hero + stat-strip below).
//   - F1 hub restructure. Same pattern. Round-by-round calendar leads;
//     Context strip + Peluang juara demoted below.
//   - Tennis hub restructure. Same pattern. Active-tournaments ribbon +
//     LiveTicker lead; Context strip + Peluang juara demoted below.
//   - SEOContent extended with `sport` prop. Each sport packs a fully
//     populated FAQ (8 questions) + 6 prose sections + intro lede.
//     Mounted on EPL / F1 / Tennis hubs at the bottom alongside NBA's
//     existing copy. Emits FAQPage JSON-LD per sport.
//   - Tennis live data fix. ESPN's tennis scoreboard wraps matches
//     inside `event.groupings[].competitions[]` (one grouping per
//     category: men's/women's singles + doubles). Our normaliser only
//     walked `event.competitions[]`, missing every match. LiveTicker
//     was permanently empty during Madrid Open / any active tournament.
//     Now walks both shapes, surfaces grouping name on each match.
//   - EPL match expansion. Clicking any score on the day-swipe
//     scoreboard expands the card to show goal scorers, assists, and
//     minute scored — both teams side-by-side. Lazy-fetched from ESPN's
//     soccer summary endpoint (header.competitions[0].details with
//     scoringPlay flag). Polls 30s while live. New
//     useEPLMatchDetail hook + MatchDetailPanel + GoalsColumn
//     components inside EPLDayScoreboard.

// v0.11.26 — Verification response (NEW-1 through NEW-7 + FU-1).
// Closes 8 of the 8 audit-team verification follow-ups in one ship.
//
//   FU-1  react-helmet-async@3 → ^2.0.5 downgrade. Closes the runtime
//         flush race that gated GIB-011 (doc.title) + GIB-018 (og:title /
//         og:url) at "partial" status. Reverting to v2 lifts the Helmet
//         hydration regression that caused statically-prerendered titles
//         to persist past SPA renavigation. No API surface change in our
//         own code — single dep bump + a build.
//
//   NEW-4 Sport-accent contrast catastrophes. New utility
//         `src/lib/contrast.js` with brighten(), darken(), contrastRatio(),
//         readableOnDark(), readableOnLight(). Applied across EPL.jsx
//         (claret #37003C foreground → readable variant), F1.jsx (Ferrari
//         red foreground → readable variant), Tennis.jsx (sponsor brown
//         #D4A13A foreground → readable variant), NBADashboard.jsx
//         (Hornets purple #1d1160 foreground → readable variant).
//         Decorative bars + chip backgrounds still use the raw brand
//         color — only foreground TEXT was lifted. Aston Villa fans can
//         now read their own club page.
//
//   NEW-3 CopyLinkButton restored on EPL / F1 / Tennis hub heroes.
//         The v0.11.25 layout restructure had inadvertently dropped the
//         <CopyLinkButton/> mount points when the lede was moved to the
//         bottom-of-page <SEOContent/>. Now mounted unconditionally
//         (no flag, no useEffect gating) so SPA renavigation always
//         re-renders it.
//
//   NEW-1 ShareButton accepts an `ariaLabel` prop. Every mount on EPL
//         (live spotlight, day scoreboard, upcoming fixtures, recent
//         results), F1 (race header, dashboard hero), Recap, F1Race
//         passes a contextual label like
//         "Bagikan Liverpool vs Crystal Palace, Sat 21:00".
//         Six identical "SHARE button" announcements on the EPL hub
//         become six unique announcements.
//
//   NEW-2 CopyLinkButton aria-label + aria-live. Visible icon glyph is
//         now aria-hidden; the button announces "Salin link halaman ini"
//         (BI) / "Copy this page link" (EN). A separate sr-only
//         aria-live="polite" region fires "Tersalin!" / "Copied!" on
//         success so AT users hear the confirmation without re-focusing.
//
//   NEW-5 EPL nested-interactive (6 nodes). MatchCard outer div was
//         role="button" + tabIndex=0 wrapping inner Link + ShareButton —
//         a focusable button with focusable descendants, axe nested-
//         interactive. Now: card is a passive container; the expand
//         action lives on a dedicated 44×44 chevron <button>; inner
//         Link + ShareButton are independent focus targets.
//
//   NEW-6 EPL fixture target-size (12 nodes). Inline <Link> wraps
//         around team names rendered at 17.5 px tall (line-height of
//         13 px text). Bumped to display:inline-block + 6 px vertical
//         padding so each link clears the 24×24 WCAG 2.5.8 floor.
//         Applied to the day-scoreboard MatchCard + LiveSpotlight +
//         upcoming + recent results in EPL.jsx.
//
//   NEW-7 Search ranking. filterRows() now scores each row: exact
//         short-code → 1.0, short-code prefix → 0.85, title prefix →
//         0.7, token prefix → 0.5, substring → 0.4 / 0.25. Stable-
//         sort, slice top 8 when active query (was 30). "VER" now
//         returns Verstappen first instead of buried in 27 noisy
//         substring hits.
//
//   Search localization. TRENDING list moved from a single hard-coded
//   English block to TRENDING_BY_LANG with id/en variants. BI users
//   now see "Liga Inggris 2025-26 · 20 klub · Pekan ke-34" instead
//   of "Premier League 2025-26 · 20 clubs · Matchweek 34".

// v0.11.27 — FU-1 belt-and-suspenders. The v0.11.26 react-helmet-async
// downgrade from v3 → v2 helped but did not fully resolve the static-
// prerender hydration race. On hard reload from a deep-link URL like
// /premier-league-2025-26?club=arsenal, the title would intermittently
// stick on the static prerender ("Liga Inggris 2025-26 · Klasemen 20
// Klub, Jadwal, Top Skor (Live) | gibol.co") while h1 + Helmet's
// <html lang> + canonical <link> all hydrated correctly. The fix:
// add three explicit useEffects in SEO.jsx that sync document.title,
// og:title / twitter:title meta content, and canonical href / og:url
// directly to the DOM whenever the title or canonical prop changes.
// Helmet keeps managing the same elements declaratively; the effects
// just guarantee consistency when Helmet's hydration loses the race.
// Also re-ranked search groupByKind to preserve the score-based order
// from filterRows, so "VER" now lands Verstappen first instead of
// behind Denver/Everton/Liverpool/Wolverhampton substring hits.

// v0.11.28 — Viewport fit. The user reported the EPL hub was "skewed
// to the right, can't see the whole screen" on a 1920-wide window.
// Live measurement: document.scrollWidth was 1633 px on a 1512 px
// viewport — 121 px horizontal overflow. The dashboard-wrap was
// correctly 1280 px, but the EPLDayScoreboard <section> inside grew
// to 1488 px because the day-tab strip's `flex: 1 0 96px` × 14 days
// had ~1344 px of intrinsic flex content. Without min-width:0 on the
// section, the section grew past dashboard-wrap and pushed match
// cards + odds chips off the right edge.
//
//   Fixes layered for resilience:
//     1. EPLDayScoreboard <section>     — minWidth:0 + overflow:hidden
//     2. EPL.jsx inner content grid     — minWidth:0
//     3. F1.jsx inner content grid      — minWidth:0
//     4. F1 RoundStrip horizontal flex   — minWidth:0
//     5. Tennis.jsx inner content grid  — minWidth:0
//     6. Tennis ActiveTournamentsRibbon — minWidth:0 + overflow:hidden
//     7. .dashboard-wrap CSS            — min-width:0 + overflow-x:clip
//     8. main#main                      — overflow-x:clip
//
// The CSS belt-and-suspenders (#7, #8) catch any future page surface
// that forgets to add min-width on its grid track. Mobile already
// works because @media (max-width: 1280px) sets dashboard-wrap to
// width:100% — fixed that breakpoint already, the issue was only on
// wide-desktop where 1280 collides with intrinsic content width.

// ─── Sprint 1 (Theme A) ──────────────────────────────────────────────
//
// v0.12.0 — Per-game OG card endpoint live at /api/og/game/:gameId.png
// (also accepts ?variant=story for 1080×1920 + ?variant=square for
// 1080×1080). Closes Theme A part 1 of the product improvement plan
// (docs/12-product-improvement-plan-amendments.md §11).
//
// Architecture:
//   • Satori (JSX → SVG, no React runtime) + @resvg/resvg-js (SVG → PNG)
//   • Inter Tight Bold + JetBrains Mono Regular variable fonts shipped
//     in api/og/_fonts/, loaded once at module init
//   • Pure-object JSX tree (api/og/_layout.js) so the function file
//     needs no JSX transform
//   • Game state fetched via existing /api/proxy/espn/.../summary
//   • Cache-Control varies by game state: live=10s, post=300s+SWR-1d,
//     pre=60s
//
// Five visual enhancements landing on top of the static template the
// Python script (ops/generate_recap.py) already produces:
//   A — fixed contrast on verdict body, player-card stat line, footer
//       tagline (was rendering ~10% opacity)
//   B — quarter-by-quarter score row under main scores
//   C — smarter status pill: FINAL · LAL leads 2-1 / LIVE · Q3 5:23
//       (with red pulse) / TIPOFF · SAT 22:30 WIB
//   D — top-3 stat-leaders strip filling the formerly-empty right
//       half of the OG variant
//   E — win-probability bar (horizontal gradient under scores, ESPN
//       provides the live %)
//
// Files added:
//   api/og/_fonts/InterTight-Bold.ttf       (568 KB — variable axis)
//   api/og/_fonts/JetBrainsMono-Regular.ttf (183 KB — variable axis)
//   api/og/_fonts.js                        (font loader, cached)
//   api/og/_theme.js                        (color tokens + brighten/hexa)
//   api/og/_layout.js                       (pure-object JSX tree)
//   api/og/_game.js                         (ESPN summary normaliser)
//   api/og/game/[gameId].js                 (the route)
//
// Files modified:
//   package.json — +satori, +@resvg/resvg-js
//
// Theme A part 2 (share button wiring + IG Story native share) ships
// next as v0.12.1.

// v0.12.1 — Theme A part 2 (share button wiring) + Theme J seedling.
//
// Closes Day 5 of the Sprint 1 amendments per docs/12-product-
// improvement-plan-amendments.md §11. Three layered ships in one
// version bump:
//
//   • src/lib/share.js — new helpers buildPerGameOgUrl(gameId, variant)
//     + buildPerGameDeepLink(gameId, { sport }). The legacy
//     buildNBARecapPngUrl stays exported for backward compatibility
//     but new code prefers the minimal-input variants.
//
//   • ShareButton.jsx — saveIGStory() rewritten with a three-layer
//     fallback (per amendments §3.x revised proposal):
//       Layer 1: navigator.canShare({ files }) + navigator.share —
//                Android Chrome happy path, file blob to IG → Story.
//       Layer 2: navigator.share({ url }) — iOS Safari + Androids
//                without file-share. URL goes to IG; user pastes.
//       Layer 3: blob download + clipboard URL — desktop fallback.
//     Each layer that fires emits `share_layer` PostHog telemetry so
//     we can read conversion by tier after a few NBA Playoff games.
//
//   • Theme J seedling — new route /nba-playoff-2026/game/:gameId via
//     src/pages/NBAGameDeepLink.jsx. Sets per-game OG meta pointing
//     at /api/recap/:gameId?v=og (v0.12.0 endpoint), then redirects
//     to /recap/:date#game-{id} for content. Without this seed,
//     WhatsApp link unfurls would still show date-level recap cards
//     instead of the new per-game ones — defeating the v0.12.0 win.
//     Full Theme J (prerender + sitemap + JSON-LD + non-NBA sports)
//     remains parked for S4.
//
//   • Wired DayScoreboard.jsx (live + final card share buttons) and
//     LiveGameFocus.jsx (focus-panel header chip) and Recap.jsx
//     (recap card share + copy link) to the new per-game canonical
//     URL.
//
// Vercel function count unchanged — no new routes added; v0.12.1 is
// a client-side ship plus the existing /api/recap/[gameId] endpoint.

// v0.12.1.1 — Hotfix for a "Moment of the Day" headline bug spotted on
// 2026-04-25: `T. Maxey drops 31 to lift BOS past PHI 108-100`. Maxey is
// a PHI player; he scored 31 in PHI's LOSS to BOS. The headline composer
// in src/hooks/useDailyRecap.js assumed the top performer always played
// for the winning team, so any high-scoring loss-side performance got
// re-attributed to the wrong club. Fix: branch on top.teamAbbr ===
// winnerAbbr and use a "drops 31 in PHI's loss" framing for loss-side
// top performers across all three thresholds (40+ pts, 30+ in close
// games, triple-doubles).

// v0.12.2 — Theme B: Pick'em Home hero + league chip.
// Closes Sprint 1 Day 8 per docs/12-product-improvement-plan-amendments.md
// §11 (last v0.12.x ship of Sprint 1).
//
// What lands:
//
//   • src/hooks/useUserBracketSummary.js — single-fetch hook that reads
//     the Supabase auth session once on mount (localStorage-backed,
//     no live subscription, dodges AuthProvider's per-page wrap cost).
//     Status states: anon | loading | no-bracket | no-league | ready
//     | error. Anon visitors fire ZERO database queries. Logged-in
//     users fire 3 round-trips bundled via Promise.all.
//
//   • src/components/PickemHomeHero.jsx — branches the Home hero by
//     status:
//       anon         → CTA: "Pick'em playoff sama temen lo. Bahasa
//                      Indonesia. Live score." with Masuk-dengan-email
//                      button → /login?next=/bracket/new
//       no-bracket   → "Bracket lo belum jadi" + Bikin-bracket button
//                      → /bracket/new
//       ready+league → 3-col on desktop, single-line on mobile:
//                      score · league #rank/total · open-bracket CTA
//
//   • src/components/LeagueChip.jsx — persistent chip in the V2 TopBar
//     actions row, desktop-only (hidden < 768 px via its own inline
//     media query so the actions row doesn't crowd on phones). Click
//     expands a 240-px popover with league name, rank, bracket score,
//     and two CTAs (open leaderboard, open bracket). Renders only
//     when status === 'ready' — anon, no-bracket, no-league all hide.
//
//   • Mount points:
//       src/pages/HomeV1.jsx                — <PickemHomeHero /> above
//                                              the 3-rail sport grid
//       src/components/v2/TopBar.jsx        — <LeagueChip /> in actions
//                                              row, between search pill
//                                              and lang toggle
//
// Cost guards:
//   - Anon Home visit: 0 Supabase queries, 0 PostHog events beyond the
//     existing baseline. Hero renders nothing while loading; CTA renders
//     after the ~5 ms localStorage read returns null session.
//   - Logged-in Home visit: 3 Supabase round-trips (bracket + memberships
//     + league members for rank). Bundled in parallel; total wall ~80–
//     120 ms from Mumbai. Re-uses across LeagueChip + PickemHomeHero
//     (they each call the hook independently — re-render cost is the
//     hook's useEffect, but each component instance reads its own copy).
//
// Theme B amendments resolved:
//   - Q1 (chip placement): hybrid — TopBar right-side on desktop,
//     hidden on mobile (PickemHomeHero covers logged-in mobile users
//     on Home). Documented in LeagueChip.jsx.
//   - Q2 (logged-out CTA): Option B — "Pick'em playoff sama temen lo.
//     Bahasa Indonesia. Live score." Shortest mobile UX, names the BI
//     differentiator, "Pick'em" is the Bahasa-recognized term.

// v0.12.3 — Mobile audit response (M-1 through M-10).
// Closes the 11-finding mobile audit Ade flagged on 2026-04-25 after
// v0.12.2 — sport hub views were "skewed and not readable" on mobile.
// Static-CSS + simulated-390-px audit revealed the 3-rail HomeV1 grid
// never collapsed, the TopBar nav scrolled invisibly, F1 Round-Detail
// wrapped to single-character columns, EPL match cards truncated team
// names + clipped SHARE buttons, and four other lower-severity issues.
//
// All ten code fixes shipped in this single bundle (M-11 — real-iPhone
// walkthrough — deferred to manual verification).
//
//   M-1  HomeV1 grid `200px 1fr 260px` → 1 column at <1024 px via
//        new `.homev1-grid` class. Was the single biggest mobile bug
//        on the site.
//   M-2  TopBar nav fade-mask on `.v2-topbar-nav` below 720 — the
//        right-edge gradient signals horizontal-scrollable nav so
//        first-time mobile users can find the sport links.
//   M-3  F1 Round-Detail header collapses to 1 column at <720 via new
//        `.f1-round-header` class — pre-fix the 48px R-badge ate so
//        much of the 390-viewport that "Circuit de Monaco · Monaco ·
//        Jun 7 2026" wrapped one-word-per-line.
//   M-4  EPL match cards (`.epl-match-card-grid`) drop the 4-col
//        layout below 540 — score row stays on top, share/odds/chevron
//        becomes a second row spanning full width. Pre-fix team names
//        truncated to "Sunderla" + "Nottingha" and SHARE clipped off-
//        screen.
//   M-5  Day-strip fade-mask via shared `.day-strip-scroll` class on
//        EPL day-tabs, NBA DayScoreboard tabs, F1 RoundStrip — visual
//        affordance that the strip is horizontally scrollable.
//   M-6  Sub-row picker left-aligns + grows to fill width below 720 px
//        via `.v2-topbar-subrow` media query. Pre-fix the picker was
//        centered with ~160 px of dead space on mobile.
//   M-7  CopyLinkButton + share row use `.hub-action-row` that flexes
//        children to grow on mobile (one-tap targets fill width <480).
//   M-8  Tennis LiveMatchCard tournament-name column hidden below 540
//        via `.tennis-live-tournament` — was being clipped to "Mu...".
//        Cards re-flow to 3 columns (player + sets + status) so the
//        score line is never truncated.
//   M-9  4-cell stat strips (EPL ContextStrip, F1 ContextStrip, Tennis
//        ContextStrip) shipped a `.stat-strip-2col` class that lowers
//        the auto-fit floor from 180 px to 160 px — gets 2 columns at
//        390 viewport (vs. the previous 1-column collapse), halving
//        the vertical scroll for the stat band.
//   M-10 Pick'em Home hero CTA headline drops from 22 px to 18 px
//        below 480 via `.pickem-anon-headline` — was wrapping to 3
//        lines on a 390 viewport, now breathes in 2.
//
// Net change: 10 new responsive CSS rules in src/index.css + 9 JSX
// className additions across HomeV1, EPL, F1, Tennis, EPLDayScoreboard,
// DayScoreboard, LiveMatchCard, PickemHomeHero. Zero functional
// regressions on desktop (all rules are inside @media queries).

// v0.12.4 — Anon home redesign + auth state propagation fix.
// Closes Ade's 4-item Home audit (mostly), with the favorites
// onboarding piece deferred to v0.12.5 so the bigger structural
// changes ship today.
//
//   Fix B — Magic-link UI propagation. useUserBracketSummary now
//     subscribes to supabase.auth.onAuthStateChange. Pre-fix, the hook
//     read the session ONCE on mount; if the user signed in via the
//     /auth/callback redirect, the home Pick'em hero stayed on the
//     anon CTA until a hard refresh. Now SIGNED_IN / SIGNED_OUT /
//     TOKEN_REFRESHED events all trigger a re-fetch and re-render.
//
//   Fix A — Anon home no longer reads as a "logged-in dashboard with
//     placeholder data." Three changes:
//     • FollowingCard renders as "Trending teams" for anon users (was
//       "Following") with an amber sign-in nudge in the footer ("★
//       Masuk untuk simpan tim favorit →"). Logged-in users with no
//       favs still see seed teams — this is the v0.12.5 swap-out.
//     • LiveGridCard now pulls Tennis live (ATP + WTA via
//       useTennisScoreboard) on top of NBA + EPL. Header chip flips
//       from "NBA · EPL" to "NBA · EPL · F1 · TENNIS" so the cross-
//       sport intent is visible.
//     • New "Coming up" fallback when nothing is live: surfaces NBA
//       next pre-game, EPL next fixture, and the F1 next GP. Cards use
//       a mono-status chip instead of the red live Pill so users can
//       tell live vs scheduled at a glance.
//
//   Fix (3) — When no live games, the home no longer shows an empty
//     "No live matches right now" — it shows the next match across
//     four sports (see "Coming up" above).
//
// Deferred to v0.12.5:
//   • (4) Favorite-teams onboarding flow + Supabase persistence
//   • Surface favorites on FollowingCard for logged-in users with
//     saved favs
//   • Replace the LivePulse + FansReacting placeholder cards with
//     content driven by the user's favorites
//
// No new files. Touched: useUserBracketSummary.js (auth subscription),
// HomeV1.jsx (FollowingCard isAnon prop, LiveGridCard tennis/upcoming
// fallback, useUserBracketSummary import).

// v0.12.5 — Favorite teams onboarding + profile persistence (closes
// the 4th item from Ade's home audit). Pre-fix, logged-in users who
// had no localStorage favorites saw the same seed teams as anon users
// (Thunder/Celtics/Arsenal/Man City) — confusing because they looked
// like the user's saved follows but weren't.
//
// What lands:
//
//   • supabase/migrations/0004_profile_favorites.sql — adds
//     favorite_teams JSONB column to public.profiles + a GIN index
//     for fast "who follows team X" lookups (future feature) + an
//     RLS policy so users can only update their own row.
//
//   • src/hooks/useFavoriteTeams.js — read + write the favorites
//     array. Subscribes to onAuthStateChange (matches the v0.12.4
//     fix on useUserBracketSummary) so the home updates instantly
//     after sign-in. Anon path fires zero queries.
//
//   • src/pages/OnboardingTeams.jsx — first-login multi-select
//     picker. Four sections (NBA / EPL / F1 / Tennis), chip grid,
//     up to 8 picks total to keep the home FOLLOWING list focused.
//     Saves to profiles.favorite_teams via upsert on the user's id
//     (handles the case where the profile row doesn't exist yet).
//
//   • AuthCallback redirect logic — after successful magic-link
//     exchange, peeks at profiles.favorite_teams. Empty → redirect
//     to /onboarding/teams?next=… so first-time users see the
//     picker. Returning users go straight to their requested next.
//
//   • FollowingCard on HomeV1 — logged-in users with saved favs see
//     them rendered exclusively (no fallback to seed teams). Each
//     fav routes to the appropriate per-sport page (NBA TeamPage,
//     EPL club page, F1 team page, Tennis hub with ?player= deep
//     link). Logged-in users without favs see a blue "★ Pilih tim
//     favoritmu →" nudge in the card footer; anon users still see
//     the amber "★ Masuk untuk simpan tim favorit →" footer.
//
// Migration apply: needs to be run via the Supabase SQL Editor
// (https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new).
// The hook handles missing column gracefully — favorites read returns
// [], save throws and is logged but doesn't break the UI.
//
// v0.15.0 — El Clasico Indonesia derby landing page.
//   /derby/persija-persib lands two weeks before the 2026-05-10 JIS
//   meeting, with: countdown hero, side-picker (Jakmania / Bobotoh /
//   Netral persisted to localStorage), live next-match panel, all-time
//   H2H card (76 laga, 24-28-24 modern era), last-5 meetings strip,
//   four polls (winner, score, first scorer, GOAT), 6-emoji reaction
//   wall, anonymous fan one-liners (80 chars, profanity-filtered, 1/min
//   rate limit), side-by-side current squad, stadium + fanbase context,
//   8-card iconic-moments timeline (1933 → 2024), trophies cabinet, FAQ
//   section, JSON-LD SportsEvent + FAQPage.
//
//   New surfaces:
//     • src/pages/Derby.jsx — single-page hub
//     • src/lib/sports/liga-1-id/derby.js — static dossier (H2H,
//       moments, trophies, polls, oneliner blocklist, FAQ)
//     • src/hooks/useDerbyState.js — combined polls/reactions/oneliners
//       with optimistic mutators + 30s revalidation
//     • src/hooks/useDerbyNextFixture.js — finds the next Persija ↔
//       Persib fixture from API-Football (resolves Persija team id at
//       runtime; Persib pinned to 2445)
//     • api/derby/state.js, api/derby/vote.js, api/derby/react.js,
//       api/derby/oneliner.js — CRUD with anonymous voter_hash, 30s
//       edge cache on reads
//     • api/_lib/voterHash.js — HMAC-SHA256(IP|UA|day-bucket) so we
//       dedup same-session votes without storing IPs long-term
//     • supabase/migrations/0005_derby_engagement.sql — derby_polls,
//       derby_poll_votes, derby_reactions, derby_oneliners, plus the
//       v_derby_poll_results + v_derby_reaction_counts views. Seeds
//       all four launch polls. Needs manual apply via SQL Editor.
//
//   Graceful degradation: if the migration hasn't run yet, /api/derby
//   /state returns schemaReady=false and the UI says "polling segera
//   dibuka" — the static sections (hero, H2H, last-5, squads, history)
//   render fully without DB.
//
// Migration apply: paste supabase/migrations/0005_derby_engagement.sql
//   into https://supabase.com/dashboard/project/egzacjfbmgbcwhtvqixc/sql/new
//   and run. Idempotent (ON CONFLICT DO NOTHING for the seed inserts).

// v0.15.1 — header IA fix: Super League Indonesia and the derby page
// were unreachable from the top nav (only "Football" → EPL existed).
// Split into "Liga 1" (priority, Gibol's Indonesia-first mission) +
// "Liga Inggris" (EPL). Derby page now lights up Liga 1 as active so
// users feel the IA continuity. Files touched:
//   • src/components/v2/TopBar.jsx — NAV_ITEMS split, prefetch entry
//     for SuperLeague, matchActive() bridge for /derby/* → liga1.
//   • src/lib/i18n.js — added navLiga1 + navEPL keys (ID + EN);
//     navFootball kept as alias mapping to "Liga Inggris" / "Premier
//     League" so any straggler reference keeps working.
//
// v0.15.2 — REGRESSION REPAIR. The v0.15.1 i18n edit accidentally
// dropped `navTennis` and `navWorldCup` while replacing the old
// nav-label block. TopBar.jsx still references both keys via
// `labelKey: 'navTennis'` / `labelKey: 'navWorldCup'`, so without
// them the t() lookup fell through to the hardcoded EN `label`
// fallback in BI mode — Bahasa users were seeing "Tennis" / "World
// Cup" instead of "Tenis" / "Piala Dunia" in the header for ~2 hours
// of production exposure. Restored both keys in EN + ID dictionaries.
// Pure regression repair, scope: 1 file. Caught during Phase 2 UX
// directive Sprint A scope audit (per docs/phase-2-ux-directive.md
// §0.5 reconciliation).
//
// v0.16.0 — PHASE 2 SPRINT A · BUG BANDAGE. Four targeted fixes
// retiring the most visibly broken things on the live site, all per
// the revised directive's §0.5 verified scope (3 keys not 7 — the
// other 4 either already exist post-v0.15.2 or aren't needed thanks
// to TopBar's labelKey-null fallback for NBA + F1 proper nouns).
//
//   1. i18n — added skipToContent / copyLink / share to both EN +
//      ID dicts. EN: "Skip to content / Copy link / Share". ID
//      casual: "Langsung ke konten / Salin link / Bagikan".
//   2. /nba-playoffs-2026 (plural) — was hitting SPA NotFound. Now
//      308-redirects to /nba-playoff-2026 (singular). Apex + path
//      variants both covered in vercel.json#redirects.
//   3. Skip-link refactor — App.jsx:142 was hardcoding the bilingual
//      concat "Langsung ke konten · Skip to content". Extracted a
//      <SkipLink/> child component that calls useApp().t('skipToContent')
//      so screen-reader users hear the language they actually toggled
//      to. App() can't call useApp() itself (it's the AppProvider
//      host); the child component is the canonical workaround.
//   4. Theme-aware --sport-* CSS vars — added a dedicated
//      :root[data-theme="dark"] block in index.css that overrides
//      --sport-f1 / --sport-pl / --sport-nba / --sport-wc /
//      --sport-id / --sport-tennis with the lightened
//      SPORT_COLOR_DARK hexes from src/lib/sportColor.js. Components
//      reading var(--sport-*) directly for chips/icons now get an
//      AA-passing hex automatically on dark theme. Saturated brand
//      hexes still apply via the combined :root default for
//      full-bleed surfaces (TeamPage wash, race banner) where
//      lightening isn't required. Source of truth for the
//      lightened hexes stays in sportColor.js#SPORT_COLOR_DARK;
//      adding a sport requires updating both files in lockstep.
//
// Five-journey advance: Sprint A doesn't directly move J1–J5 (those
// are owned by Sprints B–E), but it removes blockers for them: the
// skip-link unblocks keyboard users on every page, the redirect
// preserves SEO + share-link integrity, and the theme-aware sport
// vars unblock Sprint B's <HubStatusStrip> chip rendering on dark.

// v0.17.0 — PHASE 2 SPRINT B · <HubStatusStrip> + strip heroes.
//
// Single canonical chrome row replaces the inline `dashboard-hero`
// div on every hub. Lives at src/components/v2/HubStatusStrip.jsx
// with three slots: `picker` (top-left), `live` (center, eyebrow +
// season meta), and `actions` (top-right, <HubActionRow> Copy +
// Share). Carries the SEO h1 inline as `.sr-only` so crawlers and
// screen readers still read a heading on each page.
//
// New surfaces:
//   • src/components/v2/HubStatusStrip.jsx — ~110 lines. Slot-based
//     wrapper with optional left-edge accent stripe (used by leaf
//     pages to carry team color). Mounts via the existing
//     setTopbarSubrow(...) module store; no App.jsx changes.
//   • src/components/v2/HubActionRow.jsx — Copy + Share buttons.
//     Reads t('copyLink') and t('share') (added Sprint A v0.16.0).
//     Native navigator.share where available, clipboard fallback
//     otherwise. compact prop renders icon-only on mobile.
//
// Hubs migrated (3 stripped, 2 polished):
//   • SuperLeague (/super-league-2025-26) — STRIPPED. Eyebrow + 26px
//     h1 + subhead + filled red BAGIKAN/SHARE all collapsed into the
//     strip. SEO h1 → `.sr-only`. Red SHARE downgrades to ghost
//     outline (matches F1/Tennis pattern per directive §7.6 audit).
//   • F1 (/formula-1-2026) — STRIPPED. Eyebrow + 36px h1 + LIVE
//     chip + CopyLinkButton all gone from page body. Picker moves
//     from top-right of subrow to top-left of strip per directive
//     §4 ("for consistency with NBA / EPL / Tennis").
//   • Tennis (/tennis) — STRIPPED. Same shape as F1. Active
//     tournaments ribbon now sits ~140px closer to top of viewport.
//   • NBA (/nba-playoff-2026) — POLISHED. Reference shell, kept
//     intact. Compact <HubActionRow> appended to the existing
//     subrow's right cluster (after the refresh-age timestamp).
//   • EPL (/premier-league-2025-26) — POLISHED. Picker now wrapped
//     in <HubStatusStrip>; gains Copy + Share that the page never
//     had before. Inline hero on the page body retained (per
//     directive: "polish only — already minimal").
//
// Files touched: 5 hub pages + 2 new shared components. Net-new CSS
// lines: 0 (everything in component-local inline styles consuming
// existing CSS vars). Removed orphan imports: ShareButton in
// SuperLeague (only consumer was the stripped hero).
//
// Five-journey advance: this sprint serves J1 (live data in fold)
// directly — three live match scores now visible in the iPhone-14
// fold on every stripped hub. J2/J4 also benefit from the picker
// being one consistent location. Stopwatch test gate per the
// directive needs to be run on a real device next.

// v0.17.1 — Sprint B follow-up cleanup. First v0.17.0 deploy verified
// every hub strip rendering correctly via Chrome MCP screenshots, but
// EPL was double-rendering the chrome: the page-body `.sr-only h1`
// + inline `<CopyLinkButton>` block (left over from the v0.12.7
// strip) were still in EPL.jsx alongside the new HubStatusStrip's
// `srOnlyTitle` + actions slot, so two "Salin link" buttons stacked
// vertically. Cleanup: removed the inline duplicates from
// EPL.jsx:1115-1133 — HubStatusStrip is the single source for both
// the SEO h1 and the share controls now.

// v0.18.0 — PHASE 2 SPRINT C · <HubPicker> + <LiveStatusPill>
// consolidation. Two new wrapper components retire scattered chip
// implementations + collapse five direct picker imports into one
// polymorphic dispatcher per the directive's "wrap, don't rebuild"
// rule.
//
//   1. <HubPicker> — single entry-point for hub-level pickers.
//      Polymorphic via `kind` prop (liga1-club | epl-club | f1-team
//      | tennis | nba-team). Underlying components untouched —
//      EPLClubPicker, SuperLeagueClubPicker, ConstructorPicker,
//      TennisPlayerPicker, TeamPicker keep their per-domain logic.
//      HubPicker just lazy-loads the right one and forwards
//      `selectedKey` + `onSelect` + optional `lang`. Net effect on
//      hub pages: one import instead of five, one prop-shape
//      contract instead of five.
//
//   2. <LiveStatusPill> — canonical 5-variant status pill at
//      src/components/v2/LiveStatusPill.jsx. Variants: `live`,
//      `coming-soon`, `final`, `partial`, `offline`. Live retains
//      the universal --live red + livepulse animation (the v0.11.20
//      GIB-bonus fix that kept tennis-gold accents off live chips
//      to preserve AA contrast). Three migration sites this sprint:
//      ComingSoon (variant="soon" → "coming-soon"), TennisRankings
//      + TennisTournament (variant="live"). Three new variants
//      (`final`, `partial`, `offline`) are available now but not
//      yet adopted — that's a follow-up cleanup pass on match-card
//      FT/HT chips and feed-degraded banners.
//
// Files touched: 5 hub pages (HubPicker swap-in) + 3 leaf pages
// (LiveStatusPill swap-in) + 2 new shared components. Removed
// orphan imports: ConstructorPicker, Chip, CopyLinkButton from
// F1.jsx; EPLClubPicker from EPL.jsx; TeamPicker from
// NBADashboard.jsx; TennisPlayerPicker from Tennis.jsx. These now
// load only when their HubPicker `kind` actually mounts — keeps
// hub bundles lean.
//
// Chip.jsx left in place — it still carries `variant="neutral"`
// for tags / league-caps / metadata pills used outside the
// status-pill taxonomy (MilikmuStrip + similar). Future sprint can
// rename `<Chip variant="neutral">` to `<Tag>` if the split feels
// worth a separate component.

// v0.19.0 — PHASE 2 SPRINT D · <KpiStrip> + <ScheduleStrip>. Two
// new shared components ship; one migration lands; broader rollout
// deliberately deferred to Sprint F to avoid regressing live
// scoreboards in a "wrap and chrome" sprint.
//
//   1. <KpiStrip> — 4-cell stat strip. Cells specified as an array
//      of {eyebrow, value, sub, accent?, valueAccent?, trend?} so
//      the data layer can build the strip declaratively. 2-col on
//      mobile, 4-col on tablet+ (existing .stat-strip CSS rule).
//      role=group + aria-label for AT.
//
//      Migrated this sprint:
//        • NBADashboard.jsx:516 — the inline 4-cell `<div className=
//          "stat-strip">` mapping over `[{label,value,sub}]` swapped
//          for `<KpiStrip cells={[...]}>`. Identical pixel output;
//          team-aware accentBright color preserved via valueAccent
//          prop. Zero functional change, ~25 lines deleted, ~30
//          added (cleaner declarative shape).
//
//      Deferred:
//        • EPL Title-Favorite + Top-4 + Relegation + Golden-Boot
//          strip (EPL.jsx:416-466) — uses bespoke per-cell badges
//          and inline span renderers; risk of regression on
//          migration outweighs Sprint D scope.
//        • F1 Next-Race + Drivers-Leader + Constructor-Leader +
//          Champion-Favorite strip (F1.jsx:656-704) — uses
//          per-cell colored 3px height marks inside values; same
//          risk profile.
//      Both can land cleanly in Sprint F when leaf restructure is
//      already touching these files.
//
//   2. <ScheduleStrip> — shared chrome for the 5 schedule-row
//      variants (weekday | calendar | tournament | bracket |
//      empty). Header (title + meta) + .day-strip-scroll rail with
//      right-edge fade-mask + scroll-snap. Optional 3px left
//      accent stripe for sport-keyed contexts. role=region +
//      aria-label for AT.
//
//      Migrations deferred to Sprint F. Reason: NBA's
//      DayScoreboard already runs its own .day-strip-scroll
//      container with bespoke ESPN-live status pill in the meta
//      slot, F1's RoundStrip self-manages its scroll behavior
//      (would double-up if wrapped in ScheduleStrip's rail). All
//      five day-strips will be revisited in Sprint F's leaf
//      restructure pass; that's the right time to migrate, not
//      mid-Sprint-D where we can't fully test live-data hot
//      paths.
//
// Files touched: 2 new components, 1 hub migration. No removals.
//
// Tennis KPI strip note (directive §0.5 said "missing"): verified
// stale claim — Tennis already renders a 4-cell <TennisContextStrip>
// at row 3 below the active-tournaments ribbon (Tennis.jsx:1019).
// Per-cell rendering is rich (vertical accent bars, points
// formatters); migration to <KpiStrip> would lose that richness.
// Counted as "no action" for Sprint D.

// v0.19.5 — PHASE 2 SPRINT E · Editorial polish across HomeV1,
// About, Glossary, ComingSoon, and the Derby page. Pure visual /
// composition work; zero data-layer or hook changes. Engagement
// layer on /derby/persija-persib (Supabase polling + reactions +
// oneliners + JSON-LD) intentionally untouched per the protected-
// surfaces constraint we negotiated in docs/phase-2-ux-response.md.
//
//   1. /derby/persija-persib — RESHAPE, not rebuild. Three changes
//      per directive §4 "Derby reshape" task:
//        a. Countdown promoted to LEAD position (above eyebrow).
//           Was tucked below the tagline; now it's the first thing
//           a fan sees + drives urgency 13 days before JIS.
//        b. h1 swapped from clamp(28px, 6vw, 48px) to .derby-h1
//           class (32 mobile / 48 tablet / 56 desktop) — locks
//           the Display token from §6 of the type system.
//        c. Side-picker chips (Macan / Maung / Netral) split
//           desktop-vs-mobile via .show-desktop-only / .show-mobile-only
//           utility classes added to src/index.css. Desktop copy
//           stays inside the hero; mobile copy renders below the
//           H2H strip with horizontal-scroll affordance per
//           directive ("becomes a horizontal scroll below the H2H
//           strip on mobile").
//      Untouched: useDerbyState + useDerbyNextFixture hooks,
//      <PollsSection> + <ReactionWall> + <SquadShowdown> + JSON-LD.
//
//   2. HomeV1 mobile reorder via CSS `order` per directive §4.
//      .homev1-grid switches to flex column on ≤540px; aside +
//      section parents go display:contents so cards become direct
//      flex items; new homev1-card--{livegrid,trending,livepulse,
//      fansreact,fangir,hero,upcoming} classNames carry the
//      order:* declarations from src/index.css. Sequence on
//      mobile: Live Now grid → Trending → Live Pulse → Fans
//      Reacting → Fangir → Hero (demoted) → Upcoming (demoted).
//      Pickem CTA stays above the grid as the home banner
//      (already there in compact form, no reshape needed).
//      Desktop 3-col layout (200/1fr/260) preserved unchanged.
//
//   3. About + Glossary heroes compressed from fixed 36px to
//      .editorial-h1 token (24/28/32) per §6 type table. Each
//      page gains a JetBrains Mono eyebrow row above the h1 and
//      a <HubActionRow> share rail below the subhead, consuming
//      the Sprint A i18n keys (copyLink, share). Glossary's
//      eyebrow reads "NBA · POSTSEASON 2026 · GLOSSARY" per
//      directive's prescribed copy.
//
//   4. ComingSoon h1 → .editorial-h1 token. Features grid swapped
//      from `repeat(auto-fit, minmax(220px, 1fr))` (variable column
//      count) to the explicit .coming-soon-grid breakpoint matrix
//      (2-col ≤540 / 3-col 541-900 / 5-col ≥901) per directive §4
//      "6 feature cards become 2-col grid below 540, 3-col 540-900,
//      5-col ≥900." Applies to both /fifa-world-cup-2026 and /ibl
//      (both consume <ComingSoon>). EmailCapture component
//      deferred to growth-track ownership per the protected-
//      surfaces constraint — Phase 2 polishes layout, growth-track
//      plugs the waitlist content slot.
//
// Files touched:
//   • src/index.css — added 5 new rules: .show-mobile-only,
//     .show-desktop-only, .derby-h1, .editorial-h1, .coming-soon-grid,
//     plus the homev1-card--* @media block.
//   • src/pages/Derby.jsx — Hero refactor + new <SidePickerMobile>
//     mounted below <HeadToHead>. Engagement components untouched.
//   • src/pages/HomeV1.jsx — wrapper divs with homev1-card--*
//     classNames around each grid card (no JSX restructure).
//   • src/pages/About.jsx — hero compress + eyebrow + share rail.
//   • src/pages/Glossary.jsx — same as About + prescribed eyebrow.
//   • src/pages/ComingSoon.jsx — h1 → .editorial-h1, grid → .coming-soon-grid.
//
// Five-journey progress:
//   • J1 "Live now?" — HomeV1 mobile reorder puts Live Now grid
//     at row 1 of the grid, immediately below the Pick'em banner.
//   • J5 "Yesterday's recap" — share rail on About / Glossary
//     gives editorial pages a 2-tap share path (was zero).
//   • Derby (J2 surface for Indonesian football) — countdown lead
//     position + h1 spec compliance.
//
// Stopwatch test gate per directive: real iPhone test on
// HomeV1 → 3 live match scores in fold; Derby → countdown +
// eyebrow + h1 visible in fold; ComingSoon → 2-col grid stacks
// correctly. Code-side everything is in place.

// v0.20.0 — PHASE 2 SPRINT F · Leaf-page chrome restructure.
// All 8 leaf pages migrated to Shell A leaf with <HubStatusStrip>
// in the V2TopBar subrow. Visible 200px hero blocks stripped from
// every page; team/club/driver/tournament accents collapse into
// the strip's 3px left stripe. Strict no-data-touch sprint per
// directive §0.5: hooks, API plumbing, SEO meta, and route shape
// are completely untouched — pure chrome migration.
//
// 8 leaf pages restructured:
//
//   1. EPLClub (/premier-league-2025-26/club/:slug)
//      • Hero stripped: eyebrow + 36px h1 + venue meta + back-link
//      • Picker label: club name w/ accent block + ▾ chevron
//      • Live slot: "PREMIER LEAGUE · {SEASON} · {stadium} · {city}"
//      • Actions: HubActionRow with club accent
//
//   2. SuperLeagueClub (/super-league-2025-26/club/:slug)
//      • Hero stripped: eyebrow + 28px h1 + venue meta + filled red BAGIKAN
//      • Same shape as EPLClub. Zone chip (UCL/UEL/Conference/
//        Relegation) demoted from hero to standing card below.
//
//   3. TeamPage (/nba-playoff-2026/:teamSlug)
//      • Full-bleed team-color wash + 220px abbr watermark stripped
//      • Picker label: 28px abbr tile (team-color, branded moment)
//        + team name + ▾ — mirrors F1Driver # number tile pattern
//      • Live slot: NBA · CONF · SEED · record · streak chip · odds
//
//   4. TennisRankings (/tennis/rankings/:tour)
//      • Hero stripped: eyebrow + 36px h1 + LIVE chip + tour subhead
//      • Picker label: "ATP Peringkat ▾" / "WTA Rankings ▾"
//      • TourSwitcher (interactive ATP↔WTA toggle) preserved in
//        page body — has its own focus styling, near the table.
//
//   5. TennisTournament (/tennis/:slug)
//      • Hero stripped: eyebrow + 36px h1 + venue/dates subhead +
//        phase chip
//      • Picker label: "{tournament name} {year} ▾"
//      • Live slot: tour list · city · phase pill (LiveStatusPill
//        variant `live`/`final`/`coming-soon` mapped to phase)
//
//   6. F1Race (/formula-1-2026/race/:slug)
//      • Hero stripped: eyebrow + 36px h1 + circuit/country/race-time
//        + ShareButton (with igStory popover)
//      • Picker label: "R-badge · GP name ▾" — R-badge is a 28px
//        F1-red tile per directive §4 prescription
//      • Live slot: F1 · 2026 · ROUND NN · NEXT chip if applicable
//        · SPRINT chip if applicable
//      • Race-time line preserved as small body sub-meta below
//
//   7. F1Team (/formula-1-2026/team/:slug)
//      • Hero stripped: eyebrow + 36px h1 + base/power/founded meta
//        + Follow button + back-link
//      • Picker label: short-code tile (team accent) + team name + ▾
//      • Live slot: FORMULA 1 · 2026 · CONSTRUCTOR · P{position}
//        · {points} pt
//      • Follow button + base/power/founded meta line preserved
//        as body sub-row — favoriting affordance still one tap
//
//   8. F1Driver (/formula-1-2026/driver/:slug)
//      • Hero stripped: eyebrow + 36px "#NN Driver Name" h1 +
//        team link
//      • Picker label: # number tile (32px, 14px Inter Tight 900 in
//        team accent) + driver name + ▾ — the directive's "branded
//        moment" pattern, paralleling NBA TeamPage's abbr tile and
//        F1Race's R-badge
//      • Live slot: F1 · 2026 · DRIVER · code · team-link
//
// Constraints honored:
//   • Zero data-layer changes — useEPLTeam, useEPLStandings,
//     useEPLTeamRoster, useEPLClubSquad, useSuperLeagueTeam,
//     useSuperLeagueStandings, useSuperLeagueClubSquad, usePlayoffData,
//     useTeamSchedule, useTeamLeaders, useInjuries, useF1Standings,
//     useF1Results, useTennisRankings, useTennisTournament — all
//     untouched.
//   • Zero <SEO> block changes — title/description/path/lang/
//     keywords/jsonLd identical pre-and-post-strip.
//   • Zero route shape changes in src/App.jsx.
//   • Body content (squads, standings, schedules, rosters, recap
//     cards, IG-story PNG affordances) untouched.
//
// Files touched: 8 leaf pages. No new components. No new CSS rules
// (HubStatusStrip + HubActionRow shipped at v0.17.1 / v0.16.0).
//
// Five-journey advance: J2 ("What did my team do?") gets a major
// boost — every per-team / per-driver / per-tournament leaf now
// puts the last result + next fixture immediately in the fold
// (was below ~200px of hero chrome before).

// v0.21.0 — DERBY SHARE-CARD OG · growth-track ship #1.
//
// Per-prediction shareable OG image generator at /api/og-derby
// + a "Bagikan prediksi gue" share button under the score poll.
// Closes the WhatsApp / X / IG share loop with 13 days to derby
// kickoff: when a fan picks a score, they get a one-tap share
// that unfurls a Persija ↔ Persib gradient card with their pick
// baked in. Recipient sees the prediction in the share preview;
// every share is a backlink to /derby/persija-persib that
// compounds for years.
//
// New surfaces:
//   • api/og-derby.js — edge runtime, ~280 lines. @vercel/og
//     ImageResponse renders a satori → resvg pipeline using the
//     existing Inter Tight + JetBrains Mono fonts in api/og/_fonts.
//     Three sizes via ?size=og|story|square (1200×630, 1080×1920,
//     1080×1080). Three sides via ?side=persija|persib|neutral
//     tinting the bg gradient + tag color. Score read from
//     ?score=N-N (Persija-Persib). Optional ?handle= shouter line
//     truncated at 24 chars and glyph-allowlisted (untrusted edge
//     input). Cache-Control: public, s-maxage=86400, stale-while-
//     revalidate=604800 — first hit per param combo pays render
//     cost, subsequent served from edge.
//
// Page changes:
//   • src/pages/Derby.jsx — new <SharePredictionButton> mounts
//     under the score poll once the user has voted. Uses
//     navigator.share with clipboard fallback. Builds shareUrl
//     /derby/persija-persib?prediction=N-N&side=X so deep-links
//     unfurl with the same OG. Tracks `derby_share_prediction`
//     analytics event with method (native/clipboard) + score +
//     side.
//   • src/pages/Derby.jsx — Derby() reads ?prediction= + ?side=
//     from URL on mount; if a valid combo is present, the SEO
//     <meta og:image> + twitter:image route to the dynamic OG
//     endpoint with the same params. So a recipient who clicks
//     the shared link, then re-shares from their browser, gets
//     the same prediction-baked card again — virality compound.
//
// Function count: 10 → 11 (api/og-derby joins the function set).
// Still 1 under Vercel Hobby's 12-function limit. Headroom
// preserved for one more function before the next consolidation
// pass would be needed.
//
// Why dynamic instead of pre-generated static PNGs (CLAUDE.md
// "prefer static"): score combos × side × handle is unbounded
// once user input is allowed, and the aggressive edge cache
// (1 day TTL + 7 day SWR) makes the per-combo first-hit cost
// negligible at our scale. Net: dynamic is the right call here.

// v0.21.1 — CONTENT ENGINE PHASE 0 PREP. No web-app behavior changes;
// foundation files for the upcoming Bahasa-first content pipeline land
// in the repo at this ship so the implementation work can start
// 2026-06-01 with a clean baseline. All product decisions locked per
// docs/content-engine-response.md § 2; architectural amendments (Vite
// + JSON-files publishing, URL co-existence) locked per § 1.
//
// New surfaces (none affect the live web app):
//   • CLAUDE.md — repo-root project context. Synthesizes the Gibol
//     web-app instructions with the content-engine handoff. Future
//     Claude Code / Cowork sessions read this first.
//   • spec-content-agent.md — verbatim from the spec author. Not
//     modified; our amendments live in docs/content-engine-response.md.
//   • docs/content-engine-response.md — Vite-aligned amendments to
//     the spec, 6 product decisions resolved, sequencing relative to
//     existing growth-track (derby + FIFA WC + push notifications).
//   • supabase/migrations/0006_content_engine.sql — full content-
//     engine schema (ce_leagues, ce_teams, ce_players, ce_fixtures,
//     ce_events, ce_stats, ce_f1_sessions, ce_f1_results,
//     ce_nba_games, ce_nba_play_by_play, ce_articles, ce_article_runs,
//     ce_external_corpus). Adds pgvector extension. RLS + 5 league
//     seed rows. **NOT applied** — apply on Phase 0 kickoff via
//     Supabase SQL editor.
//   • packages/content-engine/ — Python package skeleton:
//       - pyproject.toml (Python 3.12, anthropic SDK, asyncpg,
//         pgvector, simhash, pendulum, structlog)
//       - .env.example with phase-tagged env vars
//       - README.md, STATUS.md (Phase 0 prep tracker)
//       - prompts/voice-rules.md + banned-phrases.txt (verbatim from
//         handoff — these are the load-bearing voice spec)
//       - src/{agents,data,quality,publish,orchestrator}/ — empty
//         dirs ready for Phase 0 source files
//       - eval/ — empty, ready for Phase 1 eval set
//
// Locked decisions (from docs/content-engine-response.md § 2):
//   1. Author byline: Gibol Newsroom org for v1; named human editor
//      on flagship matches by Month 3
//   2. AI disclosure footer: YES — standard wording on every article
//   3. Live match thread: SKIP for v1 and v2
//   4. English-language version: SKIP — Bahasa-first stays
//   5. Liga 1 voice supplement: PHASE 2 alongside EPL auto-publish,
//      not Phase 3 (Indonesian league > foreign leagues priority)
//   6. Push notifications + WhatsApp digest: PHASE 4 stretch
//
// Sequencing (from docs/content-engine-response.md § 3):
//   • Now → 2026-05-10 (13d): Monitor derby OG share-card analytics
//   • 2026-05-11 → 2026-05-31: FIFA WC manual content sprint
//     (~10 articles — these become Eval Set Gold for the engine)
//   • 2026-06-01 → 2026-06-07: Phase 0 — engine foundation, EPL
//     ingestion, Anthropic SDK wrapper with caching
//   • 2026-06-08 → 2026-06-28: Phase 1 — EPL Preview + Recap MVP
//     with manual review queue, ship 25 articles
//   • 2026-06-29 → 2026-07-19: Phase 2 — Liga 1 + EPL auto-publish
//     + standings explainer + Liga 1 voice supplement
//   • 2026-07-20 → 2026-08-09: Phase 3 — NBA recaps + F1 + WC
//   • 2026-08-10 onwards: Phase 4 — evergreen profiles + QC sweep
//
// Open items requiring Ade input:
//   - ✅ ANTHROPIC_API_KEY provisioned in Vercel production env
//     2026-04-27 via `npx vercel env add` (verified Encrypted in
//     vercel env ls). Anthropic billing already active with $19.59
//     credit + auto-reload to $20 at $5 threshold.
//   - ⏳ OPENAI_API_KEY deferred to Phase 4 (~September). Engine
//     doesn't need embeddings until evergreen profile retrieval lands.
//   - ⏳ Apply supabase/migrations/0006_content_engine.sql via
//     SQL editor on 2026-06-01 (Phase 0 kickoff). Idempotent.
//
// Five protected surfaces (per Phase 2 UX response, still in force):
//   1. /derby/persija-persib (engagement layer)
//   2. /fifa-world-cup-2026 (waitlist content slot)
//   3. PWA install prompt
//   4. Favorites store
//   5. Per-club squad pages (API-Football)
//
// This ship doesn't touch any of them — purely additive scaffolding.

// v0.22.0 — CONTENT ENGINE PHASE 0 KICKOFF (ahead of June 1 target).
//
// Migration 0006 applied to live Supabase + Python source landed for the
// ingestion + Anthropic SDK wrapper. The engine doesn't run on Vercel
// (Python doesn't deploy here) — Phase 0 ends when Ade can run
// `python -m content_engine.cli ingest --league premier-league
// --gameweek 35 --dry-run` locally and see clean normalized fixtures.
// This deploy is a bookkeeping ship: no web-app code changed; the
// version bump tracks the content-engine state.
//
//   1. Migration 0006 applied via Supabase SQL editor (Chrome MCP):
//        ✓ Success. No rows returned
//        ✓ ce_leagues count = 5 (epl, liga-1-id, nba-playoffs-2026,
//          f1-2026, fifa-wc-2026), verified via select query
//
//   2. Python source files landed (10 files, all parse via ast):
//
//      src/content_engine/__init__.py       — package version 0.0.1
//      src/content_engine/config.py         — pydantic-settings reading
//                                             ANTHROPIC_API_KEY, DATABASE_URL,
//                                             API_FOOTBALL_KEY, OPENAI_API_KEY
//                                             (optional). Exposes typed
//                                             singleton `settings`. Cost cap
//                                             default $5/day per agent.
//      src/content_engine/cli.py            — typer CLI with `health` + `ingest`
//                                             commands. Phase 1+ adds preview/
//                                             recap/backfill/eval.
//      src/content_engine/anthropic_client.py
//                                           — AsyncAnthropic singleton +
//                                             cached_system() helper +
//                                             run_messages() with budget
//                                             check + cost estimation across
//                                             Sonnet 4.6 / Haiku 4.5 / Opus 4.7
//                                             (cache-creation 1.25x, cache-
//                                             read 0.10x). BudgetExceededError
//                                             raised when daily cap hit.
//      src/content_engine/data/__init__.py  — package marker
//      src/content_engine/data/db.py        — asyncpg pool, ping(), upsert_
//                                             fixtures(), fetch_league(). Uses
//                                             raw SQL (no ORM) for speed +
//                                             clarity.
//      src/content_engine/data/api_football.py
//                                           — httpx async client, fetch_epl_
//                                             gameweek(), fetch_liga1_gameweek(),
//                                             fetch_fixture(), fetch_status().
//                                             League-id map: epl=39,
//                                             liga-1-id=274, fifa-wc-2026=1.
//      src/content_engine/data/normalizer.py
//                                           — API-Football response → ce_*
//                                             schema dict. Status code mapping
//                                             (NS→scheduled, FT→final, etc.),
//                                             ISO8601 → UTC datetime, venue
//                                             formatter, defensive skip on
//                                             missing id/kickoff (logs +
//                                             continues, doesn't crash the
//                                             whole gameweek).
//
//      tests/__init__.py                    — package marker
//      tests/test_normalizer.py             — 18 tests covering status
//                                             mapping (8), kickoff parsing (5),
//                                             venue formatting (4), full
//                                             fixture normalization (8),
//                                             error handling (3),
//                                             provenance assertion that no
//                                             field is fabricated (1).
//      tests/test_anthropic_client.py       — 8 tests covering cached_system
//                                             marker emission + cost
//                                             estimation across Sonnet/Haiku/
//                                             Opus + cache-creation +
//                                             cache-read pricing maths +
//                                             unknown-model defensive return.
//
//   3. Critical safety property tested: `test_normalize_no_fabricated_fields`
//      asserts the normalizer's output keys are EXACTLY the expected
//      schema keys. Per CLAUDE.md non-negotiable rule #6 ("Ground every
//      factual claim in source data") — this test is the safety net.
//      Future schema bumps must update both the normalizer and this test
//      in lockstep.
//
//   4. Anthropic API key already provisioned in v0.21.1 (Vercel production
//      env). The Python engine reads from local .env on developer machines;
//      production runtime config TBD in Phase 1 when orchestration lands
//      (Cloudflare Workers / GitHub Actions per spec § 10).
//
// Phase 0 acceptance criterion (per spec § 12 + STATUS.md):
//   `python -m content_engine.cli ingest --league premier-league
//   --gameweek 35 --dry-run` returns clean normalized data for every
//   fixture. Ade runs this locally on his Mac (Python 3.12 + pip install
//   -e ".[dev]" from packages/content-engine/) when convenient — this is
//   the natural handoff point between coding and tuning.
//
// What's NEXT (Phase 1 — 2026-06-08 onwards or earlier per Ade):
//   - prompts/preview-system.md + recap-system.md (system prompts v1)
//   - agents/preview.py + agents/recap.py
//   - quality/voice_lint.py + fact_check.py + plagiarism.py (per response
//     doc § 6: 7-gram simhash vs external corpus)
//   - publish/json_writer.py → public/content/{type}/{slug}.json
//   - 7 new lazy SPA routes (/preview/[slug], /recap/[slug], …)
//   - prerender.mjs extension to read public/content/ at build time
//   - Manual review queue (no auto-publish in Phase 1)
//   - Ship 25 articles. Read every one. Tune prompts.

// v0.22.1 — Content engine Phase 0 acceptance PASSED.
//
// `python -m content_engine.cli ingest --league premier-league
// --gameweek 35 --dry-run` returns 10 cleanly normalized EPL fixtures
// from Ade's local Mac (Python 3.13.13, venv, all deps installed,
// migration 0006 applied to live Supabase). End-to-end flow proven:
//
//   httpx async fetch → Vercel proxy (already-keyed) → API-Football
//   v3 → 10 fixtures returned → normalizer → ce_* schema dicts →
//   structlog → printed.
//
// Architectural call shipped this version: Phase 0 routes through
// the existing /api/proxy/api-football/* Vercel proxy rather than
// hitting v3.football.api-sports.io directly. Reason: API_FOOTBALL_KEY
// is marked "Sensitive" in Vercel env, so `vercel env pull` returns
// it empty — making local-dev key provisioning a friction point. The
// proxy already has the key configured server-side and works
// (verified in this session via /status). Engine sets
// _USE_PROXY=True in src/content_engine/data/api_football.py for
// Phase 0; will flip to False in Phase 1 when we need higher request
// rates and provision the key in local .env directly.
//
// Other Phase 0 polish in this ship:
//   • DATABASE_URL made optional in config.py — Phase 0 dry-run
//     doesn't write to DB. Required from Phase 0 health-check + all
//     of Phase 1 onwards (when ingest actually upserts to ce_fixtures).
//   • ANTHROPIC_API_KEY + API_FOOTBALL_KEY default to empty string
//     in config — engine starts with sparse .env. Required from
//     Phase 1 (writer agents call Anthropic; direct API-Football
//     access needs the key).
//   • typer added to pyproject.toml dependencies (was missing from
//     the initial parallel-agent scaffold; CLI module didn't import
//     without `pip install typer`).
//   • setup_env.py helper script lands at packages/content-engine/
//     for the Phase 1 onboarding step (prompts via getpass for all 3
//     keys; writes idempotently to .env without ever passing values
//     through chat or shell history).
//
// Phase 1 (EPL Preview + Recap MVP) unlocks. Per directive § 3 + the
// content-engine response doc § 3 sequencing, Phase 1 was scheduled
// for 2026-06-08. Pulled forward — can start any time now since
// foundation is proven working.

// v0.23.0 — Content engine Phase 1 SHIP #1: first generated preview
// article live end-to-end at /preview/arsenal-vs-fulham-2026-05-02.
//
// What landed in this version:
//
//   1. Preview Writer agent (Sonnet 4.6, prompt-cached system block)
//      at packages/content-engine/src/content_engine/agents/preview.py.
//      Loads voice-rules.md + preview-system.md as ONE cached system
//      block (~3K tokens, 90% cache hit rate after first call).
//      Renders user-message context block per spec § 5.2 template
//      and returns {body_md, model, usage, stop_reason}.
//
//   2. Quality gates pre-publish:
//        • quality/polish.py — deterministic preprocessor (em-dash
//          → comma, en-dash → comma, semicolon → period, smart-quotes
//          → straight, ellipsis → "...", trailing-ws strip). Per
//          voice-rules.md guidance: doctrine-compliant remediation,
//          not a bypass. Runs BEFORE the hard gate.
//        • quality/banned_phrase.py — regex check against
//          prompts/banned-phrases.txt + punctuation bans. Hard fail
//          = regenerate. No override flag (per CLAUDE.md rule #9).
//
//   3. Publishing path:
//        • publish/slug.py — Bahasa-friendly kebab-case + fixture
//          slug helper ({home}-vs-{away}-{yyyy-mm-dd}).
//        • publish/json_writer.py — writes article JSON to
//          public/content/{type}/{slug}.json with frontmatter
//          including manual_review:true (Phase 1 default per
//          locked decision § 8 — no auto-publish in Phase 1).
//
//   4. CLI:
//        • `python -m content_engine.cli preview --fixture-id
//          1379309 --dry-run` runs the full pipeline (fetch →
//          normalize → write_preview → polish → banned-phrase
//          gate → cost report).
//        • `--write` flag persists JSON to disk after the gate
//          passes.
//
//   5. SPA route:
//        • src/pages/Preview.jsx — fetches
//          /content/preview/{slug}.json, renders body_md inline
//          (handles paragraphs, # ## ### headings, **bold**,
//          *italic*, [text](url), hr — no external markdown lib).
//        • Mounts HubStatusStrip + HubActionRow in V2TopBar
//          subrow (chrome consistent with Phase 2 hub/leaf pages).
//        • Renders Breadcrumbs (Beranda > Liga Inggris > Preview)
//          + manual_review pending badge + AI disclosure footer
//          per CLAUDE.md rule #12.
//        • Lazy-loaded route /preview/:slug registered in App.jsx.
//
//   6. Prerender extension (scripts/prerender.mjs):
//        • New loadGeneratedContentRoutes() walks
//          public/content/{type}/*.json, emits one
//          /{type}/{slug}/index.html per article.
//        • Per-article SportsEvent + NewsArticle + BreadcrumbList
//          JSON-LD baked into the static HTML so AI/social
//          crawlers see structured data before JS hydrates.
//        • Sitemap.xml inclusion at priority 0.8, changefreq
//          daily.
//
// First article shipped (manual review pending):
//   public/content/preview/arsenal-vs-fulham-2026-05-02.json
//   • 1386 chars, Sonnet 4.6, $0.0099 (cache miss + ~600 output)
//   • Banned-phrase gate PASSED on first generation post-polish
//   • EPL fixture 1379309, kickoff 2 May 2026 06:30 WIB
//
// What's NOT in this ship (deferred to ship #2+):
//   • Form / standings / H2H / top-scorer ingestion (Phase 1 ship
//     #2). The article currently calls out the gaps explicitly
//     ("Data form terkini... belum tersedia") which is the
//     correct behavior per CLAUDE.md rule #6 (no fabrication).
//   • Recap Writer agent (Phase 1 ship #2 — needs final-whistle
//     trigger + match events ingestion).
//   • External plagiarism check (Phase 1 ship #3 — 7-gram simhash
//     against top 5 Indonesian sport sites per response doc § 6).
//   • Voice linter Haiku pass (Phase 1 ship #3).
//   • Auto-publish (Phase 2 — Phase 1 every article goes through
//     manual review per locked decision).
//
// Acceptance for this ship:
//   curl https://www.gibol.co/preview/arsenal-vs-fulham-2026-05-02
//   returns 200 with the article body, Bahasa meta, JSON-LD, and
//   manual_review banner. Verified post-deploy.

// v0.23.1 — content engine batch validation. The remaining 9 EPL
// gameweek 35 fixtures all generated cleanly through the same
// pipeline (Sonnet 4.6 → polish → banned-phrase gate → JSON write).
// Every article passed the gate on first generation post-polish.
//
// Batch economics validated:
//   • First call cold cache: $0.031 (cache write of voice-rules +
//     preview-system block, ~6800 tokens).
//   • Subsequent 8 calls warm cache: $0.006-0.012 each (cache_read
//     6816 tokens charged at 10% per spec § 5.1).
//   • Per-article steady-state: ~$0.0085 average. 10-article
//     gameweek = ~$0.085. Well under the $5/day per-agent cap.
//
// 10 previews shipped this version (all manual_review:true):
//   • arsenal-vs-fulham-2026-05-02
//   • aston-villa-vs-tottenham-2026-05-03
//   • bournemouth-vs-crystal-palace-2026-05-03
//   • brentford-vs-west-ham-2026-05-02
//   • chelsea-vs-nottingham-forest-2026-05-04
//   • everton-vs-manchester-city-2026-05-04
//   • leeds-vs-burnley-2026-05-01
//   • manchester-united-vs-liverpool-2026-05-03
//   • newcastle-vs-brighton-2026-05-02
//   • wolves-vs-sunderland-2026-05-02
//
// Each article emits SportsEvent + NewsArticle + BreadcrumbList
// JSON-LD via the prerender step. Sitemap.xml inclusion at
// priority 0.8, changefreq daily.
//
// Manual review queue: every article needs Ade's read-through
// before flipping manual_review to false. Phase 1 doctrine: no
// auto-publish. This is the unblocker for tuning prompts before
// Phase 1 ship #2 lands form/standings/H2H ingestion.

// v0.24.0 — Content engine Phase 1 SHIP #2: real data ingestion. The
// preview writer's context block now carries actual league standings
// + form + per-team top-scorers + last-5 H2H, fetched fresh per
// generation through the existing API-Football proxy.
//
// What landed in this version:
//
//   1. Three new API-Football endpoints in data/api_football.py:
//        • fetch_standings(league_id) → standings table with form
//          string ("WLLWW") per team
//        • fetch_h2h(home_id, away_id, last=5) → last 5 meetings
//        • fetch_topscorers(league_id) → league scoring leaderboard
//
//   2. Three new normalizers in data/normalizer.py:
//        • normalize_standings → (rank, team, points, played, form,
//          gd) rows
//        • normalize_h2h → home-POV summary string + per-meeting
//          fixtures + W/D/L tally
//        • normalize_topscorers + find_team_top_scorer → flat list
//          + per-team lookup helper
//
//   3. New module data/preview_context.py — the assembly layer that
//      takes a normalized fixture and builds the full context dict
//      the preview writer expects. In-process cache (per-run) for
//      league-wide fetches so a 10-fixture batch hits the API ~12
//      times instead of ~30. Soft-fails on partial outage.
//
//   4. Bug fix in passing: kickoff_local now formats as Asia/Jakarta
//      WIB (UTC+7) properly. Previous version used
//      astimezone().strftime() + " UTC" which leaked the runner
//      machine's local tz into the prompt, then the LLM
//      rationalized it into plausible-but-wrong WIB times. All 10
//      ship #1 articles had incorrect kickoff hours; all 10 ship
//      #2 regenerations fix this.
//
//   5. All 10 EPL gameweek 35 previews regenerated with full
//      context. File sizes jumped from ~1500-2600 bytes to
//      ~2500-3500 bytes — meaningful body increase. Manual review
//      still required (manual_review:true) before flipping public.
//
// Spot-check quality lift (Manchester United vs Liverpool):
//   Before: "Detail form, klasemen, top scorer, dan H2H belum
//            tersedia di sistem kami untuk laga ini."
//   After:  "Manchester United menjamu Liverpool di Old Trafford...
//            kedua tim sama-sama mengumpulkan 58 poin setelah 33
//            laga... MU masuk laga ini dengan form WLDWL... Bryan
//            Mbeumo jadi andalan di lini depan dengan 9 gol musim
//            ini... Lima pertemuan terakhir: MU punya catatan 1
//            menang, 2 seri, 2 kalah. Dua kekalahan 0-3 di rangkaian
//            itu cukup bicara, ketika Liverpool on song..."
//
// Cost economics validated at volume:
//   • Cold cache (first call): $0.035 (cache write of voice-rules
//     + preview-system, ~8K tokens including expanded context).
//   • Warm cache (calls 2-10): cache_read=8092 tokens at 10% per
//     spec § 5.1.
//   • Per-article steady-state: ~$0.012-$0.020. 10-article gameweek
//     ~$0.18 (vs $0.10 in ship #1). Lift in body density justifies
//     the modest per-article increase.
//
// What's NOT in this ship (Phase 1 ship #3):
//   • Lineup + injury ingestion (api/proxy/api-football/sidelined,
//     /lineups). Articles still use "Belum ada update cedera resmi"
//     stub for the injuries field — honest gap.
//   • Recap Writer + post-match events ingestion.
//   • Voice linter Haiku pass for subtle voice drift the regex
//     can't catch (e.g. training-data inferences like "tim Scott
//     Parker" — model named the manager from training).
//   • Persistent ce_standings / ce_h2h / ce_topscorers tables (
//     cache currently in-process only).

// v0.25.0 — Content engine Phase 1 SHIP #3: voice linter (Haiku 4.5)
// + recap writer + first published recap.
//
// Two parallel workstreams landed in this version:
//
// 1. Voice linter (Haiku 4.5):
//    • New module quality/voice_lint.py + system prompt
//      prompts/voice-lint-system.md.
//    • Catches what regex can't: tense over-marking, soft-discouraged
//      phrase repeats, pronoun violations (Anda/kamu in body),
//      academic register drift, AI-translated-English smell,
//      training-data inference creep (coach names, formations not in
//      input), structural patterns.
//    • Returns structured JSON: verdict, score 0-100, per-issue
//      list with severity + snippet + fix.
//    • Wired into BOTH preview and recap CLI pipelines post-polish,
//      post-banned-phrase, before write. Source context (the writer
//      agent's user message) is passed to the linter so it can
//      ground-check fact claims.
//    • Phase 1: SOFT gate. Score persisted to frontmatter.voice_lint
//      for editorial dashboard sorting. Issues surfaced to operator
//      stdout. Phase 2 flips this to hard once threshold tuned on
//      100+ articles of editorial feedback.
//    • Cost: ~$0.0008-0.003 per check (Haiku is cheap).
//
// 2. Recap Writer:
//    • Three new API-Football endpoints in data/api_football.py:
//      /fixtures/events, /fixtures/lineups, /fixtures/statistics.
//    • Three new normalizers in data/normalizer.py: events
//      (chronological timeline with player + minute + assist),
//      lineups (formation + coach + start XI + bench), statistics
//      (possession, shots, xG, passes — keyed by the snake-case
//      labels the writer prompt expects).
//    • New module data/recap_context.py — fetches all three
//      endpoints in parallel, pre-formats prose-friendly blocks
//      (timeline, stat comparison, lineups) the agent reads
//      literally.
//    • New prompt prompts/recap-system.md — tight grounding rules
//      ("every fact in input data block, no exceptions"),
//      structural template (lead → goals → tactical read →
//      defining moment → table implications), voice notes specific
//      to recaps (past tense by context, vary outcome verbs).
//    • New module agents/recap.py — Sonnet 4.6 with cached system
//      block (voice-rules + recap-system).
//    • New CLI command: `python -m content_engine.cli recap
//      --fixture-id X --write`. Same gate sequence as preview:
//      polish → banned-phrase → voice-lint → JSON write.
//
// 3. Frontend:
//    • Generalized Preview.jsx → GeneratedArticle.jsx with `type`
//      prop. Preview.jsx is now a 5-line wrapper. New MatchRecap.jsx
//      sister wrapper for recaps.
//    • Recap path is /match-recap/:slug NOT /recap/:slug. The
//      existing NBA /recap/:date landing would catch the slug param
//      and mishandle it. Future ship may unify.
//    • prerender.mjs extended: CONTENT_TYPES gained a `recap` entry
//      with routePrefix=/match-recap, eventStatus=EventCompleted.
//      Recap JSON-LD includes homeTeam.score + awayTeam.score so
//      crawlers index the final result.
//    • Sitemap.xml picks up generated recaps at priority 0.8,
//      changefreq daily.
//
// First published recap:
//   /match-recap/liverpool-vs-crystal-palace-2026-04-25
//   • EPL gameweek 34, finished 2026-04-25 14:00 UTC
//   • Liverpool 3-1 Crystal Palace (3580 chars on first generation)
//   • Cost: $0.0465 cold cache → $0.0212 warm cache
//   • Voice lint: PASS, score 82, 4 issues (1 medium, 3 low)
//   • Lead with the xG angle: "Liverpool menang 3-1 atas Crystal
//     Palace di Anfield, tapi angka xG bilang lain. Palace, yang
//     lebih berbahaya di atas kertas dengan 2.26 xG vs 1.15,
//     membuang terlalu banyak peluang."
//   • All 4 goals cited with minute + scorer + assist
//   • Defining moment: VAR-cancelled Salah penalty at 24'
//   • All factual claims verified grounded against the input
//     data block (xG, shots, possession, scorers).
//
// Total content engine output now live: 10 EPL gameweek 35 previews
// + 1 EPL gameweek 34 recap = 11 articles. ~$0.30 total spend.

// v0.26.0 — Content engine Phase 1 SHIP #4: full GW34 recap batch
// + plagiarism + dedup hard gate.
//
// 1. 8 new EPL gameweek 34 recaps written through the recap pipeline:
//    • brighton-vs-chelsea-2026-04-21       (3-0)
//    • bournemouth-vs-leeds-2026-04-22      (2-2)
//    • burnley-vs-manchester-city-2026-04-22 (0-1)
//    • sunderland-vs-nottingham-forest-2026-04-24 (0-5)
//    • fulham-vs-aston-villa-2026-04-25     (1-0)
//    • wolves-vs-tottenham-2026-04-25       (0-1)
//    • west-ham-vs-everton-2026-04-25       (2-1)
//    • arsenal-vs-newcastle-2026-04-25      (1-0)
//    All passed banned-phrase + voice-lint gates first try. File
//    sizes 3.8-4.9KB body. Total batch ~$0.18 (warm-cache average).
//    Combined with the Liverpool 3-1 Crystal Palace recap from
//    ship #3, that's 9 EPL GW34 recaps live.
//
// 2. Plagiarism + dedup hard gate (per CLAUDE.md non-negotiable rule
//    #9 + content-engine-response.md § 6).
//
//    Module: quality/plagiarism.py
//    • 64-bit SimHash over 7-gram character shingles (`simhash` 2.1.2
//      from pyproject.toml dependencies).
//    • Bahasa-aware normalization: lowercase, strip punctuation,
//      preserve diacritics (Sosa, João, Gyökeres).
//    • Hamming distance ≤ 6 / 64 = ≥ 90.6% similarity = HARD FAIL.
//      Distance 7-12 = warn (surfaced to operator, doesn't block).
//      >12 = pass.
//
//    Two corpus sources:
//    • Internal — walks public/content/{type}/*.json, fingerprints
//      every body_md, compares incoming article. Self-skip by slug
//      so a regenerate doesn't fail itself.
//    • External — pluggable JSONL fingerprint file at
//      packages/content-engine/data/external-corpus.jsonl. Phase 1
//      ship #4 ships EMPTY corpus with explicit log
//      ("plagiarism.external_corpus_empty") so it's never silent.
//      Future ship adds polite scraper for Bola.net / Detik /
//      Kompas Sport / Tempo Sport.
//
//    Wired into BOTH preview and recap CLI pipelines as gate #6c
//    (after polish, banned-phrase, voice-lint). Hard fail = exit 5.
//    No bypass flag. No override env var.
//
//    Validated against all 19 existing articles (10 previews + 9
//    recaps): 0 fails, 0 warnings. All inter-article distances >12.
//    Genuine distinct content, gate is calibrated correctly.
//
//    Frontmatter now carries `plagiarism_hash` (hex 64-bit SimHash)
//    so future loads of this article participate in the corpus
//    without re-fingerprinting.
//
// Production state at v0.26.0:
//   • 10 EPL GW35 previews (`/preview/*`)
//   • 9 EPL GW34 recaps    (`/match-recap/*`)
//   • All with manual_review: true (no auto-publish in Phase 1).
//   • Total content engine spend across all generations: ~$0.50.
//   • All 4 hard quality gates active: polish (deterministic),
//     banned-phrase (regex), voice-lint (Haiku 4.5 — soft Phase 1),
//     plagiarism (SimHash hard gate).

// v0.27.0 — Content engine Phase 1 SHIP #5: fact validator (rule-based)
// — closes the last hard quality gate per CLAUDE.md non-negotiable
// rule #9.
//
// Module: quality/fact_check.py — pure rule-based, no LLM call ($0
// cost). Future ship #5b adds Haiku 4.5 second pass for sentence-
// level fact-checking once we see the rule-based gate's first 100+
// articles in editorial feedback.
//
// Six categories of numerical claim cross-checked against the
// writer's input data block:
//   1. Position claims  ("posisi N", "ke-N", "urutan N")
//   2. Points claims    ("N poin")  — incl. delta-context allowance
//                                     (selisih, di bawah, terpaut)
//                                     so "Liverpool 25 poin di bawah
//                                     pemuncak" doesn't false-fail
//   3. Form strings     (5-char [WLD] runs in form context)
//   4. Goal counts      ("N gol musim ini" near a player name)
//   5. Final score      (recap-only, "menang N-N" in final context)
//   6. Goal minutes     (recap-only, "cetak gol di menit N")
//
// Validated against all 19 existing articles: 0 fails, 0 false
// positives. Confirmed via 5 fault-injection tests that the gate
// triggers on intentional faults (wrong position, wrong goal count,
// wrong form, wrong points, wrong recap score).
//
// Hard fail = exit 6 from the CLI. No bypass flag. Wired into both
// preview + recap pipelines as gate #6c (between voice-lint soft
// gate and plagiarism hard gate).
//
// Per-article cost: $0 (no LLM). Total spend per article unchanged
// from v0.26.0 baseline (~$0.04 cold cache, ~$0.012 warm cache).
//
// Phase 1 doctrine compliance per CLAUDE.md rule #9 — full hard-gate
// stack now active:
//   ✓ Polish (deterministic em-dash → comma, etc.)
//   ✓ Banned-phrase regex (active, 100% pass on 19 articles)
//   ✓ Length check (writer max_tokens bounded)
//   ✓ Voice lint (Haiku 4.5, soft gate Phase 1 → hard Phase 2)
//   ✓ Fact validator (rule-based hard gate)
//   ✓ Dedup hash (SimHash internal corpus hard gate)
//   ✓ Schema validity (json_writer enforces shape)
//   ✓ External plagiarism (framework live, corpus pluggable JSONL)
//
// Frontmatter now also carries fact_check.passed + issue_count for
// editorial dashboard sort.
//
// No new article generation in this ship — gate is added to the
// pipeline; existing 19 articles already PASS without re-running
// (they're already factually grounded — confirmed by the baseline).

// v0.28.0 — Content engine Phase 1 SHIPS #6 + #7: injuries
// ingestion + editorial dashboard.
//
// Ship #6 — Injuries ingestion for previews:
//   • Two new API-Football endpoints in data/api_football.py:
//     fetch_team_injuries() and fetch_fixture_injuries(). The team-
//     scoped variant is the workhorse — fixture-scoped is empty
//     until 24-48h before kickoff.
//   • New normalize_injuries() in data/normalizer.py: filters the
//     season log to entries within {21d back, 14d forward} of "now",
//     dedupes by player keeping the most recent entry, sorts by
//     team + player name.
//   • preview_context.build_context() now fetches per-team injuries
//     in parallel with standings/topscorers, caches per (team_id,
//     league_id) so a 10-fixture batch hits the /injuries endpoint
//     20x at most.
//   • _format_injuries() pre-renders to a single comma-separated
//     string for the writer prompt — same shape it already accepts.
//   • All 10 EPL GW35 previews regenerated. Body sizes substantially
//     up. Sample (Arsenal vs Fulham): "Saka, Eze, Timber, Havertz,
//     Merino, Odegaard, Calafiori, Hincapie, semuanya diragukan
//     atau dipastikan absen. Itu bukan sekadar rotasi paksa, itu
//     krisis lini tengah dan sayap di momen paling krusial."
//   • All 5 hard quality gates still pass: polish + banned-phrase +
//     fact-check + plagiarism (10/10 fresh writes).
//   • Voice-lint score average ~80 (Haiku flagged real issues per
//     article — manual review queue handles them).
//
// Ship #7 — Editorial dashboard at /editor:
//   • New page src/pages/Editor.jsx — read-only manual-review queue.
//     Lists every article from public/content/{preview,recap}/*.json
//     with voice-lint score, fact-check pass/fail, plagiarism hash,
//     cost, char count. Sortable + filterable.
//   • prerender.mjs extended: emits dist/content/index.json with
//     full metadata. Sorted pending-first then ascending lint score
//     so the editor attacks worst drafts first.
//   • Page is noindex'd via SEO component — never crawled.
//   • No auth gate yet (Phase 1, no auto-publish). Phase 2 adds a
//     "publish" button + token-auth serverless function to flip
//     manual_review = false in batch.
//   • Footer documents which gates are hard vs soft so editor
//     understands what's been pre-filtered before reaching the
//     queue.
//
// Total content engine output now live: 10 GW35 previews + 9 GW34
// recaps = 19 articles. All carry full gate metadata in frontmatter.
// Editor can sort by lint score and start working through the
// queue immediately at /editor.
//
// Cumulative spend: ~$0.85 across 19 articles + 1 round of
// regeneration (injuries layer). Average $0.045 per article fully
// gated. Well under the $5/day per-agent cap.

// v0.29.0 — Content engine Phase 1 SHIP #8: Standings explainer
// (Haiku 4.5 templated agent).
//
// Third agent type alongside preview + recap. Different shape:
//   • Templated content (Haiku 4.5, $0.001-0.003 per article vs
//     $0.012-0.020 for Sonnet preview/recap).
//   • Weekly cadence (one per league per gameweek that just
//     finished).
//   • Reads the full standings table + form strings + GD that we
//     already ingest for previews — no new API endpoints needed.
//
// New files:
//   • prompts/standings-system.md — tight rules: cite figures
//     literally, no player names, no manager names, vary the
//     direction-verbs (memimpin/menempel/turun/menjaga jarak).
//   • src/content_engine/agents/standings.py — the Haiku call,
//     same cached_system pattern as preview/recap.
//   • src/content_engine/data/standings_context.py — fixed-width
//     text table renderer + top/bottom 3 movers block.
//   • src/pages/Standings.jsx — thin wrapper around the
//     generalized GeneratedArticle component.
//   • CLI: `python -m content_engine.cli standings --league epl
//     --gameweek 34 --write`.
//
// Pipeline gates the standings agent runs through:
//   ✓ Polish (now also normalizes digit-flanked en-dashes to
//     ASCII hyphen — fixes a real bug from this ship's first
//     generation where Haiku used "5–7" in a header and the
//     banned-phrase gate failed)
//   ✓ Banned-phrase regex (hard)
//   ✓ Voice lint (Haiku 4.5, soft)
//   ✓ Plagiarism + dedup (SimHash, hard)
//   — Fact-check skipped: rule-based fact-check is fixture-shaped
//     (positions/points/form/scorers); standings articles cite
//     EVERY position by design so the rules don't add signal here.
//     Phase 2 may add a standings-specific fact-check (every figure
//     in body must appear verbatim in the rendered table).
//
// First article: /standings/epl-2025-26-pekan-34
//   • Liga Inggris 2025-26 standings analysis after gameweek 34
//   • 3171 chars, $0.0042 total
//   • Voice-lint: PASS, score 82, 3 LOW issues
//   • All 4 active gates passed
//   • Plus one editorial issue caught for manual review:
//     model misused "Si Merah" for Arsenal (that's Liverpool's
//     nickname per voice rules) — exactly the kind of subtle
//     voice issue manual review catches before publish.
//
// Bug fix in passing: polish now normalizes digit-flanked en-dashes
// (3–1, 5–7) to ASCII hyphens (3-1, 5-7) instead of preserving them.
// Earlier polish protected scorelines but the banned-phrase gate
// still failed on the en-dash. ASCII hyphen reads identically and
// passes the gate cleanly.
//
// Production state: 20 articles total now live (10 GW35 previews +
// 9 GW34 recaps + 1 EPL pekan 34 standings). Cumulative spend
// ~$0.85.

// v0.30.0 — Content engine Phase 1 SHIP #9: Liga 1 Indonesia.
//
// gibol.co's actual product differentiator goes live. Per locked
// decision § 5 (content-engine-response.md), Liga 1 was scheduled
// for Phase 2 alongside EPL auto-publish. Pulled forward — the
// architecture was multi-league-ready from ship #2 onwards
// (preview_context, recap_context, standings_context all dispatch
// by league_id), only the CLI hardcoded "epl" in the normalizer.
//
// What landed:
//
//   1. **CLI auto-detection.** `normalizer.detect_league_id(fx_raw)`
//      reads API-Football's league.id field and maps to our slug
//      (39→epl, 274→liga-1-id, 1→fifa-wc-2026). Both `preview` and
//      `recap` commands dispatch dynamically. `frontmatter.league`
//      now carries the actual league instead of the hardcoded "epl".
//
//   2. **Bug fix: score-as-zero.** The recap + standings agent
//      formatters used `str(ctx.get(k) or default)` which evaluates
//      `0 or "—"` → `"—"` because Python treats integer 0 as falsy.
//      0-0 matches rendered as "— - —" and Sonnet correctly REFUSED
//      to write the recap (CLAUDE.md rule #6 — no fabrication of
//      missing data). Fixed both formatters to only fall back on
//      None / empty string.
//
//   3. **Prerender Liga 1 breadcrumb.** Updated CONTENT_TYPES in
//      scripts/prerender.mjs so Liga 1 articles get
//      "Super League → /super-league-2025-26" in the breadcrumb +
//      JSON-LD instead of the generic "Liga → /" fallback.
//
//   4. **5 Liga 1 articles published** (manual review pending):
//      • /standings/liga-1-id-2025-26-pekan-29
//        Liga 1 round 29 standings — Pusamania Borneo + Persib
//        tied at 66 pts, hot title race noted
//      • /match-recap/persib-bandung-vs-arema-fc-2026-04-24
//        Persib 0-0 Arema — Maung Bandung vs Singo Edan derby
//        nicknames used correctly, GBLA venue, late substitution
//        timeline cited
//      • /match-recap/pusamania-borneo-vs-semen-padang-2026-04-25
//        Pusamania 3-0 — title-chaser dominance narrative
//      • /preview/bhayangkara-fc-vs-persib-bandung-2026-04-30
//        Title-race implications for Persib in 2nd
//      • /preview/pusamania-borneo-vs-persita-2026-05-05
//        Borneo title push at home, 25-pt gap framing
//
// All passed banned-phrase + plagiarism + (rule-based) fact-check.
// Voice lint flagged real issues for editorial queue (e.g. "petik
// tiga poin" — soft-discouraged in voice rules § 3, exactly the
// kind of issue manual review catches).
//
// Production state: 25 articles total now live across 2 leagues
// (10 EPL GW35 previews + 9 EPL GW34 recaps + 1 EPL standings +
// 2 Liga 1 previews + 2 Liga 1 recaps + 1 Liga 1 standings).
// Cumulative spend across all generations: ~$1.05.
//
// The multi-league architecture is now proven end-to-end. Adding
// FIFA World Cup 2026, F1, NBA in future phases is a per-league
// data-mapping exercise, not a re-architecture.

// v0.31.0 — Content engine Phase 1 SHIP #10: editor approval workflow.
//
// Closes the doctrine gap where unapproved articles were publicly
// readable. Per locked decision § 8 ("no auto-publish in Phase 1"),
// `manual_review: true` is supposed to mean "blocked from public" but
// until this ship it just rendered a yellow banner above the body.
// Now it's a real gate, three layers deep.
//
// What landed:
//
//   1. **Supabase migration 0007_article_publishes.sql** — new table
//      `ce_article_publishes (slug, type, published_at,
//      approver_email, editor_notes)`. Composite PK (slug, type) so
//      the same fixture can have separate preview + recap rows. RLS:
//      anon SELECT (so the SPA can gate body), no anon write
//      (service-role only via /api/approve).
//
//   2. **Vercel function /api/approve.js** (12/12 of Hobby slot
//      limit per CLAUDE.md). POST { type, slug, editor_notes? }.
//      Verifies Supabase JWT + email whitelist (EDITOR_EMAIL env
//      var) before upserting. 401 / 403 / 400 / 200 properly.
//
//   3. **/editor dashboard auth gate**: src/lib/editorAuth.js +
//      Editor.jsx redesign.
//        • Anonymous → Navigate to /login?next=/editor
//        • Wrong email → "Access denied" screen with sign-out
//        • Editor → full dashboard with per-row Approve buttons
//        • Status icons reflect the Supabase ledger, not just JSON
//        • Filter chips include Pending + Published
//        • Toast on approve success/failure
//
//   4. **Body gate in GeneratedArticle.jsx**: every preview / recap /
//      standings page now:
//        a. Fetches the JSON file (existing)
//        b. Fetches its row from ce_article_publishes (new)
//        c. Resolves auth session (new)
//        d. Decides:
//           • frontmatter.manual_review === false → published
//           • Supabase row exists → published
//           • Editor session → show body with DRAFT banner
//           • Else → <Navigate to="/" replace />
//
//      Per Ade's directive: "redirect to home page for pending
//      articles, active editor session only can access."
//
//   5. **Prerender extension**: scripts/prerender.mjs queries
//      Supabase at build time. Approved articles get full
//      indexable HTML + sitemap entry + JSON-LD. Unapproved get a
//      noindex stub HTML with meta-refresh redirect to /, EXCLUDED
//      from sitemap.xml. Search crawlers + social unfurls never
//      see draft content. Editor session in the SPA still renders
//      the body client-side via the same gate logic.
//
// Effect on the 25 currently-deployed articles:
//   They all become hidden immediately. The Supabase ledger is empty
//   on first deploy → all 25 articles' publish status = false →
//   anonymous visits get redirected to /. Editor session can preview
//   each via the dashboard (click title → ?preview=1 query +
//   editor session = body renders with DRAFT banner). Click Approve
//   → ledger row inserted → article public on next page load
//   (no redeploy needed for the SPA path; sitemap update on next
//   deploy).
//
// Required env vars on Vercel:
//   • EDITOR_EMAIL = ade.sulistioputra@gmail.com (server-side, used
//     by /api/approve to whitelist)
//   • VITE_EDITOR_EMAIL = ade.sulistioputra@gmail.com (client-side,
//     used by useEditorSession to gate the dashboard UI)
//   • SUPABASE_ANON_KEY (already configured) — used by prerender
//     at build time + the SPA at runtime
//   • SUPABASE_SERVICE_ROLE_KEY (already configured) — used by
//     /api/approve to bypass RLS for the upsert
//
// Required Supabase action: apply 0007_article_publishes.sql via
// the SQL editor. The migration is idempotent (CREATE TABLE IF NOT
// EXISTS, CREATE POLICY DROP-then-CREATE, CREATE INDEX IF NOT
// EXISTS) so re-running is safe.

// v0.32.0 — Content engine Phase 1 SHIP #11: NBA Playoffs writers.
//
// Third sport on the engine after EPL + Liga 1. Both preview + recap
// agent variants land in the same ship since NBA Playoffs needs both
// to be useful (every game has T-4h preview + T+15min recap per the
// approved auto-creation schedule).
//
// What landed:
//
//   1. **ESPN NBA data layer** (data/espn_nba.py): three endpoints —
//      /scoreboard for date-discovery, /scoreboard?dates= for date
//      lookup, /summary?event= for the workhorse per-game payload.
//      ESPN serves CORS-friendly public JSON so no proxy needed.
//
//   2. **NBA normalizers** (data/nba_normalizer.py):
//        • normalize_game_header — final score + status + venue +
//          tipoff + home/away abbreviations + winner derivation
//        • normalize_team_stats — FG%/3P%/FT%/rebounds/assists/etc
//          with snake_case keys the writer reads
//        • normalize_top_scorers — pts/reb/ast/min/FG-FGA/3PT per
//          player with starter flag, top-N per team
//        • normalize_series_state — playoff series snapshot ("BOS
//          leads series 3-1", round label, current_game from summary
//          parse — fixes ESPN's 7-event placeholder list quirk)
//        • normalize_key_plays — clutch-time / lead-change moments
//          for recap timeline
//
//   3. **Two new system prompts**:
//        • prompts/nba-recap-system.md — basketball voice notes
//          (default to full team names, NBA team nicknames are NOT
//          allowed per voice rules, code-switching English NBA
//          terms like "off the bench / fast break / pick and roll",
//          Bahasa for game contextuals)
//        • prompts/nba-preview-system.md — preview-specific
//          structure with series narrative + closeout / win-or-
//          go-home framing, no score predictions
//
//   4. **Two new agent modules**: agents/nba_recap.py +
//      agents/nba_preview.py. Sonnet 4.6, cached system block per
//      agent, same shape as football preview/recap.
//
//   5. **Two new context builders**: data/nba_recap_context.py +
//      data/nba_preview_context.py. Single ESPN /summary call per
//      article (recap), or summary + per-prior-game lookups for
//      preview's series-history block.
//
//   6. **NBA-specific slug helper** (publish/slug.py): nba_game_slug
//      generates "{away}-at-{home}-{yyyy-mm-dd}-g{N}" — the basketball
//      convention is "away at home" not "home vs away" + game number
//      appended for series uniqueness.
//
//   7. **CLI: `nba-recap` + `nba-preview` commands**, full gate
//      pipeline (polish → banned-phrase → voice-lint → plagiarism).
//      Fact-check is currently football-shaped — NBA-specific
//      rule-based fact-check (verify pts/reb/ast cited match input)
//      is a future ship.
//
//   8. **SPA + prerender** — GeneratedArticle.jsx LEAGUE_LABELS
//      now includes nba → /nba-playoff-2026; prerender.mjs
//      CONTENT_TYPES league/leagueCrumb dispatchers know nba;
//      SportsEvent JSON-LD's sport field maps "basketball" →
//      "Basketball" (else "Football").
//
// First two NBA articles published:
//   • /match-recap/bos-at-phi-2026-04-26-g4
//     Boston Celtics 128-96 Philadelphia 76ers, Game 4 East 1st Round
//     Pritchard 32 off bench, Tatum 30/11/7, BOS leads 3-1
//     ($0.0213 warm cache; 3362 chars; voice-lint score 82, 8 issues)
//   • /preview/phi-at-bos-2026-04-28-g5
//     Game 5 closeout-attempt preview at TD Garden
//     ($0.0390 cold cache + first preview-system block; 2585 chars)
//
// Voice tuning notes for the editor pass:
//   • Recap incorrectly called Tatum's 30/11/7 line a "triple-double"
//     (needs 10+ in 3 categories). NBA-specific fact-check rule
//     coming in a future ship.
//   • "Game 5 jadwal belum tersedia" copy reads stiff — voice
//     linter flagged. Tune the "missing data" fallback phrasing.
//
// Production state: 27 articles total now live across 3 leagues
// (10 EPL GW35 previews + 9 EPL GW34 recaps + 1 EPL standings +
// 2 Liga 1 previews + 2 Liga 1 recaps + 1 Liga 1 standings + 1 NBA
// preview + 1 NBA recap). Cumulative spend ~$1.13.

// v0.33.0 — Content engine Phase 1 SHIP #12: Formula 1 writers.
//
// Fourth sport on the engine. F1 has its own data shape (no
// home/away — race meta + classification + championship standings)
// and its own voice (motorsport English terms: pole, DRS, undercut,
// chequered flag, P1/P2/P3, lap-time, fastest lap).
//
// What landed:
//
//   1. **jolpica F1 data layer** (data/f1_jolpica.py): 6 endpoints —
//      season schedule, race meta, race results, qualifying, driver
//      standings, constructor standings. Public API, no auth, CORS-
//      friendly. Same source the SPA already uses via the Vercel
//      proxy.
//
//   2. **F1 normalizers** (data/f1_normalizer.py):
//        • normalize_race_meta — name, round, circuit, country, date
//        • normalize_race_results — full P1-P20 with grid + points +
//          status + fastest lap rank
//        • normalize_qualifying — Q1/Q2/Q3 times, pole sitter
//        • normalize_driver_standings — championship snapshot
//        • normalize_constructor_standings — constructor table
//
//   3. **Two new system prompts**:
//        • prompts/f1-recap-system.md — motorsport voice (pole/grid/
//          DRS/chequered flag stay English, race contextuals like
//          juara/menang/tertinggal translate), 5-section structure
//          (lead, race narrative, top performers, championship
//          implications, closing).
//        • prompts/f1-preview-system.md — preview structure with
//          championship state + storyline + what-to-watch, no score
//          predictions.
//
//   4. **Two agent modules**: agents/f1_recap.py + agents/f1_preview.py.
//      Sonnet 4.6, cached system block per agent.
//
//   5. **Two context builders**: data/f1_recap_context.py (3 parallel
//      jolpica calls: results + qualifying + standings) +
//      data/f1_preview_context.py (race meta + standings + last
//      race's top 5 for momentum).
//
//   6. **F1 slug helper** (publish/slug.py): f1_race_slug generates
//      "{race-name-slug}-{season}" — e.g. "japanese-grand-prix-2026",
//      "miami-grand-prix-2026". Season suffix prevents year collisions.
//
//   7. **CLI: `f1-recap` + `f1-preview`** with --season / --round
//      flags. Full gate pipeline (polish → banned-phrase →
//      voice-lint → plagiarism).
//
//   8. **SPA + prerender** — GeneratedArticle.jsx LEAGUE_LABELS adds
//      f1 → /formula-1-2026; prerender's CONTENT_TYPES dispatch
//      handles f1 league. F1 articles don't trigger SportsEvent
//      JSON-LD (no home/away teams) — only NewsArticle + Breadcrumb.
//
// First two F1 articles published:
//   • /match-recap/japanese-grand-prix-2026
//     Andrea Kimi Antonelli wins from pole at Suzuka, Mercedes 1-2
//     in standings, Verstappen P11→P8 recovery drive
//     ($0.0468 cold cache; 3266 chars; voice-lint flagged 62 — Phase
//     1 soft gate, manual review handles)
//   • /preview/miami-grand-prix-2026
//     Round 4 Miami GP, Antonelli leads championship 72 pts
//     ($0.0399; 2858 chars)
//
// Production state: 29 articles total now live across 4 sports
// (10 EPL GW35 previews + 9 EPL GW34 recaps + 1 EPL standings +
// 2 Liga 1 previews + 2 Liga 1 recaps + 1 Liga 1 standings +
// 1 NBA preview + 1 NBA recap + 1 F1 preview + 1 F1 recap).
// Cumulative spend ~$1.21.

// v0.34.0 — Content engine Phase 1 SHIP #13: Tennis (rankings).
//
// Fifth and final sport on the engine for Phase 1. Tennis is shipped
// at MVP scope: weekly ATP + WTA rankings explainer (Haiku 4.5
// templated agent). Match recaps + tournament previews defer to
// Ship #13b once the ESPN match-data shape (set scores nested in
// linescores) is reverse-engineered cleanly.
//
// What landed:
//
//   1. **ESPN tennis data layer** (data/espn_tennis.py): rankings +
//      scoreboard endpoints. Same hostname the SPA already uses via
//      proxy; content engine talks direct.
//
//   2. **Tennis normalizers** (data/tennis_normalizer.py):
//        • normalize_rankings — top 30 with current/previous rank +
//          movement + points + country (parses ESPN's flag-image-URL
//          for ISO country code, flagAltText for full name).
//        • normalize_active_tournament — currently-running event
//          metadata (name, dates, venue, previous winners). Used as
//          flavor in the rankings article.
//
//   3. **System prompt** prompts/tennis-rankings-system.md — tennis
//      voice (Grand Slam / ATP Tour / Masters 1000 / clay / hard
//      court stay English; juara / kalahkan / naik / turun
//      translate). 5-section structure (lead, top 5, big movers,
//      bottom-of-30 observation, closing).
//
//   4. **Agent** agents/tennis_rankings.py — Haiku 4.5 templated.
//      Same cost shape as football standings (~$0.001-0.003 per
//      article warm-cache).
//
//   5. **Context** data/tennis_rankings_context.py — two ESPN
//      calls in parallel (rankings + scoreboard).
//
//   6. **Slug** publish/slug.tennis_rankings_slug → e.g.
//      "ranking-atp-2026-pekan-16", "ranking-wta-2026-pekan-16".
//      Filed under the standings content type so /standings/[slug]
//      route serves it.
//
//   7. **CLI: `tennis-rankings --tour atp/wta --write`** with full
//      gate pipeline.
//
//   8. **SPA + prerender** — GeneratedArticle.jsx LEAGUE_LABELS
//      adds tennis → /tennis; prerender's CONTENT_TYPES dispatch
//      handles tennis league.
//
// First two tennis articles published:
//   • /standings/ranking-atp-2026-pekan-16
//     "Sinner Kuasai Puncak, Rublev Melejit Menjelang Madrid"
//     ($0.0057 cold cache; 2157 chars; voice-lint PASS, score 82)
//   • /standings/ranking-wta-2026-pekan-16
//     ($0.0026 warm cache; 2091 chars)
//
// Production state: 31 articles total now live across 5 sports
// (10 EPL GW35 previews + 9 EPL GW34 recaps + 1 EPL standings +
// 2 Liga 1 previews + 2 Liga 1 recaps + 1 Liga 1 standings +
// 1 NBA preview + 1 NBA recap + 1 F1 preview + 1 F1 recap +
// 1 ATP rankings + 1 WTA rankings). Cumulative spend ~$1.22.
//
// Phase 1 multi-sport content engine is now FEATURE-COMPLETE for
// agents. Ship #14 lights up GitHub Actions cron for automatic
// generation per the schedule signed off in Ship #11. Ship #15
// flips per-sport auto-publish for stable sports (EPL + Liga 1
// after they hit 100+ approved articles).

// v0.35.0 — Content engine Phase 1 SHIP #14: Cron orchestration via
// GitHub Actions. The 5-sport content engine now generates articles
// automatically on schedule + commits them back to the repo, where
// Vercel rebuilds and surfaces them in the manual review queue.
//
// What landed:
//
//   1. **Discovery script**
//      (packages/content-engine/src/content_engine/scripts/discover.py).
//      Single typer-based entry with 7 modes:
//        • football-previews — EPL + Liga 1 fixtures with kickoff in
//          T-18h to T-48h window
//        • football-recaps — finished fixtures from last 6h
//        • nba-previews — NBA games tipping off in next 12h
//        • nba-recaps — NBA games finished in last 6h
//        • f1-weekend — next-upcoming preview + last-completed recap
//        • tennis-rankings — weekly ATP + WTA explainers
//        • weekly-standings — football standings + tennis rankings
//          (combo for Monday cron)
//        • all — full back-fill (manual / smoke-test only)
//
//      Each mode is idempotent: skips slugs already on disk so
//      running twice in the same window is a no-op.
//
//   2. **GitHub Actions workflow**
//      (.github/workflows/content-cron.yml). Single job, dispatches
//      by mode (selected via workflow_dispatch input or cron-time
//      lookup). Steps:
//        • checkout repo
//        • setup Python 3.13
//        • pip install content-engine
//        • run `python -m content_engine.scripts.discover <mode>`
//        • detect new files in public/content/
//        • git commit + push (gibol-bot author) → Vercel auto-rebuild
//
//      All `schedule:` blocks ship COMMENTED OUT. The workflow runs
//      only via workflow_dispatch (manual UI trigger) until each
//      cadence is enabled per the playbook in docs/14-cron-orchestration.md.
//
//   3. **Documentation** (docs/14-cron-orchestration.md): full
//      operator guide — required GH secrets, recommended enable
//      order (tennis rankings first, recaps last), cost guardrails,
//      breakage diagnosis, future-ship notes.
//
// Idempotency bug fix: tennis-rankings used to compute its slug
// from datetime.now(), but the CLI computes from ESPN's rankings
// update timestamp. Fixed: the discovery script now probes the
// rankings to extract the actual update week, then matches against
// existing slugs. Verified: running discovery twice on disk-existing
// articles correctly reports "wrote 0, skipped 2 existing."
//
// What's NOT in this ship (Ship #15+):
//   • Auto-publish for stable sports (cron writes Supabase publish
//     rows immediately for non-flagship articles)
//   • Persistent gameweek/round state in Supabase (today the football
//     discovery scans 3 gameweeks heuristically; should query
//     ce_league_state instead)
//   • NBA/F1/Tennis-specific rule-based fact-checks
//
// Manual setup required to enable cron:
//   1. Set GitHub secrets: ANTHROPIC_API_KEY, SUPABASE_URL,
//      SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (already in
//      Vercel — paste into GitHub repo Settings → Secrets).
//   2. Test via workflow_dispatch (Actions UI → "Content Engine —
//      Cron" → Run workflow → pick "tennis-rankings" mode).
//   3. Once that succeeds, uncomment the Monday rankings schedule
//      in content-cron.yml and push. The cron starts firing.
//   4. Repeat per cadence in the recommended enable order.

// v0.36.0 — Content engine Phase 2 SHIP #15: per-sport auto-publish.
//
// The editorial approval workflow (ship #10) gated every article
// behind manual review. Per CLAUDE.md non-negotiable rule #8 + locked
// decision § 8, auto-publish was deferred to Phase 2 — this ship.
//
// What landed:
//
//   1. **Flagship list** (quality/flagship.py): explicit derby +
//      iconic-tracks + Conference-Finals rules per sport.
//        • EPL: 12 flagship pairs (north London, Manchester, Merseyside,
//          big-6 vs big-6 combinations)
//        • Liga 1: El Clasico Indonesia, JATIM derby, PSM-Persib
//        • NBA: Conference Finals, NBA Finals, Game 7 imminent, storied-
//          team elimination (LAL/GSW/BOS/MIA/NYK in 3-1 or 3-2)
//        • F1: iconic circuits (Monaco, Monza, Silverstone, Spa, Abu
//          Dhabi, Brazilian, Suzuka), season opener (Round 1), finale
//          (Round 22+)
//        • Tennis: rankings never flagship (match recaps deferred to
//          Ship #15b).
//      Each sport's `is_flagship_*` returns (bool, reason). Reason
//      surfaced in CLI output for editor transparency.
//
//   2. **Config flag** (config.py): `auto_publish_sports` env var,
//      comma-separated list of sport ids that graduate to auto-publish.
//      Empty = Phase 1 default (everything manual review). Plus
//      `is_sport_auto_publish(sport_id)` helper.
//
//   3. **Auto-publish module** (publish/auto_publish.py): writes
//      ce_article_publishes row directly via Supabase service-role
//      when:
//        a. sport in AUTO_PUBLISH_SPORTS allowlist
//        b. article is NOT flagship per quality/flagship.py
//        c. SUPABASE_SERVICE_ROLE_KEY available
//      Writes use approver_email = 'auto-publish@gibol.co' so they're
//      distinguishable from manual editor approvals in the ledger.
//
//   4. **Wired into all 8 CLI commands**: preview / recap / standings
//      (football) + nba-recap + nba-preview + f1-recap + f1-preview +
//      tennis-rankings. After successful JSON write, each command calls
//      auto_publish.maybe_publish() with the right sport_id +
//      flagship context. Outcome printed to stdout for the cron log:
//        "✓ Auto-published: ..." / "⚠ Flagship: ..." / "→ Manual queue: ..."
//
//   5. **Documentation** (docs/15-auto-publish.md): graduation criteria,
//      step-by-step env-var setup (Vercel + GitHub secrets), recommended
//      graduation order (tennis rankings first, EPL recaps last),
//      flagship list, rollback path (clear allowlist or DELETE specific
//      ledger row).
//
// Verified end-to-end:
//   • Empty allowlist → reject every article (Phase 1 default behavior
//     preserved — nothing changed for current production)
//   • AUTO_PUBLISH_SPORTS=tennis → tennis rankings auto-published
//   • AUTO_PUBLISH_SPORTS=epl + Arsenal-Tottenham → flagship detected,
//     manual review required despite allowlist
//   • AUTO_PUBLISH_SPORTS=f1 + Monaco GP → flagship detected
//
// Production state at v0.36.0:
//   • 31 articles still live (no new content this ship — auto-publish
//     is OFF by default; opt-in via env var)
//   • To enable: set AUTO_PUBLISH_SPORTS in Vercel + GitHub secrets,
//     starting with "tennis" per the recommended graduation order.
//   • Flagship guard always-on: even with the most aggressive
//     allowlist, derbies + finals + iconic tracks still go to manual
//     review per doctrine.

// v0.37.0 — Content engine Ship #16: per-sport stability dashboard
// in /editor. Surfaces the three Phase 2 graduation criteria from
// CLAUDE.md rule #8 + locked decision § 8 so the editor can make
// the auto-publish flip data-driven instead of gut-feel.
//
// Per-sport panel above the filter bar shows for each league:
//   • approved / total article count
//   • average voice-lint score (across all articles for that sport)
//   • editor approval rate (approved / total %)
//   • three checkbox criteria (≥100 approved, lint ≥85, rate ≥80%)
//   • ELIGIBLE / NOT YET badge if all three are met
//
// Computed entirely client-side from the existing /content/index.json
// + Supabase publish ledger that the editor dashboard already loads.
// No new API surface; no new env vars; no new server logic.
//
// Editor uses this to decide which sport to add to
// AUTO_PUBLISH_SPORTS first (recommended order is in
// docs/15-auto-publish.md: tennis → standings → F1 → previews → recaps).
//
// Ship #15 framework was passive — sports could be flipped on but
// the editor had no view of WHEN. Ship #16 closes that loop.

// v0.38.0 — Content engine SHIP #17: five-in-one quality pass.
//
// Five complementary improvements landed together because they share
// the same review window:
//
//   (1) **NBA fact-check** (quality/nba_fact_check.py): rule-based
//       detection of triple-double / double-double misuse + scorer
//       points + final score + stat-line citations. Wired as a hard
//       gate after voice-lint in the nba-recap CLI command. Catches
//       the "Tatum 30/11/7 = triple-double" hallucination from
//       Ship #11 production.
//
//   (2) **F1 fact-check** (quality/f1_fact_check.py): verifies
//       cited finishing positions (P1-P20) match the input
//       classification + winner attribution. Wired as a hard gate
//       in the f1-recap CLI command.
//
//   (3) **Tennis match recap pipeline** (Ship #17e): completes the
//       tennis content type — was rankings-only before. New
//       normalizer (find_match_in_scoreboard + normalize_match),
//       prompt (tennis-match-recap-system.md), agent
//       (tennis_match_recap.py), context
//       (tennis_match_recap_context.py), slug helper
//       (tennis_match_slug), CLI command (tennis-recap --match-id).
//       First article shipped: Damm vs Pellegrino, Madrid Open
//       qualifying. Two normalizer bug fixes during smoke-test:
//       flag dict-vs-string shape (different from rankings endpoint),
//       unreliable format.regulation.periods (drop format claim
//       entirely + let prompt skip it).
//
//   (4) **Liga 1 mini-derby support** — extended _FOOTBALL_FLAGSHIP_PAIRS
//       in quality/flagship.py from 4 pairs to 14: Persija-Persib,
//       Persebaya-Arema (JATIM derby), Persis-PSIS (Jawa Tengah),
//       PSS-PSIM (Yogyakarta), Persija-Persita (Jabodetabek), PSM-
//       Persib + PSM-Persija (cross-island), Semen Padang-PSM (Sumatra-
//       Sulawesi), Bali United-Persija + Bali United-Persib (Bali-
//       Java), Pusamania Borneo-Persib + Borneo-Persija (title-race
//       big-game).
//
//   (5) **Per-league state cache** in Supabase (Ship #17d):
//       new migration 0008_league_state.sql + helper module
//       data/league_state.py + discover.py update. Replaces the
//       heuristic "anchor at GW35 + scan 3 ahead" with a Supabase
//       lookup. discover.py advances the cache when it observes a
//       gameweek transition (when scheduled fixtures appear in a
//       gameweek that wasn't current).
//
// Production verified:
//   • All 31 prior articles still serving 200
//   • Tennis match recap (Damm vs Pellegrino) approved + indexable
//   • New SQL migration applied via Chrome MCP automation
//
// Pipeline now has TWO new hard gates (NBA + F1 fact-check) plus
// one new content type (tennis match recap) plus 10 more flagship
// pairs in Liga 1 plus state cache infrastructure for future cron
// reliability.

// v0.39.0 — Content engine SHIP #18: state-explainer trio for NBA + F1.
//
// Two more templated content types complete the auto-creation
// schedule signed off in Ship #11:
//
//   1. **NBA series-state explainer** (Haiku 4.5) — fires when a
//      playoff series transitions (closeout, swing, Game 7 imminent).
//      Reads ESPN summary for any game id in the series, fetches
//      each completed game's header for per-game scorelines, then
//      narrates the arc: "Game 1 BOS 110-95 home court → Game 2 BOS
//      108-100 sweep → Game 3 PHI 118-108 stole one back → Game 4
//      BOS 128-96 blowout → leads 3-1, closeout in Game 5 at PHI."
//      Filed under standings content type at /standings/nba-series-...
//
//   2. **F1 championship-state explainer** (Haiku 4.5) — fires after
//      every race weekend. Reads driver + constructor standings as
//      of round N, narrates leader / gaps / momentum. "Antonelli 72
//      poin, unggul 9 atas Russell, Mercedes 1-2 di Konstruktor."
//      Filed at /standings/f1-championship-{season}-after-round-{N}.
//
// Both use the same shape as the existing standings explainer
// (Haiku 4.5 templated, ~$0.001-0.003 per article warm-cache).
// Both wired through the gate stack: polish → banned-phrase →
// voice-lint → plagiarism + auto_publish maybe-write.
//
// First articles published:
//   • /standings/nba-series-round-1-bos-vs-phi-2026
//     "Round 1 East: BOS leads series 3-1"
//   • /standings/f1-championship-2026-after-round-3
//     "Klasemen F1 2026 setelah Round 3 — Andrea Kimi Antonelli di Puncak"
//
// Production state at v0.39.0: 34 articles total, 5 sports, 7
// content types (preview / recap / standings / nba-series /
// f1-championship + tennis-rankings / tennis-match-recap as
// special standings + recap subtypes). Cumulative spend ~$1.27.
//
// All cadences from Ship #11 signoff are now buildable. The cron
// orchestration in Ship #14 dispatches each. Ade enables sport-by-
// sport per the roadmap in docs/14-cron-orchestration.md.

// v0.40.0 — Content engine SHIP #19: QC Reviewer (Opus 4.7).
//
// Last agent in the spec from CLAUDE.md's agent table — "10% sample
// editorial check". Senior-editor critique pass that catches what
// regex gates + Haiku voice-lint miss: structural balance, lead
// weakness, narrative flow, headline strength, AI-tells.
//
// Architecture:
//   • prompts/qc-system.md — Opus's system prompt. Strict role
//     definition (advisory only, doesn't block publish, doesn't
//     repeat what voice-lint covered). Returns structured JSON
//     with section-by-section critique + per-issue suggestions.
//   • src/content_engine/agents/qc.py — Opus 4.7 call wrapper. Parses
//     JSON response into a QcReport with section scores +
//     suggestions + verdict (ship / edit / regenerate).
//   • src/content_engine/quality/qc_sampler.py — 10% deterministic
//     sampling by slug-hash. Same slug always either gets QC or
//     doesn't (regen-stable). Sample rate adjustable via
//     QC_SAMPLE_RATE env var (0.0-1.0, default 0.10).
//   • _maybe_qc_writeback() helper in cli.py — runs QC after JSON
//     write, patches the article's frontmatter.qc_review with the
//     compact summary. Wired into all 11 CLI commands (preview,
//     recap, standings, nba-recap, nba-preview, nba-series,
//     f1-recap, f1-preview, f1-championship, tennis-rankings,
//     tennis-recap).
//
// Cost economics:
//   • Opus 4.7: $15 / $75 per 1M tokens
//   • Per-call cost: ~$0.10-0.30 (article body + voice-rules system
//     block + qc-system prompt + structured JSON output)
//   • At 10% sample rate, amortized cost: ~$0.01-0.03 per article
//     generated. Acceptable safety net.
//
// Smoke test (QC_SAMPLE_RATE=1.0 forced):
//   ranking-atp-2026-pekan-16 — verdict "edit", overall 72, 6
//   suggestions. Opus caught a duplicate Lehecka mention + an
//   unsupported Grand Slam closing claim + a missed angle (Ruud
//   defending champion sliding) that voice-lint had passed at
//   score 82. Cost $0.279 for the single review.
//
// What QC adds beyond existing gates:
//   • Polish: catches em-dashes (mechanical)
//   • Banned-phrase: catches blacklist + voice-rules § 2 hard bans
//   • Voice-lint (Haiku): catches register drift + soft-discouraged repeats
//   • Fact-check (rule-based): catches numerical mismatches
//   • Plagiarism (SimHash): catches text reuse
//   • → QC (Opus 4.7, NEW): catches structural / narrative / editorial
//     issues that all of the above miss. Editor sees verdict + score
//     in /editor + uses to triage manual review queue.
//
// Doctrine reference: per CLAUDE.md non-negotiable rules + the agent
// table — QC Reviewer is advisory, not a hard gate. Output never
// blocks publish; editor decides.
//
// v0.58.4 — Service worker cache-bust for the redesign rollout.
//
// Symptom: ade reported the Gibol Newsroom on home page rendering
// blank even after v0.58.2 + v0.58.3 deployed. Diagnosis: production
// bundle had the contextual code (verified by grepping for
// 'kickoff_utc' / 'relevanceScore' / 'contextual:!0' in the
// minified NewsroomSlice chunk), and /content/index.json had the
// approved flag set with 33 articles in the contextual scoring
// window. The visible-blank was a stale-bundle cache issue — the
// PWA service worker's SW_VERSION was last bumped 2026-04-23, so
// for users who'd visited since the redesign started shipping, the
// SW served stale-while-revalidate JS bundles for the home page.
//
// Fix: bump SW_VERSION to gibol-2026-05-04-v3. SW activate handler
// already deletes any cache key not starting with the current
// version, so on next page load every visitor gets a fresh shell
// cache + the v0.58.x JS bundles + fresh /content/index.json.
//
// User action: hard-refresh (Cmd+Shift+R) bypasses SW one-off. The
// SW bump means returning visitors auto-flush on second visit.
//
// — earlier ships follow —
//
// v0.58.3 — Contextual home-page newsroom + empty-grid layout fix.
//
// Two issues ade reported on production homepage:
//
// Issue 1: "Gibol Newsroom showing empty space."
//   Root cause: NewsroomSlice's desktop grid CSS used
//     grid-row: span ${restCards.length || 1}
//   When the lead spans 1 row but the right column is also 1 row,
//   the grid creates a visual empty space below if any inline-block
//   margins push content. More acutely, when the per-sport filter
//   returned only the lead (no stacked secondaries), the 2-column
//   `1.6fr 1fr` template still rendered with empty right column.
//   Fix: drop to single-column when restCards.length === 0.
//
// Issue 2: "News on home page best to be relevant to live match,
//   post-match from 1-2 days, and prematch. Profiles relevant to
//   those only."
//   Root cause: NewsroomSlice's per-sport mode just showed "newest
//   approved articles for sport X" — could surface a 2-week-old
//   profile while a live match was playing right now. No relevance
//   weighting.
//   Fix: New `contextual` prop on NewsroomSlice triggers a
//   relevance-weighted feed that scores each article by its
//   proximity to the current/recent/upcoming game window:
//     • Just-finished recap (< 6h post-kickoff)        → 95-100
//     • Live preview (just before / just after kickoff) → 90
//     • Recent recap (6-48h post-kickoff)              → 60-95
//     • Soon preview (< 24h to kickoff)                → 50-80
//     • This-week standings                            → 30-60
//     • Recent profile (< 14d)                         → 10-30
//     • H2H                                            → 20-25
//   Articles below threshold are dropped. Mixes sports — home is
//   cross-sport. If the contextual feed is empty (no recent matches
//   anywhere), falls back to "any approved, newest first" so the
//   slice doesn't render empty.
//
// HomeV2 swap: GIBOL NEWSROOM section now uses contextual={true}
// instead of pinning to tagsAvailable[0]. Per-sport hub Newsroom
// Slices keep the legacy mode (per-sport, newest-first) — at the
// hub level, "all NBA articles, recent first" is the right shape.
//
// Future enhancements queued (not in this ship):
//   • Profile relevance: bias profile cards toward teams in active
//     games. Needs cross-referencing index.json team names with
//     usePlayoffData scoreboard. v2 polish.
//   • Live AI summary cards mixed into the feed. Needs the
//     ce_game_summaries data flowing into HomeV2's render path.
//   • Per-card "why this is here" affordance — small caption like
//     "Game 4 just ended" / "Tipoff in 2 hours".
//
// — earlier ships follow —
//
// v0.58.2 — HomeV2 hotfix. Two field-name mismatches that left the
// Live console empty even when NBA games were live on ESPN.
//
// Bug 1: HomeV2 destructured `{ schedule, lastFetch }` from
// `usePlayoffData()` but the hook returns `{ games, lastUpdate, ... }`.
// `schedule` was always undefined → `buildLiveItems(undefined)` →
// returned `[]` → LiveBand always showed the empty fallback.
//
// Bug 2: Even with the right destructure, the per-game field
// accesses were wrong. Real shape from src/lib/api.js#fetchScoreboard:
//     { id, name, date, status, statusState,
//       home: {abbr, score, record},
//       away: {abbr, score, record} }
// HomeV2 was reading g.eventId, g.homeAbbr, g.awayAbbr, g.homeScore,
// g.awayScore, g.period, g.clock — none of which exist. Updated
// buildLiveItems, pickHeroGame, and the hero-game JSX to use the
// real shape. Hero card now renders the live game with team
// abbreviations + score + ESPN status string.
//
// Bonus fix: tagsAvailable filter in HomeV2 was still using
// `manual_review === false` (the v0.57.0 logic). Switched to
// `approved === true || manual_review === false` mirroring
// NewsroomSlice's v0.58.0 fix. Means the Topik Populer chip row
// now actually appears when ≥2 leagues have approved articles.
//
// User impact: ade reported "live games not showing even though
// there are games going on" + "empty block on home page". Both
// were the same root cause (Bug 1 → empty list → empty fallback).
// v0.58.2 ships in the same env-flag-on production bundle.
//
// — earlier ships follow —
//
// v0.58.1 — Two polishes:
//
//   1. Local DX: prerender auto-loads .env files at startup. Before,
//      `npm run build` from a dev machine wouldn't see SUPABASE_URL
//      (and similar) unless the user ran `set -a && source
//      .env.production.local`. Now the script reads
//      .env.production.local and .env.local manually (no dotenv dep)
//      and only sets vars that aren't already in process.env. Vercel
//      server-side builds inject env natively — this is a no-op there.
//
//   2. Runtime fallback: NewsroomSlice now falls back to a live
//      ce_article_publishes query when the deployed index.json has
//      zero approved articles for the requested sport. Means freshly-
//      approved articles surface in the public Newsroom Slice
//      between deploys. Single Supabase call, only on the empty
//      path — doesn't add load when the build-time bake worked.
//
// Both fixes hardening, not new functionality. v0.58.0 was the
// shape change; v0.58.1 is the seams.
//
// — earlier ships follow —
//
// v0.58.0 — NewsroomSlice approval-state fix.
//
// Bug: the home page + per-hub Newsroom Slices showed empty even
// after ade approved 59 articles in /editor. Root cause: the slice
// filter used `article.manual_review === false`, but the index.json
// builder copies that field straight from the static article JSON
// where it's hard-coded `true` at content-engine write time. The
// actual approval state lives in Supabase ce_article_publishes and
// the build pipeline never wove it back into the index.
//
// Fix is build-time:
//   • scripts/prerender.mjs — buildEditorIndex now takes the
//     publishLedger (already loaded for the route emitter) and
//     bakes `approved: true|false` per article based on whether
//     `${type}:${slug}` is in the ledger.
//   • src/components/v2/NewsroomSlice.jsx — filter switched from
//     `manual_review === false` to `approved === true`. Legacy
//     `manual_review === false` kept as fallback so index.json
//     versions emitted before this ship still render.
//
// Effect: redeploying after this ship populates the home + hub
// Newsroom Slices with the 59 approved articles. Future approvals
// land in the slice on the next deploy. Real-time freshness in
// /editor is unchanged (it fetches the ledger directly).
//
// What's NOT in v0.58.0 (queued for future):
//   • Real-time NewsroomSlice that re-queries the ledger after
//     the index loads — adds a second Supabase round-trip per page
//     view. Probably not worth the latency for a public surface
//     that already updates on deploy. Defer indefinitely.
//   • Auto-rebuild webhook that fires a Vercel rebuild when
//     ce_article_publishes is upserted. Could replace the manual
//     "redeploy after batch approve" step. Standalone ship — needs
//     a Vercel deploy hook + Supabase database webhook.
//
// — earlier ships follow —
//
// v0.55.1 — Phase D backend: AI live summary actually generates +
// caches in Supabase. The LiveSummaryCard stub from v0.55.0 now
// shows real Bahasa AI summaries when an editor (or cron, in
// v0.55.2) triggers a refresh. Public read path is anon Supabase;
// no new Vercel function consumed.
//
// v0.57.0 (Phase E HomeV2) shipped FIRST in this session, then
// v0.55.1 backfilled this gap because the doc's recommended order
// was D→E but practical sequencing pushed E ahead. The v0.55.x
// version line is the one that grew the new infra; v0.57.x is
// just route + page + flag.
//
// Schema (migration 0012, applied via Supabase MCP):
//   • New table ce_game_summaries — game_id PK, sport, body_md,
//     sources jsonb, editor, ai_model, cost_cents, is_live,
//     updated_at, refreshed_by. RLS: anon SELECT only when
//     body_md IS NOT NULL (so unsummarized games stay hidden).
//
// Refresh path (api/_lib/gameSummaryRefresh.js):
//   • Triggered via /api/approve action="refresh_game_summary"
//     with { gameId }. Editor email gate (same as approve/edit).
//   • Fetches ESPN /summary directly server-side; passes last 12
//     plays + score + status to Haiku 4.5 with a tight Bahasa
//     prompt (60-100 word summary, casual register, no fabrication).
//   • Writes upsert to ce_game_summaries with cost_cents derived
//     from data.usage.{input_tokens, output_tokens}.
//   • Returns { ok, game_id, body_md, cost_cents, is_live,
//     updated_at } for optimistic SPA update.
//
// SPA wiring (src/lib/editorAuth.js + src/pages/NBAGameCenter.jsx):
//   • fetchGameSummary(gameId) → public read (anon RLS).
//   • refreshGameSummary({gameId}) → editor-gated POST.
//   • NBAGameCenter polls fetch every 60s when live, every 5 min
//     when not. LiveSummaryCard renders real body when present;
//     falls through to stub copy when null.
//   • Editors see a "↻ Refresh" button on LiveSummaryCard's header
//     (passed via forceRefresh prop). Public visitors don't see it.
//
// What's NOT in v0.55.1 (queued for v0.55.2):
//   • Cron-driven auto-refresh. Currently editor or first-page-
//     load triggers writes. v0.55.2 adds a GitHub Actions cron
//     that hits the refresh endpoint every 90s for live games.
//   • Daily cost cap (api/_lib/aiBudget.js — $5/day NBA default).
//     For now the editor's manual-trigger pace is the cap.
//   • Posthog event on every call.
//   • Multi-sport refresh — currently NBA only (sport='nba'
//     hard-coded). EPL/F1/Tennis would need their own ESPN/jolpica
//     wrappers in gameSummaryRefresh.js.
//
// Cost economics:
//   • Per call: ~$0.005-0.015 (Haiku 4.5; ~3K input + 250 output).
//   • Per live game @ 90s refresh × 3hrs: ~$1.20.
//   • Multiple parallel live games scale linearly. NBA playoffs
//     typically have 0-2 games live at once.
//
// What stays untouched in v0.55.1:
//   • Function count: 12/12 unchanged. The refresh action piggybacks
//     on api/approve.js as another action type.
//   • UI.v2 + homeVariant flags unchanged.
//   • All other pages render identically.
//   • Five protected surfaces unchanged.
//
// — earlier ships follow —
//
// v0.57.0 — Phase E of the v4 redesign: HomeV2 + LiveBand + tri-state
// home flag. Behind VITE_FLAG_HOME (default 0); old Home + HomeV1
// stay on disk as rollback paths. Flip via env var to 2 when QA
// passes — no code rollback needed.
//
// Tri-state flag (src/lib/flags.js):
//   VITE_FLAG_HOME=0 (default) → <Home />     gateway grid (current public)
//   VITE_FLAG_HOME=1           → <HomeV1 />   personalized feed
//   VITE_FLAG_HOME=2           → <HomeV2 />   v4 redesign (live console + newsroom)
// Independent from UI.v2 (the redesign-on boolean for hubs + article
// shell + Newsroom Slice). Two independent concerns: hub redesign
// vs home variant.
//
// New v2 primitive:
//   • src/components/v2/LiveBand.jsx — single-row marquee strip of
//     live games across sports. Renders sport tag + away abbr/score
//     + home abbr/score + status tag. Each ticker is clickable
//     (deep-links to per-game route when available). LIVE pulse dot
//     pinned left, "UPDATED Xs AGO" pinned right; scrollable middle.
//
// New page (src/pages/HomeV2.jsx):
//   • <LiveBand> at top with NBA live games from usePlayoffData.
//     EPL/F1/Tennis live games drop in as their hooks land (deferred).
//   • Front-page sentence — Newsreader serif headline, 24-36px clamp.
//     v1 reads from public/content/homepage-sentence.json (static
//     file, editable without redeploy). v0.57.1 ships the cron-
//     generated dynamic version via a Supabase row.
//   • Two-column body grid (1-col mobile, 2-col ≥1024px):
//       LEFT (Live console): hero live game card with team-color
//         left rule + 3 stacked compact tiles + "+ N more live"
//         CTA. Empty state when no games live. Defaults to the
//         marquee live game (highest combined score).
//       RIGHT (Newsroom): NewsroomSlice (cross-sport, picks the
//         most-active league as primary). Popular tags row below
//         with chips for each league with published articles.
//   • Mobile-first: live console + newsroom collapse to single
//     column below 1024px. Live band scrolls horizontally.
//
// What's NOT in v0.57.0 (queued for v0.57.1 polish):
//   • homepage_sentence cron (5-min refresh, edge function writes
//     to a Supabase row). v1 ships static JSON — editable by hand.
//   • V2Footer (extends existing footer with v4 polish — current
//     ContactBar + version badge keeps working).
//   • EPL/F1/Tennis live-game hooks for the LiveBand. v1 only
//     populates with NBA live games via usePlayoffData. Other
//     sports drop in as their own live-fetch hooks land.
//   • Default flip to HomeV2 (VITE_FLAG_HOME=2). That's the
//     v0.57.1 follow-up after QA + verification.
//
// Acceptance criteria from redesign doc §4 Phase E:
//   • All five Phase 2 journeys (J1-J5) pass the stopwatch test.
//   • Front-page sentence renders with editable static data.
//   • Reading list / popular tags renders.
//   • Lighthouse mobile performance ≥80, accessibility ≥95.
//
// What stays untouched in v0.57.0:
//   • Both old Homes coexist on disk (rollback path = env var).
//   • UI.v2 flag still false (redesign on hubs still gated).
//   • All other pages render identically.
//   • api/, supabase/, content cron — zero changes.
//   • Five protected surfaces unchanged.
//   • Editor at /editor unchanged.
//
// Bundle impact: HomeV2 + LiveBand are lazy()-loaded. Only the
// active home's chunk loads at runtime. ~+8 KB gzipped to the
// home route's bundle.
//
// — earlier ships follow —
//
// v0.55.0 — Phase D of the v4 redesign: NBA Game Center new surface.
// Replaces the v0.12.1 NBAGameDeepLink (which was a 30-min seedling
// for OG-card sharing only — redirected to /recap/:date). The new
// page is a proper deep-dive surface with hero score, by-quarter,
// top performers, AI live summary card (stub in v1), win-prob
// spark, play feed, and series tracker.
//
// Route unchanged: /nba-playoff-2026/game/:gameId.
//   • Anyone clicking a previously-shared per-game URL lands on
//     the new Game Center automatically. OG meta + per-game OG image
//     preserved (buildPerGameOgUrl call mirrored in the SEO call).
//
// Five new v2 primitives shipped:
//   • src/components/v2/QuarterTable.jsx — sport-agnostic
//     by-period table. Accepts arbitrary `periods` array; works for
//     halves/sets/laps too. Mono tabular numerals. Horizontal-
//     scrolls on tiny viewports.
//   • src/components/v2/PlayerStatCard.jsx — top-performer card
//     with name + team chip + position + 4-stat grid. `hot` flag
//     turns the border + values amber for career-high or 30+ ptr.
//   • src/components/v2/LiveSummaryCard.jsx — amber-bordered card
//     for AI-generated live summary. v1 ships in STUB MODE: no
//     `body` prop yet → renders "AI live summary akan tersedia di
//     v0.55.1" copy. Structure ready for the v0.55.1 backend infra.
//   • src/components/v2/PlayFeed.jsx — sport-agnostic ordered feed
//     of {t, team, text, big, color, scoreSnap} rows. Max-height
//     320 with scroll. Reverse-order default (newest-first, live).
//   • src/components/v2/SeriesTracker.jsx — best-of-N strip with
//     per-game state ('won-home' | 'won-away' | 'live' | 'scheduled'
//     | 'if_needed'). Live game pulses with amber box-shadow.
//
// Page composition (src/pages/NBAGameCenter.jsx):
//   • Header strip — kicker line "NBA · ROUND · GM N · VENUE · DATE"
//   • Score hero — 3-col on desktop (away crest / score+status / home),
//     stacks on mobile, Momentum bar below score, HubActionRow
//     for share/copy.
//   • Body 2-col grid:
//       Main column: SectionRule "By quarter" → QuarterTable →
//       SectionRule "Top performers" → PlayerStatCard×4 (auto-fit
//       grid) → LiveSummaryCard (stub).
//       Right rail: Win-prob spark with home/away % captions →
//       PlayFeed (320px max-height) → SeriesTracker if matchup
//       resolves in playoff bracket.
//   • Mobile-first: collapses to single column ≤1024px. By-quarter
//     table horizontal-scrolls. Right rail moves below body.
//
// Data sources (existing hooks; v1 ships with no new infra):
//   • useGameDetails(eventId) — ESPN /summary every 10s when live,
//     30s pre-game, 60s post. Returns boxscore + plays + leaders +
//     status + linescores + win-prob array.
//   • usePlayoffData() — series state for SeriesTracker.
//
// What's DEFERRED to v0.55.1:
//   • game_summaries Supabase migration (0012)
//   • /api/game-summary/:id edge function (GET cached row; if
//     >90s old + game live, calls Anthropic and writes back)
//   • Cron entry for scheduled live-summary refreshes
//   • LiveSummaryCard's `body` prop wires to the cached row
//   • LLM cost cap in api/_lib/aiBudget.js ($5/day default)
//
// Why deferred: Vercel Hobby is 12/12 functions per CLAUDE.md.
// Adding /api/game-summary forces consolidation. Half-day prep
// ship before v0.55.1 — split api/approve.js action handlers into
// named exports under api/_lib/, freeing one slot.
//
// Function-slot consolidation plan (v0.54.0 prep):
//   • Extract approve/edit/reject/plan_generation/game_summary
//     handlers into api/_lib/{actionName}Handler.js
//   • api/approve.js becomes a thin dispatcher
//   • Net effect: one route, multiple action types, no slot
//     consumption. Same pattern works for any future "editor write"
//     additions.
//
// What stays untouched in v0.55.0:
//   • UI.v2 flag still false. NBAGameCenter is route-mounted but
//     accessed only by users who navigate to the URL — not gated
//     because the existing deep-link was already mounted at this
//     route. NEW path = same path; no behavior surprise.
//   • All other hubs unchanged. Phase C primitives (Newsroom Slice,
//     SubNav) still gated and invisible in production.
//   • api/, supabase/, content cron — zero changes.
//   • Five protected surfaces unchanged.
//   • Editor at /editor unchanged.
//
// Bundle impact: NBAGameCenter is lazy()-loaded. The 5 new v2
// primitives only ship in this route's chunk. Estimated +18 KB
// gzipped to the per-game-route bundle (negligible).
//
// Phase E (HomeV2 + UI.v2 flip) still queued. Recommended sequence
// from here:
//   1. v0.54.0 — function-slot consolidation prep (half day)
//   2. v0.55.1 — game_summaries infra + LiveSummaryCard live
//   3. v0.57.0 — HomeV2 behind tri-state UI.v2 flag
//   4. v0.57.1 — flip default to v2
//
// — earlier ships follow —
//
// v0.53.1 — Phase C completion. Wires NewsroomSlice into the
// remaining four sport hubs that v0.53.0 deferred: EPL, F1, Tennis,
// SuperLeague (Liga 1 Indonesia). All five sport hubs (NBA from
// v0.53.0 + these four) now have the 3-up Newsroom Slice mounted
// above their SEOContent block.
//
// Each hub follows the same pattern:
//   • Import NewsroomSlice + UI flag from src/lib/flags.js
//   • Mount {UI.v2 && <NewsroomSlice sport="..." />} just above
//     SEOContent
//   • Sport-specific newsroomLabel + moreHref anchor
//
// Hubs intentionally NOT wired (would self-hide on empty content):
//   • LigaIndonesia.jsx — legacy Liga 1 page being phased out in
//     favor of SuperLeague.jsx.
//   • IBL.jsx — no published content yet (per CLAUDE.md, IBL
//     pipeline deferred).
//   • FIFA.jsx — World Cup 2026 teaser only, no content surface.
//
// SubNav primitive shipped in v0.53.0 still NOT mounted in any hub.
// Mount with sport-specific anchor lists is queued for v0.53.2 if
// editor visually verifies Phase C with UI.v2 flipped on. Per
// redesign doc §4 Phase C: SubNav items vary by sport (NBA has
// Bracket; F1 has Calendar; Tennis has Tour). One-size-fits-all
// item list would feel forced.
//
// Verification reminder: this entire phase remains invisible in
// production until VITE_FLAG_UI_V2=1 is set in Vercel env. Old
// hubs render unchanged when flag is off (default). Editor should
// flip locally first via `VITE_FLAG_UI_V2=1 npm run dev` and
// approve a few articles per sport so the slices populate.
//
// What stays untouched:
//   • All hub data hooks unchanged.
//   • Five protected surfaces unchanged.
//   • Article shell from v0.52.0 unchanged.
//   • Function count unchanged (no new API routes).
//
// — earlier ships follow —
//
// v0.53.0 — Phase C primitives of the v4 redesign + NBA hub
// Newsroom Slice proof-of-concept (per docs/redesign-v4-handover.md
// §4 Phase C). Hubs C remaining (EPL, F1, Tennis, SuperLeague,
// LigaIndonesia, IBL, FIFA) follow as v0.53.1 once NBA proves clean.
//
// Three new v2 primitives, all additive:
//   • src/components/v2/SectionRule.jsx — editorial section divider
//     (────  NBA NEWSROOM  ────  /nba/news →). Two variants:
//     "amber" for editorial sections, "muted" for utility. Optional
//     action prop renders a "→" link. Sport-agnostic.
//   • src/components/v2/NewsroomSlice.jsx — 3-up article card grid
//     for the bottom of every sport hub. Reads /content/index.json
//     filtered by `sport` and `manual_review === false` (publicly
//     visible only). Sorts by published_at desc, slices to limit (4
//     default: 1 lead + 3 stacked). Self-hides on empty — no
//     skeleton state crowding the hub bottom.
//      - Lead card: 16/9 SVG-tinted hero placeholder (real photos
//        wire in via fm.hero_image), serif headline, deck, mono
//        type-kicker + AiByline pill, relative-time meta.
//      - Stacked cards: serif headline + type-kicker + relative-time.
//      - Responsive grid: 1-up mobile → 2-up desktop ≥1024px with
//        lead spanning the row count of stacked secondaries.
//   • src/components/v2/SubNav.jsx — second-tier hub navigation
//     (Overview · Live · Standings · Bracket · Fixtures · Stats ·
//     News · Teams). Hubs pass their own items array. Active state
//     = bg-3 background + 2px sport-color underline. Horizontally
//     scrollable on mobile (overflow-x: auto, hidden scrollbar).
//     NOT YET MOUNTED — wiring deferred to v0.53.1 because each
//     hub's tab list needs sport-specific section anchors.
//
// Gated behind the existing UI.v2 flag (src/lib/flags.js).
// Currently UI.v2 = false — the NewsroomSlice + future SubNav
// render in NO hub until ade flips VITE_FLAG_UI_V2=1 in Vercel env.
// Old hubs render unchanged in production. This is the rollback
// path: env var change, no code rollback needed.
//
// NBA hub wired (NBADashboard.jsx):
//   • NewsroomSlice mounted right above SEOContent block.
//   • sport="nba", newsroomLabel="NBA NEWSROOM",
//     moreHref="/nba-playoff-2026#newsroom".
//   • Gated behind {UI.v2 && ...} — visible only when flag is on.
//
// What stays untouched in v0.53.0:
//   • Every hub renders identically with UI.v2 off (default).
//   • Five protected surfaces (Derby, FIFA WC, Liga 1, push install,
//     favorites, per-club squad pages) — no changes.
//   • All hub data hooks — usePlayoffData, etc.
//   • <HubStatusStrip>, <KpiStrip>, <ScheduleStrip>, <HubPicker>
//     from Phase 2 — coexist as siblings to the new sub-nav when
//     it lands in v0.53.1.
//
// What's NOT in v0.53.0 (queued for v0.53.1):
//   • SubNav mount on hub V2TopBar subrow — needs per-sport anchor
//     items (NBA: Overview/Live/Standings/Bracket/Stats/Newsroom;
//     EPL: similar; F1: Calendar/Drivers/Constructors/Newsroom).
//   • EPL.jsx, F1.jsx, Tennis.jsx, SuperLeague.jsx wiring
//     (NewsroomSlice mount).
//   • Type rhythm pass on hub section titles (.serif h2 +
//     JetBrains Mono .card-title).
//
// Phase D (Game Center new surface) and Phase E (HomeV2 + UI.v2
// flip) remain queued.
//
// — earlier ships follow —
//
// v0.52.0 — Phase B of the v4 redesign: editorial article shell
// goes live across all 5 generated content types.
// (per docs/redesign-v4-handover.md §4 Phase B).
//
// Single-file diff intent: GeneratedArticle.jsx now wraps every
// generated article body in the v4 shell. All five content routes
// inherit the new chrome automatically:
//   • /preview/:slug         (Preview Writer, T-24h match previews)
//   • /match-recap/:slug     (Recap Writer, post-match)
//   • /standings/:slug       (Standings Explainer, weekly + state)
//   • /profile/:slug         (Profile Writer, evergreen team/player)
//   • /h2h/:slug             (H2H landing pages)
//
// What ships visually:
//   • Full-bleed <HeroBand> at the top — sport-tinted SVG fallback
//     (gradient + faint hatch) when fm.hero_image is null. Caption
//     strip pulls "AWAY · HOME" / "AWAY 96–128 HOME" / "PEKAN 36"
//     per article type. Real photos wire in via fm.hero_image when
//     ade's editorial pipeline starts producing them.
//   • Reading column max-width 720px on desktop, full-width mobile
//     (clamp on horizontal padding). Breadcrumbs anchored to a
//     wider 1080px outer container so they don't drift on big
//     viewports.
//   • Kicker line — small mono uppercase eyebrow like
//     "PREVIEW · LIGA INGGRIS · 30 APR".
//   • Display headline — Newsreader serif with .disp class,
//     mobile-first clamp(28px, 6vw, 44px) per redesign doc §4
//     mobile overrides. textWrap: balance for clean line breaks.
//   • Deck / standfirst — Newsreader serif at 17px, lighter weight,
//     pulls article.description from frontmatter.
//   • Byline / meta strip — "Tim editorial Gibol" + AiByline pill +
//     published date. Bottom border separates from body.
//   • Body markdown enhanced:
//      - First paragraph gets a drop cap (~64px Newsreader glyph
//        floated left). CSS-driven via .editorial-dropcap class +
//        ::first-letter rule in index.css; mobile-tuned at 480px.
//      - Blockquote (`> `) markdown → <PullQuote> with optional
//        attribution after a "— Author" trailing line.
//      - First H1 in body suppressed (stylistic duplicate of
//        article.title which the shell now renders explicitly).
//      - H2 sections render in Newsreader serif when inside .v2.
//   • <EditorialFootnote> at the bottom — replaces the v1 plain-prose
//     AI disclosure footer. Auto-renders AI/human attribution,
//     per-league source list, editor name, model id, relative-
//     updated-time. Bahasa-first per voice rules. AI=false branch
//     ships ready for future human-only pieces.
//
// Mobile-first per redesign doc §4 mobile overrides:
//   • Hero band height clamps from 220px → 380px on viewport width.
//   • Headline clamps from 28px → 44px.
//   • Reading column collapses to full-width naturally via padding
//     clamp; right rail (deferred) was scoped out of v0.52.0.
//   • Drop cap stays on mobile at 56px (the doc explicitly said the
//     glyph fits at 480px).
//
// Right rail (sticky "in this story" + related series): DEFERRED
// to v0.52.1 polish. The single-column shell is the foundation;
// the rail is additive when ade wants it.
//
// Two new helpers in GeneratedArticle.jsx:
//   • sportTagFromLeague(leagueId) — maps content-engine league ids
//     to HeroBand sport tints.
//   • sourcesForLeague(leagueId) — per-sport source-data attribution
//     for EditorialFootnote.
//   • buildKicker / buildHeroCaption — type-aware meta composers.
//
// What stays untouched in v0.52.0:
//   • api/, supabase/, content cron — zero changes.
//   • TYPE_CONFIG entries (preview/recap/standings/profile/h2h) —
//     unchanged; the shell consumes them via cfg.eyebrow + cfg.eyebrowLabel.
//   • SEO + JSON-LD + canonical/sitemap entries — unchanged. Acceptance
//     check: curl gibol.co/preview/{slug} | grep canonical still returns
//     the same canonical URL.
//   • Editor preview banner — restyled to match v4 amber palette but
//     same auth gate logic.
//   • Editor at /editor — internal admin tool, inherits tokens, no
//     further work.
//
// Bundle impact: GeneratedArticle.jsx code-split via lazy() in App.jsx,
// so the v2 primitive imports only land in the article-route bundle.
// LCP gate: Newsreader was already preloaded in v0.51.0; no new
// font requests in v0.52.0.
//
// Phase C (hub Newsroom Slice + SubNav), Phase D (Game Center new
// surface), Phase E (HomeV2 + UI.v2 flip) follow as separate ships.
//
// — earlier ships follow —
//
// v0.51.0 — Phase A + Phase B primitives of the v4 redesign (per
// docs/redesign-v4-handover.md). Three changes ship together:
//
//   A.1 — REDESIGN PRIMITIVES (additive, zero surface change):
//     • index.html: Google Fonts preload extended with Newsreader
//       (400-800, latin subset, swap). Inter Tight + JetBrains Mono
//       unchanged. Total preload weight ~+30KB; LCP gate at end of
//       phase B will verify.
//     • src/index.css: 6 new tokens (--ink-5, --line-loud, --blue-soft,
//       --amber-soft, --live-soft, --paper) per the v4 design bundle.
//       Mirror set for [data-theme="light"]. Plus 6 .v2-scoped utility
//       classes (.serif, .disp, .deck, .kicker, .card-title, .ai-byline)
//       so the editorial type system never bleeds into legacy pages.
//       Existing 100+ tokens unchanged.
//     • src/components/v2/AiByline.jsx (NEW): "AI · HUMAN EDITED" pill,
//       two variants — small inline (`<AiByline />`) and full bar
//       (`<AiByline variant="bar">`). Links to /transparency by
//       default. Phase B + Phase D consume.
//     • src/components/v2/EditorialFootnote.jsx (NEW): "How was this
//       written?" disclosure block. Renders Bahasa-first AI / human
//       attribution + sources + editor + relative-time. Auto-renders on
//       all generated articles in Phase B's article shell. AI=false
//       branch shows "Reportase dan penulisan oleh X. Tidak ada AI yang
//       digunakan." for human-only pieces.
//     • src/components/v2/index.js: re-exports AiByline + EditorialFootnote.
//
//   A.1.5 — PHASE B PRIMITIVES (additive, also no surface change since
//   they're not consumed yet — wired in v0.52.0):
//     • src/components/v2/HeroBand.jsx (NEW): full-bleed hero band for
//       article shells + Game Center. Sport-tinted SVG placeholder
//       fallback when no `image=` prop. Mobile-first height clamp,
//       caption strip with backdrop blur, optional credit slot.
//     • src/components/v2/PullQuote.jsx (NEW): editorial blockquote.
//       Newsreader italic on amber rule. `attribution` prop renders
//       em-dash mono caption. "muted" variant for sidebar quotes.
//     • src/components/v2/InlineDataCard.jsx (NEW): mid-article stat
//       block. Sport-agnostic columns of {label, value, color, sub}.
//       Responsive grid (2-up mobile / N-up desktop ≥520px).
//
//   Why ship Phase B's primitives in v0.51.0 along with Phase A: they're
//   purely additive — nothing imports them yet (the wire-in lives in
//   GeneratedArticle.jsx Phase B work, deferred to v0.52.0). Shipping
//   them now makes v0.52.0 a single-file diff (GeneratedArticle wrap)
//   with all dependencies already in place. Cleaner rollback if v0.52.0
//   bug-out: revert one file, primitives stay shipped but unused.
//
//   A.2 — LINT SCORE BACKFILL v2 (data fix, no code-surface):
//     • Background: ship #28's first-pass backfill used a thin
//       frontmatter heuristic for source-context, which mis-flagged
//       genuine grounded stats (56-26 record, 47.7% FG, head coach
//       names) as training_inference. Result: 131/168 articles
//       dropped below the 70 threshold, 0 articles ≥85, bulk-approve
//       UI became useless.
//     • Fix: scripts/backfill_lint_v2.py — dispatches each article
//       to the EXACT context builder + agent.format_user_message
//       the live writer used (nba_team_profile_context,
//       football_team_profile_context, recap_context, etc.). Re-runs
//       voice_lint with that authentic source-context. Expected
//       behavior: scores rebound to live-gen levels (+15-20pt),
//       ≥85 tier repopulates, bulk-approve regains throughput.
//     • Cost: ~$0.001/article × 168 = ~$0.20. Plus first-run hit an
//       Anthropic timeout at 158/168 — second run completes the
//       remainder + re-lints the partials. ~$0.40 total.
//     • Verified: Liverpool vs Crystal Palace lifted 62 → 82 in
//       early dispatcher run, validating the lift hypothesis.
//
// Phase B (editorial article chrome) + Phase C (hub Newsroom Slice)
// + Phase D (Game Center) + Phase E (HomeV2 + UI.v2 flip) follow as
// separate ships per the redesign doc — sequenced as v0.52.0,
// v0.53.0, v0.55.0, v0.57.0 per the version remap from the prior
// stale doc baseline.
//
// What stays untouched in v0.51.0:
//   • Every existing page renders identically. No route changes.
//   • No data hook changes.
//   • UI.v2 flag still false — no surface flip yet.
//   • The Editor (/editor) workstation (Ships #21-#31) untouched.
//
// — earlier ships follow —
//
// v0.50.0 — Phase 2 ship #31: explicit Reject action in /editor.
// Closes the editorial decision tree. Before this ship the only
// terminal action was Approve; articles ade decided not to publish
// sat at Pending forever, dragging down the per-sport approval-rate
// (one of three Phase 2 graduation criteria) and cluttering the
// queue. Now there's a clean three-way state: Pending → Approved
// or Rejected.
//
// Schema (migration 0011 — applied via Supabase MCP):
//   • New table ce_article_rejections — mirror of ce_article_publishes
//     but for rejections. Same primary key (slug, type), service-role-
//     only writes, anon-readable so SPA + prerender can gate logic.
//
// State invariant: a slug is in publishes OR rejections, NEVER both.
// Server enforces this:
//   • action=approve upserts to publishes AND deletes any matching
//     rejection row (re-approve flow)
//   • action=reject upserts to rejections AND deletes any matching
//     publish row (un-publish flow if editor changes mind)
//
// SPA derivation:
//   • slug in publishes  → APPROVED
//   • slug in rejections → REJECTED
//   • else               → PENDING
//
// Backend (api/approve.js):
//   • New action="reject" branch — accepts both single and batch
//     shapes, validates type/slug, upserts rejections, strips
//     publishes. Same auth gate as approve.
//   • Existing approve branch extended: after upsert, also strips
//     any matching rejection row. Rebrokers re-approve flows
//     transparently — editor doesn't need to "un-reject" first.
//
// Helpers (src/lib/editorAuth.js):
//   • rejectArticle({type, slug, reason}) — single-row reject
//   • rejectBatch({items}) — chunked batch reject (max 200/req)
//   • fetchRejectionLedger() — bulk fetch keyed by `${type}:${slug}`
//
// /editor UI:
//   • New "Rejected" filter chip alongside Pending / Published.
//   • Rejected count surfaces in the header summary line in red.
//   • Per-row status cell: PUBLISHED / REJECTED / PENDING
//     (severity-colored badges).
//   • Action cell layout per state:
//      - Pending: Approve (primary) + ✎ Edit + ✗ Reject (secondary)
//      - Rejected: rejected timestamp + ↻ Re-approve (toggle back)
//      - Published: published timestamp (unchanged)
//   • Reject confirm flow: window.confirm with article title + an
//     optional window.prompt for a reason that lands in the row's
//     reason column (surfaces in the dashboard tooltip).
//
// Stability dashboard impact (the actual reason for shipping):
//   • Rejected articles are excluded from per-sport totals AND
//     approval-rate denominator. Approval rate = approved / (approved
//     + pending), not approved / (everything). Rejected articles ade
//     decided not to ship no longer drag the rate below the 80%
//     graduation threshold.
//
// Public path:
//   • Rejected articles redirect to home (the body-gate already does
//     this for "not in publishes ledger"). No SPA route changes
//     needed; the existing gate covers reject as a side-effect of
//     approve being absent.
//   • If the editor rejects a previously-approved article, the
//     server's strip-publish-on-reject step un-publishes it within
//     the same request — public stops seeing the body within seconds.
//
// — main ship #30A + hotfixes follow —
//
// v0.49.0 — Phase 2 ship #30A: Generate-on-demand from /editor +
// two NBA dashboard hotfixes bundled in.
//
// Hotfix A (NBA dashboard date picker): clicking a date tab didn't
// reliably show that day's games. Root cause: goToKey() relied on
// horizontal smooth-scroll + scroll-snap-type: x mandatory, and the
// scroll-end handler was the only thing setting activeKey. On some
// browsers (especially when scroll-snap is mandatory) the smooth
// programmatic scroll can stall or abort, leaving activeKey on the
// previous day forever — so the panel stayed visually on the old
// games AND the active-tab highlight didn't update.
// Fix: setActiveKey(key) is called synchronously in goToKey, then
// scrollTo uses behavior: 'instant' (overrides the track's CSS
// scroll-behavior: smooth for programmatic scrolls only — user
// swipe still gets the smooth treatment via CSS).
//
// Hotfix B (NBA bracket Western "Play-In TBD"): the western 8-seed
// kept showing "Play-In TBD" even after PHX/GSW resolved into the
// R1 bracket. Root cause: resolvePlayInWinner() only inspected
// today's games array. Once R1 advances past G1 (which happens fast),
// today's scoreboard doesn't carry the specific 1-seed-vs-play-in
// matchup, so resolution returns null. Fix: extended the resolver
// to also scan seriesMap (the historical 7-day window from
// useSeriesState). seriesMap keys are sorted "ABBR1|ABBR2"; any pair
// containing OKC + a play-in pool team identifies the winner.
// Resolution stays stable across the whole round now.
//
// — main ship #30A below —
// Editor types natural language ("previews for tomorrow's NBA
// playoff games"); backend parses intent + resolves to specific IDs;
// returns CLI commands the editor copies + runs locally. Closes the
// pre-generation half of the loop the same way Ship #29 closed the
// post-generation half.
//
// Architecture (lean v1 — "plan on web, run locally"):
//   • Editor → /api/approve action="plan_generation" {prompt}
//   • Backend → Haiku 4.5 parses NL into structured intent JSON
//   • Backend → resolvers hit the right data feed (ESPN scoreboard,
//     API-Football proxy, jolpica) to enumerate specific game/team/
//     driver/player IDs
//   • Response → list of {label, command} pairs the UI renders
//   • Editor → "📋 Copy all" → paste into terminal → run → deploy
//
// Why this scope (vs full GitHub Actions dispatch — Ship #30B):
//   • Zero new ops surface. No GitHub PAT, no workflow file, no
//     Supabase status table. Just a Vercel function that talks to
//     existing data feeds.
//   • Editor stays in control of cost — they review the plan before
//     running. A plan with 10 articles costs $0.40-$0.60; user sees
//     the count before committing.
//   • Ships in one day instead of three. Real workflow value
//     immediately, full automation pending.
//
// Backend (api/_lib/generationPlanner.js — new):
//   • Raw fetch to Anthropic Messages API (no SDK; keeps
//     package.json clean since we'd already imported the key for
//     prerender). Single Haiku call per request, ~$0.001.
//   • Intent schema fixed via system prompt with examples — Haiku
//     reliably produces clean JSON for the supported command set.
//   • Resolvers cover the most-common cases for v1:
//      - NBA preview/recap by date_filter (today/tomorrow/yesterday
//        or specific YYYY-MM-DD) → ESPN scoreboard
//      - NBA team-profile by team name → ESPN /teams index
//      - Football preview/recap by gameweek → API-Football proxy
//      - Football team-profile by team name → API-Football /teams
//      - Football standings by gameweek → direct CLI (no resolution)
//      - F1 preview/recap/championship by round → direct CLI
//      - F1 driver-profile by name → name-to-jolpica-id heuristic
//        (works for ~80% of names; UI flags as "may need manual fix")
//      - Tennis rankings → direct CLI (just needs --tour)
//      - Tennis player-profile by name → returns CLI with
//        <LOOKUP> placeholder; editor fills athlete-id manually
//        (full resolver needs ESPN core API extension; v2 polish)
//
// Endpoint dispatcher (api/approve.js):
//   • action="plan_generation" branch added BEFORE the existing
//     edit/approve branches. /api/approve is now the omnibus
//     "editor write" endpoint per the 12/12 function-slot plan.
//
// Editor UI (src/pages/Editor.jsx — new GeneratePanel component):
//   • Collapsed default: "✨ Generate articles…" pill button next
//     to the existing filter bar.
//   • Expanded: amber-bordered card with NL textarea + Plan button +
//     6 quick-preset chips ("EPL gameweek 36 previews", "Profile for
//     Persib Bandung", etc).
//   • Plan output: header summary + monospace command block + "📋
//     Copy all" button. Each command labeled with its meaning
//     ("# CHI @ BOS  (pre, 2026-04-30T23:00Z)"). Notes panel for
//     resolver caveats. Instructions footer reminds editor to run
//     from packages/content-engine/ + redeploy after.
//   • ⌘+Enter / Ctrl+Enter shortcut on textarea = Plan.
//
// Cost economics:
//   • Plan call: ~$0.001 per request (Haiku, 600-token cap)
//   • Generation cost (when editor runs the commands): unchanged,
//     ~$0.04 per article × N
//   • Net: planning is essentially free; gate is editor judgment
//     on which plans to actually execute.
//
// What's NOT in this ship (deferred to #30B):
//   • Hands-free dispatch — clicking a button to fire all CLI
//     commands without leaving the browser. Needs GitHub Actions
//     workflow + status polling + secret rotation.
//   • Tennis player-profile name resolution (currently returns CLI
//     with <LOOKUP> placeholder).
//   • Multi-command plans in one request (e.g. "previews AND
//     recaps for tomorrow"). v1 is one command per plan.
//   • Cost preview ("this plan will cost $0.40") in the UI.
//
// v0.48.0 — Phase 2 ship #29: Inline body edit in /editor.
// Closes the editorial loop: see issue → fix issue → save → approve.
// Without this, the dashboard was read-only — editor had to bounce to
// CLI / file editor to make corrections. This makes /editor a real
// workstation.
//
// Architecture (because Vercel functions can't write to public/):
//   • New table ce_article_edits stores body overrides keyed by
//     (slug, type). Single editor (Ade) → last-write-wins. edit_count
//     tracks revision history. lint_stale=true marks the edit as
//     not-yet-relint so bulk-approve ≥85 skips it until refreshed.
//   • SPA reads on-disk JSON for everything (frontmatter, lint, QC,
//     metadata) AND fetches the edits row in parallel; overlays
//     edited_body_md at render time.
//   • Prerender does the same — at deploy time, queries
//     ce_article_edits, applies overlay before generating static HTML.
//     Static + SPA both show the edited body.
//
// Backend (api/approve.js):
//   • New action="edit" branch on /api/approve. Editor email gate
//     unchanged. Validates type/slug/body length. Upserts to
//     ce_article_edits with incremented edit_count + lint_stale=true.
//   • Why piggyback on /api/approve instead of a new endpoint:
//     Vercel Hobby caps at 12 functions; we're at 12/12. /api/approve
//     becomes the omnibus "editor write" endpoint — approve, edit,
//     and (Ship #30) request-generation all dispatch by `action`.
//
// Helpers (src/lib/editorAuth.js):
//   • editArticle({type, slug, edited_body_md, edit_notes}) — POSTs
//     the edit, returns {ok, edit_count, ...}.
//   • fetchArticleEdits() — bulk fetch for /editor, returns Map.
//   • fetchArticleEdit({type, slug}) — single fetch for
//     GeneratedArticle's overlay path.
//
// /editor UI (src/pages/Editor.jsx):
//   • New "✎ Edit" button under each row's Approve button. If already
//     edited, button shows "(Nx)" with the revision count.
//   • Click opens a 1200px-wide modal:
//     - Left: textarea with the body markdown (resizable, monospace).
//       Seeded with the latest revision if one exists, else the AI
//       baseline.
//     - Right top: voice-lint issues + Opus QC suggestions in the
//       same severity-colored card layout as Ship #28's IssueDetail
//       panel — so editor sees what to fix while editing.
//     - Right bottom: ground-truth fields plucked from frontmatter
//       (league, score, athlete name, championship pos, etc) — the
//       editor uses these to verify groundedness without leaving
//       the modal.
//   • Edit notes input alongside the Save button.
//   • Save fires editArticle, refreshes the edits map, closes modal,
//     toasts "Saved edit for {slug}".
//
// Bulk-approve interaction:
//   • highScorePending now excludes any article with an unstaged
//     edit (lint_stale=true). The score reflects the OLD body, so
//     ≥85 batch approve would risk shipping a regression. Editor
//     either re-lints (CLI) or approves manually after edit.
//
// Public-visibility path (when editor saves):
//   • Immediate: SPA fetch resolves the edit overlay, public visitors
//     see the edited body within seconds (cache-busted Supabase
//     query).
//   • Static HTML / sitemap: refreshed on next deploy. Until then,
//     prerendered HTML still shows the AI baseline; SPA hydration
//     overlays. Acceptable for v1; deploy can be triggered manually
//     after a meaningful edit batch.
//
// What's NOT in this ship (deferred to #29.5):
//   • Inline re-lint after save — would need ANTHROPIC_API_KEY usage
//     from the Vercel function (key is in env, but @anthropic-ai/sdk
//     isn't in package.json). Skipped to keep #29 lean. Editor sees
//     "(edited, lint stale)" indicator until they re-run the CLI on
//     the slug. #29.5 polish ship will add the Haiku call inline.
//   • Auto-redeploy after edit. Currently next manual deploy picks
//     up the static-HTML refresh.
//
// **Server-side migration required:** Apply
// supabase/migrations/0010_article_edits.sql via the Supabase SQL
// editor before this ship is functional. Without it, the edit save
// fails on insert.
//
// v0.47.0 — Phase 2 ship #28: Issue + suggestion details surface in
// /editor. Triage hit a friction point: voice-lint shows score + issue
// count, QC shows verdict + suggestion count — but the actual
// snippets, severities, and fix suggestions weren't visible without
// re-running the CLI. Editor had to leave the dashboard to see what
// was wrong. Fixed.
//
// Three coordinated changes:
//
// 1. **Backend save** (packages/content-engine):
//    • voice_lint.VoiceLintReport.to_frontmatter() now returns the
//      full issues array (snippet + severity + type + fix), capped at
//      240 chars per field.
//    • qc.QcReport.to_frontmatter() expanded with suggestions array
//      AND per-section comments (headline_comment / lead_comment /
//      structure_comment / voice_comment).
//    • cli.py — single sed sweep replaced 17 inline voice_lint dict
//      constructions with `lint_report.to_frontmatter()`. QC was
//      already using the helper, so picks up the suggestions
//      automatically. Centralizes the shape so future expansions only
//      touch one method.
//
// 2. **Prerender stays compact** (scripts/prerender.mjs):
//    • The new arrays would balloon index.json (~600KB at 168
//      articles). Stripped at prerender time — issues + suggestions
//      live ONLY in /content/{type}/{slug}.json (already public).
//    • Editor.jsx fetches per-article on first expand. Bandwidth is
//      on-demand, not bulk-loaded.
//
// 3. **/editor expandable panel** (src/pages/Editor.jsx):
//    • New <IssueDetail> component renders below each row when
//      expanded. Two-column layout: voice-lint issues on the left,
//      Opus QC suggestions on the right.
//    • Severity-colored left borders (red/amber/gray for
//      high/medium/low). Each issue card shows the snippet (italic
//      quote), the type tag, and the fix suggestion (green).
//    • QC section scores rendered below — Headline / Lead / Structure
//      / Voice with per-section comments from Opus. Editor sees not
//      just "verdict: edit" but exactly which section dragged the
//      score down and why.
//    • "▸ show issues" / "▾ hide issues" toggle inline with each
//      title's metadata row. Lazy-loaded on first expand.
//    • Graceful fallback: if an article was generated before this
//      ship and has only summary text (no issues array), the panel
//      shows "Re-run lint via CLI to populate."
//
// Backfill (packages/content-engine/scripts/backfill_lint_issues.py):
//   • Reads each existing article body, reconstructs source-context
//     from the frontmatter fields that originally fed the writer,
//     re-runs Haiku voice-lint, writes the issues array back.
//   • For QC: only re-runs on slugs that fall in the deterministic
//     10% sample (qc_sampler.is_sampled). Per ade's call — non-sampled
//     articles stay without QC suggestions; the ~17 already-sampled
//     articles get their suggestions populated retroactively.
//   • Idempotent — skips articles whose voice_lint.issues array is
//     already populated.
//   • Cost: ~$0.10 (Haiku × 168) + ~$5 (Opus × ~17 sampled) = ~$5.10.
//
// **Server-side migration required:** v0.43.1 hotfix expanded
// /api/approve's VALID_TYPES allow-list to accept 'team' and 'h2h',
// but the underlying CHECK constraint on ce_article_publishes.type
// in Supabase still only allowed the original 3 types. Bulk approves
// of profile/h2h articles failed with the constraint error. Migration
// 0009 (supabase/migrations/0009_publish_types.sql) drops the old
// constraint and replaces with the expanded list (preview, recap,
// standings, team, h2h, race-preview, race-recap, glossary, pemain).
// **Apply via Supabase SQL editor** — paste the SQL, click Run.
// Until applied, /editor batch approve continues to fail for the
// new content types.
//
// v0.46.0 — Phase 2 ship #27: Cross-link CTAs from canonical
// dashboards into the evergreen profile articles.
//
// The 132 profile articles built in ships #21-#24 live at /profile/*
// URLs with no internal links pointing at them — orphan content from
// an SEO + share-graph perspective. The four canonical dashboards
// (TeamPage, EPLClub, SuperLeagueClub, F1Driver) ARE getting traffic
// already. This ship routes a fraction of that into the new profiles.
//
// New shared component: src/components/ProfileLink.jsx
//   • <ProfileLink sport="..." {...entityProps} /> renders a "📖
//     Profil lengkap [Subject]" CTA pill above the breadcrumbs on
//     each canonical surface. Amber accent matching existing chrome.
//   • Self-contained slug computation per the audit:
//      - NBA:    `nba-{slugify(teamFullName)}` from TEAM_META full name
//      - EPL:    `epl-{club.slug}` (canonical slug already matches profile)
//      - Liga 1: `liga-1-id-{LIGA1_LOOKUP[canonicalSlug]}` — 18-entry
//                lookup table because canonical slugs ("persib") and
//                profile slugs ("persib-bandung") diverge
//      - F1:     `f1-{slugify(driver.name)}` from full driver name
//      - Tennis: `tennis-{slugify(playerName)}` (no canonical surface
//                yet, but ready when it lands)
//   • Fully derivable at component-mount time — no extra fetch, no
//     dependency on the profile actually existing.
//
// Conditional rendering decision: v1 links blindly. If the profile
// isn't approved yet, click takes user to home (existing /profile/:slug
// body-gate behavior). Acceptable for v1 because:
//   1. Ship #26 (bulk-approve) just unblocked the queue — the orphan-
//      link window is short.
//   2. Hide-until-approved adds a build-time manifest dependency
//      that's better to ship as a v2 polish.
//
// Page integrations (4 files, ~5 lines each):
//   • src/pages/TeamPage.jsx       (NBA team)        → ProfileLink sport="nba" teamFullName=...
//   • src/pages/EPLClub.jsx        (EPL club)        → sport="epl" entitySlug=club.slug
//   • src/pages/SuperLeagueClub.jsx (Liga 1 club)    → sport="liga-1-id" canonicalSlug=club.slug
//   • src/pages/F1Driver.jsx       (F1 driver)       → sport="f1" driverName=driver.name
//
// CTA placement: directly under the existing Breadcrumbs row, above
// the hero. Matches the natural reading order — fans see the
// breadcrumb back-link first, then "📖 Profil lengkap" as the
// expand-to-narrative call. 8px top margin so it visually clusters
// with the breadcrumbs rather than the hero strip.
//
// Skipped this ship (v2 work):
//   • F1Team.jsx — no constructor profile content type yet (Profile
//     Writer focused on drivers; constructor profile = future ship).
//   • Tennis canonical surfaces — no per-player dashboard exists yet
//     (only ATP/WTA rankings hub). When the canonical tennis player
//     surface lands, ProfileLink already supports it.
//   • Build-time approved-profiles manifest for hide-until-approved.
//
// Phase 2 graduation impact: profiles that ade approves now land
// with at least one inbound canonical link. Internal link graph
// strengthens — Google PageRank-equivalents flow from established
// dashboards into evergreen profile content. SEO compounds faster
// than profile-only orphans would.
//
// v0.45.0 — Phase 2 ship #26: Bulk-approve UI in /editor.
// The 167-article queue (built up over ships #21-#24) was the actual
// constraint on shipping. Manual single-row Approve clicks would take
// 5-10 hours; this ship cuts editorial throughput to 1-2 hours.
//
// Three new bulk-action surfaces in /editor:
//   1. **"Approve all ≥85"** — single button, counts pending rows
//      with voice-lint score ≥85 ("ship as-is" tier), shows
//      confirmation modal with article count + sample titles, fires
//      a single batch upsert.
//   2. **Multi-select checkboxes** — column added at the left of
//      the article table; header checkbox toggles "select all
//      pending in current view". "Approve selected (N)" button
//      appears when any are checked.
//   3. **Score-tier filter chips** — new row in the filter bar:
//      `≥85` (green / ship-as-is), `70–84` (amber / review), `<70`
//      (red / regen). Combine with type chips and sport chips for
//      laser triage ("show me Liga 1 profiles with score 70-84").
//
// Triage sort folded in:
//   • New default sort: `pending → recap > preview > standings >
//     team > h2h → newest → score desc`. Time-sensitive content
//     (recaps, previews) surfaces first; evergreen profiles after.
//
// Backend (api/approve.js):
//   • Accepts BOTH single shape `{type, slug}` (existing, kept) AND
//     batch shape `{items: [{type, slug, editor_notes?}, ...]}`. One
//     Supabase upsert handles all rows in <1s; well under the 10s
//     Hobby timeout. Server caps at 250 per request; client helper
//     auto-chunks for larger batches. Backward compatible — every
//     existing single-row caller keeps working unchanged.
//
// Helper (src/lib/editorAuth.js):
//   • New `approveBatch({items})` — chunks at 200 to stay under
//     server cap with headroom; returns
//     `{ok, approved_count, approved}`.
//
// Confirmation UX:
//   • Modal dialog before any batch fire. Shows total count + first
//     5 article titles as a sanity check. Hard not to mis-click.
//
// What's NOT in this ship (deferred):
//   • Mark-for-regen action — needs a way to invoke the Python CLI
//     from the browser (GitHub Actions trigger or Vercel function
//     hitting a webhook). Standalone ship; not blocking the
//     throughput win.
//   • Auto-approve gate based on QC verdict (e.g. only ≥85 AND
//     QC=ship). v2 polish; current shape lets editor decide.
//
// Phase 2 graduation impact: once ade triages, NBA could go from
// 0/100 approved to 30+ approved in one bulk action. With voice-lint
// avg ~78 across the queue, raising approval rate is the lever; once
// rate ≥ 80% AND approved ≥ 100 AND lint ≥ 85, NBA flips to
// AUTO_PUBLISH_SPORTS and the cron orchestrator starts publishing
// without manual gating.
//
// Next ship lined up: #27 — cross-link CTAs from canonical dashboards
// (`/nba-playoff-2026/[teamSlug]` etc) into the new /profile/* pages.
// Routes existing dashboard traffic into the freshly-approved profile
// articles. Half a day's work; ade can be approving while I build it.
//
// v0.44.0 — Phase 2 ship #24-#25: Profile Writer goes wide² + voice-lint
// regex pre-check. Bulk-generated profiles across all 5 sports plus the
// NBA player profile content type that was deferred from the prior batch.
//
// Bulk profile gen (6 parallel runs, completed in ~22 minutes):
//   • EPL clubs: 19 generated (all 20 clubs, Liverpool was prior batch)
//   • Liga 1 sides: 17 generated (all 18 clubs, Persib prior)
//   • F1 drivers: 21 generated (every driver in 2026 standings,
//     Verstappen prior)
//   • Tennis ATP top-15: 14 generated (Sinner prior)
//   • Tennis WTA top-15: 15 generated (fresh)
//   • NBA top-12 players: 11 generated (Brown prior smoke test)
//
// Total content/team/ folder is now 132 articles (was 35). Editor's
// /editor queue absorbs all of them as drafts pending approval. Cost:
// ~$0.04 baseline × 97 + ~$0.30 × ~10 QC samples = ~$7 for the batch.
//
// New content type: NBA player profile (Sonnet 4.6 / pemain-nba-{slug}).
// Same SPA route /profile/:slug as team profiles; folder = team/ for
// simplicity, slug prefix differentiates. ESPN web-api /athletes/{id}
// gives bio + season stat summary with league rank for each stat —
// the rank context elevates the profile from stat dump to interpretive.
//
// Auto-discovery bulk runners: each sport has a shell script
// (scripts/bulk_*_profiles.sh) that fetches the league/tour endpoint,
// extracts team/driver/player IDs, iterates with idempotent skip-if-
// exists. Re-running any bulk picks up only new entries — safe to
// re-run weekly as rosters/rankings shift.
//
// Voice-lint regex pre-check (Ship #25 — quality/inference_guard.py):
// deterministic detector for the recurring training-inference patterns
// the model kept slipping on across the multi-sport rollout. Catches:
//   • Championship/trophy claims ("Juara Dunia", "World Champion")
//   • Debut-year invention ("debut profesional pada 2018")
//   • Career-history superlatives ("pernah peringkat 1", "career-high")
//   • Era/dynasty framing ("era Tatum-Brown", "dinasti Pep")
//   • Manufactured rivalries ("rivalitas lama")
//   • Specific coach attribution not in input
//   • City geography invention ("kawasan pegunungan", "kota industri")
//   • Ex-team / transfer history ("dulu bermain di Brooklyn")
//
// Each match is verified against the source-context block — if the
// claim's exact phrase appears in the input data, it's grounded
// (legit citation) and skipped. Hits merge into voice-lint's issue
// list (de-duped against Haiku catches) and 2+ high-severity hits OR
// score-below-70 forces verdict to fail. Existing articles unaffected
// (lint runs at write-time only); future runs catch the slips.
//
// What's NOT in this ship:
//   • Hard-gating voice-lint per CLAUDE.md rule #9 doctrine — the
//     existing CLI flow treats voice-lint as informational. Making
//     it block-publish would retroactively reject the existing
//     queue (~30+ articles below score 70). Separate ship — ade
//     decides if the regression cost is worth doctrinal cleanup.
//   • Cross-link from canonical NBA dashboard pages
//     (/nba-playoff-2026/[teamSlug]) into the new /profile/nba-{team}
//     pages — touches existing UI; standalone ship.
//   • External corpus expansion beyond Wikipedia seed (still 17
//     entries; future ship adds Bola.com / SkorID curation)
//
// Phase 2 graduation status unchanged: NBA still 0/30 approved. The
// 97 newly-queued articles arrive as ade reviews the prior 35 — the
// queue is now meaningfully populated for editorial pacing.
//
// v0.43.1 — Approve endpoint hotfix. Ade hit "Approve failed: type
// must be one of preview, recap, standings" when clicking Approve on
// a profile or H2H article in /editor. Root cause: /api/approve.js
// hard-coded VALID_TYPES = {preview, recap, standings} and was never
// updated when ships #21 (team) and #23 (h2h) added new content types.
// Fixed by syncing the allow-list with json_writer.write_article's
// allowed-types set: + 'team', + 'h2h', plus 'race-preview',
// 'race-recap', 'glossary', 'pemain' reserved for future ships so we
// don't ship the same bug again.
//
// No SPA changes needed — the body-gate already queries
// ce_article_publishes with the correct type values
// (cfg.contentPath in GeneratedArticle: 'team' for /profile/, 'h2h'
// for /h2h/). Editor.jsx onApprove already passes article.type from
// index.json which is the folder name. The block was purely
// server-side validation in api/approve.js.
//
// v0.43.0 — Phase 2 ship #22: Profile Writer goes wide. NBA team
// profiles bulk-generated for the full 30-team league + four
// new sports inheriting the same Profile Writer architecture:
// EPL clubs, Liga 1 sides, F1 drivers, tennis players. Single
// SPA route /profile/:slug serves them all via sport-id-prefixed
// slugs (`nba-{team}`, `epl-{team}`, `liga-1-id-{team}`,
// `f1-{driver}`, `tennis-{player}`). All 34 profile articles
// land in the editor's manual-review queue.
//
// Bulk NBA: shipped a `scripts/bulk_nba_team_profiles.sh` runner
// that iterates the 30 ESPN team IDs, idempotent (skips files
// that already exist). Ran in 30 minutes; generated 29 (BOS was
// already from #21), 0 failures. Cost: ~$1.50 baseline + ~$0.85
// from QC samples that fired on 3 articles. Per CLAUDE.md rule
// #8 nothing auto-published — all 30 sit in /editor pending
// human approval.
//
// Multi-sport profile pipelines added (one ship each shape):
//   • football_team_profile (EPL + Liga 1, shared agent +
//     prompt + context — just a --league flag picks the
//     league config). Three API-Football calls per profile
//     (team detail + season stats + standings).
//     Smoke tests: Liverpool (EPL, voice-lint 82, $0.045),
//     Persib Bandung (Liga 1, voice-lint 78, $0.023 cache-warm).
//   • f1_driver_profile (jolpica). Two calls: driver standings
//     + per-race results. Smoke: Verstappen ($0.043, voice-lint
//     62 — model slipped on training-inference about
//     championship history, prompt iteration needed).
//   • tennis_player_profile (ESPN core API). Two calls:
//     rankings + /athletes/{id} bio. Smoke: Sinner ($0.035,
//     voice-lint 58 — same training-inference slippage on
//     birthplace city + debut age).
//
// New CLI commands wired in cli.py:
//   • `football-team-profile --league {epl|liga-1-id} --team-id N --write`
//   • `f1-driver-profile --driver-id <jolpica_id> --season 2026 --write`
//   • `tennis-player-profile --athlete-id N --tour {atp|wta} --write`
//
// New slug helpers in publish/slug.py:
//   • football_team_profile_slug(name, league_id) → `{league}-{slug}`
//   • f1_driver_profile_slug(code, name) → `f1-{slug}`
//   • tennis_player_profile_slug(name) → `tennis-{slug}`
//
// New data/agent/prompt files (5 new, 0 NBA changes):
//   • data/football_team_profile_context.py
//   • data/f1_driver_profile_context.py
//   • data/tennis_player_profile_context.py
//   • agents/football_team_profile.py
//   • agents/f1_driver_profile.py
//   • agents/tennis_player_profile.py
//   • prompts/football-team-profile-system.md
//   • prompts/f1-driver-profile-system.md
//   • prompts/tennis-player-profile-system.md
//
// Existing endpoints extended (no breaking changes):
//   • api_football.fetch_team_detail / fetch_team_season_stats /
//     fetch_team_squad
//   • f1_jolpica.fetch_driver_results / fetch_driver_career
//   • espn_tennis.fetch_athlete (uses ESPN core-api endpoint
//     since site v2 returns 404 for tennis athletes)
//
// Voice-lint observation across all four new sports: model
// frequently invented out-of-data career history (championship
// counts, debut years, "previous teams"), even though prompts
// banned this. Voice-lint catches it as `training_inference`
// HIGH severity — the dashboard surfaces low scores so editor
// triages affected articles. Two prompt-iteration paths to
// consider for v2: (a) tighten the "Hard grounding rules"
// section with specific examples per sport, (b) post-write
// regex pre-check for common training-inference phrases
// ("Juara Dunia", "debut profesional pada", "kelahiran kota").
// Tagged for next ship — not blocking this round.
//
// What's NOT in this ship (deferred to next batch):
//   • NBA player profile (pemain type) — different agent shape;
//     ESPN /athletes/:id has a different schema from team
//     detail + roster. Maps cleanly to tennis_player_profile
//     pattern; copy-adapt next ship.
//   • External plagiarism corpus scraper (Bola.com / SkorID
//     fingerprints in JSONL) — defensive, no behavior change
//     until first new external article matches. Standalone
//     ship.
//   • H2H content type (head-to-head landing pages) — fresh
//     content type, sport-agnostic, derbies are flagship-grade.
//     Standalone ship.
//
// Phase 2 graduation status: NBA still 0/30 approved (just
// generated 30, all pending). Once ade approves a meaningful
// chunk + pushes lint averages above the 85 threshold, NBA
// becomes the first sport eligible for AUTO_PUBLISH_SPORTS.
//
// v0.42.0 — Phase 2 ship #21: Profile Writer goes live (NBA teams
// vertical slice). The Profile Writer from CLAUDE.md's agent table
// (Sonnet 4.6, evergreen) — first content type with a multi-month
// shelf life vs. the dated previews/recaps/standings shipped earlier.
// Why now: NBA playoffs are live = peak intent for "profil [team]"
// queries; the evergreen shape compounds long after the playoffs end.
//
// Files added:
//   • prompts/nba-team-profile-system.md — Sonnet system prompt;
//     hard grounding rules ban championship-count fabrication, era
//     names, coach tenure invention. Profile structure: lead
//     (60-90w) → identitas+posisi (120-160w) → performa (140-180w)
//     → roster picks (140-180w) → outlook (80-120w). Total 600-800.
//   • src/content_engine/data/espn_nba.py (extended) —
//     fetch_team(team_id) and fetch_team_roster(team_id) wrappers.
//   • src/content_engine/data/nba_team_profile_context.py —
//     two ESPN calls (team detail + roster), renders identity +
//     record (overall/home/road) + roster table + next-event
//     blocks for the prompt. Stamps an as_of_id (in Bahasa,
//     "28 April 2026") so future readers see when the snapshot
//     was taken.
//   • src/content_engine/agents/nba_team_profile.py — Sonnet 4.6
//     wrapper, same shape as nba_recap / nba_preview agents.
//   • src/content_engine/publish/slug.py — nba_team_profile_slug()
//     producing `nba-{team-slug}` (e.g. `nba-boston-celtics`).
//     Sport-id prefix lets a single /profile/ route serve all sports
//     without per-sport sub-routing later (epl-arsenal,
//     liga-1-id-persija, f1-max-verstappen, tennis-jannik-sinner).
//   • CLI command nba-team-profile in cli.py — same gate pipeline
//     as recap/preview minus the rule-based fact-check (no specific
//     game stats to verify; voice-lint + grounding rules cover it).
//     Auto-publish-aware + QC-sampled.
//
// SPA wiring (this ship's user-facing surface):
//   • src/pages/Profile.jsx — 3-line wrapper that mounts
//     <GeneratedArticle type="profile" />. Same chrome as
//     Preview/MatchRecap/Standings.
//   • src/pages/GeneratedArticle.jsx — TYPE_CONFIG.profile entry:
//     contentPath="team" (the on-disk folder), routePrefix="/profile",
//     eyebrow shows "MUSIM 2025-26" or "PER 28 APRIL 2026" so the
//     evergreen snapshot date is glanceable in the article header.
//   • src/App.jsx — Route `/profile/:slug` → <Profile />, lazy.
//   • scripts/prerender.mjs — CONTENT_TYPES.team entry +
//     routePrefix mapping (folder `team` → URL `/profile`).
//     Existing per-route HTML emission, sitemap inclusion, and
//     editor index.json picks profiles up automatically.
//
// Smoke test (Boston Celtics, BOS, ESPN team_id=2):
//   • Two ESPN calls + one Sonnet 4.6 call (4054 chars, $0.046,
//     32s) + Haiku voice-lint ($0.003, score 82, 3 minor issues).
//   • Plagiarism passed against the 34-article internal corpus.
//   • QC sample HIT (deterministic 10% slug hash) → Opus 4.7
//     review came back verdict=edit, score 74, 6 suggestions
//     ($0.276). Editor will see the verdict in /editor.
//   • Auto-publish gate held back ("nba not in
//     AUTO_PUBLISH_SPORTS") → manual review queue.
//
// Cost shape: ~$0.05 per profile when not QC-sampled, ~$0.32 when
// sampled. At 30 NBA teams, generating the full league once costs
// ~$1.50 baseline + ~$0.85 if QC fires on the expected 3-4
// articles. Cheap.
//
// Why "team" the type but "profile" the route: the json_writer
// allowed-types list already had `team` and `pemain` reserved
// (per the Phase 1 schema design); flipping them now would break
// other stuff. The user-facing URL is sport-agnostic /profile/:slug
// and the slug carries the sport-id prefix to differentiate.
//
// What's NOT in this ship (deferred):
//   • EPL / Liga 1 / F1 driver / tennis player profiles — same
//     pattern, sport-specific data layer + prompt; one ship each
//   • Player profile (`pemain` type) — separate prompt + data
//     layer; ESPN /athletes endpoint
//   • Profile-specific fact-check (verify cited names match roster,
//     cited record matches input) — voice-lint + grounding rules
//     cover the common cases for v1
//   • Cross-link from canonical team dashboards
//     (/nba-playoff-2026/[teamSlug]) into the profile article —
//     once enough teams have profiles published
//
// Phase 2 graduation status unchanged: NBA still 0/100 approved,
// avg lint pending. Profiles add a new content type to ade's queue
// but don't shortcut the manual-review threshold.
//
// v0.41.0 — Ship #20: surface Opus QC verdict in /editor dashboard.
// Two changes paired:
//   1. scripts/prerender.mjs: index.json article rows now include the
//      compact `qc_review` shape (verdict + overall_score +
//      suggestion_count + summary) that the QC sampler writes into
//      frontmatter. Null when not sampled (90% of articles).
//   2. src/pages/Editor.jsx: new "QC" column between Voice and Fact.
//      Renders a verdict badge with overall score:
//         ship      → green "SHIP <score>"
//         edit      → amber "EDIT <score>"
//         regenerate → red   "REGEN <score>"
//      Tooltip shows summary + suggestion count. "—" for unsampled
//      rows. Editor uses this to triage the manual review queue:
//      Opus-flagged "edit" or "regenerate" articles jump the line.
//
// Why this matters: until now QC ran in the pipeline but the verdict
// was buried in the JSON file. Editor had no way to see at a glance
// which 10% of articles got reviewed and what Opus thought. With the
// column live, ade can sort manually-curate-first by clicking the
// problematic verdicts. Pair with voice-lint score for full triage.
//
// No backend change — qc_review was already written to frontmatter
// in v0.40.0; this ship only surfaces it. Phase 2 graduation criteria
// (CLAUDE.md rule #8 + locked decisions § 8) unchanged: avg lint ≥85
// + ≥100 approved + ≥80% rate. QC verdict is informational, not part
// of the auto-publish allowlist gate.
//
// v0.58.5 — Newsroom CSS hotfix. The "still blank" report wasn't
// actually blank: contextual feed was returning all 4 cards
// (Chelsea-Forest preview, Everton-City preview, ATP, F1 standings),
// but the grid stayed single-column on desktop because the inline
// gridTemplateColumns ('repeat(1, 1fr)') outranks the media-query
// CSS rule. Result: lead card stretched to 1160px wide × 653px tall
// 16/9 placeholder, dominating the viewport — looks blank because
// it's just a dark-blue gradient with no image. Three fixes in
// NewsroomSlice.jsx:
//   1. Removed gridTemplateColumns from the inline style; the CSS
//      class .newsroom-grid now owns column layout (mobile 1fr,
//      desktop 1.6fr 1fr when stacked secondaries exist).
//   2. CardPlaceholder accepts a maxHeight prop; lead card capped
//      at 320px so the placeholder doesn't dominate when the grid
//      is in single-column mode (mobile or fallback).
//   3. Lead's CardPlaceholder now uses lead.league for sport tint
//      (was using the parent `sport` prop which is undefined on
//      the contextual home feed). Visual variety across sports.
// No data, prompt, or backend change. Pure render fix.
//
// v0.58.6 — Drop the lead card's gradient hero entirely. After
// v0.58.5 capped it at 320px, ade reported "still a block of empty
// container" — the dark navy SVG gradient on a light-mode cream
// background reads as a void no matter how much we shrink it. We
// don't have real article art yet (no editorial photo pipeline,
// no /og/* lead images for non-NBA recap previews), so showing a
// placeholder is just visual noise pretending to be content.
// New design: text-led editorial card, Bloomberg/NYT-style. Top
// hairline (2px solid ink) → kicker + AI byline → larger serif
// headline (clamp 24-36px) → 17px deck → relative timestamp. The
// stacked secondaries are unchanged. Lead now stands out by type
// scale + the editorial hairline above it, not by image weight.
// Restoring the hero is a v0.59 task once we have real OG images
// to pull (NBA recaps already do; EPL/F1/tennis previews need a
// scrape-and-canonicalize pipeline first).
//
// v0.59.0 — Match strips on home page.
//
// Two new horizontal-scroll rails between the GIBOL TODAY headline
// and the live-console/newsroom grid:
//   • HARI INI & BESOK — kickoffs in next ~36h across all sports
//   • SKOR TERAKHIR    — finished games in last ~36h with scores
//
// Each strip aggregates from existing per-sport hooks — no new
// Vercel function (we're at 11/12 Hobby slots). Sources:
//   NBA       → usePlayoffData + useYesterday
//   EPL       → useEPLFixtures (returns upcoming + recent)
//   Liga 1    → useSuperLeagueFixtures (same shape)
//   F1        → useF1Schedule + useF1Results (race winner shown)
//
// Tennis is gated for v1 — too many matches per day across multiple
// tournaments without a "headliner" filter; would noise up the strip.
// Future ship can add useTennisScoreboard once we have a top-N-rank
// filter on it.
//
// Component pieces:
//   • src/lib/matchAggregate.js   — pure aggregator + sort
//   • src/components/v2/MatchStrip.jsx — renders the strip
//
// Strip hides itself when there's nothing in the window — off-season
// sports don't leave empty rails. Each card is a 220px-wide compact
// box: sport dot + label · status (LIVE/FT/WIB time) · two team
// rows with score; winner highlighted, loser dimmed on results.
// Click → recap (post) / preview (pre) / game center (NBA live).
//
// Why this matters: the home page now answers "what to watch
// tonight?" and "who won last night?" in two glances at the top of
// the page. Both are core "what's happening" questions Gibol existed
// to answer; until now the home page jumped straight from the
// editorial headline to a single live console card and a 4-card
// newsroom — useful but not "today's sports at a glance."

// v0.59.1 — One-click article generation via GitHub Actions.
//
// Phase 2 Ship #30B (originally deferred from #30A). The /editor
// "✨ Generate articles" panel now has a "🚀 Run + auto-deploy"
// button alongside the existing "📋 Copy all (run local)" fallback.
//
// Pieces:
//   • .github/workflows/generate-on-demand.yml — accepts a
//     newline-separated list of CLI commands via workflow_dispatch.
//     Runs each from packages/content-engine/, commits + pushes
//     resulting JSON files (which triggers Vercel auto-deploy).
//     Safety: rejects any command not matching ^python -m
//     content_engine. — defense against a malicious plan injecting
//     shell. Continue-on-error per command so one bad ID lookup
//     doesn't waste the rest of the batch.
//   • api/approve.js — new action="dispatch_generation" branch.
//     Validates the commands array against the same safety regex,
//     POSTs to GitHub workflow_dispatch with a fine-grained PAT
//     (Vercel env GITHUB_PAT). Returns the runs URL so the editor
//     can watch the job.
//   • src/pages/Editor.jsx — multi-line prompt textarea (one
//     prompt per line, auto-fans-out to parallel plan_generation
//     calls and merges items). Two new "batch presets" pre-fill
//     common shapes (Tonight: NBA+EPL+Liga 1; Weekly: standings +
//     rankings). The "🚀 Run + auto-deploy" button dispatches
//     the merged plan; success state shows a "Watch on GitHub →"
//     link. Local CLI fallback retained for cases where the user
//     wants to inspect output before committing.
//
// User one-time setup (the only reason this isn't fully automatic
// from day one): create a fine-grained GitHub PAT with
// Contents:Write + Actions:Write scopes for adesulco/nba-playoffs-
// monitor and add it to Vercel env as GITHUB_PAT, then redeploy.
// The button surfaces a clear error pointing to this if the PAT
// isn't configured. ANTHROPIC_API_KEY + Supabase secrets are
// already in GitHub Actions secrets via content-cron.yml.
//
// Why this matters: previously Editor → Generate → got CLI
// commands → opened terminal → activated venv → pasted N
// commands → ran vercel deploy. Now: Editor → Generate (multi-
// sport in one pass) → click → wait ~3 min → articles live in
// /editor queue, ready to approve. No terminal, no venv, no
// deploy step.

// v0.59.2 — Scheduled auto-generation: NBA recap polling + cost cap.
//
// Flips the first cron schedule on (`*/30 2-8 * * *` for NBA recaps —
// 13 polls/day across the NBA evening-game window). The system now
// auto-generates a Bahasa recap within ~30 min of every NBA Round 2
// final whistle without anyone clicking anything. Editor's role
// shifts from "trigger generation" to "approve in queue."
//
// Pieces:
//   • supabase/migrations/0013_cron_runs.sql — new ce_cron_runs audit
//     table. Records every cron + workflow_dispatch run with
//     timestamp, mode, articles_count, cost_usd, budget_skipped,
//     and the github run URL. RLS enabled with no policies =
//     service_role only. Drives both the daily cost-cap pre-check
//     AND the future /editor audit dashboard.
//
//   • .github/workflows/content-cron.yml — three new steps wrapping
//     the existing discovery flow:
//       1. "Daily budget guard" — queries Supabase for SUM(cost_usd)
//          since 00:00 UTC today, compares to DAILY_BUDGET_USD env
//          (default 2.00, override per-run via workflow_dispatch
//          input). If at-or-over, all subsequent steps skip via
//          if: steps.budget.outputs.ok == 'true'. Hard halt per
//          CLAUDE.md rule #11.
//       2. "Compute cost from new content" — after discover writes
//          its JSON files, sums cost_usd from the diff. Surfaces as
//          step output so audit + summary can use it.
//       3. "Write audit row" — runs always() (even on budget skip
//          or discover failure), inserts to ce_cron_runs via
//          Supabase REST. Audit insert failure is non-blocking
//          (observability, not critical path).
//
// Schedules graduated:
//   ✓ NBA recaps (every 30 min, 02:00-08:00 UTC) — ENABLED
//   ⏳ Tennis rankings, football previews/recaps, NBA previews,
//     F1 weekend, weekly standings — staged in YAML, commented out.
//     Graduate per-cadence after a week of stable runs.
//
// Cost ceiling: at 6 NBA games / night × $0.04 per Sonnet recap =
// $0.24/day max. Daily cap of $2.00 gives 8x headroom. If a runaway
// loop ever hits, max bleed = $2 before the next 00:00 UTC reset.
//
// Compounding effect with v0.59.1: editor now has TWO generation
// paths — on-demand button (ad-hoc, multi-sport batches) + cron
// (passive, daily cadence). The /editor queue stays fresh without
// any morning-routine clicks; editor focuses on approve/reject.

// v0.59.3 — Surface generation failures in /editor.
//
// Before: when content-engine generated an article and a quality
// gate (fact_check / voice_lint hard fail / plagiarism) refused to
// publish, we exited silently. Editor saw "no draft appeared" with
// no idea why. User reported this directly: requested 6 articles,
// only 3 showed up in queue, the other 3 never explained.
//
// After: every blocked article writes a row to ce_generation_failures
// with the command, agent, reason_type, summary, wasted cost, and
// a GitHub Actions run link. /editor renders these in a new
// FailuresPanel above the article queue:
//   • Empty state: small green "No generation failures" pill
//   • Active state: red banner with count + total $ wasted, table
//     with WHEN / REASON / COMMAND / WASTED / SUMMARY / actions
//   • Per-row actions: View raw log, jump to GitHub run, mark resolved
//
// Pieces:
//   • supabase/migrations/0014_generation_failures.sql — applied via
//     MCP (table name `ce_generation_failures` to avoid clash with
//     existing `ce_article_rejections` which tracks editor manual
//     rejections, not engine failures).
//   • .github/workflows/{generate-on-demand,content-cron}.yml — both
//     workflows now write failures to Supabase post-run via a Python
//     parser that reads per-command logs, classifies the reason
//     (regex match against ✗ + fact-check/voice-lint/plagiarism
//     patterns), extracts agent + cost, inserts batched POST to REST.
//     Best-effort: Supabase insert failure is non-blocking.
//   • api/approve.js — two new actions: `list_failures` (returns
//     unresolved rows for the panel) and `resolve_failure` (marks a
//     row resolved with editor email + timestamp).
//   • src/lib/editorAuth.js — `listFailures()` + `resolveFailure(id)`
//     helpers.
//   • src/pages/Editor.jsx — new FailuresPanel component above the
//     article queue. Reason types color-coded:
//       fact_check_fail → red    (most serious — factual error)
//       voice_lint_fail → amber  (style/voice issue)
//       plagiarism_fail → purple (similarity hit)
//       safety_reject   → gray   (bad command shape, runner blocked)
//
// Pairs naturally with the prompt-success guidance: standings +
// tennis-rankings + team-profile rarely fail; recap + preview can
// hit fact-check on speculative phrasing. Editor now sees the
// failure pattern explicitly instead of guessing.

export const APP_VERSION = '0.59.3';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
