// Slug overrides for teams whose common SEO nickname differs from the last word of the team name.
// "76ers" is the team's actual name but "sixers" is the fan nickname that indexes better.
// "Trail Blazers" as one word is harder to type; "blazers" is the common nickname.
const SLUG_OVERRIDES = {
  'Philadelphia 76ers': 'sixers',
  'Portland Trail Blazers': 'blazers',
};

/**
 * Convert a team name to its URL slug. Used for /nba-playoff-2026/:teamSlug routes.
 * Defaults to the lowercase of the last word (e.g. "Boston Celtics" → "celtics").
 */
export function teamSlug(teamName) {
  if (!teamName) return '';
  if (SLUG_OVERRIDES[teamName]) return SLUG_OVERRIDES[teamName];
  return teamName.split(' ').pop().toLowerCase();
}

export const TEAM_META = {
  'Oklahoma City Thunder':   { abbr: 'OKC', color: '#007ac1', conf: 'W', seed: 1,    handle: 'okcthunder',    star: 'Shai Gilgeous-Alexander' },
  'San Antonio Spurs':       { abbr: 'SAS', color: '#c4ced4', conf: 'W', seed: 2,    handle: 'spurs',         star: 'Victor Wembanyama' },
  'Boston Celtics':          { abbr: 'BOS', color: '#007a33', conf: 'E', seed: 2,    handle: 'celtics',       star: 'Jayson Tatum' },
  'Denver Nuggets':          { abbr: 'DEN', color: '#0e2240', conf: 'W', seed: 3,    handle: 'nuggets',       star: 'Nikola Jokić' },
  'Detroit Pistons':         { abbr: 'DET', color: '#1d42ba', conf: 'E', seed: 1,    handle: 'DetroitPistons',star: 'Cade Cunningham' },
  'Cleveland Cavaliers':     { abbr: 'CLE', color: '#860038', conf: 'E', seed: 4,    handle: 'cavs',          star: 'Donovan Mitchell' },
  'New York Knicks':         { abbr: 'NYK', color: '#f58426', conf: 'E', seed: 3,    handle: 'nyknicks',      star: 'Jalen Brunson' },
  'Houston Rockets':         { abbr: 'HOU', color: '#ce1141', conf: 'W', seed: 5,    handle: 'HoustonRockets',star: 'Kevin Durant' },
  'Los Angeles Lakers':      { abbr: 'LAL', color: '#552583', conf: 'W', seed: 4,    handle: 'Lakers',        star: 'LeBron James' },
  'Minnesota Timberwolves':  { abbr: 'MIN', color: '#266092', conf: 'W', seed: 6,    handle: 'Timberwolves',  star: 'Anthony Edwards' },
  'Toronto Raptors':         { abbr: 'TOR', color: '#ce1141', conf: 'E', seed: 5,    handle: 'Raptors',       star: 'Scottie Barnes' },
  'Atlanta Hawks':           { abbr: 'ATL', color: '#e03a3e', conf: 'E', seed: 6,    handle: 'ATLHawks',      star: 'Trae Young' },
  'Philadelphia 76ers':      { abbr: 'PHI', color: '#006bb6', conf: 'E', seed: 7,    handle: 'sixers',        star: 'Joel Embiid' },
  'Portland Trail Blazers':  { abbr: 'POR', color: '#e03a3e', conf: 'W', seed: 7,    handle: 'trailblazers',  star: 'Scoot Henderson' },
  'Golden State Warriors':   { abbr: 'GSW', color: '#1d428a', conf: 'W', seed: null, handle: 'warriors',      star: 'Stephen Curry' },
  'Phoenix Suns':            { abbr: 'PHX', color: '#e56020', conf: 'W', seed: null, handle: 'Suns',          star: 'Devin Booker' },
  'Orlando Magic':           { abbr: 'ORL', color: '#0077c0', conf: 'E', seed: null, handle: 'OrlandoMagic',  star: 'Paolo Banchero' },
  'Charlotte Hornets':       { abbr: 'CHA', color: '#1d1160', conf: 'E', seed: null, handle: 'hornets',       star: 'LaMelo Ball' },
  'Miami Heat':              { abbr: 'MIA', color: '#98002e', conf: 'E', seed: null, handle: 'MiamiHEAT',     star: 'Bam Adebayo' },
  'Milwaukee Bucks':         { abbr: 'MIL', color: '#00471b', conf: 'E', seed: null, handle: 'Bucks',         star: 'Giannis Antetokounmpo' },
  'Chicago Bulls':           { abbr: 'CHI', color: '#ce1141', conf: 'E', seed: null, handle: 'chicagobulls',  star: 'Coby White' },
  'Brooklyn Nets':           { abbr: 'BKN', color: '#000000', conf: 'E', seed: null, handle: 'BrooklynNets',  star: 'Cam Thomas' },
  'Indiana Pacers':          { abbr: 'IND', color: '#002d62', conf: 'E', seed: null, handle: 'Pacers',        star: 'Tyrese Haliburton' },
  'Washington Wizards':      { abbr: 'WAS', color: '#002b5c', conf: 'E', seed: null, handle: 'WashWizards',   star: 'Jordan Poole' },
  'Dallas Mavericks':        { abbr: 'DAL', color: '#00538c', conf: 'W', seed: null, handle: 'dallasmavs',    star: 'Luka Dončić' },
  'Memphis Grizzlies':       { abbr: 'MEM', color: '#5d76a9', conf: 'W', seed: null, handle: 'memgrizz',      star: 'Ja Morant' },
  'New Orleans Pelicans':    { abbr: 'NOP', color: '#0c2340', conf: 'W', seed: null, handle: 'PelicansNBA',   star: 'Zion Williamson' },
  'Sacramento Kings':        { abbr: 'SAC', color: '#5a2d81', conf: 'W', seed: null, handle: 'SacramentoKings',star: 'Domantas Sabonis' },
  'Utah Jazz':               { abbr: 'UTA', color: '#002b5c', conf: 'W', seed: null, handle: 'utahjazz',      star: 'Lauri Markkanen' },
  'Los Angeles Clippers':    { abbr: 'LAC', color: '#c8102e', conf: 'W', seed: null, handle: 'LAClippers',    star: 'James Harden' },
};

