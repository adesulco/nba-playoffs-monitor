import { useState, useEffect } from 'react';
import { fetchTeamSchedule } from '../lib/api.js';

// Cache results across hook instances to avoid refetching for the same team
const cache = new Map(); // abbr -> { at: ts, data: [] }
const TTL_MS = 15 * 60 * 1000;

/**
 * Fetch ESPN schedule for one team. Shared in-memory cache + 15-min TTL.
 */
export function useTeamSchedule(teamAbbr) {
  const [data, setData] = useState(() => cache.get(teamAbbr)?.data || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamAbbr) { setData([]); return; }

    const cached = cache.get(teamAbbr);
    if (cached && Date.now() - cached.at < TTL_MS) {
      setData(cached.data);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchTeamSchedule(teamAbbr)
      .then((events) => {
        if (cancelled) return;
        cache.set(teamAbbr, { at: Date.now(), data: events });
        setData(events);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [teamAbbr]);

  return { schedule: data, loading, error };
}

/**
 * Compute current streak (e.g., "W5", "L3", "W1") from completed games.
 * Uses completed games only, most recent first.
 */
export function computeStreak(schedule, teamAbbr) {
  if (!schedule || !teamAbbr) return null;
  const completed = schedule.filter((g) => g.isCompleted);
  if (completed.length === 0) return null;

  // Sort newest first
  completed.sort((a, b) => new Date(b.date) - new Date(a.date));

  let type = null; // 'W' or 'L'
  let count = 0;
  for (const g of completed) {
    const teamSide = g.home.abbr === teamAbbr ? g.home : g.away.abbr === teamAbbr ? g.away : null;
    if (!teamSide) continue;
    const won = !!teamSide.winner;
    const curr = won ? 'W' : 'L';
    if (type === null) {
      type = curr;
      count = 1;
    } else if (curr === type) {
      count++;
    } else {
      break;
    }
  }
  return type ? `${type}${count}` : null;
}

/**
 * Head-to-head: given two team abbrs and a schedule, return recent completed meetings.
 */
export function computeH2H(schedule, teamA, teamB, limit = 3) {
  if (!schedule || !teamA || !teamB) return [];
  return schedule
    .filter((g) => g.isCompleted && ((g.home.abbr === teamA && g.away.abbr === teamB) || (g.home.abbr === teamB && g.away.abbr === teamA)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}
