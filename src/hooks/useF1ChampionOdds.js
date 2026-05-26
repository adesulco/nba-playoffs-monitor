import { useEffect, useState, useRef } from 'react';
import { fetchPolymarketEventOdds } from '../lib/api.js';
import { DRIVERS_2026, TEAMS_BY_ID } from '../lib/sports/f1/constants.js';

/**
 * F1 2026 Drivers' Championship odds — live from Polymarket Gamma API.
 *
 * Event slug: `2026-f1-drivers-champion`. ~32 markets, heavy volume
 * (verified 2026-04-21: $118M lifetime, $2M / 24h).
 *
 * Polymarket includes placeholder "Driver A / C / E / G / I" markets
 * for field spreads; the validateName filter drops them. Real driver
 * names differ slightly from our DRIVERS_2026 (e.g. "Carlos Sainz Jr."
 * vs "Carlos Sainz", "Kimi Antonelli" vs "Andrea Kimi Antonelli"), so
 * a small alias map joins Polymarket → our canonical metadata.
 */

// Polymarket display name → our DRIVERS_2026 `name`.
const NAME_ALIAS = {
  'Carlos Sainz Jr.': 'Carlos Sainz',
  'Kimi Antonelli': 'Andrea Kimi Antonelli',
  'Nico Hulkenberg': 'Nico Hülkenberg',
  'Sergio Perez': 'Sergio Pérez',
};

function canonicalize(name) {
  return NAME_ALIAS[name] || name;
}

// Accept any name that either matches one of our drivers OR a known
// Polymarket short form — but reject the "Driver A" placeholders.
const DRIVER_NAMES = new Set(DRIVERS_2026.map((d) => d.name));
const ALIAS_KEYS = Object.keys(NAME_ALIAS);
function isPlaceholder(name) {
  return /^Driver [A-Z]$/i.test(name) || /^Other\b/i.test(name);
}
function validateName(name) {
  if (isPlaceholder(name)) return false;
  const canon = canonicalize(name);
  return DRIVER_NAMES.has(canon) || ALIAS_KEYS.includes(name) ||
    // Also allow any single-person name not on our curated list (rookies
    // added mid-season that Polymarket surfaces before our constants.js
    // refresh). These render without an accent but still appear.
    /^[A-Za-zÀ-ÿ' -]+ [A-Za-zÀ-ÿ' -]+/.test(name.trim());
}

const DRIVERS_BY_NAME = Object.fromEntries(DRIVERS_2026.map((d) => [d.name, d]));

export function useF1ChampionOdds({ refreshMs = 60000 } = {}) {
  const [odds, setOdds] = useState([]);
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
        const res = await fetchPolymarketEventOdds('2026-f1-drivers-champion', {
          validateName,
        });
        if (cancelled) return;
        const enriched = res.odds.map((o) => {
          const canonicalName = canonicalize(o.name);
          const driver = DRIVERS_BY_NAME[canonicalName] || null;
          const team = driver ? TEAMS_BY_ID[driver.teamId] : null;
          const prior = prevPctRef.current[o.name];
          return {
            ...o,
            canonicalName,
            driver, // { code, slug, teamId, number } or null
            team,   // { id, short, accent, slug } or null
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
