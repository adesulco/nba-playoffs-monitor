import { useEffect, useState, useRef } from 'react';
import { fetchPolymarketEventOdds } from '../lib/api.js';
import { TENNIS_STARS_BY_SLUG } from '../lib/sports/tennis/constants.js';

/**
 * Grand Slam winner odds — live from Polymarket Gamma API.
 *
 * Takes a `tour` ('atp' | 'wta') and a `slamSlug` (Polymarket event
 * slug like '2026-mens-french-open-winner'). Returns the top markets
 * with player metadata joined from TENNIS_STARS_BY_SLUG when we have
 * a curated player.
 *
 * Verified markets (2026-04-22):
 *   · 2026-mens-french-open-winner   — 67 markets, $15.2M vol
 *   · 2026-womens-french-open-winner — 74 markets, $2.4M vol
 *
 * Names on Polymarket already use the diacritic form that matches our
 * constants (e.g. "Iga Świątek", "Karolína Muchová"), so no NAME_ALIAS
 * is needed — a simple slug join works.
 */

// Build a fast "name → slug" index once, lowercased for case-insensitive
// match-up. TENNIS_STARS entries store the canonical `name` with accents.
function buildNameToSlug() {
  const idx = {};
  for (const [slug, player] of Object.entries(TENNIS_STARS_BY_SLUG)) {
    if (player?.name) idx[player.name.toLowerCase()] = slug;
  }
  return idx;
}

const NAME_TO_SLUG = buildNameToSlug();

// Drop obvious placeholder markets. Polymarket sometimes lists
// "Player A" / "Field" type entries for field spreads.
function isPlaceholder(name) {
  return (
    /^player [A-Z]$/i.test(name) ||
    /^field$/i.test(name) ||
    /^other$/i.test(name)
  );
}

function validateName(name) {
  if (!name) return false;
  if (isPlaceholder(name)) return false;
  // Accept any "First Last" shaped string — lets us show outside-our-curated
  // players too (Fonseca, Fils, etc.). The join to metadata is best-effort.
  return /^[\p{L}\p{M}'’.\- ]+$/u.test(name.trim()) && name.trim().includes(' ');
}

export function useTennisSlamOdds(slamSlug, { refreshMs = 60000 } = {}) {
  const [odds, setOdds] = useState([]);
  const [volume, setVolume] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevPctRef = useRef({});

  useEffect(() => {
    if (!slamSlug) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetchPolymarketEventOdds(slamSlug, { validateName });
        if (cancelled) return;
        const enriched = res.odds.map((o) => {
          const slug = NAME_TO_SLUG[o.name.toLowerCase()] || null;
          const player = slug ? TENNIS_STARS_BY_SLUG[slug] : null;
          const prior = prevPctRef.current[o.name];
          return {
            ...o,
            slug,        // null if not in our curated list
            player,      // { slug, name, short, tour, ccode, accent } or null
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
  }, [slamSlug, refreshMs]);

  return { odds, volume, volume24h, loading, error };
}
