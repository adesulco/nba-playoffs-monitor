// ============================================================================
// v0.69.0 — Pick'em P4 bracket source-of-truth data.
// v0.79.18 — Wired to the REAL WC2026 draw (12 groups × 4 nations, A–L),
//   read from the API-Football WC2026 standings (league=1, season=2026) and
//   mirrored into teams.conference via scripts/seed-wc2026-groups.mjs. The
//   old placeholder seed (fantasy groups with Indonesia/Italy + fabricated
//   "Peluang lolos %" odds — a Komdigi-sensitive leftover) is GONE.
//
// Shape contract:
//
//   GROUP_LETTERS:     ['A'..'L']
//   SAMPLE_GROUPS[L]:  { teams: [[code, seed], …4] }   // 12 real groups
//                      `seed` is a draw-order strength (4=pot-1 … 1) used
//                      ONLY to order the autofill heuristic. It is NEVER
//                      displayed — no probability/odds surfaces remain.
//   SAMPLE_R32:        [{ id, home, away, pick }] × 16
//   SAMPLE_R16_DEFAULT [{ id, home, away, pick }] × 8
//   SAMPLE_QF:         [{ id, home, away, pick }] × 4
//   SAMPLE_SF:         [{ id, home, away, pick }] × 2
//   SAMPLE_FINAL:      { id, home, away, pick }
//
// The KO match-ups are an EDITABLE starting template built only from real
// qualifiers (12 group winners + 12 runners-up + the 8 best third-placed
// teams from the standings ranking) — no fantasy sides. They re-seed in
// real life from the actual group results; the builder needs a concrete
// starting bracket of real teams to render against until kickoff.
// ============================================================================

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Real WC2026 draw. Teams listed in draw/pot order (first = top seed); the
// trailing integer is that draw-order strength (4→1), used only by autofill.
export const SAMPLE_GROUPS = {
  A: { teams: [['MEX', 4], ['RSA', 3], ['KOR', 2], ['CZE', 1]] },
  B: { teams: [['CAN', 4], ['BIH', 3], ['QAT', 2], ['SUI', 1]] },
  C: { teams: [['BRA', 4], ['MAR', 3], ['HAI', 2], ['SCO', 1]] },
  D: { teams: [['USA', 4], ['PAR', 3], ['AUS', 2], ['TUR', 1]] },
  E: { teams: [['GER', 4], ['CUW', 3], ['CIV', 2], ['ECU', 1]] },
  F: { teams: [['NED', 4], ['JPN', 3], ['SWE', 2], ['TUN', 1]] },
  G: { teams: [['BEL', 4], ['EGY', 3], ['IRN', 2], ['NZL', 1]] },
  H: { teams: [['ESP', 4], ['CPV', 3], ['KSA', 2], ['URU', 1]] },
  I: { teams: [['FRA', 4], ['SEN', 3], ['IRQ', 2], ['NOR', 1]] },
  J: { teams: [['ARG', 4], ['ALG', 3], ['AUT', 2], ['JOR', 1]] },
  K: { teams: [['PRT', 4], ['COD', 3], ['UZB', 2], ['COL', 1]] },
  L: { teams: [['ENG', 4], ['CRO', 3], ['GHA', 2], ['PAN', 1]] },
};

// R32 — all 32 real qualifiers (12 winners + 12 runners-up + 8 best thirds),
// paired to avoid same-group meetings. Editable starting template.
export const SAMPLE_R32 = [
  ['MEX', 'CRO'], ['ARG', 'RSA'], ['BRA', 'KOR'], ['ENG', 'SEN'],
  ['FRA', 'QAT'], ['ESP', 'JPN'], ['GER', 'MAR'], ['NED', 'IRN'],
  ['PRT', 'CPV'], ['BEL', 'PAR'], ['USA', 'BIH'], ['CAN', 'ALG'],
  ['KSA', 'CIV'], ['HAI', 'SWE'], ['AUS', 'EGY'], ['COD', 'CUW'],
].map(([h, a], i) => ({ id: 'r32-' + i, home: h, away: a, pick: null }));

export const SAMPLE_R16_DEFAULT = [
  ['MEX', 'ARG'], ['BRA', 'ENG'], ['FRA', 'ESP'], ['GER', 'NED'],
  ['PRT', 'BEL'], ['USA', 'CAN'], ['CIV', 'SWE'], ['EGY', 'COD'],
].map(([h, a], i) => ({ id: 'r16-' + i, home: h, away: a, pick: null }));

export const SAMPLE_QF = [
  { id: 'qf-0', home: 'ARG', away: 'BRA', pick: null },
  { id: 'qf-1', home: 'FRA', away: 'GER', pick: null },
  { id: 'qf-2', home: 'PRT', away: 'USA', pick: null },
  { id: 'qf-3', home: 'CIV', away: 'EGY', pick: null },
];

export const SAMPLE_SF = [
  { id: 'sf-0', home: 'ARG', away: 'FRA', pick: null },
  { id: 'sf-1', home: 'PRT', away: 'EGY', pick: null },
];

export const SAMPLE_FINAL = { id: 'final', home: 'ARG', away: 'PRT', pick: null };

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
// Bahasa names — full WC2026 field (48) + legacy aliases. Kept in sync with
// Flag.jsx COUNTRY_NAMES (duplicated rather than imported so this data module
// stays free of the JSX/React Flag dependency).
const TEAM_NAMES_ID = {
  ALG: 'Aljazair',      ARG: 'Argentina',     AUS: 'Australia',     AUT: 'Austria',
  BEL: 'Belgia',        BIH: 'Bosnia',        BRA: 'Brasil',        CAN: 'Kanada',
  CPV: 'Tanjung Verde', COL: 'Kolombia',      COD: 'Kongo DR',      CRO: 'Kroasia',
  CUW: 'Curaçao',       CZE: 'Ceko',          ECU: 'Ekuador',       EGY: 'Mesir',
  ENG: 'Inggris',       FRA: 'Prancis',       GER: 'Jerman',        GHA: 'Ghana',
  HAI: 'Haiti',         IRN: 'Iran',          IRQ: 'Irak',          CIV: 'Pantai Gading',
  JPN: 'Jepang',        JOR: 'Yordania',      MEX: 'Meksiko',       MAR: 'Maroko',
  NED: 'Belanda',       NZL: 'Selandia Baru', NOR: 'Norwegia',      PAN: 'Panama',
  PAR: 'Paraguay',      PRT: 'Portugal',      QAT: 'Qatar',         KSA: 'Arab Saudi',
  SCO: 'Skotlandia',    SEN: 'Senegal',       RSA: 'Afrika Selatan', KOR: 'Korea Selatan',
  ESP: 'Spanyol',       SWE: 'Swedia',        SUI: 'Swiss',         TUN: 'Tunisia',
  TUR: 'Turki',         USA: 'Amerika Serikat', URU: 'Uruguay',     UZB: 'Uzbekistan',
  // legacy aliases
  POR: 'Portugal',      ITA: 'Italia',        IDN: 'Indonesia',
};

export function teamLabel(code) {
  if (!code) return '';
  return TEAM_NAMES_ID[code] || code;
}

export function teamShort(code) {
  // 3-letter mono identifier — same as the code itself for ISO alpha-3.
  return code || '';
}
