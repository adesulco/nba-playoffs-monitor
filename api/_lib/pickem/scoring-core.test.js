// Vitest suite for scoring-core.js — Scoring Spec v1 (doc 17 §1).
// The shared vectors in scoring-vectors.json are the contract with the SQL
// engine; scripts/test-scoring-parity.mjs runs the same cases against prod.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  resolveScoringConfig, rulesRowToConfig, templateConfig, SPEC_V1_DEFAULTS, NEW_DEFAULTS,
  deriveOutcome, tierFor, ladderPoints, basePoints, pointsFor,
  jagoanMultiplier, jagoanPenalty, underdogMultiplier, scoreMatchPrediction,
  aggregateMatchday, streakBonus, memberPoints, previewScoring,
  scoreGroupRanking, scoreKnockoutPick,
} from './scoring-core.js';

const vectors = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'scoring-vectors.json'), 'utf8'));
const STD = resolveScoringConfig(null, null);
const SULTAN = resolveScoringConfig({ template: 'sultan' }, null);

const toPrediction = (p) => ({
  pickedOutcome: p.picked_outcome, pickedHome: p.picked_home ?? null, pickedAway: p.picked_away ?? null,
  isJagoan: p.is_jagoan === true, consensusAtLock: p.consensus_at_lock ?? null,
});

describe('scoring-vectors.json (shared contract with the SQL engine)', () => {
  it('has at least 40 match cases', () => expect(vectors.cases.length).toBeGreaterThanOrEqual(40));
  for (const c of vectors.cases) {
    it(c.name, () => {
      const cfg = resolveScoringConfig(c.config, c.rules || null);
      const s = scoreMatchPrediction(toPrediction(c.prediction), { homeScore: c.fixture.home_score, awayScore: c.fixture.away_score }, cfg);
      expect({ tier: s.tier, awarded: s.awarded, penalty: s.penalty }).toEqual(c.expect);
    });
  }
  for (const a of vectors.aggregation) {
    it(`aggregation: ${a.name}`, () => {
      const cfg = resolveScoringConfig(a.config, null);
      expect(memberPoints(a.rows.map((r) => ({ ...r, isJagoan: r.isJagoan === true, consensusAtLock: r.consensusAtLock ?? null })), cfg, a.basePoints)).toEqual(a.expect);
    });
  }
});

describe('resolveScoringConfig', () => {
  it('defaults are Spec v1', () => {
    expect(STD.ladder).toEqual({ exact: 5, margin: 3, outcome: 2, nyaris: 1 });
    expect(STD.jagoan).toEqual({ mult: 2, penalty: 0 });
    expect(STD.underdog).toEqual({ threshold: 0.30, multiplier: 1.5 });
    expect(STD.stackCap).toBe(4);
    expect(STD.streak).toEqual({ len: 3, bonus: 0 });
    expect(STD.knockoutPts).toEqual({ r32: 10, r16: 12, qf: 15, sf: 20, final: 30 });
    expect(NEW_DEFAULTS).toBe(SPEC_V1_DEFAULTS);
  });
  it('order: defaults ← rules row ← template ← overrides', () => {
    const row = { pts_exact: 8, pts_goaldiff: 5, pts_outcome: 3, jagoan_mult: 2, jagoan_penalty: 0, streak_bonus: 0 };
    const cfg = resolveScoringConfig({ template: 'sultan', score_exact: 9 }, row);
    expect(cfg.ladder.exact).toBe(9);          // override
    expect(cfg.ladder.margin).toBe(5);         // row
    expect(cfg.jagoan.penalty).toBe(0.25);     // template beats row
    expect(cfg.streak.bonus).toBe(3);
    expect(cfg.template).toBe('sultan');
  });
  it('templates match the SQL literal', () => {
    expect(templateConfig('santai')).toEqual({ jagoan_multiplier: 1, jagoan_penalty: 0, underdog_multiplier: 1, streak_bonus: 0 });
    expect(templateConfig('nope')).toEqual(templateConfig('standar'));
    expect(SULTAN.jagoan.penalty).toBe(0.25);
  });
  it('maps a 0021 rules row and tolerates the 0015 names', () => {
    expect(rulesRowToConfig({ pts_nyaris: 2, jagoan_mult: 3, bracket_pts_final: 40 })).toMatchObject({ score_nyaris: 2, jagoan_multiplier: 3, knockout_pts: expect.objectContaining({ final: 40 }) });
    expect(rulesRowToConfig({ jagoan_mult_group: 2.5, bracket_pts_finalist: 160 })).toMatchObject({ jagoan_multiplier: 2.5 });
    expect(rulesRowToConfig(null)).toEqual({});
  });
  it('junk values fall back to defaults', () => {
    const cfg = resolveScoringConfig({ score_exact: 'x', jagoan_multiplier: NaN, stack_cap: null }, null);
    expect(cfg.ladder.exact).toBe(5); expect(cfg.jagoan.mult).toBe(2); expect(cfg.stackCap).toBe(4);
  });
  it('numeric strings from PostgREST numerics are accepted', () => {
    expect(resolveScoringConfig(null, { jagoan_mult: '2.00', underdog_threshold: '0.30' }).jagoan.mult).toBe(2);
  });
});

