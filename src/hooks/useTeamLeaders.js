import { useState, useEffect } from 'react';
import { fetchTeamLeaders } from '../lib/api.js';

/**
 * Fetch ESPN team leaders (top players by points/rebs/asts) for a given team abbr.
 * Refreshes every 15 minutes.
 *
 * v0.11.6 — accepts `{ enabled }` so the Leaders panel can defer its
 * fetch until it scrolls into view. Combined with the existing
 * teamAbbr gate: fetch fires only when both a team is picked AND the
 * panel is visible.
 */
export function useTeamLeaders(teamAbbr, { enabled = true } = {}) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamAbbr || !enabled) {
      setLeaders([]);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchTeamLeaders(teamAbbr);
        if (!cancelled) {
          setLeaders(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [teamAbbr, enabled]);

  return { leaders, loading, error };
}
