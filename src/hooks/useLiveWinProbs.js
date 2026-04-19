import { useEffect, useState, useRef } from 'react';
import { fetchWinProbabilities } from '../lib/api.js';

/**
 * Fetches the latest ESPN win probability for each live event in the input list.
 * ESPN's win-prob endpoint is the same public stream used by the LiveGameFocus
 * chart — we just grab the most recent point per game.
 *
 * Returns a map: { [eventId]: { homePct, awayPct, ts } } where homePct/awayPct
 * are in 0..1. Missing or failed events are absent from the map.
 *
 * Only polls for events with statusState === 'in' (live). Re-polls on a
 * 30s cadence synced with the main scoreboard.
 *
 * Rate-limit consideration: max ~4 concurrent live games in an NBA day
 * during peak (two early + two late). At 30s poll, that's ~8 req/min
 * against a public ESPN edge-cached endpoint. Well within polite use.
 */
export function useLiveWinProbs(events, pollMs = 30000) {
  const [probs, setProbs] = useState({});
  const lastIdsRef = useRef('');

  useEffect(() => {
    const liveEvents = (events || []).filter((e) => e && e.statusState === 'in');
    const ids = liveEvents.map((e) => e.id).filter(Boolean);
    const key = ids.join(',');

    // No live games → clear and bail.
    if (ids.length === 0) {
      if (lastIdsRef.current !== '') setProbs({});
      lastIdsRef.current = '';
      return;
    }

    lastIdsRef.current = key;
    let cancelled = false;

    async function run() {
      const results = await Promise.allSettled(ids.map((id) => fetchWinProbabilities(id)));
      if (cancelled) return;
      const next = {};
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value || r.value.length === 0) return;
        const latest = r.value[r.value.length - 1];
        if (latest.homePct === null || latest.homePct === undefined) return;
        next[ids[i]] = {
          homePct: latest.homePct,
          awayPct: 1 - latest.homePct,
          ts: Date.now(),
        };
      });
      setProbs(next);
    }

    run();
    const interval = setInterval(run, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [events, pollMs]);

  return probs;
}