describe('deriveOutcome / tierFor', () => {
  it('H / A / D / void', () => {
    expect(deriveOutcome(2, 1)).toBe('H'); expect(deriveOutcome(0, 1)).toBe('A');
    expect(deriveOutcome(1, 1)).toBe('D'); expect(deriveOutcome(null, 1)).toBe(null);
  });
  it('ignores the stored outcome: 1–1 pick on 1–1 game is exact even if outcome says H', () => {
    expect(tierFor({ pickedOutcome: 'D', pickedHome: 1, pickedAway: 1 }, { homeScore: 1, awayScore: 1, outcome: 'H' })).toBe('exact');
  });
  it('nyaris boundary: totals differ by 1 → nyaris, by 2 → miss', () => {
    expect(tierFor({ pickedOutcome: 'H', pickedHome: 2, pickedAway: 0 }, { homeScore: 0, awayScore: 1 })).toBe('nyaris');
    expect(tierFor({ pickedOutcome: 'H', pickedHome: 3, pickedAway: 0 }, { homeScore: 0, awayScore: 1 })).toBe('miss');
  });
  it('basePoints (compat) = ladderPoints(tierFor)', () => {
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 3, pickedAway: 2 }, { homeScore: 2, awayScore: 1 }, STD)).toBe(3);
    expect(ladderPoints('void', STD)).toBe(0);
  });
});

describe('multipliers and penalty', () => {
  it('jagoan is flat ×mult', () => {
    expect(jagoanMultiplier({ isJagoan: true }, STD)).toBe(2);
    expect(jagoanMultiplier({ isJagoan: false }, STD)).toBe(1);
  });
  it('underdog strict <', () => {
    expect(underdogMultiplier({ consensusAtLock: 0.2999 }, STD)).toBe(1.5);
    expect(underdogMultiplier({ consensusAtLock: 0.30 }, STD)).toBe(1);
    expect(underdogMultiplier({ consensusAtLock: '0.1' }, STD)).toBe(1.5);
    expect(underdogMultiplier({ consensusAtLock: undefined }, STD)).toBe(1);
  });
  it('penalty only for a jagoan miss/nyaris under a config with penalty on', () => {
    expect(jagoanPenalty({ isJagoan: true, tier: 'miss' }, STD)).toBe(0);
    expect(jagoanPenalty({ isJagoan: true, tier: 'miss' }, SULTAN)).toBe(1);
    expect(jagoanPenalty({ isJagoan: true, tier: 'nyaris' }, SULTAN)).toBe(1);
    expect(jagoanPenalty({ isJagoan: true, tier: 'void' }, SULTAN)).toBe(0);
    expect(jagoanPenalty({ isJagoan: true, tier: 'result' }, SULTAN)).toBe(0);
    expect(jagoanPenalty({ isJagoan: false, tier: 'miss' }, SULTAN)).toBe(0);
  });
  it('pointsFor: nyaris takes no multipliers; cap at stack_cap × base', () => {
    expect(pointsFor('nyaris', { isJagoan: true, consensusAtLock: 0 }, STD)).toBe(1);
    const cfg = resolveScoringConfig({ jagoan_multiplier: 10 }, null);
    expect(pointsFor('exact', { isJagoan: true, consensusAtLock: null }, cfg)).toBe(20);
  });
  it('scoreMatchPrediction reports capped and the audit multipliers', () => {
    const cfg = resolveScoringConfig({ jagoan_multiplier: 10 }, null);
    const s = scoreMatchPrediction({ pickedOutcome: 'H', pickedHome: 2, pickedAway: 1, isJagoan: true }, { homeScore: 2, awayScore: 1 }, cfg);
    expect(s).toMatchObject({ tier: 'exact', base: 5, jagoanMult: 10, underdogMult: 1, awarded: 20, capped: true });
    const w = scoreMatchPrediction({ pickedOutcome: 'A', isJagoan: true, consensusAtLock: 0.1 }, { homeScore: 2, awayScore: 1 }, cfg);
    expect(w).toMatchObject({ tier: 'miss', jagoanMult: 1, underdogMult: 1, awarded: 0 });
  });
});

