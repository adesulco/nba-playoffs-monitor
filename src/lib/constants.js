export const TEAM_META = {
  'Oklahoma City Thunder':   { abbr: 'OKC', color: '#007ac1', conf: 'W', seed: 1 },
  'San Antonio Spurs':       { abbr: 'SAS', color: '#000000', conf: 'W', seed: 2 },
  'Boston Celtics':          { abbr: 'BOS', color: '#007a33', conf: 'E', seed: 2 },
  'Denver Nuggets':          { abbr: 'DEN', color: '#0e2240', conf: 'W', seed: 3 },
  'Detroit Pistons':         { abbr: 'DET', color: '#1d42ba', conf: 'E', seed: 1 },
  'Cleveland Cavaliers':     { abbr: 'CLE', color: '#860038', conf: 'E', seed: 4 },
  'New York Knicks':         { abbr: 'NYK', color: '#f58426', conf: 'E', seed: 3 },
  'Houston Rockets':         { abbr: 'HOU', color: '#ce1141', conf: 'W', seed: 5 },
  'Los Angeles Lakers':      { abbr: 'LAL', color: '#552583', conf: 'W', seed: 4 },
  'Minnesota Timberwolves':  { abbr: 'MIN', color: '#0c2340', conf: 'W', seed: 6 },
  'Toronto Raptors':         { abbr: 'TOR', color: '#ce1141', conf: 'E', seed: 5 },
  'Atlanta Hawks':           { abbr: 'ATL', color: '#e03a3e', conf: 'E', seed: 6 },
  'Philadelphia 76ers':      { abbr: 'PHI', color: '#006bb6', conf: 'E', seed: 7 },
  'Portland Trail Blazers':  { abbr: 'POR', color: '#e03a3e', conf: 'W', seed: 7 },
  'Golden State Warriors':   { abbr: 'GSW', color: '#1d428a', conf: 'W', seed: null },
  'Phoenix Suns':            { abbr: 'PHX', color: '#1d1160', conf: 'W', seed: null },
  'Orlando Magic':           { abbr: 'ORL', color: '#0077c0', conf: 'E', seed: null },
  'Charlotte Hornets':       { abbr: 'CHA', color: '#1d1160', conf: 'E', seed: null },
};

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

// 2026 Round 1 bracket — confirmed by ESPN/CBS/NBA.com
// 8-seeds resolve from tonight's play-in (Apr 17)
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

export const COLORS = {
  bg: '#08111f',
  panel: '#0c1a2e',
  panel2: '#0f2038',
  line: '#1a2d4a',
  lineSoft: '#152339',
  text: '#e6edf5',
  dim: '#8a9bb4',
  muted: '#56688a',
  amber: '#ffb347',
  amberBright: '#ffcc66',
  green: '#3ddb84',
  red: '#ff5c5c',
  nbaRed: '#c8102e',
  cut: '#b89b5e',
};
