import { useState, useEffect } from 'react';
import { fetchTeamLeaders } from '../lib/api.js';

/**
 * Fetch ESPN team leaders (top players by points/rebs/asts) for a given team abbr.
 * Refreshes every 15 minutes.
 */
export function useTeamLeaders(teamAbbr) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamAbbr) {
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
  }, [teamAbbr]);

  return { leaders, loading, error };
}
