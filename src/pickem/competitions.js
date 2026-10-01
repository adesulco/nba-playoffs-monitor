/**
 * Pick'em competition registry — THE single source (doc 17 §2.1).
 *
 * One sport = one row. Everything that used to carry its own copy reads
 * this: sport skins, the invite OG card, create-league validation, server
 * defaults, both backfill scripts and the workflow matrix (those read the
 * generated competitions.json; `npm run build` fails if it drifts —
 * scripts/check-registry.mjs). Adding a competition = one row here +
 * `node scripts/build-registry.mjs`, plus a feed adapter only when the
 * provider is new.
 *
 * Row contract:
 *   key              fixtures.league / pickem_rules.league / leagues.competition
 *   sport            skin key: 'bola' | 'basket' | 'motogp' | 'voli'
 *   season           '2026-27'
 *   label            { en, id }      labelShort { en, id }
 *   structure        'league' | 'tournament' | 'playoff-series'
 *   rounds           { unit: 'MW' | 'MD' | 'R' | 'W', count, startsAt? }
 *   features         { match, score, jagoan, bracket, survivor }
 *   window           { opensAt, closesAt }  (picks open / competition over)
 *   lock             { policy: 'kickoff', offsetMin }
 *   feed             { provider, code, mode: 'rolling' | 'window', status,
 *                      seasonType?, roundMap?, tricodeOverrides, nations?,
 *                      clubs?, seedSource?, from?, to? }
 *   teamsLeagueKey   teams.league for this competition's teams
 *   scoringTemplate  'santai' | 'standar' | 'sultan' (pickem_rules row seed)
 *
 * The derived legacy fields (label string, labelLong, shape, has*,
 * openAt/closeAt, sportAccent) keep every existing screen working; new
 * code should read the contract fields.
 */

const ESPN_FOOTBALL_KO = {
  'group-stage':     { stage: 'group', matchday: null },
  'round-of-32':     { stage: 'R32',   matchday: 4 },
  'round-of-16':     { stage: 'R16',   matchday: 5 },
  'quarterfinals':   { stage: 'QF',    matchday: 6 },
  'semifinals':      { stage: 'SF',    matchday: 7 },
  '3rd-place-match': { stage: '3rd',   matchday: 7 },
  'final':           { stage: 'final', matchday: 8 },
};

