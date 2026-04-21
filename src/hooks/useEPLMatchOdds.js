import { useEffect, useState } from 'react';
import { CLUBS_BY_ESPN_ID } from '../lib/sports/epl/clubs.js';

/**
 * Per-match Polymarket odds for EPL fixtures. Single batched fetch via
 * Polymarket's tag_slug=epl endpoint — returns up to 100 event objects,
 * we filter to the 3-way-result ones and key them by our own match id.
 *
 * Why batched (one request for the whole dashboard) vs per-match probing:
 *   - Polymarket's Gamma API is rate-limited; one query returns all active
 *     EPL events (champion + per-match + total-corners + exact-score etc.).
 *   - Per-match probes would be O(n) requests and leak user browsing
 *     patterns onto Polymarket. One fetch, done.
 *   - The tag endpoint returns 100 events which comfortably covers the
 *     14-day fixture window useEPLFixtures queries.
 *
 * Polymarket slug pattern for per-match:
 *   epl-{homeAbbr}-{awayAbbr}-{YYYY-MM-DD}
 *
 * Where {homeAbbr} is Polymarket's 3-letter club code (see `polyAbbr` in
 * clubs.js) — note `mac` for Manchester City (not `mci`) and `wes` for
 * West Ham (not `whu`). We ignore variant slugs ending in
 * `-more-markets`, `-halftime-result`, `-exact-score`, etc.
 *
 * Returned shape:
 *   byMatchId: { [espnEventId]: { home: pct, draw: pct, away: pct, slug } }
 *
 * Lookup is O(1) — render side calls oddsByMatchId[match.id] for each
 * fixture row; null result = no market available for that match (common
 * for far-future fixtures or low-liquidity matches).
 */

const POLY_ENDPOINT = 'https://gamma-api.polymarket.com/events?tag_slug=epl&closed=false&limit=100';

// Slug variants we skip — we only care about the root 3-way (home/draw/away)
// market, not derivative market types.
const VARIANT_SUFFIXES = [
  '-more-markets',
  '-halftime-result',
  '-exact-score',
  '-total-corners',
  '-player-props',
  '-total-cards',
  '-both-teams-to-score',
];

function isRootMatchSlug(slug) {
  if (!slug || !slug.startsWith('epl-')) return false;
  for (const suf of VARIANT_SUFFIXES) if (slug.endsWith(suf)) return false;
  // Must match `epl-XXX-XXX-YYYY-MM-DD` exactly.
  return /^epl-[a-z]{3}-[a-z]{3}-\d{4}-\d{2}-\d{2}$/.test(slug);
}

// Parse a 3-way market: home / draw / away
function parseMatchMarkets(event) {
  const markets = event.markets || [];
  let home = null;
  let draw = null;
  let away = null;
  for (const m of markets) {
    const title = (m.groupItemTitle || m.question || '').trim();
    const price = parseFloat(m.lastTradePrice) || 0;
    const pct = Math.round(price * 100);
    if (/^Draw(\b| \()/i.test(title)) {
      draw = pct;
    } else if (home === null) {
      home = pct;
    } else {
      away = pct;
    }
  }
  if (home === null || draw === null || away === null) return null;
  return { home, draw, away };
}

// Match the Polymarket slug abbr+date back to our ESPN match id.
// Inputs:
//   - upcomingMatches: [{ id, kickoffUtc, home: {teamId}, away: {teamId} }]
//   - polymarketEvents: [{ slug, markets }]
function buildMatchIdIndex(upcomingMatches) {
  // Index clubs by polyAbbr for O(1) lookup
  const byPolyAbbr = {};
  for (const key in CLUBS_BY_ESPN_ID) {
    const club = CLUBS_BY_ESPN_ID[key];
    if (club?.polyAbbr) byPolyAbbr[club.polyAbbr] = club;
  }
  // Index our upcoming fixtures by "ymd:homeEspnId:awayEspnId"
  const byMatchKey = {};
  for (const m of upcomingMatches || []) {
    if (!m?.kickoffUtc || !m?.home?.teamId || !m?.away?.teamId) continue;
    const d = new Date(m.kickoffUtc);
    const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    byMatchKey[`${ymd}:${m.home.teamId}:${m.away.teamId}`] = m.id;
  }
  return { byPolyAbbr, byMatchKey };
}

export function useEPLMatchOdds({ upcomingMatches = [], refreshMs = 60000 } = {}) {
  const [byMatchId, setByMatchId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guard: no matches → don't waste a request.
    if (!upcomingMatches || upcomingMatches.length === 0) {
      setByMatchId({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(POLY_ENDPOINT);
        if (!res.ok) throw new Error(`Polymarket per-match: HTTP ${res.status}`);
        const events = await res.json();
        if (cancelled) return;

        const { byPolyAbbr, byMatchKey } = buildMatchIdIndex(upcomingMatches);
        const next = {};

        for (const ev of events || []) {
          const slug = (ev.slug || '').toLowerCase();
          if (!isRootMatchSlug(slug)) continue;

          // Slug: epl-XXX-YYY-YYYY-MM-DD. Parse.
          const parts = slug.split('-');
          if (parts.length !== 6) continue;
          const [, homeA, awayA, y, mo, d] = parts;
          const homeClub = byPolyAbbr[homeA];
          const awayClub = byPolyAbbr[awayA];
          if (!homeClub || !awayClub) continue;

          const ymd = `${y}-${mo}-${d}`;
          const key = `${ymd}:${homeClub.espnId}:${awayClub.espnId}`;
          const matchId = byMatchKey[key];
          if (!matchId) continue;

          const parsed = parseMatchMarkets(ev);
          if (!parsed) continue;

          next[matchId] = { ...parsed, slug };
        }

        if (!cancelled) {
          setByMatchId(next);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingMatches.map((m) => m.id).join(','), refreshMs]);

  return { byMatchId, loading, error };
}
