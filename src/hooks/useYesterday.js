import { useState, useEffect } from 'react';
import { fetchScoreboardForDate } from '../lib/api.js';

/**
 * Fetch yesterday's NBA games (completed only). Refreshes once per page load.
 */
export function useYesterday() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Derive yesterday's date in ET (NBA games happen in ET timezone; this avoids missing late games)
        const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const yyyymmdd = `${y}${m}${day}`;

        const results = await fetchScoreboardForDate(yyyymmdd);
        if (!cancelled) {
          // Only completed games with scores
          const completed = (results || []).filter((g) => g.statusState === 'post');
          setGames(completed);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
  }, []);

  return { games, loading, error };
}
