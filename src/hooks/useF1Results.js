import { useEffect, useState } from 'react';
import { SEASON } from '../lib/sports/f1/constants.js';

/**
 * F1 2026 per-round race results via Jolpica-F1.
 *
 * Endpoint: GET /api/proxy/jolpica-f1/{season}/results.json?limit=100
 *
 * Returns `resultsByRound` keyed by round number, each entry containing the
 * top 3 finishers (code, name, team, points). Used by the calendar dropdown
 * expand so fans can tap a past race and see who won without navigating away.
 *
 * Refresh cadence: 10 min — Jolpica's results update within an hour of the
 * chequered flag, so 10 min is more than enough and keeps the edge cache
 * warm without spamming.
 */
export function useF1Results() {
  const [resultsByRound, setResultsByRound] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/proxy/jolpica-f1/${SEASON}/results.json?limit=100`);
        if (!r.ok) throw new Error(`jolpica ${r.status}`);
        const json = await r.json();
        const races = json?.MRData?.RaceTable?.Races || [];
        const map = {};
        for (const race of races) {
          const round = Number(race.round);
          const results = (race.Results || []).slice(0, 3).map((res) => ({
            position: Number(res.position) || null,
            points: Number(res.points) || 0,
            code: res.Driver?.code || '',
            name: `${res.Driver?.givenName || ''} ${res.Driver?.familyName || ''}`.trim(),
            teamName: res.Constructor?.name || '',
            time: res.Time?.time || (res.status || ''), // finish time OR "DNF" etc.
            laps: Number(res.laps) || null,
          }));
          map[round] = {
            round,
            raceName: race.raceName,
            date: race.date,
            podium: results,
          };
        }
        if (!cancelled) {
          setResultsByRound(map);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { resultsByRound, loading, error };
}
