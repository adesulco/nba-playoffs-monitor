import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchScoreboard,
  fetchScoreboardRange,
} from '../lib/api.js';
import { readCache, writeCache } from '../lib/swrCache.js';

// v0.79.0 — the futures-odds provider strip (Komdigi de-risk 2026-05-23).
// Champion-odds / MVP-odds / sparkline state stripped — those were
// the futures-odds provider-sourced and the brand was blocked by Komdigi on
// 2026-05-22. The ESPN per-game win-prob chart on the game view stays
// (statistical model) and lives in a separate hook.
// This hook is now scoreboard-only.

const CACHE_KEYS = {
  games: 'nba-scoreboard',
  gamesByDay: 'nba-scoreboard-range',
};
const TTL = {
  games: 2 * 60 * 1000,       //  2 min
  gamesByDay: 5 * 60 * 1000,  //  5 min
};

// Build a 7-day window (today ±3) of Date objects for the day-tab scoreboard.
function buildWindow(anchor = new Date(), pastDays = 3, futureDays = 3) {
  const dates = [];
  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function usePlayoffData(refreshMs = 30000) {
  const [games, setGames] = useState(() =>
    readCache(CACHE_KEYS.games, { ttlMs: TTL.games }) ?? [],
  );
  const [gamesByDay, setGamesByDay] = useState(() =>
    readCache(CACHE_KEYS.gamesByDay, { ttlMs: TTL.gamesByDay }) ?? {},
  );
  const [lastUpdate, setLastUpdate] = useState(null);
  const hydratedFromCache = useRef(false);
  const [status, setStatus] = useState(() => {
    const hadGames = !!readCache(CACHE_KEYS.games, { ttlMs: TTL.games });
    if (hadGames) {
      hydratedFromCache.current = true;
      return 'stale';
    }
    return 'connecting';
  });
  const [errors, setErrors] = useState({ scores: null });

  const refresh = useCallback(async () => {
    const windowDates = buildWindow();
    const results = await Promise.allSettled([
      fetchScoreboard(),
      fetchScoreboardRange(windowDates),
    ]);
    const [scoresRes, rangeRes] = results;
    const errs = { scores: null };
    let successes = 0;

    if (scoresRes.status === 'fulfilled') {
      setGames(scoresRes.value);
      writeCache(CACHE_KEYS.games, scoresRes.value);
      successes++;
    } else {
      errs.scores = scoresRes.reason?.message || 'failed';
    }

    // 7-day window is supplementary — failures shouldn't affect main status.
    if (rangeRes.status === 'fulfilled') {
      setGamesByDay(rangeRes.value);
      writeCache(CACHE_KEYS.gamesByDay, rangeRes.value);
    }

    setErrors(errs);
    setLastUpdate(new Date());
    setStatus(successes === 0 ? 'error' : 'live');
  }, []);

  // Initial + interval polling
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  return { games, gamesByDay, lastUpdate, status, errors, refresh };
}
