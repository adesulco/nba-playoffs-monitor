/**
 * Sport registry — the single source of truth for every sport gibol.co covers.
 * See src/lib/sports/_types.js for the adapter shape contract. Per multi-sport
 * build plan §2.1.
 *
 * Consumers:
 *   - Home.jsx builds its card grid from this registry (filtered by flags.js).
 *   - scripts/prerender.mjs (post-build) iterates every adapter's
 *     prerenderRoutes() to emit per-route static HTML for scrapers.
 *   - Future phases register per-sport hooks / components under their own
 *     src/lib/sports/<slug>/ directory.
 *
 * Add a sport: (1) create src/lib/sports/<slug>/adapter.js, (2) import + register
 * it here, (3) add a route + lazy page in src/App.jsx. Do NOT skip the adapter.
 */

import nba from './nba/adapter.js';
import f1 from './f1/adapter.js';
import epl from './epl/adapter.js';
import tennis from './tennis/adapter.js';
import fifa from './fifa-wc-2026/adapter.js';
import liga1 from './liga-1-id/adapter.js';

// Ordered — this is the same order used on Home so we control card layout here.
// Tennis slots in after EPL per 6-card Home grid (v0.5.0 Phase 1A).
export const SPORTS = [nba, f1, epl, tennis, fifa, liga1];

export const SPORTS_BY_ID = SPORTS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

export function getSport(id) {
  return SPORTS_BY_ID[id];
}

export default SPORTS;
