import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/AppContext.jsx';
import Home from './pages/Home.jsx';
import NBADashboard from './pages/NBADashboard.jsx';
import IBL from './pages/IBL.jsx';
import FIFA from './pages/FIFA.jsx';
import AnalyticsTracker from './components/AnalyticsTracker.jsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nba-playoff-2026" element={<NBADashboard />} />
          {/* legacy path used briefly while the NBA dashboard was at root */}
          <Route path="/nba" element={<Navigate to="/nba-playoff-2026" replace />} />
          <Route path="/ibl" element={<IBL />} />
          <Route path="/fifa-world-cup-2026" element={<FIFA />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
