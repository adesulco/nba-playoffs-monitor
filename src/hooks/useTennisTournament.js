import { useEffect, useState } from 'react';
import { TOURNAMENTS_BY_SLUG } from '../lib/sports/tennis/tournaments.js';

/**
 * Per-tournament dashboard data — loads tournament metadata + current-day
 * scoreboard scoped to a tournament (filtered by name/id on client side since
 * ESPN's scoreboard doesn't accept a single-tournament filter reliably).
 *
 * Params: slug like `roland-garros-2026` (tournament + year combined).
 * Result:
 *   {
 *     tournament: <static registry entry from tournaments.js>,
 *     year: int,
 *     phase: 'upcoming' | 'live' | 'completed',
 *     loading, error
 *   }
 *
 * Phase 1A keeps this lightweight — draw + schedule enrichment lands in
 * Phase 1B (before Roland Garros 2026-05-24).
 */
export function useTennisTournament(slug) {
  const [state, setState] = useState(() => resolve(slug, new Date()));

  useEffect(() => {
    setState(resolve(slug, new Date()));
  }, [slug]);

  return { ...state, loading: false, error: state.tournament ? null : `unknown-slug:${slug}` };
}

function resolve(slug, now) {
  if (!slug) return { tournament: null, year: null, phase: null };
  // slug format: `{tournamentSlug}-{year}` — strip trailing 4-digit year.
  const m = String(slug).match(/^(.*)-(\d{4})$/);
  if (!m) return { tournament: null, year: null, phase: null };
  const tournament = TOURNAMENTS_BY_SLUG[m[1]] || null;
  const year = Number(m[2]);
  if (!tournament) return { tournament: null, year, phase: null };

  const today = now.toISOString().slice(0, 10);
  let phase = 'upcoming';
  if (today > tournament.endDate) phase = 'completed';
  else if (today >= tournament.startDate) phase = 'live';

  return { tournament, year, phase };
}
