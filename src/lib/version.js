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

export const APP_VERSION = '0.2.5';

// Short ISO date. Vite replaces import.meta.env.VITE_BUILD_DATE at build
// time if set (see vercel.json / build command); otherwise falls back to
// the module's import time.
export const BUILD_DATE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) ||
  new Date().toISOString().slice(0, 10);

export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_DATE}`;
