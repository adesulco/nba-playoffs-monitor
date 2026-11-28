/**
 * playoffTopology.js — Universal 5-Shape Playoff Bracket & Simulator Engine
 * (Playoff Pick'em v3, Decision D4).
 *
 * Pure, zero-dependency DAG engine powering both:
 *   1. /simulasi/:competition — zero-login "Skenario & Dream Bracket" viral tool
 *   2. /bagan/:competition    — official Playoff Bracket lock + Babak Baru (0.75x)
 *
 * Supported topologies:
 *   - 'double-elim'    (M8 World Championship / MPL ID — Upper + Lower w/ loserOf)
 *   - 'single-elim'    (BWF Indonesia Masters Super 500 & Indonesia Open Super 1000)
 *   - 'two-leg-ko'     (UEFA Champions League Knockouts · Edisi Sahur)
 *   - 'playoff-series' (NBA Best-of-7 & IBL Best-of-5 w/ series length bonus)
 *   - 'group-plus-ko'  (BWF Sudirman Cup & AFC Asian Cup Timnas Garuda)
 *
 * Persistence bridge:
 *   encodeTopologyToSlots() / decodeSlotsToTopology() map any topology cleanly
 *   onto the live `public.picks` schema (slot_type + slot_index + picked_team_code)
 *   so brackets save and score in prod immediately without blocking on schema DDL.
 */

export const TOPOLOGY_SHAPES = Object.freeze([
  'single-elim',
  'two-leg-ko',
  'playoff-series',
  'double-elim',
  'group-plus-ko',
]);

/**
 * Contender metadata helper: [code, name, seedLabel].
 */
function teamMap(entries) {
  return Object.fromEntries(
    entries.map(([code, name, seed]) => [code, Object.freeze({ code, name, seed: seed || '' })])
  );
}

