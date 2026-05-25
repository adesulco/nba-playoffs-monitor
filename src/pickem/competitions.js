/**
 * Pick'em competitions registry — v0.79.1 (2026-05-25)
 *
 * Pick'em was architected around the FIFA World Cup 2026 (group + KO + survivor
 * over an 8-matchday tournament) as its launch tentpole. The NBA Playoffs 2026
 * window opened first and we backfilled NBA-Playoffs-2026 fixtures
 * (commit 58233d9), so the SPA now runs both competitions in parallel.
 *
 * Each competition has a `shape` that gates which screens render:
 *   - `tournament-bracket`  — has group stage + KO + survivor (WC2026 shape)
 *   - `playoff-series`      — has best-of-7 KO rounds only (NBA shape)
 *
 * The current competition is selected at the Pick'em root via a small pill in
 * the chrome. Defaults are picked so a returning user with an old WC2026
 * session continues to land on WC2026 once it opens (June 11, 2026), while a
 * fresh visitor today lands on NBA. See `defaultCompetitionKey()` below.
 *
 * Adding a competition later (Liga 1, EPL, F1, Tennis) is a one-entry
 * addition here + a teams-table seed migration for that sport.
 */

export const COMPETITIONS = {
  'NBA-Playoffs-2026': {
    key: 'NBA-Playoffs-2026',
    label: 'NBA Playoffs',
    labelLong: 'NBA Playoffs 2026',
    sport: 'nba',
    sportAccent: '#e8502e',
    season: '2025-26',
    shape: 'playoff-series',
    // Match-prediction is always on. Bracket / Survivor / Grup are
    // tournament-shape features and don't apply to the NBA playoff bracket
    // in v1 — we render "Coming June 11" placeholders for them when the
    // user has NBA selected.
    hasPredict: true,
    hasBracket: false,   // NBA's bracket UI is the existing /nba-playoff-2026 page
    hasSurvivor: false,  // best-of-7 series doesn't fit the survivor-by-matchday loop
    hasGrups: true,      // grups (private leagues) work without bracket/survivor
    // Live window — used by defaultCompetitionKey() to pick the right
    // initial competition without asking the user to choose.
    openAt:  '2026-04-18T00:00:00Z',
    closeAt: '2026-06-25T00:00:00Z',
  },
  'WC2026': {
    key: 'WC2026',
    label: 'Piala Dunia',
    labelLong: 'FIFA World Cup 2026',
    sport: 'fifa_wc',
    sportAccent: '#326295',
    season: '2026',
    shape: 'tournament-bracket',
    hasPredict: true,
    hasBracket: true,
    hasSurvivor: true,
    hasGrups: true,
    openAt:  '2026-06-11T00:00:00Z',
    closeAt: '2026-07-20T00:00:00Z',
  },
};

export const COMPETITION_ORDER = ['NBA-Playoffs-2026', 'WC2026'];

const STORAGE_KEY = 'gibol:pickem:competition';

/**
 * Pick the right default for a fresh visitor:
 * - First competition whose [openAt, closeAt] window covers `now`
 * - Falls back to the first competition that's already opened (most recent)
 * - Falls back to the first registered entry
 */
export function defaultCompetitionKey(now = new Date()) {
  const t = now.getTime();
  for (const key of COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (!c) continue;
    const opens = new Date(c.openAt).getTime();
    const closes = new Date(c.closeAt).getTime();
    if (t >= opens && t <= closes) return key;
  }
  // No live window — fall back to the most recently opened competition
  let mostRecent = null;
  let mostRecentTs = -Infinity;
  for (const key of COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (!c) continue;
    const opens = new Date(c.openAt).getTime();
    if (opens <= t && opens > mostRecentTs) {
      mostRecent = key;
      mostRecentTs = opens;
    }
  }
  if (mostRecent) return mostRecent;
  return COMPETITION_ORDER[0];
}

export function getStoredCompetitionKey() {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && COMPETITIONS[v]) return v;
  } catch {}
  return null;
}

export function setStoredCompetitionKey(key) {
  if (typeof window === 'undefined') return;
  if (!COMPETITIONS[key]) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {}
}

/**
 * Resolve to a competition config object, never null. Used by every Pick'em
 * screen that previously read `const COMPETITION = 'WC2026'`.
 */
export function resolveCompetition(key) {
  if (key && COMPETITIONS[key]) return COMPETITIONS[key];
  return COMPETITIONS[defaultCompetitionKey()];
}
