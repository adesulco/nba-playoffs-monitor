import { useEffect, useRef, useState } from 'react';

/**
 * Tennis scoreboard — ESPN undocumented tennis API via our edge proxy.
 *
 * Endpoints (per docs/tennis/01-data-sources.md):
 *   GET /api/proxy/espn/tennis/{tour}/scoreboard           — today, all tournaments
 *   GET /api/proxy/espn/tennis/{tour}/scoreboard?dates=YYYYMMDD
 *
 * Match shape (normalized):
 *   {
 *     id, status: 'live'|'pre'|'post'|'cancelled'|'walkover'|'retired',
 *     startUTC, tournamentName, tournamentId, round, surface,
 *     players: [{id,name,slug,seed,country}, {...}],
 *     sets:    [{p1,p2,tiebreak?}, ...],
 *     currentSet: int|null,
 *     server:  0|1|null,
 *     winner:  0|1|null,
 *     raw:     <original espn competition for escape hatch>
 *   }
 *
 * Refresh cadence: 15s when ANY match is live, 5min idle. Matches TTLs
 * recommended in 01-data-sources.md so we cache-hit 80%+ during slam days.
 */
export function useTennisScoreboard(tour = 'atp', options = {}) {
  const { date = null } = options;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const anyLiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const qs = date ? `?dates=${date.replace(/-/g, '')}` : '';
        const r = await fetch(`/api/proxy/espn/tennis/${tour}/scoreboard${qs}`);
        if (!r.ok) throw new Error(`scoreboard ${r.status}`);
        const json = await r.json();
        const normalized = normaliseEvents(json);
        if (!cancelled) {
          setMatches(normalized);
          anyLiveRef.current = normalized.some((m) => m.status === 'live');
          setUpdatedAt(new Date().toISOString());
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Adaptive interval — re-arm at 15s while live, 5min otherwise.
    let interval;
    function arm() {
      clearInterval(interval);
      interval = setInterval(() => {
        load().then(() => arm());
      }, anyLiveRef.current ? 15_000 : 5 * 60_000);
    }
    arm();
    return () => { cancelled = true; clearInterval(interval); };
  }, [tour, date]);

  return { matches, loading, error, updatedAt };
}

// ─── Normaliser ──────────────────────────────────────────────────────────────

function normaliseEvents(json) {
  const events = Array.isArray(json?.events) ? json.events : [];
  const out = [];
  for (const ev of events) {
    const tournamentName = ev?.name || ev?.shortName || '';
    const tournamentId = ev?.id || null;
    // v0.11.25 — ESPN's tennis scoreboard wraps matches inside
    // `event.groupings[].competitions[]` (one grouping per category:
    // men's singles, women's singles, men's doubles, women's doubles).
    // The earlier normaliser only walked `event.competitions[]` (the
    // shape ESPN uses for NBA / NFL / soccer) so tennis returned 0
    // matches even when ESPN was reporting 100+. Walk both shapes so
    // a future ESPN normalisation doesn't regress us either way.
    const groupings = Array.isArray(ev?.groupings) ? ev.groupings : [];
    for (const g of groupings) {
      const groupingName = g?.grouping?.displayName || g?.grouping?.slug || g?.displayName || null;
      const groupingSlug = g?.grouping?.slug || null;
      const comps = Array.isArray(g?.competitions) ? g.competitions : [];
      for (const c of comps) {
        out.push(normaliseCompetition(c, { tournamentName, tournamentId, groupingName, groupingSlug }));
      }
    }
    const comps = Array.isArray(ev?.competitions) ? ev.competitions : [];
    for (const c of comps) {
      out.push(normaliseCompetition(c, { tournamentName, tournamentId, groupingName: null, groupingSlug: null }));
    }
  }
  return out.filter(Boolean);
}

function normaliseCompetition(c, tournamentCtx) {
  if (!c) return null;
  const statusStr = (c?.status?.type?.state || '').toLowerCase(); // 'pre'|'in'|'post'
  const statusDetail = (c?.status?.type?.description || '').toLowerCase();
  let status = 'pre';
  if (statusStr === 'in') status = 'live';
  else if (statusStr === 'post') status = 'post';
  if (statusDetail.includes('walkover')) status = 'walkover';
  if (statusDetail.includes('retire')) status = 'retired';
  if (statusDetail.includes('cancel')) status = 'cancelled';

  const round = c?.round?.displayName || c?.notes?.[0]?.headline || null;

  const competitors = Array.isArray(c?.competitors) ? c.competitors : [];
  const players = competitors.map((comp) => ({
    id: comp?.id || comp?.athlete?.id || null,
    name: comp?.athlete?.displayName || comp?.athlete?.fullName || comp?.displayName || '',
    shortName: comp?.athlete?.shortName || comp?.athlete?.lastName || '',
    slug: playerSlugFromAthlete(comp?.athlete),
    seed: comp?.curatedRank?.current || comp?.seed || null,
    country: comp?.athlete?.flag?.alt || comp?.athlete?.country || null,
    countryCode: comp?.athlete?.flag?.href?.match(/\/([a-z]{2,3})\./i)?.[1] || null,
    winner: comp?.winner === true,
  }));

  // Sets — ESPN emits competitor.linescores as an array of per-set objects.
  const sets = [];
  const maxSets = Math.max(
    0,
    ...competitors.map((x) => (Array.isArray(x?.linescores) ? x.linescores.length : 0))
  );
  for (let i = 0; i < maxSets; i++) {
    const p1 = competitors[0]?.linescores?.[i];
    const p2 = competitors[1]?.linescores?.[i];
    if (!p1 && !p2) continue;
    sets.push({
      p1: p1?.value ?? null,
      p2: p2?.value ?? null,
      tiebreak: {
        p1: p1?.tiebreak ?? null,
        p2: p2?.tiebreak ?? null,
      },
    });
  }

  const serveSide = c?.situation?.hasPossession ? 0
    : (competitors?.[1]?.hasPossession ? 1 : null);

  const winnerIdx = competitors.findIndex((x) => x?.winner === true);

  return {
    id: c?.id || null,
    status,
    startUTC: c?.date || null,
    tournamentName: tournamentCtx.tournamentName,
    tournamentId: tournamentCtx.tournamentId,
    // v0.11.25 — carry grouping context so the LiveTicker can label
    // a match as "Men's Singles · 3R" or "Women's Doubles · QF".
    groupingName: tournamentCtx.groupingName || null,
    groupingSlug: tournamentCtx.groupingSlug || null,
    round,
    surface: c?.venue?.fullName ? null : null, // ESPN doesn't expose surface per-match; derived in UI
    players,
    sets,
    currentSet: sets.length > 0 ? sets.length - 1 : null,
    server: serveSide,
    winner: winnerIdx >= 0 ? winnerIdx : null,
    raw: c,
  };
}

function playerSlugFromAthlete(a) {
  if (!a) return null;
  const first = a.firstName || a.givenName || '';
  const last = a.lastName || a.familyName || '';
  const joined = `${first} ${last}`.trim();
  if (!joined) return null;
  return joined
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');
}
