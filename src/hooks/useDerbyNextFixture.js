import { useEffect, useState } from 'react';

/**
 * useDerbyNextFixture — finds the next Persija ↔ Persib match via
 * API-Football. Searches both team IDs (2445 = Persib, 2446 = Persija
 * — looked up at runtime) and returns the soonest fixture that hasn't
 * kicked off yet, plus the most recent finished one for the "last
 * meeting" header.
 *
 * v0.15.0. Resolves Persija's team id at runtime since we don't have
 * it pinned in the local clubs.js (only ESPN ids are stored there).
 */

const PERSIB_AF_ID = 2445; // verified via /teams?league=274 in v0.14.5
let persijaIdCache = null;

async function resolvePersijaId(season) {
  if (persijaIdCache) return persijaIdCache;
  const r = await fetch(`/api/proxy/api-football/teams?league=274&season=${season}`);
  if (!r.ok) return null;
  const json = await r.json();
  const list = Array.isArray(json?.response) ? json.response : [];
  const found = list.find((t) => /persija/i.test(t?.team?.name || ''));
  persijaIdCache = found?.team?.id || null;
  return persijaIdCache;
}

export function useDerbyNextFixture({ season = 2025 } = {}) {
  const [next, setNext] = useState(null);
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const persijaId = await resolvePersijaId(season);
        if (!persijaId) throw new Error('persija_id_not_found');

        // Pull all Persib fixtures for the season, then keep ones where
        // the opponent is Persija. Cheaper than two queries; the response
        // is small (≈34 rows in a Liga 1 season).
        const r = await fetch(
          `/api/proxy/api-football/fixtures?league=274&season=${season}&team=${PERSIB_AF_ID}`,
        );
        if (r.status === 401 || r.status === 403) throw new Error('unauthorized');
        if (!r.ok) throw new Error(`fixtures ${r.status}`);
        const json = await r.json();
        const all = Array.isArray(json?.response) ? json.response : [];
        const derbies = all.filter((f) => {
          const home = f?.teams?.home?.id;
          const away = f?.teams?.away?.id;
          return home === persijaId || away === persijaId;
        });

        const upcoming = derbies
          .filter((f) => ['NS', 'TBD', 'PST', '1H', 'HT', '2H', 'ET', 'P', 'BT', 'INT', 'LIVE'].includes(f?.fixture?.status?.short))
          .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
        const finished = derbies
          .filter((f) => ['FT', 'AET', 'PEN'].includes(f?.fixture?.status?.short))
          .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));

        if (!cancelled) {
          setNext(upcoming[0] || null);
          setLast(finished[0] || null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [season]);

  return { next, last, loading, error };
}
