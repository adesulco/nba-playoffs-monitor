import { useEffect, useState } from 'react';

/**
 * Super League match statistics via API-Football v3.
 *
 * v0.14.5 — clone of useEPLMatchStatistics retargeted to league=274
 * (Indonesian Super League). Same cross-API resolution: by date +
 * home/away team-name match. Same graceful 401/403 handling.
 *
 * Endpoints:
 *   GET /fixtures?league=274&season={yr}&date=YYYY-MM-DD
 *   GET /fixtures/statistics?fixture={id}
 *
 * Note: Indonesian Super League stats coverage on API-Football may
 * be sparser than EPL — some matches return only basic stats. The
 * hook returns whatever the API gives; the panel renders only
 * non-null fields.
 */
export function useSuperLeagueMatchStatistics({
  homeName,
  awayName,
  dateISO,
  isLive = false,
  enabled = true,
  season = 2025,
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
        const statsRes = await fetch(
          `/api/proxy/api-football/fixtures/statistics?fixture=${fixtureId}`,
        );
        if (!statsRes.ok) throw new Error(`statistics ${statsRes.status}`);
        const statsJson = await statsRes.json();
        const stats = Array.isArray(statsJson?.response) ? statsJson.response : [];

        const flatten = (entry) => {
          const out = {
            possession: null, shots: null, shotsOnTarget: null, xG: null,
            corners: null, fouls: null, yellow: null, red: null,
            passes: null, passAccuracy: null,
          };
          for (const s of (entry?.statistics || [])) {
            const t = String(s?.type || '').toLowerCase();
            const v = s?.value;
            if (t.includes('ball possession')) out.possession = parsePct(v);
            else if (t === 'shots on goal') out.shotsOnTarget = numOrNull(v);
            else if (t === 'total shots') out.shots = numOrNull(v);
            else if (t.includes('expected_goals') || t === 'expected goals') out.xG = floatOrNull(v);
            else if (t === 'corner kicks') out.corners = numOrNull(v);
            else if (t === 'fouls') out.fouls = numOrNull(v);
            else if (t === 'yellow cards') out.yellow = numOrNull(v);
            else if (t === 'red cards') out.red = numOrNull(v);
            else if (t === 'total passes') out.passes = numOrNull(v);
            else if (t === 'passes %') out.passAccuracy = parsePct(v);
          }
          return out;
        };

        const homeEntry = stats.find((s) => {
          const n = String(s?.team?.name || '').toLowerCase();
          return n.includes(needleHome) || needleHome.includes(n);
        });
        const awayEntry = stats.find((s) => {
          const n = String(s?.team?.name || '').toLowerCase();
          return n.includes(needleAway) || needleAway.includes(n);
        });

        if (!cancelled) {
          setData({
            home: homeEntry ? flatten(homeEntry) : null,
            away: awayEntry ? flatten(awayEntry) : null,
          });
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

function numOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function floatOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function parsePct(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const m = String(v).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}
