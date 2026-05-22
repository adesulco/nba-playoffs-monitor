import { useEffect, useState } from 'react';

/**
 * Per-club Super League data — used by /super-league-2025-26/club/:slug.
 *
 * Calls two ESPN endpoints in parallel:
 *   /api/proxy/espn/soccer/idn.1/teams/{espnId}            — club metadata
 *   /api/proxy/espn/soccer/idn.1/teams/{espnId}/schedule   — fixtures + results
 *
 * Mirrors useEPLTeam — same return shape so SuperLeagueClub.jsx and
 * EPLClub.jsx can share helpers.
 */
export function useSuperLeagueTeam(espnId) {
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
          fetch(`/api/proxy/espn/soccer/idn.1/teams/${espnId}`),
          fetch(`/api/proxy/espn/soccer/idn.1/teams/${espnId}/schedule`),
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

        const { CLUBS_BY_ESPN_ID } = await import('../lib/sports/liga-1-id/clubs.js');

        const events = sJson?.events || [];
        // v0.62.5 — audit FUNC-007. Coerce a competitor score to a real
        // number ONLY when ESPN gave an inline scalar. The team SCHEDULE
        // endpoint returns competitor.score as a HATEOAS {$ref} object
        // (no inline value), and Number({$ref}) is NaN — which then
        // poisoned formResult + the results list. Non-numeric → null;
        // W/D/L is derived from the reliable winner/drawn booleans.
        const numScore = (v) => {
          const n = typeof v === 'number' ? v
            : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
          return Number.isFinite(n) ? n : null;
        };
        const fx = events.map((ev) => {
          const comp = ev?.competitions?.[0] || ev;
          const competitors = comp?.competitors || [];
          const us = competitors.find((c) => String(c.team?.id) === String(espnId));
          const them = competitors.find((c) => String(c.team?.id) !== String(espnId));
          const oppTeam = them?.team || {};
          const oppClub = oppTeam.id ? CLUBS_BY_ESPN_ID[String(oppTeam.id)] : null;
          // v0.62.5 — audit FUNC-007. ESPN's team schedule endpoint nests
          // status on the COMPETITION, not the event. Reading ev.status
          // yielded undefined for every fixture — which silently emptied
          // the form widget AND the results/upcoming lists. Read comp.
          const status = comp?.status?.type?.state; // pre / in / post
          return {
            id: ev.id,
            date: ev.date,
            isHome: us?.homeAway === 'home',
            opponentId: oppTeam.id ? String(oppTeam.id) : null,
            opponentSlug: oppClub?.slug || null,
            opponentName: oppClub?.name || oppTeam.displayName || '',
            opponentShortName: oppTeam.abbreviation || oppClub?.name || '',
            opponentAccent: oppClub?.accent || '#E2231A',
            status,
            statusDetail: comp?.status?.type?.shortDetail || '',
            ourScore: numScore(us?.score),
            theirScore: numScore(them?.score),
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
