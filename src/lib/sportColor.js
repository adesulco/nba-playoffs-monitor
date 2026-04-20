/**
 * Shared theme-aware sport-accent resolver (step 4/9).
 *
 * Three components need the same lookup: SportIcon strokes, Chip bg/border,
 * Button bg/border. Instead of duplicating SPORT_COLOR_DARK/LIGHT in each
 * module, centralize here so adding a new sport is a one-file change.
 *
 * Dark variants are the lightened hexes that pass AA on --ink-1 parchment.
 * Light variants are the full brand hexes. These must stay in sync with the
 * --sport-* CSS vars in src/index.css; the vars drive large-surface bg tints
 * (card borders, hero gradients) where dark-theme lightening is not required.
 */

export const SPORT_COLOR_DARK = {
  nba: '#ff8795',
  f1:  '#ff8a8a',
  pl:  '#d7b5f5',
  wc:  '#a0c2ea',
  id:  '#ff9ea0',
};

export const SPORT_COLOR_LIGHT = {
  nba: '#c9082a',
  f1:  '#e10600',
  pl:  '#3d195b',
  wc:  '#326295',
  id:  '#c1272d',
};

/**
 * Resolve a theme-aware accent for a chip/button/icon.
 *
 * Order of preference:
 *   1. If a known `sportId` is given, pick from the theme-correct table.
 *   2. Else fall back to an explicit `accent` prop (raw hex).
 *   3. Else return undefined — caller must supply its own default.
 */
export function resolveSportColor({ theme, sportId, accent }) {
  if (sportId && SPORT_COLOR_DARK[sportId]) {
    return theme === 'light' ? SPORT_COLOR_LIGHT[sportId] : SPORT_COLOR_DARK[sportId];
  }
  return accent;
}
