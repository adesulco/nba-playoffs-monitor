import { useState, useEffect } from 'react';
import { fetchScoreboardForDate } from '../lib/api.js';

/**
 * Pull ESPN scoreboard for each date in [startIso..endIso] and reduce to a
 * map of "ABBR1|ABBR2" (sorted) -> { [ABBR1]: wins, [ABBR2]: wins, games: [ {date, winner} ] }
 *
 * Used to render "LEADS 2-1" / "TIED 1-1" / "SWEPT 4-0" watermarks on the Round 1 bracket.
 *
 * Caches once per day-set, refreshes every 10 min.
 */
export function useSeriesState(startIso = '2026-04-18', endIso = '2026-05-03') {
  const [seriesMap, setSeriesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const today = new Date();
    // Only query dates up to (and including) today — future dates have no results
    const until = today < end ? today : end;

    // Build YYYYMMDD list
    const dates = [];
    for (let d = new Date(start); d <= until; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}${m}${day}`);
    }

    if (dates.length === 0) {
      setSeriesMap({});
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const results = await Promise.allSettled(dates.map((d) => fetchScoreboardForDate(d)));
        if (cancelled) return;

        const map = {};
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          for (const g of r.value) {
            if (g.statusState !== 'post') continue;
            const a = g.away?.abbr;
            const h = g.home?.abbr;
            if (!a || !h) continue;
            const winner = g.home?.winner ? h : g.away?.winner ? a : null;
            if (!winner) continue;
            const key = [a, h].sort().join('|');
            if (!map[key]) map[key] = { [a]: 0, [h]: 0, games: [] };
            map[key][winner] = (map[key][winner] || 0) + 1;
            map[key].games.push({ date: g.date, winner });
          }
        }
        setSeriesMap(map);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10 * 60 * 1000); // refresh every 10 min

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [startIso, endIso]);

  return { seriesMap, loading, error };
}
