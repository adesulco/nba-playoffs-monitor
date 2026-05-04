import { useEffect, useState } from 'react';

/**
 * Super League match lineups via API-Football v3.
 *
 * v0.14.5 — clone of useEPLMatchLineups retargeted to league=274.
 * Same date+team-name resolution. Returns { home, away } each with
 * formation, startXI (with jersey #, name, pos, grid), substitutes,
 * coach.
 */
export function useSuperLeagueMatchLineups({
  homeName, awayName, dateISO, isLive = false, enabled = true, season = 2025,
} = {}) {
  const [data, setData] = useState({ home: null, away: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !homeName || !awayName || !dateISO) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const ymd = String(dateISO).slice(0, 10);
        const fxRes = await fetch(
          `/api/proxy/api-football/fixtures?league=274&season=${season}&date=${ymd}`,
        );
        if (fxRes.status === 401 || fxRes.status === 403) throw new Error('unauthorized');
        if (!fxRes.ok) throw new Error(`fixtures ${fxRes.status}`);
        const fxJson = await fxRes.json();
        const fixtures = Array.isArray(fxJson?.response) ? fxJson.response : [];

        const needleHome = String(homeName).toLowerCase();
        const needleAway = String(awayName).toLowerCase();
        const fx = fixtures.find((f) => {
          const h = String(f?.teams?.home?.name || '').toLowerCase();
          const a = String(f?.teams?.away?.name || '').toLowerCase();
          return (
            (h.includes(needleHome) || needleHome.includes(h)) &&
            (a.includes(needleAway) || needleAway.includes(a))
          );
        });
        if (!fx) {
          if (!cancelled) {
            setData({ home: null, away: null });
            setError(null);
            setLoading(false);
          }
          return;
        }

        const fixtureId = fx?.fixture?.id;
        const lineupsRes = await fetch(
          `/api/proxy/api-football/fixtures/lineups?fixture=${fixtureId}`,
        );
        if (!lineupsRes.ok) throw new Error(`lineups ${lineupsRes.status}`);
        const lineupsJson = await lineupsRes.json();
        const lineups = Array.isArray(lineupsJson?.response) ? lineupsJson.response : [];

        const flatten = (entry) => {
          if (!entry) return null;
          return {
            teamName: entry?.team?.name || '',
            formation: entry?.formation || '',
            startXI: (entry?.startXI || [])
              .map((p) => p.player)
              .filter(Boolean)
              .map((p) => ({
                number: p.number ?? null,
                name: p.name || '',
                pos: p.pos || '',
                grid: p.grid || '',
              })),
            substitutes: (entry?.substitutes || [])
              .map((p) => p.player)
              .filter(Boolean)
              .map((p) => ({
                number: p.number ?? null,
                name: p.name || '',
                pos: p.pos || '',
              })),
            coach: entry?.coach
              ? { name: entry.coach.name, photo: entry.coach.photo }
              : null,
          };
        };

        const homeEntry = lineups.find((s) => {
          const n = String(s?.team?.name || '').toLowerCase();
          return n.includes(needleHome) || needleHome.includes(n);
        });
        const awayEntry = lineups.find((s) => {
          const n = String(s?.team?.name || '').toLowerCase();
          return n.includes(needleAway) || needleAway.includes(n);
        });

        if (!cancelled) {
          setData({ home: flatten(homeEntry), away: flatten(awayEntry) });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    let interval;
    if (isLive) interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [homeName, awayName, dateISO, isLive, enabled, season]);

  return { ...data, loading, error };
}
