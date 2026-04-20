import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './lib/AppContext.jsx';
import AnalyticsTracker from './components/AnalyticsTracker.jsx';
import SportErrorBoundary from './components/SportErrorBoundary.jsx';

// F21 — route-based code splitting. Each page becomes its own bundle so the
// home hero loads without pulling 300KB of dashboard logic, and vice versa.
// Home is eagerly imported since it's the root entry.
import Home from './pages/Home.jsx';

const NBADashboard = lazy(() => import('./pages/NBADashboard.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
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
const Recap = lazy(() => import('./pages/Recap.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Glossary = lazy(() => import('./pages/Glossary.jsx'));

// Minimal blank fallback — keeps layout shift near zero while the chunk streams.
function RouteFallback() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }} aria-busy="true" />
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

export default function App() {
  return (
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter>
        <AnalyticsTracker />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* NBA — live sport (recovery baseline) */}
            <Route path="/nba-playoff-2026" element={<Sport sport="nba" sportLabel="NBA Playoffs 2026"><NBADashboard /></Sport>} />
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
            <Route path="/liga-1-2026" element={<Sport sport="liga_1_id" sportLabel="Super League Indonesia"><LigaIndonesia /></Sport>} />

            {/* NBA recap surface — per multi-sport build plan this becomes
                sport-generic eventually; for now it's NBA-only. */}
            <Route path="/recap" element={<Recap />} />
            <Route path="/recap/:date" element={<Recap />} />

            <Route path="/about" element={<About />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </BrowserRouter>
      </AppProvider>
    </HelmetProvider>
  );
}
