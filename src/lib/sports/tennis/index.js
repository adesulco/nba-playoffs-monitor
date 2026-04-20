/**
 * Tennis 2026 — module barrel (v0.5.0 Phase 1A).
 *
 * Re-exports the adapter (for sport registry consumption) and the key
 * constants most hooks + components will want. Components should import
 * symbols from this file rather than reaching into `./constants`, `./glossary`,
 * or `./tournaments` directly so the surface stays stable as Phase 2 grows.
 */

export { default as adapter, adapter as tennis } from './adapter.js';

export {
  SEASON,
  TOURS,
  TOUR_LABEL,
  INDONESIAN_PLAYERS,
  INDONESIAN_PLAYERS_BY_SLUG,
  formatTennisDate,
  formatTennisDateRange,
  daysUntil,
  humanRelativeDays,
  playerSlug,
} from './constants.js';

export {
  SEASON_YEAR,
  TOURNAMENTS_2026,
  TOURNAMENTS_BY_ID,
  TOURNAMENTS_BY_SLUG,
  TOURNAMENTS_BY_TIER,
  nextSlam,
  tournamentInProgress,
  tournamentPath,
} from './tournaments.js';

export {
  TENNIS_GLOSSARY,
  TENNIS_GLOSSARY_BY_ID,
  bahasaTerm,
  SURFACE_LABEL,
  TIER_LABEL,
  TIER_ORDER,
} from './glossary.js';

export { default } from './adapter.js';
