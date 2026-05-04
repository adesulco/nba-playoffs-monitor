import { useState, useEffect } from 'react';
import { fetchInjuries } from '../lib/api.js';

/**
 * Pull the ESPN injury report. Refreshes every 5 min (injury state rarely changes faster).
 * Returns: { byTeam: { [abbr]: injury[] }, loading, error }
 *
 * v0.11.6 — accepts `{ enabled }` so callers can defer the fetch until
 * the Injuries panel scrolls into view (via useInView). When disabled,
 * the hook returns empty state and fires no network request.
 */
export function useInjuries({ enabled = true } = {}) {
  const [byTeam, setByTeam] = useState({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  return { byTeam, loading, error };
}
