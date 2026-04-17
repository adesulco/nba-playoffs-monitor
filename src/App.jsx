import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './lib/AppContext.jsx';
import AnalyticsTracker from './components/AnalyticsTracker.jsx';

// F21 — route-based code splitting. Each page becomes its own bundle so the
// home hero loads without pulling 300KB of dashboard logic, and vice versa.
// Home is eagerly imported since it's the root entry.
import Home from './pages/Home.jsx';

const NBADashboard = lazy(() => import('./pages/NBADashboard.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
const IBL = lazy(() => import('./pages/IBL.jsx'));
const FIFA = lazy(() => import('./pages/FIFA.jsx'));
const Recap = lazy(() => import('./pages/Recap.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Glossary = lazy(() => import('./pages/Glossary.jsx'));

// Minimal blank fallback — keeps layout shift near zero while the chunk streams.
function RouteFallback() {
  return (
    <div style={{ background: '#08111f', minHeight: '100vh' }} aria-busy="true" />
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
            <Route path="/nba-playoff-2026" element={<NBADashboard />} />
            <Route path="/nba-playoff-2026/:teamSlug" element={<TeamPage />} />
            {/* legacy path used briefly while the NBA dashboard was at root */}
            <Route path="/nba" element={<Navigate to="/nba-playoff-2026" replace />} />
            <Route path="/ibl" element={<IBL />} />
            <Route path="/fifa-world-cup-2026" element={<FIFA />} />
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
