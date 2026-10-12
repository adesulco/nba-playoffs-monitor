import { useEffect, useState } from 'react';
import { CLUBS } from '../lib/sports/liga-1-id/clubs.js';

/**
 * Super League Indonesia 2025-26 Golden Boot via API-Football v3.
 *
 * v0.14.0 — closes the only ESPN gap for `idn.1`. ESPN doesn't expose
 * per-player stats for Indonesian leagues, so the v0.13.0 handover
 * deferred Top Scorer until API-Football Pro was budgeted. Now that
 * Ade has signed up for the $19/mo plan, we wire it.
 *
 * Endpoint:
 *   GET /api/proxy/api-football/topscorers?league=274&season=2025
 *
 * API-Football league IDs:
 *   274 = Indonesian Super League / Liga 1 (the league formerly
 *         known as BRI Liga 1)
 *
 * Cost shape (per the proxy's effectiveTtl): cached 60s by default
 * upstream, but top scorer board changes ONCE per matchday so we
 * also poll only every 10 min from the client. Combined with edge
 * cache, this is ~1 upstream request per 10 min during active hours
 * → well under the 7,500/day Pro plan budget.
 *
 * Graceful degradation: if API_FOOTBALL_KEY is unset on the server,
 * the proxy returns 401. Hook surfaces that as `error: 'unauthorized'`
 * and the caller renders a "API key not configured" placeholder
 * instead of failing the page render.
 *
 * Return shape:
 *   { scorers: [{ rank, goals, assists, appearances, name, photo,
 *                 team: { id, slug, name, accent } }],
 *     loading, error }
 */

// Match API-Football team name → our CLUBS registry. API-Football uses
// the longer, stadium-style names ("Persija Jakarta") while our CLUBS
// `name` field is the short ESPN form ("Persija"). Normalise via
// lowercase substring containment.
const NAME_INDEX = (() => {
  const idx = [];
  for (const c of CLUBS) {
    const tokens = [c.name, c.nameId, c.slug.replace(/-/g, ' ')]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    idx.push({ club: c, tokens });
  }
  return idx;
})();

function resolveClub(apiFootballTeamName) {
  if (!apiFootballTeamName) return null;
  const needle = String(apiFootballTeamName).toLowerCase();
  // Exact club name match first, then substring as a fallback (catches
  // "Bali United Pusam FC" → bali-united, "PSM Makassar" → psm-makassar).
  for (const { club, tokens } of NAME_INDEX) {
    if (tokens.includes(needle)) return club;
  }
  for (const { club, tokens } of NAME_INDEX) {
    if (tokens.some((t) => needle.includes(t) || t.includes(needle))) return club;
  }
  return null;
}

export function useSuperLeagueTopScorers({ season = 2025, limit = 10 } = {}) {
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // API-Football v3 endpoint is `/players/topscorers` — verified
        // via /status that the key + Pro plan are active. Bare
        // `/topscorers` returned 403 "endpoint does not exist".
        const res = await fetch(
          `/api/proxy/api-football/players/topscorers?league=274&season=${season}`,
        );
        if (res.status === 401 || res.status === 403) {
          throw new Error('unauthorized');
        }
        if (!res.ok) throw new Error(`topscorers ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.response) ? json.response : [];

        // API-Football returns a `statistics` array per player (one per
        // team they played for in the season — relevant for mid-season
        // transfers). Pick the entry with the highest `goals.total`.
        const normalized = list.slice(0, limit).map((row, i) => {
          const player = row?.player || {};
          const stats = Array.isArray(row?.statistics) ? row.statistics : [];
          const best = stats.reduce((acc, s) => {
            const g = Number(s?.goals?.total) || 0;
            return !acc || g > (Number(acc?.goals?.total) || 0) ? s : acc;
          }, null);
          const teamName = best?.team?.name || '';
          const club = resolveClub(teamName);
          return {
            rank: i + 1,
            goals: Number(best?.goals?.total) || 0,
            assists: Number(best?.goals?.assists) || 0,
            appearances: Number(best?.games?.appearences) || 0,
            name: player.name || `${player.firstname || ''} ${player.lastname || ''}`.trim(),
            photo: player.photo || null,
            team: {
              id: best?.team?.id ? String(best.team.id) : null,
              slug: club?.slug || null,
              name: club?.name || teamName,
              shortName: club?.name || teamName,
              accent: club?.accent || '#E2231A',
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
    // Top scorer changes ~once per matchday. 10 min poll + edge cache
    // keeps upstream cost negligible.
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [season, limit]);

  return { scorers, loading, error };
}