describe('aggregateMatchday / streakBonus / memberPoints', () => {
  it('floors at 0', () => {
    expect(aggregateMatchday([{ awarded: 5, penalty: 0 }, { awarded: 0, penalty: 1 }])).toBe(4);
    expect(aggregateMatchday([{ awarded: 0, penalty: 8 }])).toBe(0);
    expect(aggregateMatchday([])).toBe(0);
  });
  it('streakBonus resets after each completed run', () => {
    expect(streakBonus([true, true, true], SULTAN)).toBe(3);
    expect(streakBonus([true, true, true, true, true, true], SULTAN)).toBe(6);
    expect(streakBonus([true, true, false, true, true, true], SULTAN)).toBe(3);
    expect(streakBonus([true, true, true], STD)).toBe(0);
  });
  it('memberPoints: late-join par is added, void rows skipped, empty → par', () => {
    expect(memberPoints([], STD, 7)).toEqual({ points: 7, exactCount: 0, nyarisCount: 0 });
    expect(memberPoints([{ id: 'x', matchday: 1, tier: 'void', isJagoan: true }], SULTAN, 0).points).toBe(0);
  });
});

describe('previewScoring', () => {
  it('shows each tier for a scoreline pick, outcome-only otherwise', () => {
    expect(previewScoring({ pickedHome: 2, pickedAway: 1, isJagoan: true }, STD)).toMatchObject({ jagoanMult: 2, exactPoints: 10, goalDiffPoints: 6, outcomePoints: 4, nyarisPoints: 1, bestCaseLabel: 'exact', bestCasePoints: 10 });
    expect(previewScoring({ pickedHome: null, pickedAway: null, isJagoan: false }, STD)).toMatchObject({ exactPoints: null, outcomePoints: 2, bestCaseLabel: 'outcome', bestCasePoints: 2 });
  });
});

describe('bracket: scoreGroupRanking / scoreKnockoutPick', () => {
  const actual = ['FRA', 'SEN', 'IRQ', 'NOR'];
  it('all exact → 4×4 + 8 = 24; two exact → 8', () => {
    expect(scoreGroupRanking(actual, actual, STD)).toEqual({ exact: 4, points: 24, perfect: true });
    expect(scoreGroupRanking(['FRA', 'SEN', 'NOR', 'IRQ'], actual, STD)).toEqual({ exact: 2, points: 8, perfect: false });
    expect(scoreGroupRanking([], actual, STD)).toEqual({ exact: 0, points: 0, perfect: false });
  });
  it('knockout escalates r32 10 → final 30, case-insensitive, unknown 0', () => {
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'r32' }, STD)).toBe(10);
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'FINAL' }, STD)).toBe(30);
    expect(scoreKnockoutPick({ pickedTeam: 'BRA', advancingTeam: 'ARG', stage: 'sf' }, STD)).toBe(0);
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'r128' }, STD)).toBe(0);
  });
});
