/**
 * usePickemCompetition() — the active Pick'em competition for this user.
 *
 * Returns { competition, setCompetition }. competition is the full config
 * object from competitions.js (never null). setCompetition(key) persists
 * the choice to localStorage and re-renders consumers.
 *
 * Lives outside AppContext so the bundle cost (a small useState + listener)
 * only lands on Pick'em pages. Pick'em pages already mount their own
 * <AuthProvider>; we follow the same convention here.
 *
 * The provider is mounted once at <PickemRoot>; every Pick'em screen reads
 * via the hook. The seven hardcoded `COMPETITION = 'WC2026'` constants
 * across PredictingHub / FixtureDetail / Bracket / BracketTreeView /
 * Leaderboard / Grup / GrupCreate are replaced with this hook.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  COMPETITIONS,
  defaultCompetitionKey,
  getStoredCompetitionKey,
  setStoredCompetitionKey,
  resolveCompetition,
} from './competitions.js';

const PickemCompetitionContext = createContext(null);

export function PickemCompetitionProvider({ children }) {
  const [key, setKey] = useState(() => {
    return getStoredCompetitionKey() || defaultCompetitionKey();
  });

  // Listen for cross-tab changes — if the user picks NBA in tab 1, tab 2
  // should reflect the change next time it remounts the Pick'em root.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onStorage(e) {
      if (e.key !== 'gibol:pickem:competition') return;
      const next = e.newValue;
      if (next && COMPETITIONS[next]) setKey(next);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCompetition = useCallback((nextKey) => {
    if (!COMPETITIONS[nextKey]) return;
    setStoredCompetitionKey(nextKey);
    setKey(nextKey);
  }, []);

  const competition = resolveCompetition(key);

  const value = { competition, setCompetition };
  return (
    <PickemCompetitionContext.Provider value={value}>
      {children}
    </PickemCompetitionContext.Provider>
  );
}

export function usePickemCompetition() {
  const ctx = useContext(PickemCompetitionContext);
  if (!ctx) {
    // Defensive: if a screen renders outside the provider, fall back to the
    // resolved default rather than throwing. The Pick'em root mounts the
    // provider, but direct deep-links should still render something useful.
    return { competition: resolveCompetition(null), setCompetition: () => {} };
  }
  return ctx;
}
