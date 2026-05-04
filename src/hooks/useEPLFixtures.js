import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID } from '../lib/sports/epl/clubs.js';
import { readCache, writeCache } from '../lib/swrCache.js';

// v0.11.15 SWR key + TTL. Live fixtures tick every couple minutes —
// 2 min ceiling matches NBA scoreboard cadence. Cache key includes
// the date-window args so different consumers don't clobber.
function cacheKey(daysBack, daysFwd) {
  return `epl-fixtures-${daysBack}-${daysFwd}`;
}
const CACHE_TTL = 2 * 60 * 1000;

/**
 * EPL 2025-26 fixtures + recent results via ESPN scoreboard endpoint.
 *
 * Endpoint:
 *   GET /api/proxy/espn/soccer/eng.1/scoreboard?dates=YYYYMMDD-YYYYMMDD
 *
 * ESPN's scoreboard takes a date range. We fetch a 14-day window centered on
 * today — 7 days back for "Hasil terbaru", 7 days forward for "Jadwal minggu
 * ini". Good balance between coverage and payload size.
 *
 * Return shape:
 *   upcoming: [{ id, kickoffUtc, statusId, statusDetail, home, away }]
 *   recent:   [{ id, kickoffUtc, home, away, homeScore, awayScore, status }]
 *
 * Each side is { teamId, slug, name, shortName, logo, accent }.
 */

function ymd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function resolveSide(competitor) {
  const team = competitor?.team || {};
  const club = team.id ? CLUBS_BY_ESPN_ID[String(team.id)] : null;
  return {
    teamId: team.id ? String(team.id) : null,
    slug: club?.slug || null,
    name: club?.name || team.displayName || '',
    shortName: team.abbreviation || team.shortDisplayName || club?.name || '',
    logo: team.logo || null,
    accent: club?.accent || '#37003C',
    score: competitor?.score != null ? Number(competitor.score) : null,
    isHome: competitor?.homeAway === 'home',
    winner: competitor?.winner === true,
  };
}

export function useEPLFixtures({ daysBack = 7, daysFwd = 7 } = {}) {
  // v0.11.15 — SWR hydrate. The cache is window-scoped so Home's
  // 7/7 call and the EPL dashboard's 7/7 call share the same entry.
  const cached = readCache(cacheKey(daysBack, daysFwd), { ttlMs: CACHE_TTL });
  const [upcoming, setUpcoming] = useState(cached?.upcoming ?? []);
  const [recent, setRecent] = useState(cached?.recent ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const from = new Date(now.getTime() - daysBack * 86400000);
        const to = new Date(now.getTime() + daysFwd * 86400000);
        const url = `/api/proxy/espn/soccer/eng.1/scoreboard?dates=${ymd(from)}-${ymd(to)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`scoreboard ${res.status}`);
        const json = await res.json();
        const events = json?.events || [];

        const up = [];
        const rec = [];

        for (const ev of events) {
          const comp = ev?.competitions?.[0];
          if (!comp) continue;
          const [a, b] = comp.competitors || [];
          if (!a || !b) continue;
          const home = a.homeAway === 'home' ? resolveSide(a) : resolveSide(b);
          const away = a.homeAway === 'home' ? resolveSide(b) : resolveSide(a);
          const statusType = ev.status?.type?.state; // pre / in / post
          const kickoffUtc = ev.date;

          const base = {
            id: ev.id,
            kickoffUtc,
            statusDetail: ev.status?.type?.shortDetail || '',
            statusState: statusType,
            home,
            away,
          };

          if (statusType === 'post') {
            rec.push({ ...base, homeScore: home.score, awayScore: away.score });
          } else {
            up.push(base);
          }
        }

        up.sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc));
        rec.sort((a, b) => new Date(b.kickoffUtc) - new Date(a.kickoffUtc));

        if (!cancelled) {
          setUpcoming(up);
          setRecent(rec);
          writeCache(cacheKey(daysBack, daysFwd), { upcoming: up, recent: rec });
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
  }, [daysBack, daysFwd]);

  return { upcoming, recent, loading, error };
}
