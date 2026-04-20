import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID } from '../lib/sports/epl/clubs.js';

/**
 * EPL 2025-26 Golden Boot top scorers via ESPN's common leaders endpoint.
 *
 * Endpoint:
 *   GET /api/proxy/espn-common/soccer/eng.1/leaders?limit=10
 *
 * ESPN returns `categories[]` — we want the "goals" category. Each leader
 * entry has `athlete`, `value` (goals), and a `team` back-reference.
 *
 * Return shape:
 *   scorers: [{ rank, goals, name, headshot, team:{slug,name,accent} }]
 *
 * This polls slowly (every 5 min) — top scorer changes happen once per
 * match-day so there's no reason to burn proxy budget.
 */

export function useEPLScorers({ limit = 10 } = {}) {
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/proxy/espn-common/soccer/eng.1/leaders?limit=${limit * 2}`
        );
        if (!res.ok) throw new Error(`leaders ${res.status}`);
        const json = await res.json();

        const cats = json?.categories || json?.leaders?.categories || [];
        const goalsCat = cats.find(
          (c) =>
            c?.name === 'goals' ||
            c?.name === 'totalGoals' ||
            c?.abbreviation === 'G' ||
            c?.displayName?.toLowerCase?.().includes('goals')
        );
        const leaders = goalsCat?.leaders || [];

        const normalized = leaders.slice(0, limit).map((lead, i) => {
          const athlete = lead.athlete || {};
          const teamId = athlete.team?.id || lead.team?.id;
          const club = teamId ? CLUBS_BY_ESPN_ID[String(teamId)] : null;
          return {
            rank: i + 1,
            goals: Number(lead.value) || 0,
            name: athlete.displayName || athlete.fullName || '',
            shortName: athlete.shortName || athlete.lastName || '',
            headshot: athlete.headshot?.href || null,
            position: athlete.position?.abbreviation || '',
            team: {
              id: teamId ? String(teamId) : null,
              slug: club?.slug || null,
              name: club?.name || athlete.team?.displayName || '',
              shortName: athlete.team?.abbreviation || club?.name || '',
              accent: club?.accent || '#37003C',
            },
          };
        });

        if (!cancelled) {
          setScorers(normalized);
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
  }, [limit]);

  return { scorers, loading, error };
}
