import { useState, useEffect } from 'react';
import { fetchInjuries } from '../lib/api.js';

/**
 * Pull the ESPN injury report. Refreshes every 5 min (injury state rarely changes faster).
 * Returns: { byTeam: { [abbr]: injury[] }, loading, error }
 */
export function useInjuries() {
  const [byTeam, setByTeam] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchInjuries();
        if (!cancelled) {
          setByTeam(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { byTeam, loading, error };
}
