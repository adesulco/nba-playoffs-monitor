import { useState, useEffect, useRef } from 'react';
import { fetchGameSummary, fetchWinProbabilities } from '../lib/api.js';

/**
 * Poll ESPN summary + win-probability for a specific eventId.
 * Polls 10s when live, 60s when pre/post. Stops when eventId is null.
 */
export function useGameDetails(eventId) {
  const [summary, setSummary] = useState(null);
  const [winProb, setWinProb] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!eventId) {
      setSummary(null);
      setWinProb([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const [sum, prob] = await Promise.allSettled([
          fetchGameSummary(eventId),
          fetchWinProbabilities(eventId),
        ]);
        if (cancelled) return;

        if (sum.status === 'fulfilled') {
          setSummary(sum.value);
          setError(null);
        } else {
          setError(sum.reason?.message || 'summary failed');
        }

        if (prob.status === 'fulfilled') {
          setWinProb(prob.value);
        }

        setLastUpdate(new Date());

        // Re-poll faster for live games
        const s = sum.status === 'fulfilled' ? sum.value.statusState : null;
        const delay = s === 'in' ? 10000 : s === 'post' ? 60000 : 30000;
        timerRef.current = setTimeout(refresh, delay);
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message || e));
          timerRef.current = setTimeout(refresh, 30000);
        }
      }
    }

    refresh();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [eventId]);

  return { summary, winProb, error, lastUpdate };
}
