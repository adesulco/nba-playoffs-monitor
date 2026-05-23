// ============================================================================
// v0.69.0 — Pick'em P4 bracket source-of-truth data.
//
// Placeholder seed for the WC2026 bracket builder. Lifted verbatim from
// design-handoff-pickem/js/bracket.jsx so the UI port stays faithful.
// Once migration 0015 is applied AND the bracket-data ingest exists, the
// useBracketState hook should swap these constants for a real fetch
// against the `series` table (existing) or a future `bracket_slots` view.
//
// Until then, the shape is the contract:
//
//   GROUP_LETTERS:     ['A'..'L']
//   SAMPLE_GROUPS[L]:  { teams: [[code, oddsPct], …4] }   // 12 groups
//   SAMPLE_R32:        [{ id, home, away, pick }] × 16
//   SAMPLE_R16_DEFAULT [{ id, home, away, pick }] × 8
//   SAMPLE_QF:         [{ id, home, away, pick }] × 4
//   SAMPLE_SF:         [{ id, home, away, pick }] × 2
//   SAMPLE_FINAL:      { id, home, away, pick }
//
// The KO seedings are "plausible top-2 + best-3rds" placeholders — they
// re-seed in real life from the actual group results, but the bracket
// builder needs SOMETHING to render against until kickoff.
// ============================================================================

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const SAMPLE_GROUPS = {
  A: { teams: [['CAN', 78], ['MEX', 65], ['IDN', 28], ['SEN', 56]] },
  B: { teams: [['BRA', 88], ['BEL', 60], ['KOR', 32], ['MAR', 45]] },
  C: { teams: [['ARG', 84], ['CRO', 58], ['KOR', 38], ['AUS', 30]] },
  D: { teams: [['FRA', 80], ['NED', 62], ['JPN', 50], ['USA', 35]] },
  E: { teams: [['ESP', 82], ['GER', 70], ['ITA', 55], ['URU', 40]] },
  F: { teams: [['ENG', 76], ['POR', 68], ['COL', 48], ['AUS', 32]] },
  G: { teams: [['BRA', 75], ['SEN', 55], ['MAR', 48], ['JPN', 40]] },
  H: { teams: [['NED', 70], ['MEX', 58], ['CRO', 50], ['USA', 38]] },
  I: { teams: [['GER', 72], ['BEL', 62], ['POR', 55], ['SEN', 35]] },
  J: { teams: [['ITA', 68], ['COL', 55], ['CAN', 50], ['IDN', 30]] },
  K: { teams: [['URU', 65], ['KOR', 52], ['MAR', 48], ['AUS', 35]] },
  L: { teams: [['POR', 70], ['JPN', 58], ['CRO', 52], ['USA', 40]] },
};

export const SAMPLE_R32 = [
  ['CAN', 'MEX'], ['BRA', 'POR'], ['ARG', 'JPN'], ['FRA', 'GER'],
  ['ESP', 'BEL'], ['ENG', 'URU'], ['NED', 'SEN'], ['ITA', 'COL'],
  ['BRA', 'MAR'], ['GER', 'CRO'], ['POR', 'KOR'], ['CAN', 'USA'],
  ['NED', 'BEL'], ['ESP', 'SEN'], ['ARG', 'MEX'], ['FRA', 'ITA'],
].map(([h, a], i) => ({ id: 'r32-' + i, home: h, away: a, pick: null }));

export const SAMPLE_R16_DEFAULT = [
  ['CAN', 'BRA'], ['ARG', 'FRA'], ['ESP', 'ENG'], ['NED', 'ITA'],
  ['BRA', 'GER'], ['POR', 'CAN'], ['NED', 'ESP'], ['ARG', 'FRA'],
].map(([h, a], i) => ({ id: 'r16-' + i, home: h, away: a, pick: null }));

export const SAMPLE_QF = [
  { id: 'qf-0', home: 'CAN', away: 'ARG', pick: null },
  { id: 'qf-1', home: 'ESP', away: 'NED', pick: null },
  { id: 'qf-2', home: 'BRA', away: 'POR', pick: null },
  { id: 'qf-3', home: 'NED', away: 'ARG', pick: null },
];

export const SAMPLE_SF = [
  { id: 'sf-0', home: 'ARG', away: 'NED', pick: null },
  { id: 'sf-1', home: 'BRA', away: 'NED', pick: null },
];

export const SAMPLE_FINAL = { id: 'final', home: 'ARG', away: 'BRA', pick: null };