const ROWS = [
  {
    key: 'EPL-2026-27',
    sport: 'bola',
    season: '2026-27',
    label: { en: 'Premier League', id: 'Liga Inggris' },
    labelShort: { en: 'EPL', id: 'EPL' },
    labelLong: { en: 'Premier League 2026/27', id: 'Liga Inggris 2026/27' },
    structure: 'league',
    rounds: { unit: 'MW', count: 38 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: true },
    window: { opensAt: '2026-08-10T00:00:00Z', closesAt: '2027-05-30T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'eng.1', mode: 'rolling', status: 'live',
      tricodeOverrides: {},
      // One-time seed: fixturedownload has all 380 with RoundNumber = MW.
      seedSource: { provider: 'fixturedownload', url: 'https://fixturedownload.com/feed/json/epl-2026' },
      clubs: {
        'Arsenal': 'ARS', 'Aston Villa': 'AVL', 'Bournemouth': 'BOU', 'Brentford': 'BRE',
        'Brighton': 'BHA', 'Chelsea': 'CHE', 'Coventry': 'COV', 'Crystal Palace': 'CRY',
        'Everton': 'EVE', 'Fulham': 'FUL', 'Hull': 'HUL', 'Ipswich': 'IPS', 'Leeds': 'LEE',
        'Liverpool': 'LIV', 'Man City': 'MNC', 'Man Utd': 'MAN', 'Newcastle': 'NEW',
        "Nott'm Forest": 'NFO', 'Spurs': 'TOT', 'Sunderland': 'SUN',
      },
    },
    teamsLeagueKey: 'EPL-2026-27',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  {
    key: 'LIGA1-2026-27',
    sport: 'bola',
    season: '2026-27',
    label: { en: 'Super League', id: 'Super League' },
    labelShort: { en: 'Liga 1', id: 'Liga 1' },
    labelLong: { en: 'Super League Indonesia 2026/27', id: 'Super League Indonesia 2026/27' },
    structure: 'league',
    rounds: { unit: 'MW', count: 34 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: true },
    // Opens when the feed does: ESPN idn.1 has no 2026/27 data on
    // 2026-10-01 (calendar ends 2026-05-23). The cron creates matchweeks
    // from ESPN the moment they appear (feed.seedMode 'create').
    window: { opensAt: '2026-10-15T00:00:00Z', closesAt: '2027-06-15T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'idn.1', mode: 'rolling', status: 'pending',
      seedMode: 'create',
      // teams.tricode is global and three letters (teams_tricode_check):
      // ESPN 'BHA' collides with Brighton, 'PER' with Peru, and BALI / PSBS /
      // PSIM / SPFC are four letters. Verified against all 108 prod tricodes
      // on 2026-10-01.
      tricodeOverrides: { BHA: 'BHY', PER: 'PJP', BALI: 'BLU', PSBS: 'BIA', PSIM: 'PSI', SPFC: 'SPD' },
      clubs: {
        'Arema Indonesia': 'ARC', 'Bali United': 'BLU', 'Bhayangkara Presisi': 'BHY',
        'Borneo FC': 'BOR', 'Dewa United': 'DEW', 'Madura United FC': 'MDR',
        'Malut United': 'MAL', 'PSBS Biak': 'BIA', 'PSIM Yogyakarta': 'PSI',
        'PSM Makassar': 'PSM', 'Persebaya Surabaya': 'PSS', 'Persib': 'PSB',
        'Persija': 'PSJ', 'Persijap': 'PJP', 'Persik Kediri': 'KED', 'Persis Solo': 'PSO',
        'Persita': 'PST', 'Semen Padang': 'SPD',
      },
    },
    teamsLeagueKey: 'LIGA1-2026-27',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  {
    key: 'NBA-2026-27',
    sport: 'basket',
    season: '2026-27',
    label: { en: 'NBA', id: 'NBA' },
    labelShort: { en: 'NBA', id: 'NBA' },
    labelLong: { en: 'NBA 2026/27', id: 'NBA 2026/27' },
    structure: 'league',
    // Regular season "pekan": Monday-anchored weeks from opening week.
    rounds: { unit: 'W', count: 25, startsAt: '2026-10-19T00:00:00Z' },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: false },
    window: { opensAt: '2026-10-12T00:00:00Z', closesAt: '2027-04-20T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'nba', mode: 'rolling', status: 'live', seasonType: 2,
      tricodeOverrides: { SA: 'SAS', NY: 'NYK', NO: 'NOP', GS: 'GSW', WSH: 'WAS', UTAH: 'UTA' },
    },
    teamsLeagueKey: 'NBA',
    scoringTemplate: 'standar',
    sportAccent: '#e8502e',
  },
  {
    key: 'AFF2026',
    sport: 'bola',
    season: '2026',
    label: { en: 'ASEAN Cup', id: 'Piala AFF' },
    labelShort: { en: 'AFF', id: 'AFF' },
    labelLong: { en: 'ASEAN Championship 2026', id: 'Piala AFF 2026' },
    structure: 'tournament',
    rounds: { unit: 'MD', count: 9 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: false },
    window: { opensAt: '2026-07-21T00:00:00Z', closesAt: '2026-08-27T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'aff.championship', mode: 'window', status: 'done',
      from: '2026-07-24', to: '2026-08-26',
      roundMap: {
        'group-stage': { stage: 'group', matchday: 'cluster' },
        'semifinals':  { stage: 'SF', legs: true, baseMatchday: 6 },
        'finals':      { stage: 'F',  legs: true, baseMatchday: 8 },
      },
      tricodeOverrides: { PHI: 'PHL' },
      nations: {
        CAM: 'Cambodia', SIN: 'Singapore', TLS: 'Timor-Leste', VIE: 'Vietnam', MYA: 'Myanmar',
        MAS: 'Malaysia', LAO: 'Laos', THA: 'Thailand', IDN: 'Indonesia', PHL: 'Philippines',
      },
    },
    teamsLeagueKey: 'AFF2026',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  {
    key: 'WC2026',
    sport: 'bola',
    season: '2026',
    label: { en: 'World Cup', id: 'Piala Dunia' },
    labelShort: { en: 'WC', id: 'PD' },
    labelLong: { en: 'FIFA World Cup 2026', id: 'Piala Dunia 2026' },
    structure: 'tournament',
    rounds: { unit: 'MD', count: 8 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: true },
    window: { opensAt: '2026-06-11T00:00:00Z', closesAt: '2026-07-20T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'fifa.world', mode: 'window', status: 'done',
      from: '2026-06-11', to: '2026-07-19',
      roundMap: ESPN_FOOTBALL_KO,
      tricodeOverrides: { POR: 'PRT' },
    },
    teamsLeagueKey: 'WC2026',
    scoringTemplate: 'standar',
    sportAccent: '#326295',
  },
  {
    key: 'NBA-Playoffs-2026',
    sport: 'basket',
    season: '2025-26',
    label: { en: 'NBA Playoffs', id: 'NBA Playoffs' },
    labelShort: { en: 'NBA PO', id: 'NBA PO' },
    labelLong: { en: 'NBA Playoffs 2026', id: 'NBA Playoff 2026' },
    structure: 'playoff-series',
    rounds: { unit: 'R', count: 4 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: false },
    window: { opensAt: '2026-04-18T00:00:00Z', closesAt: '2026-06-25T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'nba', mode: 'rolling', status: 'done', seasonType: 3,
      tricodeOverrides: { SA: 'SAS', NY: 'NYK', NO: 'NOP', GS: 'GSW', WSH: 'WAS', UTAH: 'UTA' },
    },
    teamsLeagueKey: 'NBA',
    scoringTemplate: 'standar',
    sportAccent: '#e8502e',
  },
];

// ── Derived legacy fields (keep existing screens working) ───────────────────
const LEGACY_SPORT = { bola: 'football', basket: 'nba', motogp: 'motogp', voli: 'volleyball' };

function withLegacy(row) {
  const shape = row.structure === 'playoff-series' ? 'playoff-series' : 'tournament-bracket';
  return Object.freeze({
    ...row,
    // legacy scalar label (Indonesian, as the old registry had it)
    labelText: row.label.id,
    legacySport: row.key === 'WC2026' ? 'fifa_wc' : LEGACY_SPORT[row.sport] || row.sport,
    shape,
    hasPredict: row.features.match,
    hasBracket: row.features.bracket,
    hasSurvivor: row.features.survivor,
    hasGrups: true,
    openAt: row.window.opensAt,
    closeAt: row.window.closesAt,
  });
}

/** key → row. Rows carry both the contract fields and the derived legacy ones. */
export const COMPETITIONS = Object.freeze(Object.fromEntries(
  ROWS.map((r) => {
    const full = withLegacy(r);
    // Old code reads `.label` as a string and `.sport` as 'football'/'nba'.
    // Keep those spellings on the object the screens already use, while
    // the contract fields stay available under explicit names.
    return [r.key, Object.freeze({
      ...full,
      label: r.label.id,
      labelI18n: r.label,
      sport: full.legacySport,
      sportKey: r.sport,
      labelLong: r.labelLong.id,
      labelLongI18n: r.labelLong,
    })];
  }),
));

/** Order used for the default-competition scan and any competition pills. */
export const COMPETITION_ORDER = ['EPL-2026-27', 'LIGA1-2026-27', 'NBA-2026-27', 'AFF2026', 'NBA-Playoffs-2026', 'WC2026'];

/** The rows the data pipeline should run for (feed not 'done'). */
export const ACTIVE_FEED_KEYS = ROWS.filter((r) => r.feed.status !== 'done').map((r) => r.key);

const STORAGE_KEY = 'gibol:pickem:competition';

/**
 * Default competition for a fresh visitor: first row (in COMPETITION_ORDER)
 * whose window covers now, else the most recently opened, else the first.
 * Pure given `now`; the server uses the same function via competitions.json.
 */
export function defaultCompetitionKey(now = new Date()) {
  return pickDefault(COMPETITIONS, COMPETITION_ORDER, now);
}

export function pickDefault(table, order, now = new Date()) {
  const t = now.getTime();
  for (const key of order) {
    const c = table[key];
    if (!c) continue;
    if (t >= new Date(c.openAt || c.window?.opensAt).getTime() && t <= new Date(c.closeAt || c.window?.closesAt).getTime()) return key;
  }
  let mostRecent = null, mostRecentTs = -Infinity;
  for (const key of order) {
    const c = table[key];
    if (!c) continue;
    const opens = new Date(c.openAt || c.window?.opensAt).getTime();
    if (opens <= t && opens > mostRecentTs) { mostRecent = key; mostRecentTs = opens; }
  }
  return mostRecent || order[0];
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
  if (typeof window === 'undefined' || !COMPETITIONS[key]) return;
  try { window.localStorage.setItem(STORAGE_KEY, key); } catch {}
}

/** Resolve to a competition row, never null. */
export function resolveCompetition(key) {
  if (key && COMPETITIONS[key]) return COMPETITIONS[key];
  return COMPETITIONS[defaultCompetitionKey()];
}

/** Plain-data mirror written to competitions.json (contract fields only). */
export function registryRows() {
  return ROWS.map((r) => JSON.parse(JSON.stringify(r)));
}
