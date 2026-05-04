import { useEffect, useState } from 'react';
import { readCache, writeCache } from '../lib/swrCache.js';

// v0.11.15 SWR. Tennis rankings update Mondays per ATP/WTA schedule —
// 6h cache aligns with the existing refresh interval so return visits
// paint the table immediately instead of waiting on ESPN's proxy.
function cacheKey(tour) { return `tennis-rankings-${tour}`; }
const CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * ATP + WTA singles rankings via ESPN's undocumented rankings endpoint.
 *
 * Endpoints (per docs/tennis/01-data-sources.md):
 *   GET /api/proxy/espn/tennis/atp/rankings
 *   GET /api/proxy/espn/tennis/wta/rankings
 *
 * Response returns rankings[0] = current singles ranking; we also extract
 * rankings[1] where present (doubles) to surface Indonesian doubles specialists.
 *
 * Refresh cadence: 6h. Rankings only update Mondays per tour publishing
 * schedule — a 6h TTL is conservative and keeps upstream load minimal.
 */
export function useTennisRankings(tour = 'atp') {
  const cached = readCache(cacheKey(tour), { ttlMs: CACHE_TTL });
  const [singles, setSingles] = useState(cached?.singles ?? []);
  const [doubles, setDoubles] = useState(cached?.doubles ?? []);
  const [updatedAt, setUpdatedAt] = useState(cached?.updatedAt ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/proxy/espn/tennis/${tour}/rankings`);
        if (!r.ok) throw new Error(`rankings ${r.status}`);
        const json = await r.json();
        const lists = Array.isArray(json?.rankings) ? json.rankings : [];
        const singlesList = lists.find(
          (x) => (x?.name || '').toLowerCase().includes('singles')
        ) || lists[0];
        const doublesList = lists.find(
          (x) => (x?.name || '').toLowerCase().includes('doubles')
        );
        const singlesRanks = normaliseRanks(singlesList?.ranks);
        const doublesRanks = normaliseRanks(doublesList?.ranks);
        if (!cancelled) {
          const nextUpdatedAt = singlesList?.lastUpdated || null;
          setSingles(singlesRanks);
          setDoubles(doublesRanks);
          setUpdatedAt(nextUpdatedAt);
          writeCache(cacheKey(tour), {
            singles: singlesRanks,
            doubles: doublesRanks,
            updatedAt: nextUpdatedAt,
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
    const id = setInterval(load, 6 * 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tour]);

  return { singles, doubles, updatedAt, loading, error };
}

function normaliseRanks(ranks) {
  if (!Array.isArray(ranks)) return [];
  return ranks.map((r) => {
    const a = r?.athlete || {};
    const fullName =
      a.displayName ||
      `${a.firstName || ''} ${a.lastName || ''}`.trim();
    return {
      current: Number(r?.current) || null,
      previous: Number(r?.previous) || null,
      trend: r?.trend || trendFromDelta(r?.current, r?.previous),
      points: Number(r?.points) || 0,
      name: fullName,
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      slug: playerSlug(a.firstName, a.lastName),
      country: a?.flag?.alt || a?.country || null,
      countryCode: a?.flag?.href?.match(/\/([a-z]{2,3})\./i)?.[1]?.toUpperCase() || null,
      athleteId: a?.id || null,
    };
  });
}

function trendFromDelta(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return '—';
  if (c < p) return `up${p - c}`;
  if (c > p) return `down${c - p}`;
  return '—';
}

// Mirror of constants.js playerSlug — kept local so this hook doesn't depend
// on the tennis module tree (cheaper code-split for the rankings page).
function playerSlug(firstName, lastName) {
  const norm = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '');
  return [norm(firstName), norm(lastName)].filter(Boolean).join('-');
}
