import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID, SEASON } from '../lib/sports/epl/clubs.js';

/**
 * EPL 2025-26 Golden Boot top scorers via ESPN's core API.
 *
 * v0.60.7 — endpoint rewrite. Was hitting `/api/proxy/espn-common/soccer/eng.1/leaders`
 * which is the deprecated `site.web.api.espn.com/apis/common/v3/...` family.
 * That endpoint now returns 404 across the soccer league space, which left
 * the EPL hub's GOLDEN BOOT KPI showing "—" with source "ESPN" since the
 * ESPN cutover (audit ref item #5 / G).
 *
 * The replacement lives at:
 *   sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/seasons/{startYear}/types/1/leaders
 *
 * Same upstream that powers ESPN's web app. Two structural differences from
 * the old endpoint matter here:
 *
 *   1. Athletes + teams come back as HATEOAS $ref URLs, not inlined objects.
 *      We follow each top-N athlete $ref through the proxy to get the
 *      displayName/shortName/position. Team accent still comes from
 *      CLUBS_BY_ESPN_ID — we extract the team id from the team $ref path
 *      so we don't need a second team fetch.
 *
 *   2. Leader value is `value` (numeric) not `displayValue`. The site API
 *      used `value` directly; the core API does too — kept Number(...) coerce
 *      for safety.
 *
 * Cost: 1 leaders fetch + N athlete fetches per refresh, where N = limit.
 * The proxy edge-caches each (espn-core: 20s default), so the per-user
 * marginal cost on a warm cache is one document. Refresh interval kept at
 * 5 min — top scorer changes once per match-day, not faster.
 *
 * Return shape (unchanged):
 *   scorers: [{ rank, goals, name, shortName, headshot, position, team:{id,slug,name,shortName,accent} }]
 */

// EPL season is "2025-26" → ESPN keys season by start year ("2025").
const SEASON_START_YEAR = (SEASON || '').split('-')[0] || String(new Date().getFullYear());

const LEADERS_PATH =
  `/api/proxy/espn-core/soccer/leagues/eng.1/seasons/${SEASON_START_YEAR}/types/1/leaders`;

// $ref looks like:
//   http://sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/seasons/2025/athletes/253989?lang=en&region=us
// We turn it into:
//   /api/proxy/espn-core/soccer/leagues/eng.1/seasons/2025/athletes/253989
function refToProxyPath(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const m = ref.match(/sports\.core\.api\.espn\.com\/v2\/sports\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return `/api/proxy/espn-core/${m[1]}`;
}

// Pull the numeric ID from the tail of a $ref path (works for athletes + teams).
function refToId(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const m = ref.match(/\/(\d+)(?:\?|$)/);
  return m ? m[1] : null;
}

export function useEPLScorers({ limit = 10 } = {}) {
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(LEADERS_PATH);
        if (!res.ok) throw new Error(`leaders ${res.status}`);
        const json = await res.json();

        const cats = json?.categories || json?.leaders?.categories || [];
        const goalsCat = cats.find(
          (c) =>
            c?.name === 'goals' ||
            c?.name === 'goalsLeaders' ||
            c?.name === 'totalGoals' ||
            c?.abbreviation === 'G' ||
            c?.displayName?.toLowerCase?.().includes('goals')
        );
        const leaders = (goalsCat?.leaders || []).slice(0, limit);

        // Resolve athlete $refs in parallel via the proxy. Failures degrade
        // gracefully — a leader with an unresolvable name still contributes
        // to the list with team data, just no displayName.
        const athletes = await Promise.all(
          leaders.map(async (lead) => {
            const path = refToProxyPath(lead?.athlete?.$ref);
            if (!path) return null;
            try {
              const r = await fetch(path);
              if (!r.ok) return null;
              return await r.json();
            } catch (_) {
              return null;
            }
          })
        );

        const normalized = leaders.map((lead, i) => {
          const ath = athletes[i] || {};
          const teamId = refToId(lead?.team?.$ref);
          const club = teamId ? CLUBS_BY_ESPN_ID[String(teamId)] : null;
          return {
            rank: i + 1,
            goals: Number(lead.value) || 0,
            name: ath.displayName || ath.fullName || '',
            shortName: ath.shortName || ath.lastName || '',
            headshot: ath.headshot?.href || null,
            position: ath.position?.abbreviation || '',
            team: {
              id: teamId,
              slug: club?.slug || null,
              name: club?.name || '',
              shortName: club?.shortName || club?.name || '',
              accent: club?.accent || '#37003C',
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
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [limit]);

  return { scorers, loading, error };
}
