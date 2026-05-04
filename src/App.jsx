import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from './lib/AppContext.jsx';
import AnalyticsTracker from './components/AnalyticsTracker.jsx';
import SportErrorBoundary from './components/SportErrorBoundary.jsx';
import { SentryErrorBoundary } from './lib/observability.js';

// F21 — route-based code splitting. Each page becomes its own bundle so the
// home hero loads without pulling 300KB of dashboard logic, and vice versa.
// Home is eagerly imported since it's the root entry.
import Home from './pages/Home.jsx';
import V2TopBar from './components/v2/TopBar.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import SearchOnboardingTooltip from './components/SearchOnboardingTooltip.jsx';
// v0.13.4 Sprint 2 Theme C — scrolls to #hash fragments on
// navigation. Required by the sport-aware MobileBottomNav whose
// items deep-link to hub sections like #standings + #top-scorer.
import ScrollToHash from './components/ScrollToHash.jsx';
import { UI, homeVariant } from './lib/flags.js';

// v2 redesign — Home V1 personalized-feed variant. Lazy so the v1 Home
// doesn't pay its cost on first paint when ui_v2 is off (the default).
const HomeV1 = lazy(() => import('./pages/HomeV1.jsx'));
// v0.57.0 — Phase E redesign: HomeV2. Behind tri-state homeVariant
// flag from src/lib/flags.js (VITE_FLAG_HOME=0|1|2; default 0).
// Old Home + HomeV1 stay on disk as rollback paths. Flip via env
// var when QA passes — no code rollback needed.
const HomeV2 = lazy(() => import('./pages/HomeV2.jsx'));