// Reverse lookup: slug → full team name. Built once at import time.
export const TEAM_BY_SLUG = Object.fromEntries(
  Object.keys(TEAM_META).map((name) => [teamSlug(name), name])
);

// F14 — derive an on-dark-bg safe color from a team's brand color.
// Blends the team color toward panel dark at given intensity.
// Fully-bright team colors (Warriors yellow, Lakers purple, Heat pink)
// often fail WCAG AA (4.5:1) against body text, so use this when
// tinting large surfaces (hero backgrounds, panel borders).
export function softTeamColor(hex, mix = 0.35) {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return hex;
  const target = { r: 12, g: 26, b: 46 }; // panel dark
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (target.r - r) * mix);
  const ng = Math.round(g + (target.g - g) * mix);
  const nb = Math.round(b + (target.b - b) * mix);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// Returns whether a given hex color has sufficient contrast (~WCAG AA) against
// dark panel background. Used to decide whether to use the full brand color
// for text-on-dark or swap to a tinted/lightened version.
export function hasGoodContrastOnDark(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Rough luminance — team color needs to be bright-enough to read on dark bg.
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 90; // empirical threshold — dark teams (Spurs, Celtics) fail.
}

export const FALLBACK_CHAMPION = [
  { name: 'Oklahoma City Thunder', pct: 44, change: 2, volume: 0 },
  { name: 'San Antonio Spurs',     pct: 15, change: 1, volume: 0 },
  { name: 'Boston Celtics',        pct: 13, change: 0, volume: 0 },
  { name: 'Denver Nuggets',        pct: 9,  change: -1, volume: 0 },
  { name: 'Detroit Pistons',       pct: 6,  change: 1, volume: 0 },
  { name: 'Cleveland Cavaliers',   pct: 4,  change: 0, volume: 0 },
  { name: 'New York Knicks',       pct: 4,  change: -1, volume: 0 },
  { name: 'Houston Rockets',       pct: 3,  change: 0, volume: 0 },
  { name: 'Los Angeles Lakers',    pct: 2,  change: 0, volume: 0 },
];

export const FALLBACK_MVP = [
  { name: 'Shai Gilgeous-Alexander', pct: 95 },
  { name: 'Victor Wembanyama',       pct: 3 },
];

// Pool of teams that were in each conference's play-in tournament. The 8-seed
// that actually advances gets auto-detected from ESPN R1 game data in the
// Bracket component (see resolvePlayInWinner). This pool is the fallback list
// we show as "Play-In TBD (ORL/CHA)" etc. until ESPN confirms the winner.
export const PLAYIN_POOL = {
  east: ['Orlando Magic', 'Charlotte Hornets'],
  west: ['Phoenix Suns', 'Golden State Warriors'],
};

// 2026 Round 1 bracket — confirmed by ESPN/CBS/NBA.com
// 8-seeds are placeholders; real team name is resolved at render-time from
// live ESPN R1 matchups. See Bracket.jsx.
export const BRACKET_R1 = {
  east: [
    { seeds: [1, 8], teams: ['Detroit Pistons', 'TBD (ORL/CHA)'] },
    { seeds: [4, 5], teams: ['Cleveland Cavaliers', 'Toronto Raptors'] },
    { seeds: [3, 6], teams: ['New York Knicks', 'Atlanta Hawks'] },
    { seeds: [2, 7], teams: ['Boston Celtics', 'Philadelphia 76ers'] },
  ],
  west: [
    { seeds: [1, 8], teams: ['Oklahoma City Thunder', 'TBD (PHX/GSW)'] },
    { seeds: [4, 5], teams: ['Los Angeles Lakers', 'Houston Rockets'] },
    { seeds: [3, 6], teams: ['Denver Nuggets', 'Minnesota Timberwolves'] },
    { seeds: [2, 7], teams: ['San Antonio Spurs', 'Portland Trail Blazers'] },
  ],
};

// Theme-aware colors use CSS vars; light/dark values live in index.css.
// Brand colors (nbaRed, cut) are theme-independent and stay as hex.
export const COLORS = {
  bg: 'var(--bg)',
  panel: 'var(--panel)',
  panel2: 'var(--panel2)',
  panelSoft: 'var(--panel-soft)',
  panelRow: 'var(--panel-row)',
  line: 'var(--line)',
  lineSoft: 'var(--line-soft)',
  text: 'var(--text)',
  dim: 'var(--dim)',
  muted: 'var(--muted)',
  amber: 'var(--amber)',
  amberBright: 'var(--amber-bright)',
  green: 'var(--green)',
  red: 'var(--red)',
  hover: 'var(--hover)',
  topbarBg: 'var(--topbar-bg)',
  heroBg: 'var(--hero-bg)',
  nbaRed: '#c8102e',
  cut: '#b89b5e',
};
