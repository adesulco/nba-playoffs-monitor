// ============================================================================
// v0.64.0 — Paper-grey sport descriptor + data-sport helper (P2 systems).
//
// Single source of truth for the six sport keys used by the paper-grey
// per-sport accent system. Set `data-sport="..."` on any subtree root and
// the handoff's --sport / --sport-deep / --sport-soft / --sport-wash retint
// the entire subtree (CSS lives in src/index.css under
// [data-brand="paper"] [data-sport="..."]).
//
// Keys match the handoff (nba / epl / liga1 / f1 / tennis / worldcup) and
// stay independent of the codebase's older --sport-nba / --sport-pl / etc.
// tokens, which are not part of the paper system. Hub slugs match the
// canonical URLs already shipped to production.
// ============================================================================

export const SPORT_META = {
  nba: {
    key: 'nba',
    label: 'NBA Playoffs',
    short: 'NBA',
    tag: 'NBA Playoffs 2026',
    hubPath: '/nba-playoff-2026',
  },
  epl: {
    key: 'epl',
    label: 'Liga Inggris',
    short: 'EPL',
    tag: 'Premier League 2025/26',
    hubPath: '/premier-league-2025-26',
  },
  liga1: {
    key: 'liga1',
    label: 'Super League',
    short: 'Liga 1',
    tag: 'Super League Indonesia 2025/26',
    hubPath: '/super-league-2025-26',
  },
  f1: {
    key: 'f1',
    label: 'Formula 1',
    short: 'F1',
    tag: 'Formula 1 2026',
    hubPath: '/formula-1-2026',
  },
  tennis: {
    key: 'tennis',
    label: 'Tenis',
    short: 'Tenis',
    tag: 'ATP / WTA 2026',
    hubPath: '/tennis',
  },
  worldcup: {
    key: 'worldcup',
    label: 'Piala Dunia',
    short: 'PD26',
    tag: 'FIFA World Cup 2026',
    hubPath: '/fifa-world-cup-2026',
  },
};

export const SPORT_KEYS = Object.keys(SPORT_META);

/**
 * Map a (current) sport identifier from the rest of the codebase onto a
 * paper-mode `data-sport` value. Accepts the older `--sport-*` short keys
 * (nba/pl/f1/tennis/wc/id), full slugs, common aliases, and the paper
 * keys themselves. Returns null when nothing matches so callers can
 * leave `data-sport` unset (falls back to --pulse).
 */
export function resolveSportKey(input) {
  if (!input) return null;
  const v = String(input).trim().toLowerCase();
  if (SPORT_META[v]) return v;
  const ALIASES = {
    // older codebase tokens
    pl: 'epl',
    wc: 'worldcup',
    id: 'liga1',
    'liga-1-id': 'liga1',
    fifa: 'worldcup',
    'fifa-world-cup': 'worldcup',
    'world-cup': 'worldcup',
    'premier-league': 'epl',
    'super-league': 'liga1',
    'nba-playoff': 'nba',
    'nba-playoffs': 'nba',
    'formula-1': 'f1',
    formula1: 'f1',
  };
  if (ALIASES[v]) return ALIASES[v];
  // path-style: pull the leading segment
  const seg = v.replace(/^\/+/, '').split('/')[0];
  if (SPORT_META[seg]) return seg;
  if (ALIASES[seg]) return ALIASES[seg];
  return null;
}