// Stage list — drives the stepper + paging order.
export const STAGES = [
  { k: 'group', l: 'Grup',  total: 36 },   // 12 groups × 3 ranked picks
  { k: 'r32',   l: 'R32',   total: 16 },
  { k: 'r16',   l: 'R16',   total: 8 },
  { k: 'qf',    l: 'QF',    total: 4 },
  { k: 'sf',    l: 'SF',    total: 2 },
  { k: 'final', l: 'Final', total: 1 },
  { k: 'champ', l: 'Juara', total: 1 },
];

export const STAGE_LABELS = {
  group: 'Standings Grup',
  r32: 'Babak 32 Besar',
  r16: 'Babak 16 Besar',
  qf: 'Perempat Final',
  sf: 'Semi Final',
  final: 'Final',
  champ: 'Juara Dunia 2026',
};

// Spec §5.4 scoring constants — kept here next to the bracket data so a
// future schema migration that lifts these into pickem_rules can swap
// this module's exports for a server-fetched table without touching the
// stage components.
export const BRACKET_POINTS = {
  group: { rank1: 5, rank2: 3, rank3: 2 },
  r32:   10,
  r16:   20,
  qf:    40,
  sf:    80,
  finalist: 160,  // each finalist (your SF winner reaching final)
  champion: 200,
};

/**
 * Compute potential points if every current pick is correct.
 * Group: rank-pick × tier (5/3/2). KO: round-weight per filled match.
 * Finalist: each SF pick contributes 160 if it goes through to final.
 * Champion: 200 if filled.
 */
export function potentialBracketPoints(state) {
  let pts = 0;
  // Group stage: 5 for rank-1, 3 for rank-2, 2 for rank-3
  for (const groupKey of GROUP_LETTERS) {
    const g = state.groups?.[groupKey] || {};
    for (const team of Object.keys(g)) {
      const r = g[team];
      if (r === 1) pts += BRACKET_POINTS.group.rank1;
      else if (r === 2) pts += BRACKET_POINTS.group.rank2;
      else if (r === 3) pts += BRACKET_POINTS.group.rank3;
    }
  }
  // Knockouts
  pts += (state.r32 || []).filter((m) => m.pick).length * BRACKET_POINTS.r32;
  pts += (state.r16 || []).filter((m) => m.pick).length * BRACKET_POINTS.r16;
  pts += (state.qf  || []).filter((m) => m.pick).length * BRACKET_POINTS.qf;
  // SF + finalist double-up: each SF pick advances a team to the final
  // (per spec §5.4: SF winner 80 + Finalist reaches final 160)
  pts += (state.sf  || []).filter((m) => m.pick).length * (BRACKET_POINTS.sf + BRACKET_POINTS.finalist);
  // Champion (the BracketChampion stage is ceremonial — value comes from
  // final's pick which we elevate to champion on stage entry).
  if (state.champion) pts += BRACKET_POINTS.champion;
  return pts;
}

export function maxBracketPoints() {
  const groupMax = 12 * (BRACKET_POINTS.group.rank1 + BRACKET_POINTS.group.rank2 + BRACKET_POINTS.group.rank3);
  return (
    groupMax
    + 16 * BRACKET_POINTS.r32
    + 8 * BRACKET_POINTS.r16
    + 4 * BRACKET_POINTS.qf
    + 2 * (BRACKET_POINTS.sf + BRACKET_POINTS.finalist)
    + BRACKET_POINTS.champion
  );
}

/**
 * Resolve a 3-letter ISO/FIFA team code to a display label. Tries the
 * Flag pipeline's COUNTRY_NAMES first (Bahasa labels), then falls back
 * to the code. Centralised so stage components don't duplicate the
 * lookup.
 */
const TEAM_NAMES_ID = {
  ARG: 'Argentina',   BRA: 'Brasil',     FRA: 'Prancis',  ENG: 'Inggris',
  IDN: 'Indonesia',   ESP: 'Spanyol',    GER: 'Jerman',   NED: 'Belanda',
  POR: 'Portugal',    CRO: 'Kroasia',    MAR: 'Maroko',   JPN: 'Jepang',
  USA: 'Amerika',     MEX: 'Meksiko',    CAN: 'Kanada',   ITA: 'Italia',
  BEL: 'Belgia',      URU: 'Uruguay',    COL: 'Kolombia', SEN: 'Senegal',
  KOR: 'Korea Sel.',  AUS: 'Australia',
};

export function teamLabel(code) {
  if (!code) return '';
  return TEAM_NAMES_ID[code] || code;
}

export function teamShort(code) {
  // 3-letter mono identifier — same as the code itself for ISO alpha-3.
  return code || '';
}
