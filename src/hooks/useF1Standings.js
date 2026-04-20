import { useEffect, useState } from 'react';
import { SEASON, TEAMS_BY_ID, DRIVERS_BY_CODE } from '../lib/sports/f1/constants.js';

/**
 * F1 2026 driver + constructor standings via Jolpica-F1 through our edge proxy.
 *
 * Endpoints:
 *   GET /api/proxy/jolpica-f1/{season}/driverStandings.json
 *   GET /api/proxy/jolpica-f1/{season}/constructorStandings.json
 *
 * Returns two arrays, each normalized into a shape the UI can render directly.
 * Before the first race of the season, Jolpica returns an empty StandingsList
 * — in that case we show "Belum ada balapan" state in the UI, not an error.
 *
 * Refresh cadence: 5 min. Jolpica-F1 updates within minutes of a race ending;
 * 5 min is a good balance between freshness and their rate limit.
 */
export function useF1Standings() {
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [dRes, cRes] = await Promise.all([
          fetch(`/api/proxy/jolpica-f1/${SEASON}/driverStandings.json`),
          fetch(`/api/proxy/jolpica-f1/${SEASON}/constructorStandings.json`),
        ]);
        if (!dRes.ok) throw new Error(`driver ${dRes.status}`);
        if (!cRes.ok) throw new Error(`constructor ${cRes.status}`);
        const [dJson, cJson] = await Promise.all([dRes.json(), cRes.json()]);

        const dList = dJson?.MRData?.StandingsTable?.StandingsLists?.[0];
        const cList = cJson?.MRData?.StandingsTable?.StandingsLists?.[0];

        const normalizedDrivers = (dList?.DriverStandings || []).map((s) => {
          const code = s.Driver?.code;
          const meta = code ? DRIVERS_BY_CODE[code] : null;
          return {
            position: Number(s.position) || null,
            points: Number(s.points) || 0,
            wins: Number(s.wins) || 0,
            code: code || s.Driver?.givenName?.[0] + s.Driver?.familyName?.slice(0, 2).toUpperCase(),
            name: meta?.name || `${s.Driver?.givenName || ''} ${s.Driver?.familyName || ''}`.trim(),
            number: Number(s.Driver?.permanentNumber) || meta?.number || null,
            teamId: meta?.teamId || null,
            teamName: s.Constructors?.[0]?.name || TEAMS_BY_ID[meta?.teamId]?.name || '',
            slug: meta?.slug || (s.Driver?.driverId || '').toLowerCase(),
          };
        });

        const normalizedTeams = (cList?.ConstructorStandings || []).map((s) => {
          const id = s.Constructor?.constructorId;
          const meta = id ? TEAMS_BY_ID[id] : null;
          return {
            position: Number(s.position) || null,
            points: Number(s.points) || 0,
            wins: Number(s.wins) || 0,
            id: id || null,
            name: meta?.name || s.Constructor?.name || '',
            short: meta?.short || s.Constructor?.name || '',
            accent: meta?.accent || '#888',
          };
        });

        if (!cancelled) {
          setDrivers(normalizedDrivers);
          setTeams(normalizedTeams);
          setRound(dList?.round ? Number(dList.round) : null);
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

  return { drivers, teams, round, loading, error };
}
