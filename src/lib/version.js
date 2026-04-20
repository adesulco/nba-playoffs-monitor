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

export const APP_VERSION = '0.3.1';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
