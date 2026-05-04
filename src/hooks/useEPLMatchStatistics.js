import { useEffect, useState } from 'react';

/**
 * EPL match statistics via API-Football v3.
 *
 * v0.14.1 — adds possession %, shots, expected goals (xG), corners,
 * fouls, and yellow/red card counts to the live + post-match detail
 * panel that EPLDayScoreboard already opens on whole-card tap (Ship
 * v0.12.7). ESPN's /summary endpoint is rich on goals/cards/subs but
 * doesn't expose any of the above; API-Football fills the gap.
 *
 * Cross-API ID resolution: ESPN and API-Football don't share fixture
 * IDs. We resolve by date + team-name lookup:
 *   1. GET /fixtures?league=39&season=2025&date=YYYY-MM-DD  (5min cache)
 *   2. Find the entry where teams.home.name + teams.away.name match
 *      our scoreboard row (lowercase substring check).
 *   3. GET /fixtures/statistics?fixture={id}                (30s live, 5min final)
 *
 * The day-fixture list is shared across every match that day — so for
 * a 10-fixture matchday, opening any panel triggers ONE list fetch +
 * ONE statistics fetch (= 2 upstream requests per opened panel).
 *
 * API-Football league IDs:
 *   39  = Premier League
 *
 * Graceful degradation: if API_FOOTBALL_KEY isn't configured the
 * proxy returns 401/403; the hook surfaces `error: 'unauthorized'`
 * and the consumer renders nothing (the existing goals/cards/subs
 * panel is unaffected).
 *
 * Returns:
 *   { home: { possession, shots, shotsOnTarget, xG, corners, fouls,
 *             yellow, red, passes, passAccuracy },
 *     away: { ...same keys },
 *     loading, error }
 */
export function useEPLMatchStatistics({
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
        // Step 1 — list of EPL fixtures on the given date.
        // dateISO might be a full UTC ISO timestamp; pull the YYYY-MM-DD slice.
        const ymd = String(dateISO).slice(0, 10);
        const fxRes = await fetch(
          `/api/proxy/api-football/fixtures?league=39&season=${season}&date=${ymd}`,
        );
        if (fxRes.status === 401 || fxRes.status === 403) {
          throw new Error('unauthorized');
        }
        if (!fxRes.ok) throw new Error(`fixtures ${fxRes.status}`);
        const fxJson = await fxRes.json();
        const fixtures = Array.isArray(fxJson?.response) ? fxJson.response : [];

        // Match by lowercase substring containment of home + away.
        // API-Football uses long names ("Manchester United", "Wolverhampton
        // Wanderers"); the scoreboard sometimes carries the full name and
        // sometimes the short form. Token-based contains is robust to both.
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
          // No fixture match — typically pre-season friendlies on the
          // calendar, or a name that doesn't normalise. Empty result.
          if (!cancelled) {
            setData({ home: null, away: null });
            setError(null);
            setLoading(false);
          }
          return;
        }

        // Step 2 — statistics for the matched fixture.
        const fixtureId = fx?.fixture?.id;
        const statsRes = await fetch(
          `/api/proxy/api-football/fixtures/statistics?fixture=${fixtureId}`,
        );
        if (!statsRes.ok) throw new Error(`statistics ${statsRes.status}`);
        const statsJson = await statsRes.json();
        const stats = Array.isArray(statsJson?.response) ? statsJson.response : [];

        // API-Football returns one entry per team (home then away), each
        // with a `statistics` array of {type, value} pairs. Flatten into
        // a normalised object per side.
        const flatten = (entry) => {
          const out = {
            possession: null,
            shots: null,
            shotsOnTarget: null,
            xG: null,
            corners: null,
            fouls: null,
            yellow: null,
            red: null,
            passes: null,
            passAccuracy: null,
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
            else if (t === 'passes accurate') out.passesAccurate = numOrNull(v);
            else if (t === 'passes %') out.passAccuracy = parsePct(v);
          }
          return out;
        };

        // Resolve which entry is home vs away by team name.
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
    // Live games refresh stats every 60s; finalised games never re-poll.
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
  // "55%" → 55
  const m = String(v).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}