const NBADashboard = lazy(() => import('./pages/NBADashboard.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
// v0.12.1 — Theme J seedling, NBA-only per-game canonical URL.
// Registered before /:teamSlug below because React Router v6 matches
// in order; specific routes must come before catch-alls.
const NBAGameDeepLink = lazy(() => import('./pages/NBAGameDeepLink.jsx'));
// v0.55.0 — Phase D redesign. NBAGameCenter is the proper deep-dive
// per-game surface (score hero, by-quarter, top performers, AI live
// summary stub, win-prob spark, play feed, series tracker).
// Replaces NBAGameDeepLink at the same route. The deep-link is kept
// in the bundle as a fallback (Vite tree-shakes if unused).
const NBAGameCenter = lazy(() => import('./pages/NBAGameCenter.jsx'));
const IBL = lazy(() => import('./pages/IBL.jsx'));
const FIFA = lazy(() => import('./pages/FIFA.jsx'));
// v0.2.0 — multi-sport stubs (coming-soon pages; phases 1/2/4 replace these).
// v0.2.2 — F1 flipped live (Phase 1A): Jolpica-powered dashboard + per-GP pages.
const F1 = lazy(() => import('./pages/F1.jsx'));
const F1Race = lazy(() => import('./pages/F1Race.jsx'));
// v0.2.5 — per-constructor + per-driver SEO pages.
const F1Team = lazy(() => import('./pages/F1Team.jsx'));
const F1Driver = lazy(() => import('./pages/F1Driver.jsx'));
const EPL = lazy(() => import('./pages/EPL.jsx'));
// v0.4.0 — EPL Phase 1A: per-club SEO pages (20 URLs).
const EPLClub = lazy(() => import('./pages/EPLClub.jsx'));
const LigaIndonesia = lazy(() => import('./pages/LigaIndonesia.jsx'));
// v0.13.0 — Indonesian Super League Phase 1A: hub + 18 per-club SEO pages.
const SuperLeague = lazy(() => import('./pages/SuperLeague.jsx'));
const SuperLeagueClub = lazy(() => import('./pages/SuperLeagueClub.jsx'));
// v0.15.0 — El Clasico Indonesia derby landing page (Persija vs Persib).
// Designed as a sport-generic /derby/[slug] surface; the data + polls are
// pinned to one derby today, but the route shape lets us add Lakers-Celtics
// or El Clasico Spanyol mirrors without rebuilding the page shell.
const Derby = lazy(() => import('./pages/Derby.jsx'));
// v0.5.0 — Tennis Phase 1A: hub, per-tournament, and rankings pages.
const Tennis = lazy(() => import('./pages/Tennis.jsx'));
const TennisTournament = lazy(() => import('./pages/TennisTournament.jsx'));
const TennisRankings = lazy(() => import('./pages/TennisRankings.jsx'));
const Recap = lazy(() => import('./pages/Recap.jsx'));
// v0.23.0 — Phase 1 ship #1. Generated Bahasa pre-match previews. Loads
// /content/preview/{slug}.json (written by the Python content engine to
// public/content/preview/) and renders body_md inline. Sport-generic
// route — every league's preview hangs off the same path.
const Preview = lazy(() => import('./pages/Preview.jsx'));
// v0.25.0 — Phase 1 ship #3. Post-match recaps (separate from the
// existing NBA /recap/:date landing). Slug-based route, same chrome
// + render path as Preview via the shared GeneratedArticle component.
// Path is /match-recap/:slug to disambiguate from the NBA recap
// surface which uses /recap/:date.
const MatchRecap = lazy(() => import('./pages/MatchRecap.jsx'));
// v0.28.0 — Phase 1 ship #7. Editorial dashboard for the manual-
// review queue. Read-only list of every generated article with
// voice-lint score + fact-check status + plagiarism hash + cost.
// Sortable, filterable. noindex'd. Phase 2 will add a publish
// button gated by editor auth.
const Editor = lazy(() => import('./pages/Editor.jsx'));
// v0.29.0 — Phase 1 ship #8. Weekly standings explainer (Haiku 4.5
// templated agent). Slug shape: {league}-{season}-pekan-{N}. Same
// chrome as Preview/MatchRecap via the shared GeneratedArticle
// component.
const Standings = lazy(() => import('./pages/Standings.jsx'));
// v0.42.0 — Phase 2 ship #21. Evergreen team / player profiles
// (Sonnet 4.6 Profile Writer). Slug shape: {sport-id}-{team-or-player}
// (e.g. `nba-boston-celtics`). Reads /content/team/{slug}.json. Same
// chrome as Preview/MatchRecap/Standings via GeneratedArticle.
const Profile = lazy(() => import('./pages/Profile.jsx'));
// v0.43.0 — Phase 2 ship #23. Head-to-head matchup explainers.
// Football-first; slug is alphabetically-sorted team-vs-team so
// /h2h/epl-arsenal-vs-liverpool-h2h is the canonical URL. Reads
// /content/h2h/{slug}.json. Same chrome as the other GeneratedArticle
// surfaces.
const H2H = lazy(() => import('./pages/H2H.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Glossary = lazy(() => import('./pages/Glossary.jsx'));

// Pick'em — bracket, private leagues, leaderboards. Lazy so the Supabase
// client + auth context don't land on users who never visit /bracket.
const Login = lazy(() => import('./pages/Login.jsx'));
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'));
// v0.12.5 — first-login favorites picker
const OnboardingTeams = lazy(() => import('./pages/OnboardingTeams.jsx'));
// v0.12.9 — edit-favorites surface for logged-in users
const SettingsTeams = lazy(() => import('./pages/SettingsTeams.jsx'));
// v0.12.10 — proper SPA NotFound (replaces the silent Navigate-to-/
// catch-all that polluted Google's index by 200-ing every garbage URL)
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
// v0.13.0 — site-wide cross-sport footer (Ship 3E). Mounts below the
// route Suspense so every page (incl. NotFound + leaf pages) ends with
// a link grid to all sport hubs. Lazy because it's never above the
// fold and the bundle stays small without it on initial paint.
const SportFooter = lazy(() => import('./components/SportFooter.jsx'));
const Bracket = lazy(() => import('./pages/Bracket.jsx'));
const BracketNew = lazy(() => import('./pages/BracketNew.jsx'));
const BracketEdit = lazy(() => import('./pages/BracketEdit.jsx'));
const BracketShare = lazy(() => import('./pages/BracketShare.jsx'));
const LeagueNew = lazy(() => import('./pages/LeagueNew.jsx'));
const LeagueJoin = lazy(() => import('./pages/LeagueJoin.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const LeaderboardLeague = lazy(() => import('./pages/LeaderboardLeague.jsx'));

// Minimal blank fallback — renders BELOW the persistent V2TopBar so the
// masthead stays put during chunk streams. The outer sticky header (rendered
// in <AppShell/> above <Suspense/>) means the user never sees a blank page,
// just a shimmer under the bar.
function RouteFallback() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 48px)' }} aria-busy="true" />
  );
}

// Small helper: wrap a sport route in an error boundary so one broken sport
// never takes down the others. Per multi-sport build plan §2.3.
function Sport({ sport, sportLabel, children }) {
  return (
    <SportErrorBoundary sport={sport} sportLabel={sportLabel}>
      {children}
    </SportErrorBoundary>
  );
}

// Minimal fallback for Sentry's outermost error boundary. If the whole
// React tree explodes (rare; usually a bad deploy), give the user a way
// back to the home page without wiping the Vercel/Sentry diagnostics.
function GlobalErrorFallback() {
  return (
    <div style={{
      background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', padding: 24, fontFamily: 'var(--font-sans)', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Gibol lagi nggak enak badan.
      </h1>
      <p style={{ fontSize: 14, opacity: 0.8, maxWidth: 420, marginBottom: 20, lineHeight: 1.5 }}>
        Kami sudah dapat report-nya otomatis. Coba refresh — biasanya beres.
      </p>
      <a href="/" style={{ fontSize: 13, textDecoration: 'underline' }}>← Balik ke Home</a>
    </div>
  );
}

/**
 * Skip-to-content link, mounted as the first focusable element under
 * <AppProvider>. Lives as a separate component so it can read the
 * language from useApp() — the App() function itself is the provider
 * host and can't call useApp() directly.
 *
 * v0.16.0 (Phase 2 Sprint A) — replaces a hardcoded bilingual concat
 * "Langsung ke konten · Skip to content" with a single i18n-resolved
 * label. The visual treatment (.skip-link CSS) is unchanged.
 */
function SkipLink() {
  const { t } = useApp();
  return (
    <a href="#main" className="skip-link">
      {t('skipToContent')}
    </a>
  );
}

export default function App() {
  return (
    <SentryErrorBoundary fallback={<GlobalErrorFallback />}>
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter>
        <AnalyticsTracker />
        <ScrollToHash />
        {/* A11y — skip-to-content link. First focusable element in the
            tab order; becomes visible only when focused. Jumps past the
            persistent V2TopBar + SportNav so keyboard/screen-reader
            users can reach the page body in one keystroke instead of
            tabbing through the nav strip on every route.
            v0.16.0 (Phase 2 Sprint A) — was a hardcoded bilingual
            concat; now resolves from the i18n dict via the SkipLink
            child component (App is the AppProvider host, so it can't
            call useApp() itself — the child can). */}
        <SkipLink />
        {/* V2TopBar is rendered ONCE here — above <Suspense> — so the
            masthead persists across every route change. Pages push
            sub-row content (pickers, status strips) via
            src/lib/topbarSubrow.js; the bar subscribes and re-renders
            only itself. Navigating between sports no longer remounts
            the header, and chunk loading no longer blanks the page. */}
        <V2TopBar />
        {/* A11y — <main> landmark wraps every route so screen-reader
            users land here via the skip-link and VoiceOver landmark
            rotor jumps straight to the page body. tabIndex=-1 lets the
            skip-link focus target #main without making it a regular
            tab stop. */}
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* v0.57.0 — Phase E redesign: tri-state homeVariant flag.
                  homeVariant=0 (default) → <Home />          gateway grid
                  homeVariant=1           → <HomeV1 />        personalized feed
                  homeVariant=2           → <HomeV2 />        v4 redesign (live console + newsroom)
                Falls back to gateway on any unexpected value.
                Inactive variants tree-shaken via lazy() — only the
                active home's chunk loads. */}
            <Route path="/" element={
              homeVariant === 2 ? <HomeV2 /> :
              (homeVariant === 1 || UI.v2) ? <HomeV1 /> :
              <Home />
            } />

            {/* NBA — live sport (recovery baseline) */}
            <Route path="/nba-playoff-2026" element={<Sport sport="nba" sportLabel="NBA Playoffs 2026"><NBADashboard /></Sport>} />
            {/* v0.12.1 Theme J seedling — must come BEFORE /:teamSlug
                catch-all so /game/:gameId routes correctly. */}
            <Route path="/nba-playoff-2026/game/:gameId" element={<Sport sport="nba" sportLabel="NBA Playoffs 2026"><NBAGameCenter /></Sport>} />
            <Route path="/nba-playoff-2026/:teamSlug" element={<Sport sport="nba" sportLabel="NBA Playoffs 2026"><TeamPage /></Sport>} />
            {/* legacy path used briefly while the NBA dashboard was at root */}
            <Route path="/nba" element={<Navigate to="/nba-playoff-2026" replace />} />

            {/* IBL stays under /ibl — the Home card is now Liga 1, but the
                /ibl route remains live so the existing coming-soon page and
                any previously-shared links still work. */}
            <Route path="/ibl" element={<Sport sport="ibl" sportLabel="IBL"><IBL /></Sport>} />

            {/* v0.2.0 — new sport stub routes. All use SportErrorBoundary so
                a broken F1 adapter (Phase 1) can't white-screen NBA. */}
            <Route path="/formula-1-2026" element={<Sport sport="f1" sportLabel="Formula 1 2026"><F1 /></Sport>} />
            <Route path="/formula-1-2026/race/:slug" element={<Sport sport="f1" sportLabel="Formula 1 2026"><F1Race /></Sport>} />
            <Route path="/formula-1-2026/team/:slug" element={<Sport sport="f1" sportLabel="Formula 1 2026"><F1Team /></Sport>} />
            <Route path="/formula-1-2026/driver/:slug" element={<Sport sport="f1" sportLabel="Formula 1 2026"><F1Driver /></Sport>} />
            <Route path="/premier-league-2025-26" element={<Sport sport="epl" sportLabel="Liga Inggris 2025-26"><EPL /></Sport>} />
            <Route path="/premier-league-2025-26/club/:slug" element={<Sport sport="epl" sportLabel="Liga Inggris 2025-26"><EPLClub /></Sport>} />
            <Route path="/fifa-world-cup-2026" element={<Sport sport="fifa_wc" sportLabel="Piala Dunia FIFA 2026"><FIFA /></Sport>} />
            {/* v0.13.0 — Indonesian Super League Phase 1A. New /super-league-2025-26
                is the live dashboard; legacy /liga-1-2026 is 308-redirected via
                vercel.json so any prior crawl still resolves. The ComingSoon
                LigaIndonesia page stays as a fallback in case the redirect
                misses (defense in depth). */}
            <Route path="/super-league-2025-26" element={<Sport sport="liga_1_id" sportLabel="Super League Indonesia 2025-26"><SuperLeague /></Sport>} />
            <Route path="/super-league-2025-26/club/:slug" element={<Sport sport="liga_1_id" sportLabel="Super League Indonesia 2025-26"><SuperLeagueClub /></Sport>} />
            {/* v0.15.0 — derby landing page. Sport-generic route, single
                concrete slug today (persija-persib). Future derbies hang
                off the same path. */}
            <Route path="/derby/persija-persib" element={<Sport sport="liga_1_id" sportLabel="El Clasico Indonesia"><Derby /></Sport>} />
            <Route path="/liga-1-2026" element={<Sport sport="liga_1_id" sportLabel="Super League Indonesia"><LigaIndonesia /></Sport>} />

            {/* v0.5.0 — Tennis Phase 1A: hub, per-tournament SEO pages,
                and per-tour rankings landings (ATP / WTA). */}
            <Route path="/tennis" element={<Sport sport="tennis" sportLabel="Tenis 2026"><Tennis /></Sport>} />
            <Route path="/tennis/rankings/:tour" element={<Sport sport="tennis" sportLabel="Tenis 2026"><TennisRankings /></Sport>} />
            <Route path="/tennis/:slug" element={<Sport sport="tennis" sportLabel="Tenis 2026"><TennisTournament /></Sport>} />

            {/* NBA recap surface — per multi-sport build plan this becomes
                sport-generic eventually; for now it's NBA-only. */}
            <Route path="/recap" element={<Recap />} />
            <Route path="/recap/:date" element={<Recap />} />

            {/* v0.23.0 — Phase 1 ship #1. Content-engine preview articles.
                Sport-generic, slug-driven; the page reads
                /content/preview/{slug}.json at runtime. The prerender step
                emits one /preview/{slug}/index.html per file in
                public/content/preview/ so scrapers + AI crawlers see Bahasa
                meta + JSON-LD before JS runs. */}
            <Route path="/preview/:slug" element={<Preview />} />

            {/* v0.25.0 — Phase 1 ship #3. Post-match recaps.
                Path is /match-recap/:slug (NOT /recap/:slug) because
                the existing /recap/:date NBA landing would catch the
                slug param and mishandle it. Reads
                /content/recap/{slug}.json. Prerender emits
                /match-recap/{slug}/index.html with NewsArticle +
                SportsEvent JSON-LD. */}
            <Route path="/match-recap/:slug" element={<MatchRecap />} />

            {/* v0.28.0 — Phase 1 ship #7. Editorial dashboard for the
                manual-review queue. Read-only. noindex via SEO
                component. */}
            <Route path="/editor" element={<Editor />} />

            {/* v0.29.0 — Phase 1 ship #8. Weekly standings explainer.
                Slug shape: {league}-{season}-pekan-{N}. Reads
                /content/standings/{slug}.json. */}
            <Route path="/standings/:slug" element={<Standings />} />

            {/* v0.42.0 — Phase 2 ship #21. Evergreen team / player
                profiles. Slug shape: {sport-id}-{team-or-player}.
                Reads /content/team/{slug}.json (the json_writer's
                "team" type folder). NBA teams first; EPL / F1 /
                tennis follow on the same route. */}
            <Route path="/profile/:slug" element={<Profile />} />

            {/* v0.43.0 — Phase 2 ship #23. Head-to-head matchup
                explainers. Slug shape:
                {league}-{team-a}-vs-{team-b}-h2h (alphabetically
                sorted so order doesn't matter). Reads
                /content/h2h/{slug}.json. */}
            <Route path="/h2h/:slug" element={<H2H />} />

            <Route path="/about" element={<About />} />
            <Route path="/glossary" element={<Glossary />} />

            {/* Pick'em — bracket, private leagues, leaderboards. Auth pages
                (login + magic-link callback) and public share view live here.
                Private pages enforce auth via AuthProvider + navigate to
                /login?next=... when session is missing. */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* v0.12.5 — first-login favorites picker. Anon users get
                redirected to /login?next=/onboarding/teams from inside
                the page itself. */}
            <Route path="/onboarding/teams" element={<OnboardingTeams />} />
            {/* v0.12.9 — edit-favorites surface. Anon users redirect
                to /login?next=/settings/teams from inside the page. */}
            <Route path="/settings/teams" element={<SettingsTeams />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/bracket/new" element={<BracketNew />} />
            <Route path="/bracket/:id" element={<BracketEdit />} />
            <Route path="/bracket/:id/share" element={<BracketShare />} />
            <Route path="/league/new" element={<LeagueNew />} />
            <Route path="/league/:id/join" element={<LeagueJoin />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/leaderboard/:leagueId" element={<LeaderboardLeague />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </main>
        {/* v0.13.0 — site-wide cross-sport footer. Wrapped in its own
            Suspense so the chunk stream doesn't blank the page body
            while it loads; fallback is just empty space matching the
            footer's vertical footprint to avoid layout shift. */}
        <Suspense fallback={<div style={{ minHeight: 320 }} aria-hidden="true" />}>
          <SportFooter />
        </Suspense>
        {/* Mobile bottom-nav — hidden on ≥721 px via CSS. Reserves a
            60px bottom gutter on body so content never hides behind
            the fixed bar. Sprint 4 mobile craft pass. */}
        <MobileBottomNav />
        {/* ⌘K first-visit onboarding tooltip — points at the search
            pill on desktop, at the BottomNav search icon on mobile.
            Self-dismisses on user interaction, scroll, or 8s timeout;
            localStorage flag keeps it from returning. */}
        <SearchOnboardingTooltip />
        </BrowserRouter>
        {/* Vercel built-ins — Hobby plan includes both at no extra cost.
            SpeedInsights pipes real-user Core Web Vitals to the Vercel
            dashboard; Analytics adds privacy-friendly page visit counts.
            Both are no-ops in local dev. */}
        <SpeedInsights />
        <Analytics />
      </AppProvider>
    </HelmetProvider>
    </SentryErrorBoundary>
  );
}
