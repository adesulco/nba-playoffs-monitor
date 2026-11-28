import { describe, it, expect } from 'vitest';
import {
  TOPOLOGIES,
  TOPOLOGY_SHAPES,
  getTopology,
  createEmptyTopologyState,
  resolveNodeTeams,
  applyTopologyPick,
  promoteGroupTeam,
  randomizeTopologyState,
  summarizeTopologyState,
  scoreTopologyPicks,
  encodeTopologyToSlots,
  decodeSlotsToTopology,
  encodeSimQuery,
  decodeSimQuery,
} from './playoffTopology.js';

describe('playoffTopology — 5-shape DAG engine', () => {
  it('covers all 5 canonical playoff shapes with unique (slotType, slotIndex) mappings', () => {
    const shapesPresent = new Set(Object.values(TOPOLOGIES).map((t) => t.shape));
    for (const s of TOPOLOGY_SHAPES) {
      expect(shapesPresent.has(s), `missing shape ${s}`).toBe(true);
    }

    for (const topo of Object.values(TOPOLOGIES)) {
      const seenSlots = new Set();
      for (const n of topo.nodes) {
        const key = `${n.slotType}:${n.slotIndex}`;
        expect(seenSlots.has(key), `${topo.key} duplicate slot ${key}`).toBe(false);
        seenSlots.add(key);
      }
      expect(topo.nodes.some((n) => n.isFinal), `${topo.key} has final`).toBe(true);
    }
  });

  it('double-elim (M8-KO-2027) propagates winners to Upper and losers to Lower Bracket, and prunes cleanly on flip', () => {
    const topo = getTopology('M8-KO-2027');
    let state = createEmptyTopologyState(topo);

    // BTR beats TSP in ub_qf1; TLP beats ONI in ub_qf2
    state = applyTopologyPick(topo, state, 'ub_qf1', 'BTR', '3-1');
    state = applyTopologyPick(topo, state, 'ub_qf2', 'TLP', '3-2');

    // Upper SF1 should be BTR vs TLP; Lower R1_1 should be losers TSP vs ONI!
    expect(resolveNodeTeams(topo, state, 'ub_sf1')).toEqual(['BTR', 'TLP']);
    expect(resolveNodeTeams(topo, state, 'lb_r1_1')).toEqual(['TSP', 'ONI']);

    // Advance BTR in ub_sf1 and ONI in lb_r1_1 -> lb_qf2 gets loserOf(ub_sf1)=TLP!
    state = applyTopologyPick(topo, state, 'ub_sf1', 'BTR', '3-0');
    state = applyTopologyPick(topo, state, 'lb_r1_1', 'ONI', '3-1');
    expect(resolveNodeTeams(topo, state, 'lb_qf1')[1]).toBe('ONI');

    // Flip ub_qf1 winner from BTR to TSP:
    // - ub_sf1 winner 'BTR' must be pruned!
    // - lb_r1_1 entrants become ['BTR', 'ONI'] (still contains ONI, so ONI pick survives!)
    state = applyTopologyPick(topo, state, 'ub_qf1', 'TSP', '3-2');
    expect(state.nodes.ub_sf1).toBeUndefined();
    expect(resolveNodeTeams(topo, state, 'lb_r1_1')).toEqual(['BTR', 'ONI']);
    expect(state.nodes.lb_r1_1?.winner).toBe('ONI');
  });

  it('group-plus-ko (AFC-ASIAN-CUP-2027) routes Group F top 2 into QF and prunes on rank swap', () => {
    const topo = getTopology('AFC-ASIAN-CUP-2027');
    let state = createEmptyTopologyState(topo);

    // Promote Indonesia (IDN) to #1 in Group F!
    state = promoteGroupTeam(topo, state, 'F', 'IDN', 1);
    expect(state.groups.F[0]).toBe('IDN');
    expect(resolveNodeTeams(topo, state, 'qf1')[0]).toBe('IDN');

    state = applyTopologyPick(topo, state, 'qf1', 'IDN', '90m');
    expect(state.nodes.qf1.winner).toBe('IDN');

    // Demote IDN to #3 in Group F -> qf1 winner IDN must be pruned
    state = promoteGroupTeam(topo, state, 'F', 'IDN', 3);
    expect(state.nodes.qf1).toBeUndefined();
  });

  it('round-trips through DB slots and URL query string losslessly', () => {
    let i = 0;
    const seq = [0.2, 0.8, 0.3, 0.7, 0.1, 0.9, 0.4, 0.6];
    const rng = () => seq[i++ % seq.length];

    for (const key of ['M8-KO-2027', 'UCL-KO-2026-27', 'NBA-Playoffs-2027', 'SUDIRMAN-2027', 'ID-Masters-2027']) {
      const topo = getTopology(key);
      const full = randomizeTopologyState(topo, rng);
      const summary = summarizeTopologyState(topo, full, 'full');
      expect(summary.complete).toBe(true);
      expect(summary.champion).toBeTruthy();

      const slots = encodeTopologyToSlots(topo, full);
      const fromSlots = decodeSlotsToTopology(topo, slots);
      expect(fromSlots).toEqual(full);

      const q = encodeSimQuery(topo, full);
      const fromQuery = decodeSimQuery(topo, q);
      expect(fromQuery).toEqual(full);
    }
  });

  it('scores full and Babak Baru (0.75x) brackets accurately including exact series detail bonus', () => {
    const topo = getTopology('NBA-Playoffs-2027');
    let state = createEmptyTopologyState(topo);
    state = applyTopologyPick(topo, state, 'w_sf1', 'OKC', '6');
    state = applyTopologyPick(topo, state, 'w_sf2', 'LAL', '7');
    state = applyTopologyPick(topo, state, 'e_sf1', 'BOS', '5');
    state = applyTopologyPick(topo, state, 'e_sf2', 'NYK', '6');
    state = applyTopologyPick(topo, state, 'w_cf', 'OKC', '6');
    state = applyTopologyPick(topo, state, 'e_cf', 'BOS', '7');
    state = applyTopologyPick(topo, state, 'nba_finals', 'OKC', '6');

    const results = {
      nodes: {
        w_sf1: { winner: 'OKC', detail: '6' },      // 15 + 5 = 20
        w_sf2: { winner: 'DEN', detail: '6' },      // miss = 0
        e_sf1: { winner: 'BOS', detail: '4' },      // winner right, detail off = 15
        e_sf2: { winner: 'NYK', detail: '6' },      // 15 + 5 = 20
        w_cf: { winner: 'OKC', detail: '6' },       // 30 + 8 = 38
        e_cf: { winner: 'BOS', detail: '7' },       // 30 + 8 = 38
        nba_finals: { winner: 'OKC', detail: '6' }, // 60 + 12 = 72
      },
    };

    const fullScore = scoreTopologyPicks(topo, state, results, 'full');
    expect(fullScore.total).toBe(20 + 0 + 15 + 20 + 38 + 38 + 72);
    expect(fullScore.correctWinners).toBe(6);
    expect(fullScore.exactDetails).toBe(5);

    // Babak Baru 'cf' only scores w_cf (38) + e_cf (38) + nba_finals (72) = 148 * 0.75 = 111
    const babakBaruScore = scoreTopologyPicks(topo, state, results, 'cf');
    expect(babakBaruScore.total).toBe(Math.round((38 + 38 + 72) * 0.75));
  });
});
