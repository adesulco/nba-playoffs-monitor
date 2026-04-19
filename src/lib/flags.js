/**
 * Per-sport feature flags — multi-sport build plan §2.3.
 *
 * Default: every non-NBA sport is "soon" (route lives, Home card says COMING SOON).
 * When a sport's phase ships, the adapter flips to live and the Home card becomes
 * a clickable LIVE tile. No env-var wrangling required for the normal path —
 * these flags only exist to let us kill a misbehaving sport in prod without
 * redeploying code.
 *
 * Env-var override (set in Vercel production env, NOT VITE_*_KEY — these are
 * UI-only toggles, safe to expose in the client bundle):
 *
 *   VITE_FLAG_NBA=0          → hide NBA card (e.g. during maintenance)
 *   VITE_FLAG_F1=1           → promote F1 from "soon" to visible LIVE status
 *   VITE_FLAG_EPL=1          → ditto
 *   VITE_FLAG_FIFA_WC=1      → ditto
 *   VITE_FLAG_LIGA_1_ID=1    → ditto
 *
 * The default logic: NBA is LIVE (the recovery baseline). Every other sport is
 * SOON unless explicitly promoted via its flag. Setting FLAG_*=0 hides the card
 * from Home (direct URL still works so we can test in prod).
 */

function envFlag(name, fallback) {
  const v = import.meta.env?.[name];
  if (v === undefined || v === null || v === '') return fallback;
  if (v === '0' || v === 'false' || v === false) return false;
  return true;
}

// Visibility: should the Home grid include this sport's card at all?
export const VISIBLE = {
  nba:        envFlag('VITE_FLAG_NBA', true),
  f1:         envFlag('VITE_FLAG_F1_VISIBLE', true),
  epl:        envFlag('VITE_FLAG_EPL_VISIBLE', true),
  fifa_wc:    envFlag('VITE_FLAG_FIFA_WC_VISIBLE', true),
  liga_1_id:  envFlag('VITE_FLAG_LIGA_1_ID_VISIBLE', true),
};

// Live status: is this sport's dashboard shipped and serving real data?
// If false, the route renders a ComingSoon page instead of the dashboard.
export const LIVE = {
  nba:        envFlag('VITE_FLAG_NBA', true),          // NBA is the recovery baseline
  f1:         envFlag('VITE_FLAG_F1', false),          // Phase 1 flips this
  epl:        envFlag('VITE_FLAG_EPL', false),         // Phase 2
  fifa_wc:    envFlag('VITE_FLAG_FIFA_WC', false),     // Phase 3
  liga_1_id:  envFlag('VITE_FLAG_LIGA_1_ID', false),   // Phase 4
};

// Convenience helper used by Home and adapters.
export function isLive(sportId) {
  return !!LIVE[sportId];
}

export function isVisible(sportId) {
  return !!VISIBLE[sportId];
}

export const FLAGS = { VISIBLE, LIVE, isLive, isVisible };
export default FLAGS;
