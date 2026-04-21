import { useEffect, useState, useRef } from 'react';
import { fetchPolymarketEventOdds } from '../lib/api.js';
import { CLUBS_BY_NAME, CLUBS } from '../lib/sports/epl/clubs.js';

/**
 * Premier League 2025-26 champion odds — live from Polymarket Gamma API.
 *
 * Wraps the generic `fetchPolymarketEventOdds()` with an EPL-flavored
 * validateName filter that:
 *   1. Drops placeholder markets ("Club A" / "Club B" / "Other" etc.)
 *   2. Maps Polymarket's short names to our clubs.js CLUBS_BY_NAME map.
 *
 * Polling: 60s — Polymarket's lastTradePrice updates frequently enough
 * that a tighter poll would just burn proxy budget without improving UX.
 * If product wants live WebSocket ticks, wire `usePolymarketWS` with the
 * returned clobTokens map (parallels the NBA title-odds implementation).
 *
 * Polymarket market groupItemTitle values on this event (verified
 * 2026-04-21):
 *   Arsenal, Man City, Liverpool, Man United, Aston Villa, Chelsea,
 *   Tottenham, Newcastle, Brighton, West Ham, Everton, Fulham,
 *   Crystal Palace, Brentford, Wolves, Bournemouth, Nottm Forest,
 *   Leeds, Burnley, Sunderland
 *
 * Our CLUBS_BY_NAME uses the full canonical ESPN names (e.g. "Manchester
 * City", "Manchester United", "Nottingham Forest"). We alias-map the
 * Polymarket short forms → our canonical names below so downstream
 * consumers can join against our club metadata (accent color, slug,
 * handle, stadium, etc.).
 */

// Polymarket → canonical CLUBS_BY_NAME key
const NAME_ALIAS = {
  'Man City': 'Manchester City',
  'Man United': 'Manchester United',
  'Nottm Forest': 'Nottingham Forest',
  'Spurs': 'Tottenham Hotspur',
  'Tottenham': 'Tottenham Hotspur',
  'Newcastle': 'Newcastle United',
  'West Ham': 'West Ham United',
  'Wolves': 'Wolverhampton Wanderers',
  'Leeds': 'Leeds United',
  'Brighton': 'Brighton & Hove Albion',
  'Bournemouth': 'AFC Bournemouth',
};

function canonicalize(name) {
  return NAME_ALIAS[name] || name;
}

// Valid club names we accept (Polymarket shortforms OR canonical names)
const VALID_POLYMARKET_NAMES = new Set(
  CLUBS.map((c) => c.name).concat(Object.keys(NAME_ALIAS))
);

export function useEPLChampionOdds({ refreshMs = 60000 } = {}) {
  const [odds, setOdds] = useState([]); // [{ name, canonicalName, club, pct, change, yesTokenId }]
  const [volume, setVolume] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevPctRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetchPolymarketEventOdds('english-premier-league-winner', {
          validateName: (n) => VALID_POLYMARKET_NAMES.has(n),
        });
        if (cancelled) return;
        const enriched = res.odds.map((o) => {
          const canonicalName = canonicalize(o.name);
          const club = CLUBS_BY_NAME[canonicalName] || null;
          const prior = prevPctRef.current[o.name];
          return {
            ...o,
            canonicalName,
            club, // {slug, accent, espnId, ...} or null
            change: prior !== undefined ? o.pct - prior : 0,
          };
        });
        prevPctRef.current = Object.fromEntries(enriched.map((o) => [o.name, o.pct]));
        setOdds(enriched);
        setVolume(res.volume);
        setVolume24h(res.volume24h);
        setError(null);
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
  }, [refreshMs]);

  return { odds, volume, volume24h, loading, error };
}
