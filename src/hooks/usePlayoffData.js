import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchChampionOdds,
  fetchMvpOdds,
  fetchScoreboard,
  fetchScoreboardRange,
  fetchPriceHistory,
} from '../lib/api.js';
import { FALLBACK_CHAMPION, FALLBACK_MVP } from '../lib/constants.js';

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
  const [champion, setChampion] = useState({
    odds: FALLBACK_CHAMPION,
    volume: 475900000,
    volume24h: 8400000,
    clobTokens: {},
  });
  const [mvp, setMvp] = useState(FALLBACK_MVP);
  const [games, setGames] = useState([]);
  const [gamesByDay, setGamesByDay] = useState({}); // 'YYYYMMDD' -> games[]
  const [sparklines, setSparklines] = useState({}); // team -> number[]
  const [lastUpdate, setLastUpdate] = useState(null);
  const [status, setStatus] = useState('connecting');
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

      setChampion({
        odds: newOdds,
        volume: champRes.value.volume,
        volume24h: champRes.value.volume24h,
        clobTokens: champRes.value.clobTokens,
      });
      successes++;
    } else {
      errs.champion = champRes.reason?.message || 'failed';
    }

    if (mvpRes.status === 'fulfilled') {
      setMvp(mvpRes.value);
      successes++;
    } else {
      errs.mvp = mvpRes.reason?.message || 'failed';
    }

    if (scoresRes.status === 'fulfilled') {
      setGames(scoresRes.value);
      successes++;
    } else {
      errs.scores = scoresRes.reason?.message || 'failed';
    }

    // 7-day window is supplementary — failures shouldn't affect main status.
    if (rangeRes.status === 'fulfilled') {
      setGamesByDay(rangeRes.value);
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
