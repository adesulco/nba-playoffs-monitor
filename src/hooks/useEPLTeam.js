import { useEffect, useState } from 'react';

/**
 * Fetch per-club data from ESPN for one EPL club — used by the per-club
 * SEO pages at /premier-league-2025-26/club/:slug.
 *
 * Calls three endpoints in parallel:
 *   /api/proxy/espn/soccer/eng.1/teams/{espnId}            — club metadata
 *   /api/proxy/espn/soccer/eng.1/teams/{espnId}/schedule   — fixtures + results
 *
 * Normalized shape:
 *   { info:{record,logo}, fixtures:[{id,date,opponentSlug,opponentName,opponentAccent,isHome,status,statusDetail,homeScore,awayScore}] }
 */
export function useEPLTeam(espnId) {
  const [info, setInfo] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!espnId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [tRes, sRes] = await Promise.all([
          fetch(`/api/proxy/espn/soccer/eng.1/teams/${espnId}`),
          fetch(`/api/proxy/espn/soccer/eng.1/teams/${espnId}/schedule`),
        ]);
        if (!tRes.ok) throw new Error(`team ${tRes.status}`);
        if (!sRes.ok) throw new Error(`schedule ${sRes.status}`);
        const [tJson, sJson] = await Promise.all([tRes.json(), sRes.json()]);

        const team = tJson?.team || {};
        const records = team.record?.items || [];
        const overall = records.find((r) => r.type === 'total') || records[0];
        const wins = overall?.stats?.find((s) => s.name === 'wins')?.value ?? null;
        const draws = overall?.stats?.find((s) => s.name === 'ties' || s.name === 'draws')?.value ?? null;
        const losses = overall?.stats?.find((s) => s.name === 'losses')?.value ?? null;
        const points = overall?.stats?.find((s) => s.name === 'points')?.value ?? null;
        const goalsFor = overall?.stats?.find((s) => s.name === 'pointsFor' || s.name === 'goalsFor')?.value ?? null;
        const goalsAgainst = overall?.stats?.find((s) => s.name === 'pointsAgainst' || s.name === 'goalsAgainst')?.value ?? null;

        const infoNormalized = {
          espnId: String(team.id || espnId),
          name: team.displayName || '',
          shortName: team.abbreviation || '',
          logo: team.logos?.[0]?.href || null,
          record: {
            wins, draws, losses, points, goalsFor, goalsAgainst,
            summary: overall?.summary || '',
          },
        };

        // Schedule: ESPN returns `events[]` with opponent in competitors[].
        // Import CLUBS_BY_ESPN_ID lazily so this file doesn't circular-import.
        const { CLUBS_BY_ESPN_ID } = await import('../lib/sports/epl/clubs.js');

        const events = sJson?.events || [];
        const fx = events.map((ev) => {
          const comp = ev?.competitions?.[0] || ev;
          const competitors = comp?.competitors || [];
          const us = competitors.find((c) => String(c.team?.id) === String(espnId));
          const them = competitors.find((c) => String(c.team?.id) !== String(espnId));
          const oppTeam = them?.team || {};
          const oppClub = oppTeam.id ? CLUBS_BY_ESPN_ID[String(oppTeam.id)] : null;
          const status = ev.status?.type?.state; // pre / in / post
          return {
            id: ev.id,
            date: ev.date,
            isHome: us?.homeAway === 'home',
            opponentId: oppTeam.id ? String(oppTeam.id) : null,
            opponentSlug: oppClub?.slug || null,
            opponentName: oppClub?.name || oppTeam.displayName || '',
            opponentShortName: oppTeam.abbreviation || oppClub?.name || '',
            opponentAccent: oppClub?.accent || '#37003C',
            status,
            statusDetail: ev.status?.type?.shortDetail || '',
            ourScore: us?.score != null ? Number(us.score) : null,
            theirScore: them?.score != null ? Number(them.score) : null,
            winner: us?.winner === true,
            drawn: status === 'post' && us?.winner === false && them?.winner === false,
          };
        });

        if (!cancelled) {
          setInfo(infoNormalized);
          setFixtures(fx);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [espnId]);

  return { info, fixtures, loading, error };
}
