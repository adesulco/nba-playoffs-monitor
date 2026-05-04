import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID, CLUBS_BY_NAME } from '../lib/sports/epl/clubs.js';
import { readCache, writeCache } from '../lib/swrCache.js';

// v0.11.15 SWR key + TTL. Standings shift at most every ~90 min
// during match-days, so 5 min is the right ceiling for cache re-serve.
const CACHE_KEY = 'epl-standings';
const CACHE_TTL = 5 * 60 * 1000;

/**
 * EPL 2025-26 standings via ESPN's `apis/v2/sports` standings endpoint
 * (proxied through /api/proxy/espn-v2). ESPN returns a "groups" array — for
 * the Premier League (eng.1) there's one group with 20 entries, each an
 * object keyed by `team` + `stats`.
 *
 * Endpoint:
 *   GET /api/proxy/espn-v2/soccer/eng.1/standings?season=2025
 *
 * Return shape (normalized for the UI):
 *   rows: [{
 *     rank, teamId, slug, clubName, clubAccent, games, wins, draws,
 *     losses, goalsFor, goalsAgainst, goalDiff, points, form  ( 'WDLWW' )
 *   }, ...]
 *
 * Refresh cadence: 60s during a match-day, standings rarely change faster.
 * The edge proxy caches at s-maxage=300 so 5 concurrent viewers ≈ 1 call.
 */
const SEASON_YEAR = 2025; // ESPN labels PL seasons by their August-start year

// ESPN stat names we care about. Different ESPN responses key by `name` or
// `abbreviation` — try both.
const STAT_KEYS = {
  games: ['gamesPlayed', 'GP'],
  wins: ['wins', 'W'],
  draws: ['ties', 'D', 'T'],
  losses: ['losses', 'L'],
  goalsFor: ['pointsFor', 'GF', 'goalsFor'],
  goalsAgainst: ['pointsAgainst', 'GA', 'goalsAgainst'],
  goalDiff: ['pointDifferential', 'GD', 'goalDifference'],
  points: ['points', 'P', 'PTS'],
  rank: ['rank'],
};

function pickStat(stats, wanted) {
  if (!Array.isArray(stats)) return null;
  const keys = STAT_KEYS[wanted] || [wanted];
  for (const s of stats) {
    if (keys.includes(s.name) || keys.includes(s.abbreviation) || keys.includes(s.shortDisplayName)) {
      // ESPN may give `value` (number) or `displayValue` (string).
      if (typeof s.value === 'number') return s.value;
      if (s.displayValue && !isNaN(Number(s.displayValue))) return Number(s.displayValue);
    }
  }
  return null;
}

function resolveClub(team) {
  const byId = team?.id ? CLUBS_BY_ESPN_ID[String(team.id)] : null;
  if (byId) return byId;
  const byName = team?.displayName ? CLUBS_BY_NAME[team.displayName] : null;
  return byName || null;
}

export function useEPLStandings() {
  // v0.11.15 — hydrate synchronously from SWR cache so return visits
  // paint the table on the first frame before the fetch round-trips.
  const [rows, setRows] = useState(() =>
    readCache(CACHE_KEY, { ttlMs: CACHE_TTL }) ?? [],
  );
  const [loading, setLoading] = useState(() => rows.length === 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/proxy/espn-v2/soccer/eng.1/standings?season=${SEASON_YEAR}`
        );
        if (!res.ok) throw new Error(`standings ${res.status}`);
        const json = await res.json();

        // ESPN shape: children[0].standings.entries[] OR standings.entries[]
        // depending on the endpoint variant — handle both.
        const entries =
          json?.children?.[0]?.standings?.entries ||
          json?.standings?.entries ||
          [];

        const normalized = entries.map((e) => {
          const club = resolveClub(e.team);
          const stats = e.stats || [];
          const points = pickStat(stats, 'points') ?? 0;
          const games = pickStat(stats, 'games') ?? 0;
          const wins = pickStat(stats, 'wins') ?? 0;
          const draws = pickStat(stats, 'draws') ?? 0;
          const losses = pickStat(stats, 'losses') ?? 0;
          const goalsFor = pickStat(stats, 'goalsFor') ?? 0;
          const goalsAgainst = pickStat(stats, 'goalsAgainst') ?? 0;
          const goalDiff = pickStat(stats, 'goalDiff') ?? (goalsFor - goalsAgainst);
          const rank = pickStat(stats, 'rank') ?? 0;

          // Form guide: ESPN sometimes includes a `form` stat on the entry.
          // Otherwise derive it from any recentResults string on the team.
          let form = e.team?.form || e.note?.recentResults || '';
          if (!form) {
            const formStat = (stats || []).find((s) => s.name === 'form' || s.type === 'form');
            if (formStat) form = formStat.displayValue || '';
          }

          return {
            rank,
            teamId: e.team?.id ? String(e.team.id) : null,
            slug: club?.slug || null,
            clubName: club?.name || e.team?.displayName || '',
            clubNameShort: e.team?.shortDisplayName || club?.name || '',
            clubAccent: club?.accent || '#37003C',
            games, wins, draws, losses,
            goalsFor, goalsAgainst, goalDiff,
            points,
            form: String(form || '').toUpperCase().replace(/[^WDL]/g, '').slice(-5),
          };
        });

        normalized.sort((a, b) => (a.rank || 99) - (b.rank || 99));

        if (!cancelled) {
          setRows(normalized);
          writeCache(CACHE_KEY, normalized);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { rows, loading, error };
}
