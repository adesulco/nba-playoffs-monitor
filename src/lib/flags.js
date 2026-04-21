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
  tennis:     envFlag('VITE_FLAG_TENNIS_VISIBLE', true),
  fifa_wc:    envFlag('VITE_FLAG_FIFA_WC_VISIBLE', true),
  liga_1_id:  envFlag('VITE_FLAG_LIGA_1_ID_VISIBLE', true),
};

// Live status: is this sport's dashboard shipped and serving real data?
// If false, the route renders a ComingSoon page instead of the dashboard.
export const LIVE = {
  nba:        envFlag('VITE_FLAG_NBA', true),          // NBA is the recovery baseline
  f1:         envFlag('VITE_FLAG_F1', false),          // Phase 1 flips this
  epl:        envFlag('VITE_FLAG_EPL', false),         // Phase 2
  tennis:     envFlag('VITE_FLAG_TENNIS', true),       // v0.5.0 ships live
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

// v2 redesign flags — coexist with VISIBLE/LIVE (different question: UI variant
// vs. sport-live). All default false so Phase 1 foundation ships with zero
// visible change. Flip per-env via Vercel.
//
//   VITE_FLAG_UI_V2=1              → master gate for the v2 redesign
//   VITE_FLAG_CMD_CENTER=1         → V2 Command Center home
//   VITE_FLAG_TERMINAL_HOME=1      → V4 Terminal home
//   VITE_FLAG_PICKEM=1             → Pick'em MVP
//   VITE_FLAG_XG_PER_SHOT=1        → PL per-shot xG (vs totals-only fallback)
//   VITE_FLAG_TENNIS_PBP=1         → tennis point-by-point (vs set-score only)
//   VITE_FLAG_F1_TYRE_PIT=1        → F1 tyre age + pit window viz
//   VITE_FLAG_WC2026_TEASER=1      → WC2026 teaser page (no email capture)
//   VITE_FLAG_LIGA1_TEASER=1       → Liga 1 teaser page (no email capture)
export const UI = {
  // v0.6.3 — rolled back to FALSE. HomeV1 felt disconnected from the
  // sport dashboards (which still use v1 TopBar without search/theme),
  // creating a seam users noticed. Falling back to the gateway Home
  // while we finish migrating all sport dashboards to V2TopBar first.
  // Re-enable with VITE_FLAG_UI_V2=1 when the chrome is consistent.
  v2:            envFlag('VITE_FLAG_UI_V2', false),
  cmdCenter:     envFlag('VITE_FLAG_CMD_CENTER', false),
  terminalHome:  envFlag('VITE_FLAG_TERMINAL_HOME', false),
  pickem:        envFlag('VITE_FLAG_PICKEM', false),
  xgPerShot:     envFlag('VITE_FLAG_XG_PER_SHOT', false),
  tennisPbp:     envFlag('VITE_FLAG_TENNIS_PBP', false),
  f1TyrePit:     envFlag('VITE_FLAG_F1_TYRE_PIT', false),
  wc2026Teaser:  envFlag('VITE_FLAG_WC2026_TEASER', false),
  liga1Teaser:   envFlag('VITE_FLAG_LIGA1_TEASER', false),
};

export function isUiV2() {
  return !!UI.v2;
}

export const FLAGS = { VISIBLE, LIVE, UI, isLive, isVisible, isUiV2 };
export default FLAGS;
