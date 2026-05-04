import { useEffect, useState } from 'react';

/**
 * Generic API-Football leaderboard hook — v0.14.3.
 *
 * One hook shared across leagues (EPL, Super League, future: La Liga,
 * Serie A, etc.) and across leaderboard types (top scorers, top
 * assists, top yellow/red cards if we ever surface them). Replaces
 * the per-league one-offs (useEPLScorers via ESPN, useSuperLeagueTopScorers
 * via API-Football).
 *
 * Why one hook for all of this:
 *   - Same response shape across `/players/topscorers` + `/players/topassists`
 *     (both return { player, statistics } pairs).
 *   - Same caching + polling profile (10 min — leaderboard changes
 *     once per matchday).
 *   - Same graceful-degradation contract (401/403 → `error: 'unauthorized'`).
 *   - Shared <LeaderboardPanel> renders both flavors with one toggle.
 *
 * Mapping API-Football team name → our local CLUBS registry happens
 * via a `resolveClub` callback the caller passes in (each sport's
 * club list is different so the mapping is sport-specific). The
 * panel uses the resolved club's `accent` + `slug` for visual
 * consistency.
 *
 * Endpoints:
 *   GET /api/proxy/api-football/players/topscorers?league={id}&season={yr}
 *   GET /api/proxy/api-football/players/topassists?league={id}&season={yr}
 *
 * Per-sport invocation:
 *   const { rows } = useApiFootballLeaderboard({
 *     league: 274,                      // Super League Indonesia
 *     season: 2025,
 *     type: 'goals',                    // or 'assists'
 *     resolveClub: resolveSuperLeagueClub, // (apiFootballTeamName) => CLUBS entry | null
 *   });
 *
 * Returns:
 *   { rows: [{ rank, primary, goals, assists, appearances, name,
 *              photo, team }],
 *     loading, error }
 *   primary = the value the leaderboard is ranked by (goals or assists)
 *             so the panel can render one canonical "headline number"
 *             column without knowing which type was queried.
 */
export function useApiFootballLeaderboard({
  league,
  season = 2025,
  type = 'goals',
  limit = 10,
  resolveClub,
} = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!league) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const path = type === 'assists' ? 'topassists' : 'topscorers';
        const res = await fetch(
          `/api/proxy/api-football/players/${path}?league=${league}&season=${season}`,
        );
        if (res.status === 401 || res.status === 403) {
          throw new Error('unauthorized');
        }
        if (!res.ok) throw new Error(`${path} ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.response) ? json.response : [];

        const normalized = list.slice(0, limit).map((row, i) => {
          const player = row?.player || {};
          const stats = Array.isArray(row?.statistics) ? row.statistics : [];
          // Player can have multiple stat blocks if they transferred
          // mid-season. Pick the one with the highest `goals.total` for
          // top-scorer or `goals.assists` for top-assist.
          const primaryKey = type === 'assists' ? 'assists' : 'total';
          const best = stats.reduce((acc, s) => {
            const v = Number(s?.goals?.[primaryKey]) || 0;
            return !acc || v > (Number(acc?.goals?.[primaryKey]) || 0) ? s : acc;
          }, null);
          const teamName = best?.team?.name || '';
          const club = resolveClub ? resolveClub(teamName) : null;
          const goals = Number(best?.goals?.total) || 0;
          const assists = Number(best?.goals?.assists) || 0;
          return {
            rank: i + 1,
            primary: type === 'assists' ? assists : goals,
            goals,
            assists,
            appearances: Number(best?.games?.appearences) || 0,
            name: player.name
              || `${player.firstname || ''} ${player.lastname || ''}`.trim(),
            photo: player.photo || null,
            team: {
              id: best?.team?.id ? String(best.team.id) : null,
              slug: club?.slug || null,
              name: club?.name || teamName,
              shortName: club?.name || teamName,
              accent: club?.accent || '#37003C',
            },
          };
        });

        if (!cancelled) {
          setRows(normalized);
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
  }, [league, season, type, limit, resolveClub]);

  return { rows, loading, error };
}
