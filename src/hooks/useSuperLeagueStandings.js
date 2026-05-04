import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID, CLUBS_BY_NAME } from '../lib/sports/liga-1-id/clubs.js';
import { readCache, writeCache } from '../lib/swrCache.js';

// SWR key + TTL — mirrors useEPLStandings.
const CACHE_KEY = 'superleague-standings';
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Indonesian Super League 2025-26 standings via ESPN's standings v2 endpoint.
 *
 * Endpoint:
 *   GET /api/proxy/espn-v2/soccer/idn.1/standings?season=2025
 *
 * Verified live 2026-04-26 — returns 18 entries with stats: points, wins,
 * ties, losses, gamesPlayed, pointsFor, pointsAgainst, pointDifferential,
 * rank. Same shape as eng.1, so this is a near-clone of useEPLStandings
 * with the league code swapped.
 *
 * Refresh cadence: 60s during a match-day. Edge proxy caches at s-maxage=300.
 */
const SEASON_YEAR = 2025;

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

export function useSuperLeagueStandings() {
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
          `/api/proxy/espn-v2/soccer/idn.1/standings?season=${SEASON_YEAR}`
        );
        if (!res.ok) throw new Error(`standings ${res.status}`);
        const json = await res.json();

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
            clubAccent: club?.accent || '#E2231A',
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
