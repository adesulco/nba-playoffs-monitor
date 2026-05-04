import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchChampionOdds,
  fetchMvpOdds,
  fetchScoreboard,
  fetchScoreboardRange,
  fetchPriceHistory,
} from '../lib/api.js';
import { FALLBACK_CHAMPION, FALLBACK_MVP } from '../lib/constants.js';
import { readCache, writeCache } from '../lib/swrCache.js';

// v0.11.7 SWR keys + TTLs. Return visits paint from cache synchronously,
// then refresh in the background. TTLs are tuned to the natural pace of
// each endpoint: champion odds drift slowly outside trade windows,
// scoreboards are tighter, MVP picks only move once/week.
const CACHE_KEYS = {
  champion: 'nba-champion',
  mvp: 'nba-mvp',
  games: 'nba-scoreboard',
  gamesByDay: 'nba-scoreboard-range',
};
const TTL = {
  champion: 15 * 60 * 1000,   // 15 min
  mvp: 24 * 60 * 60 * 1000,   // 24 h
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
  // v0.11.7 — initial state hydrated from SWR cache synchronously so
  // return visits paint with the last known values on the very first
  // frame. Fallback constants only apply on first-ever visit (or after
  // the 15-min / 2-min / 5-min TTLs).
  const [champion, setChampion] = useState(() => {
    const cached = readCache(CACHE_KEYS.champion, { ttlMs: TTL.champion });
    if (cached) return cached;
    return {
      odds: FALLBACK_CHAMPION,
      volume: 475900000,
      volume24h: 8400000,
      clobTokens: {},
    };
  });
  const [mvp, setMvp] = useState(() =>
    readCache(CACHE_KEYS.mvp, { ttlMs: TTL.mvp }) ?? FALLBACK_MVP,
  );
  const [games, setGames] = useState(() =>
    readCache(CACHE_KEYS.games, { ttlMs: TTL.games }) ?? [],
  );
  const [gamesByDay, setGamesByDay] = useState(() =>
    readCache(CACHE_KEYS.gamesByDay, { ttlMs: TTL.gamesByDay }) ?? {},
  );
  const [sparklines, setSparklines] = useState({}); // team -> number[]
  const [lastUpdate, setLastUpdate] = useState(null);
  // v0.11.7 — if we hydrated from cache, status starts 'stale' (we have
  // data but are still revalidating) rather than 'connecting'. First-ever
  // visits keep 'connecting'.
  const hydratedFromCache = useRef(false);
  const [status, setStatus] = useState(() => {
    const hadGames = !!readCache(CACHE_KEYS.games, { ttlMs: TTL.games });
    const hadChamp = !!readCache(CACHE_KEYS.champion, { ttlMs: TTL.champion });
    if (hadGames || hadChamp) {
      hydratedFromCache.current = true;
      return 'stale';
    }
    return 'connecting';
  });
  const [errors, setErrors] = useState({ champion: null, mvp: null, scores: null });
  const prevOddsRef = useRef({});

  const refresh = useCallback(async () => {
    const windowDates = buildWindow();
    const results = await Promise.allSettled([
      fetchChampionOdds(),
      fetchMvpOdds(),
      fetchScoreboard(),
      fetchScoreboardRange(windowDates),
    ]);
    const [champRes, mvpRes, scoresRes, rangeRes] = results;
    const errs = { champion: null, mvp: null, scores: null };
    let successes = 0;

    if (champRes.status === 'fulfilled') {
      const newOdds = champRes.value.odds.map((o) => {
        const prior = prevOddsRef.current[o.name];
        return { ...o, change: prior !== undefined ? o.pct - prior : 0 };
      });
      prevOddsRef.current = Object.fromEntries(newOdds.map((o) => [o.name, o.pct]));

      const nextChampion = {
        odds: newOdds,
        volume: champRes.value.volume,
        volume24h: champRes.value.volume24h,
        clobTokens: champRes.value.clobTokens,
      };
      setChampion(nextChampion);
      writeCache(CACHE_KEYS.champion, nextChampion);
      successes++;
    } else {
      errs.champion = champRes.reason?.message || 'failed';
    }

    if (mvpRes.status === 'fulfilled') {
      setMvp(mvpRes.value);
      writeCache(CACHE_KEYS.mvp, mvpRes.value);
      successes++;
    } else {
      errs.mvp = mvpRes.reason?.message || 'failed';
    }

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
    setStatus(successes === 0 ? 'error' : successes < 3 ? 'stale' : 'live');
  }, []);

  // Initial + interval polling
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  // Fetch sparklines once clobTokens arrive (top 5 teams only)
  useEffect(() => {
    const topTokens = champion.odds.slice(0, 5).map((o) => ({ name: o.name, tokenId: o.yesTokenId }));
    if (topTokens.length === 0 || !topTokens[0].tokenId) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        topTokens.map(async ({ name, tokenId }) => {
          const history = await fetchPriceHistory(tokenId, '1w', 360);
          return [name, history.map((h) => h.p)];
        })
      );
      if (!cancelled) {
        setSparklines(Object.fromEntries(results));
      }
    })();
    return () => { cancelled = true; };
  }, [champion.clobTokens]);

  return { champion, mvp, games, gamesByDay, sparklines, lastUpdate, status, errors, refresh };
}
