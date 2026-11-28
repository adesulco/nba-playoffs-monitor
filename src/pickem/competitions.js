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
  // ── Playoff Pick'em v3 Portfolio (2027–2028 Tentpoles, Decisions D1–D4) ───
  {
    key: 'M8-KO-2027',
    sport: 'mlbb',
    season: '2027',
    tier: 'playoff',
    topologyKey: 'M8-KO-2027',
    label: { en: 'M8 Knockout', id: 'M8 Knockout' },
    labelShort: { en: 'M8', id: 'M8' },
    labelLong: { en: 'M8 World Championship 2027 Knockouts', id: 'Fase Gugur M8 World Championship 2027' },
    structure: 'double-elim',
    rounds: { unit: 'R', count: 6 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-01-10T00:00:00Z', closesAt: '2027-01-25T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'manual', code: 'mlbb.m8', mode: 'window', status: 'upcoming',
      from: '2027-01-14', to: '2027-01-23',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'MLBB-M8',
    scoringTemplate: 'standar',
    sportAccent: '#C81E3A',
  },
  {
    key: 'ID-Masters-2027',
    sport: 'badminton',
    season: '2027',
    tier: 'playoff',
    topologyKey: 'ID-Masters-2027',
    label: { en: 'Indonesia Masters', id: 'Indonesia Masters' },
    labelShort: { en: 'IDM', id: 'IDM' },
    labelLong: { en: 'Indonesia Masters 2027 · BWF Super 500', id: 'Indonesia Masters 2027 · Istora' },
    structure: 'single-elim',
    rounds: { unit: 'R', count: 4 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-02-05T00:00:00Z', closesAt: '2027-02-15T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'manual', code: 'bwf.idmasters', mode: 'window', status: 'upcoming',
      from: '2027-02-09', to: '2027-02-14',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'BWF-2027',
    scoringTemplate: 'standar',
    sportAccent: '#1F7A3D',
  },
  {
    key: 'UCL-KO-2026-27',
    sport: 'bola',
    season: '2026-27',
    tier: 'playoff',
    topologyKey: 'UCL-KO-2026-27',
    label: { en: 'UCL Knockouts', id: 'Fase Gugur UCL' },
    labelShort: { en: 'UCL', id: 'UCL' },
    labelLong: { en: 'UEFA Champions League 2026/27 Knockouts', id: 'Fase Gugur UCL 2026/27 · Edisi Sahur' },
    structure: 'two-leg-ko',
    rounds: { unit: 'R', count: 5 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-02-12T00:00:00Z', closesAt: '2027-06-07T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'uefa.champions', mode: 'window', status: 'upcoming',
      from: '2027-02-16', to: '2027-06-05',
      roundMap: ESPN_FOOTBALL_KO,
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'UCL-2026-27',
    scoringTemplate: 'standar',
    sportAccent: '#1E3FBB',
  },
  {
    key: 'NBA-Playoffs-2027',
    sport: 'basket',
    season: '2026-27',
    tier: 'playoff',
    topologyKey: 'NBA-Playoffs-2027',
    label: { en: 'NBA Playoffs', id: 'NBA Playoff' },
    labelShort: { en: 'NBA PO', id: 'NBA PO' },
    labelLong: { en: 'NBA Playoffs 2027', id: 'NBA Playoff 2027' },
    structure: 'playoff-series',
    rounds: { unit: 'R', count: 4 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-04-13T00:00:00Z', closesAt: '2027-06-25T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'nba', mode: 'rolling', status: 'upcoming', seasonType: 3,
      tricodeOverrides: { SA: 'SAS', NY: 'NYK', NO: 'NOP', GS: 'GSW', WSH: 'WAS', UTAH: 'UTA' },
    },
    teamsLeagueKey: 'NBA',
    scoringTemplate: 'standar',
    sportAccent: '#E07B00',
  },
  {
    key: 'SUDIRMAN-2027',
    sport: 'badminton',
    season: '2027',
    tier: 'playoff',
    topologyKey: 'SUDIRMAN-2027',
    label: { en: 'Sudirman Cup', id: 'Piala Sudirman' },
    labelShort: { en: 'SUD', id: 'SUD' },
    labelLong: { en: 'BWF Sudirman Cup Finals 2027', id: 'Piala Sudirman 2027 · Beregu Campuran' },
    structure: 'tournament',
    rounds: { unit: 'MD', count: 6 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-04-18T00:00:00Z', closesAt: '2027-05-03T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'manual', code: 'bwf.sudirman', mode: 'window', status: 'upcoming',
      from: '2027-04-21', to: '2027-05-02',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'BWF-NATIONS',
    scoringTemplate: 'standar',
    sportAccent: '#1F7A3D',
  },
  {
    key: 'EPL-RUNIN-2027',
    sport: 'bola',
    season: '2026-27',
    tier: 'playoff',
    label: { en: 'EPL Title Run-In', id: 'Pekan Penentuan EPL' },
    labelShort: { en: 'EPL Final', id: 'EPL Final' },
    labelLong: { en: 'Premier League 2026/27 · Final 5 Weeks', id: '5 Pekan Penentuan EPL 2026/27' },
    structure: 'league',
    rounds: { unit: 'MW', count: 5 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: false },
    window: { opensAt: '2027-04-24T00:00:00Z', closesAt: '2027-05-30T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'eng.1', mode: 'rolling', status: 'upcoming',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'EPL-2026-27',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  {
    key: 'LIGA1-RUNIN-2027',
    sport: 'bola',
    season: '2026-27',
    tier: 'playoff',
    label: { en: 'Super League Run-In', id: 'Penentuan Super League' },
    labelShort: { en: 'SL Final', id: 'SL Final' },
    labelLong: { en: 'Super League Indonesia 2026/27 · Final 5 Weeks', id: '5 Pekan Penentuan Super League 2026/27' },
    structure: 'league',
    rounds: { unit: 'MW', count: 5 },
    features: { match: true, score: true, jagoan: true, bracket: false, survivor: false },
    window: { opensAt: '2027-04-25T00:00:00Z', closesAt: '2027-06-05T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'idn.1', mode: 'rolling', status: 'upcoming',
      tricodeOverrides: { BHA: 'BHY', PER: 'PJP', BALI: 'BLU', PSBS: 'BIA', PSIM: 'PSI', SPFC: 'SPD' },
    },
    teamsLeagueKey: 'LIGA1-2026-27',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  {
    key: 'ID-Open-2027',
    sport: 'badminton',
    season: '2027',
    tier: 'playoff',
    topologyKey: 'ID-Open-2027',
    label: { en: 'Indonesia Open', id: 'Indonesia Open' },
    labelShort: { en: 'IDO', id: 'IDO' },
    labelLong: { en: 'Indonesia Open 2027 · BWF Super 1000', id: 'Indonesia Open 2027 · Super 1000 Istora' },
    structure: 'single-elim',
    rounds: { unit: 'R', count: 4 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-05-24T00:00:00Z', closesAt: '2027-06-07T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'manual', code: 'bwf.idopen', mode: 'window', status: 'upcoming',
      from: '2027-05-27', to: '2027-06-06',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'BWF-2027',
    scoringTemplate: 'standar',
    sportAccent: '#1F7A3D',
  },
  {
    key: 'IBL-Playoffs-2027',
    sport: 'basket',
    season: '2027',
    tier: 'playoff',
    topologyKey: 'IBL-Playoffs-2027',
    label: { en: 'IBL Playoffs', id: 'Playoff IBL' },
    labelShort: { en: 'IBL PO', id: 'IBL PO' },
    labelLong: { en: 'IBL Indonesia 2027 Best-of-5 Playoffs', id: 'Playoff IBL 2027 · Best-of-5' },
    structure: 'playoff-series',
    rounds: { unit: 'R', count: 3 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-06-05T00:00:00Z', closesAt: '2027-07-25T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'manual', code: 'ibl.playoffs', mode: 'window', status: 'upcoming',
      from: '2027-06-10', to: '2027-07-20',
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'IBL-2027',
    scoringTemplate: 'standar',
    sportAccent: '#E07B00',
  },
  {
    key: 'AFC-ASIAN-CUP-2027',
    sport: 'bola',
    season: '2027-28',
    tier: 'playoff',
    topologyKey: 'AFC-ASIAN-CUP-2027',
    label: { en: 'Asian Cup', id: 'Piala Asia' },
    labelShort: { en: 'AFC', id: 'AFC' },
    labelLong: { en: 'AFC Asian Cup Saudi Arabia 2027 · Timnas Garuda', id: 'Piala Asia AFC 2027 · Timnas Garuda' },
    structure: 'tournament',
    rounds: { unit: 'MD', count: 7 },
    features: { match: true, score: true, jagoan: true, bracket: true, survivor: false },
    window: { opensAt: '2027-12-15T00:00:00Z', closesAt: '2028-01-23T00:00:00Z' },
    lock: { policy: 'kickoff', offsetMin: 0 },
    feed: {
      provider: 'espn', code: 'afc.cup', mode: 'window', status: 'upcoming',
      from: '2027-12-23', to: '2028-01-21',
      roundMap: ESPN_FOOTBALL_KO,
      tricodeOverrides: {},
    },
    teamsLeagueKey: 'AFC2027',
    scoringTemplate: 'standar',
    sportAccent: '#D92D1C',
  },
  // ── Legacy regular-season & historical rows (kept for DB/backfill continuity)
  {
    key: 'EPL-2026-27',
    sport: 'bola',
    season: '2026-27',
    tier: 'legacy-regular',
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
const LEGACY_SPORT = {
  bola: 'football',
  basket: 'nba',
  motogp: 'motogp',
  voli: 'volleyball',
  mlbb: 'esports',
  badminton: 'badminton',
};

function withLegacy(row) {
  const shape = row.structure === 'playoff-series' ? 'playoff-series'
    : row.structure === 'double-elim' ? 'double-elim'
    : row.structure === 'two-leg-ko' ? 'two-leg-ko'
    : 'tournament-bracket';
  return Object.freeze({
    ...row,
    tier: row.tier || 'archive',
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
export const COMPETITION_ORDER = [
  'M8-KO-2027',
  'ID-Masters-2027',
  'UCL-KO-2026-27',
  'NBA-Playoffs-2027',
  'SUDIRMAN-2027',
  'EPL-RUNIN-2027',
  'LIGA1-RUNIN-2027',
  'ID-Open-2027',
  'IBL-Playoffs-2027',
  'AFC-ASIAN-CUP-2027',
  'EPL-2026-27',
  'LIGA1-2026-27',
  'NBA-2026-27',
  'AFF2026',
  'NBA-Playoffs-2026',
  'WC2026',
];

/** Playoff Pick'em v3 tentpoles (excludes legacy full-season & finished 2026 events). */
export const PLAYOFF_COMPETITION_ORDER = ROWS.filter((r) => r.tier === 'playoff').map((r) => r.key);

/** Competitions with a 5-shape interactive Playoff Bracket / Simulator. */
export const BRACKET_COMPETITION_ORDER = ROWS.filter((r) => r.features.bracket && r.topologyKey).map((r) => r.key);

/** The rows the data pipeline should run for right now ('live' or 'pending'). */
export const ACTIVE_FEED_KEYS = ROWS.filter((r) => r.feed.status === 'live' || r.feed.status === 'pending').map((r) => r.key);

const STORAGE_KEY = 'gibol:pickem:competition';

/**
 * Default Playoff tentpole for create-grup, bracket, and simulator surfaces:
 * first active `tier: 'playoff'` window, else soonest upcoming Playoff window.
 */
export function defaultPlayoffCompetitionKey(now = new Date()) {
  const t = now.getTime();
  for (const key of PLAYOFF_COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (c && t >= new Date(c.openAt).getTime() && t <= new Date(c.closeAt).getTime()) return key;
  }
  let soonest = null;
  let soonestTs = Infinity;
  for (const key of PLAYOFF_COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (!c) continue;
    const opens = new Date(c.openAt).getTime();
    if (opens > t && opens < soonestTs) {
      soonest = key;
      soonestTs = opens;
    }
  }
  return soonest || PLAYOFF_COMPETITION_ORDER[0] || COMPETITION_ORDER[0];
}

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
