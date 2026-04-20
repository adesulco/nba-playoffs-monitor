import { useEffect, useState } from 'react';
import { CALENDAR_2026, SEASON } from '../lib/sports/f1/constants.js';

/**
 * F1 season schedule, via Jolpica-F1 (Ergast successor) through our edge proxy.
 * Endpoint: GET https://api.jolpi.ca/ergast/f1/{season}.json
 *
 * Returns the full 2026 race calendar. Falls back to the hardcoded
 * CALENDAR_2026 in constants.js if Jolpica is unreachable — means the UI
 * always has a calendar to render, and the only thing affected by downtime
 * is whether FP/Quali/Sprint times are "official latest" or "our snapshot."
 *
 * Refresh cadence: hourly. Calendar changes once or twice a season at most.
 */
export function useF1Schedule() {
  const [races, setRaces] = useState(CALENDAR_2026);
  const [source, setSource] = useState('fallback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/proxy/jolpica-f1/${SEASON}.json`);
        if (!r.ok) throw new Error(`jolpica ${r.status}`);
        const json = await r.json();
        const raw = json?.MRData?.RaceTable?.Races;
        if (!Array.isArray(raw) || raw.length === 0) {
          throw new Error('jolpica: no races');
        }
        // Merge Jolpica data on top of our local slug/WIB metadata so we keep
        // the WIB start-time we pre-computed (Jolpica gives UTC only).
        const mergedByRound = {};
        CALENDAR_2026.forEach((gp) => { mergedByRound[gp.round] = gp; });
        for (const race of raw) {
          const round = Number(race.round);
          const base = mergedByRound[round] || {};
          mergedByRound[round] = {
            ...base,
            round,
            name: race.raceName || base.name,
            circuit: race.Circuit?.circuitName || base.circuit,
            country: race.Circuit?.Location?.country || base.country,
            dateISO: race.date || base.dateISO,
            utcTime: race.time ? race.time.slice(0, 5) : null, // "HH:MM" UTC
            // Keep WIB time + slug + sprint flag from our local snapshot.
            slug: base.slug,
            wibTime: base.wibTime,
            countryId: base.countryId,
            sprint: base.sprint,
          };
        }
        const merged = Object.values(mergedByRound).sort((a, b) => a.round - b.round);
        if (!cancelled) {
          setRaces(merged);
          setSource('jolpica');
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setSource('fallback');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60 * 60 * 1000); // hourly
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { races, source, loading, error };
}