export const TOPOLOGIES = Object.freeze({
  // ── 1. DOUBLE ELIMINATION: M8 World Championship 2027 Knockouts ────────────
  'M8-KO-2027': {
    key: 'M8-KO-2027',
    shape: 'double-elim',
    lockAt: '2027-01-14T07:00:00Z',
    seedNote: {
      en: 'Projected Top 8 Swiss qualifiers · Final bracket seeds lock Jan 10, 2027',
      id: 'Simulasi Top 8 lolos Swiss · Bagan resmi dikunci 10 Jan 2027',
    },
    detailLabel: { en: 'Series score', id: 'Skor seri' },
    teams: teamMap([
      ['BTR', 'Bigetron Alpha', 'ID #1'],
      ['NVI', 'NAVI ID', 'ID #2'],
      ['TLP', 'Team Liquid PH', 'PH #1'],
      ['APB', 'Falcons AP.Bren', 'PH #2'],
      ['SRG', 'Selangor Red Giants', 'MY #1'],
      ['ONI', 'ONIC', 'WC'],
      ['TSP', 'Team Spirit', 'EECA'],
      ['RRQ', 'RRQ Hoshi', 'ID WC'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Full Bracket (1.0×)', id: 'Bagan Penuh (1,0×)' } },
      { key: 'top4', multiplier: 0.75, label: { en: 'Babak Baru · Top 4 (0.75×)', id: 'Babak Baru · 4 Besar (0,75×)' } },
    ],
    stages: [
      { key: 'upper', label: { en: 'Upper Bracket', id: 'Upper Bracket' } },
      { key: 'lower', label: { en: 'Lower Bracket', id: 'Lower Bracket' } },
      { key: 'finals', label: { en: 'Finals', id: 'Grand Final' } },
    ],
    nodes: [
      // Upper Quarterfinals (Bo5) — mapped to r16_winner 1..4
      { id: 'ub_qf1', stage: 'upper', roundLabel: { en: 'Upper QF 1 · Bo5', id: 'Upper QF 1 · Bo5' }, slotType: 'r16_winner', slotIndex: 1, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { seed: 'BTR' }, b: { seed: 'TSP' } },
      { id: 'ub_qf2', stage: 'upper', roundLabel: { en: 'Upper QF 2 · Bo5', id: 'Upper QF 2 · Bo5' }, slotType: 'r16_winner', slotIndex: 2, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { seed: 'TLP' }, b: { seed: 'ONI' } },
      { id: 'ub_qf3', stage: 'upper', roundLabel: { en: 'Upper QF 3 · Bo5', id: 'Upper QF 3 · Bo5' }, slotType: 'r16_winner', slotIndex: 3, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { seed: 'SRG' }, b: { seed: 'NVI' } },
      { id: 'ub_qf4', stage: 'upper', roundLabel: { en: 'Upper QF 4 · Bo5', id: 'Upper QF 4 · Bo5' }, slotType: 'r16_winner', slotIndex: 4, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { seed: 'APB' }, b: { seed: 'RRQ' } },
      // Upper Semifinals (Bo5) — mapped to r16_winner 5..6
      { id: 'ub_sf1', stage: 'upper', roundLabel: { en: 'Upper Semifinal 1 · Bo5', id: 'Upper Semifinal 1 · Bo5' }, slotType: 'r16_winner', slotIndex: 5, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'ub_qf1' }, b: { winnerOf: 'ub_qf2' } },
      { id: 'ub_sf2', stage: 'upper', roundLabel: { en: 'Upper Semifinal 2 · Bo5', id: 'Upper Semifinal 2 · Bo5' }, slotType: 'r16_winner', slotIndex: 6, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'ub_qf3' }, b: { winnerOf: 'ub_qf4' } },
      // Lower Round 1 (Bo5) — losers of UB QF drop down! Mapped to qf_winner 1..2
      { id: 'lb_r1_1', stage: 'lower', roundLabel: { en: 'Lower R1 · Eliminasi Bo5', id: 'Lower R1 · Eliminasi Bo5' }, slotType: 'qf_winner', slotIndex: 1, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { loserOf: 'ub_qf1' }, b: { loserOf: 'ub_qf2' } },
      { id: 'lb_r1_2', stage: 'lower', roundLabel: { en: 'Lower R1 · Eliminasi Bo5', id: 'Lower R1 · Eliminasi Bo5' }, slotType: 'qf_winner', slotIndex: 2, points: 10, detailBonus: 3, detailOptions: ['3-0', '3-1', '3-2'], a: { loserOf: 'ub_qf3' }, b: { loserOf: 'ub_qf4' } },
      // Lower Quarterfinals (Bo5) — UB SF losers cross into LB R1 winners! Mapped to qf_winner 3..4
      { id: 'lb_qf1', stage: 'lower', roundLabel: { en: 'Lower QF 1 · Bo5', id: 'Lower QF 1 · Bo5' }, slotType: 'qf_winner', slotIndex: 3, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { loserOf: 'ub_sf2' }, b: { winnerOf: 'lb_r1_1' } },
      { id: 'lb_qf2', stage: 'lower', roundLabel: { en: 'Lower QF 2 · Bo5', id: 'Lower QF 2 · Bo5' }, slotType: 'qf_winner', slotIndex: 4, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { loserOf: 'ub_sf1' }, b: { winnerOf: 'lb_r1_2' } },
      // Top 4 Phase (`top4` Babak Baru starts here!)
      { id: 'ub_final', stage: 'finals', phases: ['full', 'top4'], roundLabel: { en: 'Upper Final · Bo5', id: 'Final Upper · Bo5' }, slotType: 'sf_winner', slotIndex: 1, points: 25, detailBonus: 5, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'ub_sf1' }, b: { winnerOf: 'ub_sf2' } },
      { id: 'lb_sf', stage: 'lower', phases: ['full', 'top4'], roundLabel: { en: 'Lower Semifinal · Bo5', id: 'Semifinal Lower · Bo5' }, slotType: 'r32_winner', slotIndex: 1, points: 20, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'lb_qf1' }, b: { winnerOf: 'lb_qf2' } },
      { id: 'lb_final', stage: 'finals', phases: ['full', 'top4'], roundLabel: { en: 'Lower Final · Bo5', id: 'Final Lower · Bo5' }, slotType: 'sf_winner', slotIndex: 2, points: 30, detailBonus: 5, detailOptions: ['3-0', '3-1', '3-2'], a: { loserOf: 'ub_final' }, b: { winnerOf: 'lb_sf' } },
      { id: 'grand_final', stage: 'finals', phases: ['full', 'top4'], isFinal: true, roundLabel: { en: 'Grand Final · Bo7', id: 'Grand Final M8 · Bo7' }, slotType: 'final_winner', slotIndex: 1, points: 50, detailBonus: 10, detailOptions: ['4-0', '4-1', '4-2', '4-3'], a: { winnerOf: 'ub_final' }, b: { winnerOf: 'lb_final' } },
    ],
  },

  // ── 2. SINGLE ELIMINATION: Indonesia Masters 2027 (BWF Super 500) ──────────
  'ID-Masters-2027': {
    key: 'ID-Masters-2027',
    shape: 'single-elim',
    lockAt: '2027-02-12T05:00:00Z',
    seedNote: {
      en: 'Flagship Men’s Singles Top 8 Istora draw · Official BWF draw locks Feb 9',
      id: 'Unggulan Tunggal Putra Istora Senayan · Undian resmi BWF 9 Feb',
    },
    detailLabel: { en: 'Game score', id: 'Skor gim' },
    teams: teamMap([
      ['JOC', 'Jonatan Christie', 'INA #1'],
      ['ASG', 'Anthony Ginting', 'INA #2'],
      ['ALW', 'Alwi Farhan', 'INA WC'],
      ['SYQ', 'Shi Yu Qi', 'CHN #1'],
      ['VAX', 'Viktor Axelsen', 'DEN #1'],
      ['KVT', 'Kunlavut Vitidsarn', 'THA #1'],
      ['AAN', 'Anders Antonsen', 'DEN #2'],
      ['LZJ', 'Lee Zii Jia', 'MAS #1'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Quarterfinals → Final (1.0×)', id: '8 Besar → Final (1,0×)' } },
      { key: 'sf', multiplier: 0.75, label: { en: 'Babak Baru · Semifinals (0.75×)', id: 'Babak Baru · Semifinal (0,75×)' } },
    ],
    stages: [
      { key: 'qf', label: { en: 'Quarterfinals', id: 'Perempat Final' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'Final Istora', id: 'Final Istora' } },
    ],
    nodes: [
      { id: 'qf1', stage: 'qf', roundLabel: { en: 'Quarterfinal 1', id: 'Perempat Final 1' }, slotType: 'qf_winner', slotIndex: 1, points: 10, detailBonus: 3, detailOptions: ['2-0', '2-1'], a: { seed: 'SYQ' }, b: { seed: 'ALW' } },
      { id: 'qf2', stage: 'qf', roundLabel: { en: 'Quarterfinal 2', id: 'Perempat Final 2' }, slotType: 'qf_winner', slotIndex: 2, points: 10, detailBonus: 3, detailOptions: ['2-0', '2-1'], a: { seed: 'JOC' }, b: { seed: 'LZJ' } },
      { id: 'qf3', stage: 'qf', roundLabel: { en: 'Quarterfinal 3', id: 'Perempat Final 3' }, slotType: 'qf_winner', slotIndex: 3, points: 10, detailBonus: 3, detailOptions: ['2-0', '2-1'], a: { seed: 'KVT' }, b: { seed: 'ASG' } },
      { id: 'qf4', stage: 'qf', roundLabel: { en: 'Quarterfinal 4', id: 'Perempat Final 4' }, slotType: 'qf_winner', slotIndex: 4, points: 10, detailBonus: 3, detailOptions: ['2-0', '2-1'], a: { seed: 'AAN' }, b: { seed: 'VAX' } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 1', id: 'Semifinal 1' }, slotType: 'sf_winner', slotIndex: 1, points: 20, detailBonus: 5, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf2' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 2', id: 'Semifinal 2' }, slotType: 'sf_winner', slotIndex: 2, points: 20, detailBonus: 5, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'qf3' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'sf'], isFinal: true, roundLabel: { en: 'Final · Istora Senayan', id: 'Final · Istora Senayan' }, slotType: 'final_winner', slotIndex: 1, points: 40, detailBonus: 8, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },

  // ── 3. TWO-LEG KNOCKOUT: UEFA Champions League 2026/27 ("Edisi Sahur") ─────
  'UCL-KO-2026-27': {
    key: 'UCL-KO-2026-27',
    shape: 'two-leg-ko',
    lockAt: '2027-03-09T19:45:00Z',
    seedNote: {
      en: '2-leg aggregate R16 → SF + Final Jun 5, 2027 · Sahur kickoffs 03:00 WIB',
      id: 'Agregat 2 leg 16 Besar → SF + Final 5 Jun 2027 · Kickoff Sahur 03.00 WIB',
    },
    detailLabel: { en: 'How tie is won', id: 'Cara lolos' },
    teams: teamMap([
      ['LIV', 'Liverpool', '#1'],
      ['BAR', 'Barcelona', '#2'],
      ['ARS', 'Arsenal', '#3'],
      ['INT', 'Inter Milan', '#4'],
      ['RMA', 'Real Madrid', '#5'],
      ['BAY', 'Bayern Munich', '#6'],
      ['MCI', 'Man City', '#7'],
      ['PSG', 'PSG', '#8'],
      ['ATM', 'Atletico Madrid', '#9'],
      ['LEV', 'Bayer Leverkusen', '#10'],
      ['BVB', 'Borussia Dortmund', '#11'],
      ['MIL', 'AC Milan', '#12'],
      ['JUV', 'Juventus', '#13'],
      ['CHE', 'Chelsea', '#14'],
      ['BEN', 'Benfica', '#15'],
      ['PSV', 'PSV Eindhoven', '#16'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'R16 → Final (1.0×)', id: '16 Besar → Final (1,0×)' } },
      { key: 'qf', multiplier: 0.75, label: { en: 'Babak Baru · Quarterfinals (0.75×)', id: 'Babak Baru · 8 Besar (0,75×)' } },
    ],
    stages: [
      { key: 'r16', label: { en: 'Round of 16', id: '16 Besar' } },
      { key: 'qf', label: { en: 'Quarterfinals', id: '8 Besar' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'Final', id: 'Final UCL' } },
    ],
    nodes: [
      { id: 'r16_1', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 1, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'LIV' }, b: { seed: 'PSG' } },
      { id: 'r16_2', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 2, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'RMA' }, b: { seed: 'ATM' } },
      { id: 'r16_3', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 3, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'ARS' }, b: { seed: 'PSV' } },
      { id: 'r16_4', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 4, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'INT' }, b: { seed: 'MIL' } },
      { id: 'r16_5', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 5, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'BAR' }, b: { seed: 'BEN' } },
      { id: 'r16_6', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 6, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'BAY' }, b: { seed: 'LEV' } },
      { id: 'r16_7', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 7, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'MCI' }, b: { seed: 'JUV' } },
      { id: 'r16_8', stage: 'r16', roundLabel: { en: 'R16 · 2 Legs', id: '16 Besar · 2 Leg' }, slotType: 'r16_winner', slotIndex: 8, points: 10, detailBonus: 3, detailOptions: ['90m', 'ET', 'PEN'], a: { seed: 'BVB' }, b: { seed: 'CHE' } },
      { id: 'qf1', stage: 'qf', phases: ['full', 'qf'], roundLabel: { en: 'Quarterfinal 1 · 2 Legs', id: 'Perempat Final 1 · 2 Leg' }, slotType: 'qf_winner', slotIndex: 1, points: 20, detailBonus: 4, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'r16_1' }, b: { winnerOf: 'r16_2' } },
      { id: 'qf2', stage: 'qf', phases: ['full', 'qf'], roundLabel: { en: 'Quarterfinal 2 · 2 Legs', id: 'Perempat Final 2 · 2 Leg' }, slotType: 'qf_winner', slotIndex: 2, points: 20, detailBonus: 4, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'r16_3' }, b: { winnerOf: 'r16_4' } },
      { id: 'qf3', stage: 'qf', phases: ['full', 'qf'], roundLabel: { en: 'Quarterfinal 3 · 2 Legs', id: 'Perempat Final 3 · 2 Leg' }, slotType: 'qf_winner', slotIndex: 3, points: 20, detailBonus: 4, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'r16_5' }, b: { winnerOf: 'r16_6' } },
      { id: 'qf4', stage: 'qf', phases: ['full', 'qf'], roundLabel: { en: 'Quarterfinal 4 · 2 Legs', id: 'Perempat Final 4 · 2 Leg' }, slotType: 'qf_winner', slotIndex: 4, points: 20, detailBonus: 4, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'r16_7' }, b: { winnerOf: 'r16_8' } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'qf'], roundLabel: { en: 'Semifinal 1 · 2 Legs', id: 'Semifinal 1 · 2 Leg' }, slotType: 'sf_winner', slotIndex: 1, points: 40, detailBonus: 6, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf2' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'qf'], roundLabel: { en: 'Semifinal 2 · 2 Legs', id: 'Semifinal 2 · 2 Leg' }, slotType: 'sf_winner', slotIndex: 2, points: 40, detailBonus: 6, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'qf3' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'qf'], isFinal: true, roundLabel: { en: 'UCL Final · Single Match', id: 'Final UCL · 1 Laga' }, slotType: 'final_winner', slotIndex: 1, points: 80, detailBonus: 10, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },

  // ── 4. BEST-OF-N PLAYOFF SERIES: NBA Playoffs 2027 (Bo7) ───────────────────
  'NBA-Playoffs-2027': {
    key: 'NBA-Playoffs-2027',
    shape: 'playoff-series',
    lockAt: '2027-04-17T17:00:00Z',
    seedNote: {
      en: 'Best-of-7 Conference Semis → NBA Finals · +bonus for exact series length',
      id: 'Seri Best-of-7 Semifinal Wilayah → Final NBA · +bonus tepat jumlah gim',
    },
    detailLabel: { en: 'Games (Bo7)', id: 'Jumlah gim (Bo7)' },
    teams: teamMap([
      ['OKC', 'Oklahoma City Thunder', 'W1'],
      ['DEN', 'Denver Nuggets', 'W2'],
      ['LAL', 'LA Lakers', 'W3'],
      ['MIN', 'Minnesota Timberwolves', 'W4'],
      ['BOS', 'Boston Celtics', 'E1'],
      ['NYK', 'New York Knicks', 'E2'],
      ['CLE', 'Cleveland Cavaliers', 'E3'],
      ['MIL', 'Milwaukee Bucks', 'E4'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Full Playoff Tree (1.0×)', id: 'Bagan Penuh (1,0×)' } },
      { key: 'cf', multiplier: 0.75, label: { en: 'Babak Baru · Conf Finals (0.75×)', id: 'Babak Baru · Final Wilayah (0,75×)' } },
    ],
    stages: [
      { key: 'csf', label: { en: 'Conf Semis', id: 'Semifinal Wilayah' } },
      { key: 'cf', label: { en: 'Conf Finals', id: 'Final Wilayah' } },
      { key: 'finals', label: { en: 'NBA Finals', id: 'Final NBA' } },
    ],
    nodes: [
      { id: 'w_sf1', stage: 'csf', roundLabel: { en: 'West Semifinal 1 · Bo7', id: 'Semifinal Barat 1 · Bo7' }, slotType: 'qf_winner', slotIndex: 1, points: 15, detailBonus: 5, detailOptions: ['4', '5', '6', '7'], a: { seed: 'OKC' }, b: { seed: 'MIN' } },
      { id: 'w_sf2', stage: 'csf', roundLabel: { en: 'West Semifinal 2 · Bo7', id: 'Semifinal Barat 2 · Bo7' }, slotType: 'qf_winner', slotIndex: 2, points: 15, detailBonus: 5, detailOptions: ['4', '5', '6', '7'], a: { seed: 'DEN' }, b: { seed: 'LAL' } },
      { id: 'e_sf1', stage: 'csf', roundLabel: { en: 'East Semifinal 1 · Bo7', id: 'Semifinal Timur 1 · Bo7' }, slotType: 'qf_winner', slotIndex: 3, points: 15, detailBonus: 5, detailOptions: ['4', '5', '6', '7'], a: { seed: 'BOS' }, b: { seed: 'MIL' } },
      { id: 'e_sf2', stage: 'csf', roundLabel: { en: 'East Semifinal 2 · Bo7', id: 'Semifinal Timur 2 · Bo7' }, slotType: 'qf_winner', slotIndex: 4, points: 15, detailBonus: 5, detailOptions: ['4', '5', '6', '7'], a: { seed: 'NYK' }, b: { seed: 'CLE' } },
      { id: 'w_cf', stage: 'cf', phases: ['full', 'cf'], roundLabel: { en: 'Western Conference Finals · Bo7', id: 'Final Wilayah Barat · Bo7' }, slotType: 'sf_winner', slotIndex: 1, points: 30, detailBonus: 8, detailOptions: ['4', '5', '6', '7'], a: { winnerOf: 'w_sf1' }, b: { winnerOf: 'w_sf2' } },
      { id: 'e_cf', stage: 'cf', phases: ['full', 'cf'], roundLabel: { en: 'Eastern Conference Finals · Bo7', id: 'Final Wilayah Timur · Bo7' }, slotType: 'sf_winner', slotIndex: 2, points: 30, detailBonus: 8, detailOptions: ['4', '5', '6', '7'], a: { winnerOf: 'e_sf1' }, b: { winnerOf: 'e_sf2' } },
      { id: 'nba_finals', stage: 'finals', phases: ['full', 'cf'], isFinal: true, roundLabel: { en: 'NBA Finals 2027 · Bo7', id: 'Final NBA 2027 · Bo7' }, slotType: 'final_winner', slotIndex: 1, points: 60, detailBonus: 12, detailOptions: ['4', '5', '6', '7'], a: { winnerOf: 'w_cf' }, b: { winnerOf: 'e_cf' } },
    ],
  },

  // ── 5. GROUP + KNOCKOUT: Piala Sudirman 2027 & Piala Asia AFC 2027 ─────────
  'SUDIRMAN-2027': {
    key: 'SUDIRMAN-2027',
    shape: 'group-plus-ko',
    lockAt: '2027-04-21T02:00:00Z',
    seedNote: {
      en: 'Pick Top 2 per group → Mixed Team Knockout (3-0 / 3-1 / 3-2 ties)',
      id: 'Pilih Juara & Runner-up Grup → Fase Gugur Beregu Campuran (skor 3-0 / 3-1 / 3-2)',
    },
    detailLabel: { en: 'Tie score', id: 'Skor beregu' },
    teams: teamMap([
      ['CHN', 'Tiongkok', 'A1'],
      ['SGP', 'Singapura', 'A2'],
      ['IND', 'India', 'A3'],
      ['INA', 'Indonesia', 'B1'],
      ['DEN', 'Denmark', 'B2'],
      ['THA', 'Thailand', 'B3'],
      ['KOR', 'Korea Selatan', 'C1'],
      ['TPE', 'Chinese Taipei', 'C2'],
      ['CAN', 'Kanada', 'C3'],
      ['JPN', 'Jepang', 'D1'],
      ['MAS', 'Malaysia', 'D2'],
      ['FRA', 'Prancis', 'D3'],
    ]),
    groups: {
      A: ['CHN', 'IND', 'SGP'],
      B: ['INA', 'DEN', 'THA'],
      C: ['KOR', 'TPE', 'CAN'],
      D: ['JPN', 'MAS', 'FRA'],
    },
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Groups + Knockout (1.0×)', id: 'Grup + Fase Gugur (1,0×)' } },
      { key: 'ko', multiplier: 0.75, label: { en: 'Babak Baru · Quarterfinals (0.75×)', id: 'Babak Baru · 8 Besar (0,75×)' } },
    ],
    stages: [
      { key: 'groups', label: { en: 'Group Stage', id: 'Fase Grup' } },
      { key: 'qf', label: { en: 'Quarterfinals', id: '8 Besar' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'Final', id: 'Final Sudirman' } },
    ],
    nodes: [
      { id: 'qf1', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 1 · Bo5', id: 'Perempat Final 1 · Bo5' }, slotType: 'qf_winner', slotIndex: 1, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { groupRankOf: { group: 'A', rank: 1 } }, b: { groupRankOf: { group: 'B', rank: 2 } } },
      { id: 'qf2', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 2 · Bo5', id: 'Perempat Final 2 · Bo5' }, slotType: 'qf_winner', slotIndex: 2, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { groupRankOf: { group: 'B', rank: 1 } }, b: { groupRankOf: { group: 'A', rank: 2 } } },
      { id: 'qf3', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 3 · Bo5', id: 'Perempat Final 3 · Bo5' }, slotType: 'qf_winner', slotIndex: 3, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { groupRankOf: { group: 'C', rank: 1 } }, b: { groupRankOf: { group: 'D', rank: 2 } } },
      { id: 'qf4', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 4 · Bo5', id: 'Perempat Final 4 · Bo5' }, slotType: 'qf_winner', slotIndex: 4, points: 15, detailBonus: 4, detailOptions: ['3-0', '3-1', '3-2'], a: { groupRankOf: { group: 'D', rank: 1 } }, b: { groupRankOf: { group: 'C', rank: 2 } } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'ko'], roundLabel: { en: 'Semifinal 1 · Bo5', id: 'Semifinal 1 · Bo5' }, slotType: 'sf_winner', slotIndex: 1, points: 30, detailBonus: 6, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf3' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'ko'], roundLabel: { en: 'Semifinal 2 · Bo5', id: 'Semifinal 2 · Bo5' }, slotType: 'sf_winner', slotIndex: 2, points: 30, detailBonus: 6, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'qf2' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'ko'], isFinal: true, roundLabel: { en: 'Sudirman Cup Final · Bo5', id: 'Final Piala Sudirman · Bo5' }, slotType: 'final_winner', slotIndex: 1, points: 60, detailBonus: 10, detailOptions: ['3-0', '3-1', '3-2'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },

  // ── Additional Tentpoles reusing the 5 Canonical Shapes ────────────────────
  'ID-Open-2027': {
    key: 'ID-Open-2027',
    shape: 'single-elim',
    lockAt: '2027-06-03T05:00:00Z',
    seedNote: {
      en: 'BWF Super 1000 Istora · Top 8 Championship Draw',
      id: 'BWF Super 1000 Istora · Bagan 8 Besar Perebutan Gelar',
    },
    detailLabel: { en: 'Game score', id: 'Skor gim' },
    teams: teamMap([
      ['JOC', 'Jonatan Christie', 'INA #1'],
      ['ASG', 'Anthony Ginting', 'INA #2'],
      ['ALW', 'Alwi Farhan', 'INA #3'],
      ['SYQ', 'Shi Yu Qi', 'CHN #1'],
      ['VAX', 'Viktor Axelsen', 'DEN #1'],
      ['KVT', 'Kunlavut Vitidsarn', 'THA #1'],
      ['LKY', 'Loh Kean Yew', 'SGP #1'],
      ['LZJ', 'Lee Zii Jia', 'MAS #1'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Full Draw (1.0×)', id: 'Bagan Penuh (1,0×)' } },
      { key: 'sf', multiplier: 0.75, label: { en: 'Babak Baru · Semis (0.75×)', id: 'Babak Baru · Semifinal (0,75×)' } },
    ],
    stages: [
      { key: 'qf', label: { en: 'Quarterfinals', id: 'Perempat Final' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'Final Super 1000', id: 'Final Super 1000' } },
    ],
    nodes: [
      { id: 'qf1', stage: 'qf', roundLabel: { en: 'Quarterfinal 1', id: 'Perempat Final 1' }, slotType: 'qf_winner', slotIndex: 1, points: 15, detailBonus: 4, detailOptions: ['2-0', '2-1'], a: { seed: 'SYQ' }, b: { seed: 'LKY' } },
      { id: 'qf2', stage: 'qf', roundLabel: { en: 'Quarterfinal 2', id: 'Perempat Final 2' }, slotType: 'qf_winner', slotIndex: 2, points: 15, detailBonus: 4, detailOptions: ['2-0', '2-1'], a: { seed: 'JOC' }, b: { seed: 'VAX' } },
      { id: 'qf3', stage: 'qf', roundLabel: { en: 'Quarterfinal 3', id: 'Perempat Final 3' }, slotType: 'qf_winner', slotIndex: 3, points: 15, detailBonus: 4, detailOptions: ['2-0', '2-1'], a: { seed: 'KVT' }, b: { seed: 'ALW' } },
      { id: 'qf4', stage: 'qf', roundLabel: { en: 'Quarterfinal 4', id: 'Perempat Final 4' }, slotType: 'qf_winner', slotIndex: 4, points: 15, detailBonus: 4, detailOptions: ['2-0', '2-1'], a: { seed: 'ASG' }, b: { seed: 'LZJ' } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 1', id: 'Semifinal 1' }, slotType: 'sf_winner', slotIndex: 1, points: 30, detailBonus: 6, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf2' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 2', id: 'Semifinal 2' }, slotType: 'sf_winner', slotIndex: 2, points: 30, detailBonus: 6, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'qf3' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'sf'], isFinal: true, roundLabel: { en: 'Indonesia Open Final', id: 'Final Indonesia Open' }, slotType: 'final_winner', slotIndex: 1, points: 60, detailBonus: 10, detailOptions: ['2-0', '2-1'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },

  'IBL-Playoffs-2027': {
    key: 'IBL-Playoffs-2027',
    shape: 'playoff-series',
    lockAt: '2027-06-10T12:00:00Z',
    seedNote: {
      en: 'IBL 2027 Top 8 Best-of-5 Playoffs · Home & Away format',
      id: 'Playoff Top 8 IBL 2027 Best-of-5 · Format Kandang & Tandang',
    },
    detailLabel: { en: 'Games (Bo5)', id: 'Jumlah gim (Bo5)' },
    teams: teamMap([
      ['PJB', 'Pelita Jaya Jakarta', '#1'],
      ['SMU', 'Satria Muda Pertamina', '#2'],
      ['DUB', 'Dewa United Banten', '#3'],
      ['PRW', 'Prawira Bandung', '#4'],
      ['KBS', 'Kesatria Bengawan Solo', '#5'],
      ['RSB', 'Rans Simba Bogor', '#6'],
      ['AHT', 'Amartha Hangtuah', '#7'],
      ['PCC', 'Pacific Caesar', '#8'],
    ]),
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Quarterfinals → Final (1.0×)', id: '8 Besar → Final (1,0×)' } },
      { key: 'sf', multiplier: 0.75, label: { en: 'Babak Baru · Semifinals (0.75×)', id: 'Babak Baru · Semifinal (0,75×)' } },
    ],
    stages: [
      { key: 'qf', label: { en: 'Quarterfinals', id: 'Perempat Final' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'IBL Finals', id: 'Final IBL' } },
    ],
    nodes: [
      { id: 'qf1', stage: 'qf', roundLabel: { en: 'QF 1 · Bo5', id: '8 Besar 1 · Bo5' }, slotType: 'qf_winner', slotIndex: 1, points: 10, detailBonus: 4, detailOptions: ['3', '4', '5'], a: { seed: 'PJB' }, b: { seed: 'PCC' } },
      { id: 'qf2', stage: 'qf', roundLabel: { en: 'QF 2 · Bo5', id: '8 Besar 2 · Bo5' }, slotType: 'qf_winner', slotIndex: 2, points: 10, detailBonus: 4, detailOptions: ['3', '4', '5'], a: { seed: 'PRW' }, b: { seed: 'KBS' } },
      { id: 'qf3', stage: 'qf', roundLabel: { en: 'QF 3 · Bo5', id: '8 Besar 3 · Bo5' }, slotType: 'qf_winner', slotIndex: 3, points: 10, detailBonus: 4, detailOptions: ['3', '4', '5'], a: { seed: 'SMU' }, b: { seed: 'AHT' } },
      { id: 'qf4', stage: 'qf', roundLabel: { en: 'QF 4 · Bo5', id: '8 Besar 4 · Bo5' }, slotType: 'qf_winner', slotIndex: 4, points: 10, detailBonus: 4, detailOptions: ['3', '4', '5'], a: { seed: 'DUB' }, b: { seed: 'RSB' } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 1 · Bo5', id: 'Semifinal 1 · Bo5' }, slotType: 'sf_winner', slotIndex: 1, points: 20, detailBonus: 6, detailOptions: ['3', '4', '5'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf2' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'sf'], roundLabel: { en: 'Semifinal 2 · Bo5', id: 'Semifinal 2 · Bo5' }, slotType: 'sf_winner', slotIndex: 2, points: 20, detailBonus: 6, detailOptions: ['3', '4', '5'], a: { winnerOf: 'qf3' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'sf'], isFinal: true, roundLabel: { en: 'IBL Finals · Bo5', id: 'Final IBL 2027 · Bo5' }, slotType: 'final_winner', slotIndex: 1, points: 45, detailBonus: 10, detailOptions: ['3', '4', '5'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },

  'AFC-ASIAN-CUP-2027': {
    key: 'AFC-ASIAN-CUP-2027',
    shape: 'group-plus-ko',
    lockAt: '2027-12-23T15:00:00Z',
    seedNote: {
      en: 'Skenario Lolos Timnas Garuda (Group F vs Japan, Qatar, Thailand) → Knockout',
      id: 'Skenario Lolos Timnas Garuda (Grup F vs Jepang, Qatar, Thailand) → Fase Gugur',
    },
    detailLabel: { en: 'How match ends', id: 'Cara menang' },
    teams: teamMap([
      ['KSA', 'Arab Saudi', 'C1'],
      ['IRQ', 'Irak', 'C2'],
      ['OMN', 'Oman', 'C3'],
      ['KOR', 'Korea Selatan', 'D1'],
      ['UZB', 'Uzbekistan', 'D2'],
      ['JOR', 'Yordania', 'D3'],
      ['IRN', 'Iran', 'E1'],
      ['AUS', 'Australia', 'E2'],
      ['UAE', 'UEA', 'E3'],
      ['JPN', 'Jepang', 'F1'],
      ['QAT', 'Qatar', 'F2'],
      ['IDN', 'Indonesia', 'F3'],
      ['THA', 'Thailand', 'F4'],
    ]),
    groups: {
      C: ['KSA', 'IRQ', 'OMN'],
      D: ['KOR', 'UZB', 'JOR'],
      E: ['IRN', 'AUS', 'UAE'],
      F: ['JPN', 'IDN', 'QAT', 'THA'],
    },
    phases: [
      { key: 'full', multiplier: 1, label: { en: 'Groups + Knockout (1.0×)', id: 'Grup + Fase Gugur (1,0×)' } },
      { key: 'ko', multiplier: 0.75, label: { en: 'Babak Baru · Quarterfinals (0.75×)', id: 'Babak Baru · 8 Besar (0,75×)' } },
    ],
    stages: [
      { key: 'groups', label: { en: 'Group Path', id: 'Fase Grup' } },
      { key: 'qf', label: { en: 'Quarterfinals', id: '8 Besar' } },
      { key: 'sf', label: { en: 'Semifinals', id: 'Semifinal' } },
      { key: 'final', label: { en: 'Final Riyadh', id: 'Final Piala Asia' } },
    ],
    nodes: [
      { id: 'qf1', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 1', id: 'Perempat Final 1' }, slotType: 'qf_winner', slotIndex: 1, points: 20, detailBonus: 5, detailOptions: ['90m', 'ET', 'PEN'], a: { groupRankOf: { group: 'F', rank: 1 } }, b: { groupRankOf: { group: 'E', rank: 2 } } },
      { id: 'qf2', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 2', id: 'Perempat Final 2' }, slotType: 'qf_winner', slotIndex: 2, points: 20, detailBonus: 5, detailOptions: ['90m', 'ET', 'PEN'], a: { groupRankOf: { group: 'F', rank: 2 } }, b: { groupRankOf: { group: 'E', rank: 1 } } },
      { id: 'qf3', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 3', id: 'Perempat Final 3' }, slotType: 'qf_winner', slotIndex: 3, points: 20, detailBonus: 5, detailOptions: ['90m', 'ET', 'PEN'], a: { groupRankOf: { group: 'C', rank: 1 } }, b: { groupRankOf: { group: 'D', rank: 2 } } },
      { id: 'qf4', stage: 'qf', phases: ['full', 'ko'], roundLabel: { en: 'Quarterfinal 4', id: 'Perempat Final 4' }, slotType: 'qf_winner', slotIndex: 4, points: 20, detailBonus: 5, detailOptions: ['90m', 'ET', 'PEN'], a: { groupRankOf: { group: 'D', rank: 1 } }, b: { groupRankOf: { group: 'C', rank: 2 } } },
      { id: 'sf1', stage: 'sf', phases: ['full', 'ko'], roundLabel: { en: 'Semifinal 1', id: 'Semifinal 1' }, slotType: 'sf_winner', slotIndex: 1, points: 40, detailBonus: 8, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'qf1' }, b: { winnerOf: 'qf3' } },
      { id: 'sf2', stage: 'sf', phases: ['full', 'ko'], roundLabel: { en: 'Semifinal 2', id: 'Semifinal 2' }, slotType: 'sf_winner', slotIndex: 2, points: 40, detailBonus: 8, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'qf2' }, b: { winnerOf: 'qf4' } },
      { id: 'final', stage: 'final', phases: ['full', 'ko'], isFinal: true, roundLabel: { en: 'AFC Asian Cup Final', id: 'Final Piala Asia 2027' }, slotType: 'final_winner', slotIndex: 1, points: 80, detailBonus: 12, detailOptions: ['90m', 'ET', 'PEN'], a: { winnerOf: 'sf1' }, b: { winnerOf: 'sf2' } },
    ],
  },
});

const GROUP_IDX = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11 };

export function getTopology(competitionKey) {
  return TOPOLOGIES[competitionKey] || null;
}

export function createEmptyTopologyState(topology) {
  const groups = {};
  if (topology?.groups) {
    for (const [letter, codes] of Object.entries(topology.groups)) {
      groups[letter] = [...codes];
    }
  }
  return { nodes: {}, groups };
}

/**
 * Resolve a single endpoint source (`{ seed }`, `{ winnerOf }`, `{ loserOf }`,
 * `{ groupRankOf }`) against the user's current state.
 */
export function resolveSourceTeam(topology, state, src, _depth = 0) {
  if (!topology || !src || _depth > 16) return null;
  if (src.seed) return src.seed;
  if (src.groupRankOf) {
    const arr = state?.groups?.[src.groupRankOf.group] || topology.groups?.[src.groupRankOf.group] || [];
    return arr[src.groupRankOf.rank - 1] || null;
  }
  if (src.winnerOf) {
    return state?.nodes?.[src.winnerOf]?.winner || null;
  }
  if (src.loserOf) {
    const upstream = topology.nodes.find((n) => n.id === src.loserOf);
    if (!upstream) return null;
    const pickedWinner = state?.nodes?.[upstream.id]?.winner;
    if (!pickedWinner) return null;
    const teamA = resolveSourceTeam(topology, state, upstream.a, _depth + 1);
    const teamB = resolveSourceTeam(topology, state, upstream.b, _depth + 1);
    if (!teamA || !teamB) return null;
    if (pickedWinner === teamA) return teamB;
    if (pickedWinner === teamB) return teamA;
    return null;
  }
  return null;
}

/**
 * Resolve `[codeA, codeB]` for a node in the topology.
 */
export function resolveNodeTeams(topology, state, nodeId) {
  const node = topology?.nodes?.find((n) => n.id === nodeId);
  if (!node) return [null, null];
  return [
    resolveSourceTeam(topology, state, node.a),
    resolveSourceTeam(topology, state, node.b),
  ];
}

/**
 * Walk every node in topological order and prune any downstream node pick whose
 * chosen winner is no longer one of its two resolved entrants. Handles both
 * `winnerOf` AND `loserOf` cascades cleanly.
 */
export function pruneInvalidDownstream(topology, nextState) {
  const nodes = { ...(nextState?.nodes || {}) };
  const state = { groups: { ...(nextState?.groups || {}) }, nodes };
  let changed = true;
  let guard = 0;
  while (changed && guard < 20) {
    changed = false;
    guard++;
    for (const node of topology.nodes) {
      const cur = nodes[node.id];
      if (!cur?.winner) continue;
      const [a, b] = resolveNodeTeams(topology, state, node.id);
      if (cur.winner !== a && cur.winner !== b) {
        delete nodes[node.id];
        changed = true;
      }
    }
  }
  return state;
}

/**
 * Apply a winner (+ optional detail like '3-1' or '6') to `nodeId` and prune
 * any invalidated downstream picks.
 */
export function applyTopologyPick(topology, prevState, nodeId, winnerCode, detail = null) {
  if (!topology) return prevState;
  const base = prevState || createEmptyTopologyState(topology);
  const [a, b] = resolveNodeTeams(topology, base, nodeId);
  if (!winnerCode || (winnerCode !== a && winnerCode !== b)) return base;
  const prevNode = base.nodes?.[nodeId] || {};
  const nextNodes = {
    ...(base.nodes || {}),
    [nodeId]: {
      winner: winnerCode,
      detail: detail != null ? detail : (prevNode.winner === winnerCode ? prevNode.detail || null : null),
    },
  };
  return pruneInvalidDownstream(topology, {
    groups: { ...(base.groups || {}) },
    nodes: nextNodes,
  });
}

/**
 * Update only the detail chip (e.g. series length '6' or score '3-1') on an
 * already-picked node.
 */
export function applyTopologyDetail(topology, prevState, nodeId, detail) {
  const cur = prevState?.nodes?.[nodeId];
  if (!cur?.winner) return prevState;
  return {
    ...prevState,
    nodes: {
      ...prevState.nodes,
      [nodeId]: {
        ...cur,
        detail: cur.detail === detail ? null : detail,
      },
    },
  };
}

/**
 * Swap / promote a team's rank inside a group (`group-plus-ko` shape) and
 * cascade-prune downstream KO nodes if Top-2 qualifiers changed.
 */
export function promoteGroupTeam(topology, prevState, groupKey, teamCode, targetRank) {
  if (!topology?.groups?.[groupKey]) return prevState;
  const base = prevState || createEmptyTopologyState(topology);
  const current = [...(base.groups?.[groupKey] || topology.groups[groupKey])];
  const idx = current.indexOf(teamCode);
  const dest = Math.max(0, Math.min(current.length - 1, targetRank - 1));
  if (idx === -1 || idx === dest) return base;
  current.splice(idx, 1);
  current.splice(dest, 0, teamCode);
  return pruneInvalidDownstream(topology, {
    groups: { ...(base.groups || {}), [groupKey]: current },
    nodes: { ...(base.nodes || {}) },
  });
}

/**
 * Nodes active for a given entry phase ('full' vs Babak Baru phase).
 */
export function nodesForPhase(topology, phaseKey = 'full') {
  if (!topology) return [];
  if (!phaseKey || phaseKey === 'full') return topology.nodes;
  return topology.nodes.filter((n) => Array.isArray(n.phases) && n.phases.includes(phaseKey));
}

/**
 * Generate a fun, valid "Chaos / Upset" full bracket in 1 tap for /simulasi!
 */
export function randomizeTopologyState(topology, rng = Math.random) {
  if (!topology) return { nodes: {}, groups: {} };
  let state = createEmptyTopologyState(topology);
  if (topology.groups) {
    for (const [g, list] of Object.entries(topology.groups)) {
      const shuffled = [...list].sort(() => rng() - 0.5);
      state.groups[g] = shuffled;
    }
  }
  for (const node of topology.nodes) {
    const [a, b] = resolveNodeTeams(topology, state, node.id);
    if (!a || !b) continue;
    // Slight underdog tilt (55% slot B) so "Acak Skenario" produces spicy debates!
    const winner = rng() < 0.45 ? a : b;
    const opts = node.detailOptions || [];
    const detail = opts.length ? opts[Math.floor(rng() * opts.length)] : null;
    state = applyTopologyPick(topology, state, node.id, winner, detail);
  }
  return state;
}

/**
 * Summarize champion, runner-up, pick count, and max points for UI headers &
 * the g4-bracket share card.
 */
export function summarizeTopologyState(topology, state, phaseKey = 'full') {
  if (!topology) return { pickedCount: 0, totalNodes: 0, maxPoints: 0, champion: null, runnerUp: null };
  const activeNodes = nodesForPhase(topology, phaseKey);
  const phase = topology.phases?.find((p) => p.key === phaseKey) || { multiplier: 1 };
  const mult = phase.multiplier ?? 1;

  let pickedCount = 0;
  let maxPoints = 0;
  for (const n of activeNodes) {
    if (state?.nodes?.[n.id]?.winner) pickedCount++;
    maxPoints += Math.round(((n.points || 0) + (n.detailBonus || 0)) * mult);
  }
  if (phaseKey === 'full' && topology.groups) {
    maxPoints += Object.keys(topology.groups).length * 8; // +5 rank1, +3 rank2
  }

  const finalNode = topology.nodes.find((n) => n.isFinal) || topology.nodes[topology.nodes.length - 1];
  const championCode = finalNode ? state?.nodes?.[finalNode.id]?.winner || null : null;
  let runnerUpCode = null;
  if (finalNode && championCode) {
    const [fa, fb] = resolveNodeTeams(topology, state, finalNode.id);
    runnerUpCode = championCode === fa ? fb : fa;
  }

  return {
    pickedCount,
    totalNodes: activeNodes.length,
    complete: activeNodes.length > 0 && pickedCount === activeNodes.length,
    maxPoints,
    multiplier: mult,
    champion: championCode ? (topology.teams[championCode] || { code: championCode, name: championCode }) : null,
    runnerUp: runnerUpCode ? (topology.teams[runnerUpCode] || { code: runnerUpCode, name: runnerUpCode }) : null,
    finalDetail: finalNode ? state?.nodes?.[finalNode.id]?.detail || null : null,
  };
}

/**
 * Pure deterministic scoring of a user's topology state against official results.
 * `results` has shape `{ nodes: { [nodeId]: { winner, detail } }, groups?: { [g]: [rank1, rank2, ...] } }`.
 */
export function scoreTopologyPicks(topology, state, results, phaseKey = 'full') {
  if (!topology || !state || !results) return { total: 0, exactDetails: 0, correctWinners: 0, perNode: {} };
  const phase = topology.phases?.find((p) => p.key === phaseKey) || { multiplier: 1 };
  const mult = phase.multiplier ?? 1;
  const activeIds = new Set(nodesForPhase(topology, phaseKey).map((n) => n.id));

  let rawTotal = 0;
  let correctWinners = 0;
  let exactDetails = 0;
  const perNode = {};

  if (phaseKey === 'full' && topology.groups && results.groups) {
    for (const [g, actualOrder] of Object.entries(results.groups)) {
      const userOrder = state.groups?.[g] || [];
      if (actualOrder[0] && userOrder[0] === actualOrder[0]) rawTotal += 5;
      if (actualOrder[1] && userOrder[1] === actualOrder[1]) rawTotal += 3;
    }
  }

  for (const node of topology.nodes) {
    if (!activeIds.has(node.id)) continue;
    const pick = state.nodes?.[node.id];
    const res = results.nodes?.[node.id];
    if (!pick?.winner || !res?.winner) continue;
    if (pick.winner === res.winner) {
      correctWinners++;
      let pts = node.points || 0;
      if (pick.detail && res.detail && String(pick.detail) === String(res.detail)) {
        pts += node.detailBonus || 0;
        exactDetails++;
      }
      perNode[node.id] = Math.round(pts * mult);
      rawTotal += pts;
    } else {
      perNode[node.id] = 0;
    }
  }

  return {
    total: Math.round(rawTotal * mult),
    correctWinners,
    exactDetails,
    multiplier: mult,
    perNode,
  };
}

/**
 * Encode topology state into `public.picks` slot rows compatible with migration
 * 0016 (`slot_type`, `slot_index`, `picked_team_code`).
 */
export function encodeTopologyToSlots(topology, state) {
  if (!topology || !state) return [];
  const slots = [];
  if (topology.groups && state.groups) {
    for (const [letter, order] of Object.entries(state.groups)) {
      const gIdx = GROUP_IDX[letter];
      if (gIdx == null || !Array.isArray(order)) continue;
      order.slice(0, 2).forEach((code, idx) => {
        if (!code) return;
        slots.push({
          slot_type: 'group_rank',
          slot_index: gIdx * 3 + (idx + 1),
          picked_team_code: String(code).toUpperCase(),
        });
      });
    }
  }

  for (const node of topology.nodes) {
    const pick = state.nodes?.[node.id];
    if (!pick?.winner) continue;
    const encoded = pick.detail ? `${pick.winner}:${pick.detail}` : pick.winner;
    slots.push({
      slot_type: node.slotType,
      slot_index: node.slotIndex,
      picked_team_code: encoded,
    });
    if (node.isFinal) {
      slots.push({
        slot_type: 'champion',
        slot_index: 1,
        picked_team_code: pick.winner,
      });
    }
  }
  return slots;
}

/**
 * Reconstruct `{ nodes, groups }` from `public.picks` slot rows.
 */
export function decodeSlotsToTopology(topology, slotRows = []) {
  const state = createEmptyTopologyState(topology);
  if (!topology || !Array.isArray(slotRows)) return state;

  if (topology.groups) {
    const rankPicks = slotRows.filter((r) => r.slot_type === 'group_rank');
    for (const [letter, defaults] of Object.entries(topology.groups)) {
      const gIdx = GROUP_IDX[letter];
      const r1 = rankPicks.find((r) => r.slot_index === gIdx * 3 + 1)?.picked_team_code;
      const r2 = rankPicks.find((r) => r.slot_index === gIdx * 3 + 2)?.picked_team_code;
      const ordered = [];
      if (r1 && defaults.includes(r1)) ordered.push(r1);
      if (r2 && defaults.includes(r2) && !ordered.includes(r2)) ordered.push(r2);
      for (const c of defaults) if (!ordered.includes(c)) ordered.push(c);
      state.groups[letter] = ordered;
    }
  }

  for (const node of topology.nodes) {
    const row = slotRows.find(
      (r) => r.slot_type === node.slotType && Number(r.slot_index) === node.slotIndex
    );
    if (!row?.picked_team_code) continue;
    const [winner, detail] = String(row.picked_team_code).split(':');
    if (winner && topology.teams[winner]) {
      state.nodes[node.id] = { winner, detail: detail || null };
    }
  }

  return pruneInvalidDownstream(topology, state);
}

/**
 * Compact URL query state (`?s=...`) so shared `/simulasi/:comp?s=...` links
 * hydrate a friend's exact Dream Bracket in WhatsApp with zero DB writes!
 */
export function encodeSimQuery(topology, state) {
  if (!topology || !state) return '';
  const parts = [];
  if (topology.groups && state.groups) {
    const gStr = Object.keys(topology.groups)
      .map((g) => `${g}.${(state.groups[g] || []).slice(0, 2).join('-')}`)
      .join('_');
    if (gStr) parts.push(`G~${gStr}`);
  }
  const nStr = topology.nodes
    .map((n, idx) => {
      const p = state.nodes?.[n.id];
      if (!p?.winner) return null;
      return `${idx}.${p.winner}${p.detail ? `-${p.detail}` : ''}`;
    })
    .filter(Boolean)
    .join('_');
  if (nStr) parts.push(`N~${nStr}`);
  return parts.join('!');
}

export function decodeSimQuery(topology, raw) {
  const state = createEmptyTopologyState(topology);
  if (!topology || !raw || typeof raw !== 'string') return state;
  for (const section of raw.split('!')) {
    if (section.startsWith('G~') && topology.groups) {
      for (const item of section.slice(2).split('_')) {
        const [g, rest] = item.split('.');
        if (!topology.groups[g] || !rest) continue;
        const top = rest.split('-').filter((c) => topology.groups[g].includes(c));
        const full = [...new Set([...top, ...topology.groups[g]])];
        state.groups[g] = full;
      }
    } else if (section.startsWith('N~')) {
      for (const item of section.slice(2).split('_')) {
        const [idxStr, val] = item.split('.');
        const node = topology.nodes[Number(idxStr)];
        if (!node || !val) continue;
        const dash = val.indexOf('-');
        const winner = dash === -1 ? val : val.slice(0, dash);
        const detail = dash === -1 ? null : val.slice(dash + 1);
        if (topology.teams[winner]) {
          state.nodes[node.id] = { winner, detail };
        }
      }
    }
  }
  return pruneInvalidDownstream(topology, state);
}
