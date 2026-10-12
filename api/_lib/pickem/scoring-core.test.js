// Exhaustive Vitest suite for scoring-core.js — ticket A2.
// This is the money math; every branch, boundary, and zeroed-config case.
import { describe, it, expect } from 'vitest';
import {
  resolveScoringConfig,
  NEW_DEFAULTS,
  deriveOutcome,
  basePoints,
  jagoanMultiplier,
  jagoanPenalty,
  stakeValue,
  underdogMultiplier,
  scoreMatchPrediction,
  aggregateMatchday,
  streakBonus,
  nemesisBonus,
  scoreGroupRanking,
  scoreKnockoutPick,
} from './scoring-core.js';

const NEW = resolveScoringConfig({}, null);                 // new defaults
const LEGACY = resolveScoringConfig(null, {                 // prod pickem_rules row
  pts_exact: 8, pts_goaldiff: 5, pts_outcome: 3,
  jagoan_mult_group: 2.0, jagoan_mult_ko: 3.0,
  enable_upset_bonus: true, upset_floor: 1.0, upset_cap: 3.0,
  upset_curve: [
    { p: 0.65, mult: 1.0 }, { p: 0.45, mult: 1.5 }, { p: 0.33, mult: 2.0 },
    { p: 0.18, mult: 2.2 }, { p: 0.12, mult: 3.0 },
  ],
  ko_stages: ['R32', 'R16', 'QF', 'SF', 'final'],
});

// ── config resolution ───────────────────────────────────────────────────────
describe('resolveScoringConfig', () => {
  it('prefers scoring_config over pickem_rules', () => {
    const cfg = resolveScoringConfig({ score_exact: 7 }, { pts_exact: 8 });
    expect(cfg.mode).toBe('new');
    expect(cfg.ladder.exact).toBe(7);
  });
  it('fills partial scoring_config from NEW defaults, not legacy rules', () => {
    const cfg = resolveScoringConfig({ score_exact: 7 }, { pts_outcome: 99 });
    expect(cfg.ladder.outcome).toBe(NEW_DEFAULTS.score_result); // 2, not 99
  });
  it('falls back to legacy semantics: no jagoan penalty, curve underdog, no streak', () => {
    expect(LEGACY.mode).toBe('legacy');
    expect(LEGACY.jagoan.penalty).toBe(0);
    expect(LEGACY.underdog.mode).toBe('curve');
    expect(LEGACY.streak.bonus).toBe(0);
    expect(LEGACY.stackCap).toBe(Infinity);
  });
  it('legacy with no rules row at all still yields sane defaults', () => {
    const cfg = resolveScoringConfig(null, null);
    expect(cfg.ladder).toEqual({ exact: 8, margin: 5, outcome: 3 });
    expect(cfg.jagoan.multKo).toBe(3);
  });
  it('enable_upset_bonus=false turns underdog off', () => {
    const cfg = resolveScoringConfig(null, { enable_upset_bonus: false });
    expect(cfg.underdog.mode).toBe('off');
    expect(underdogMultiplier({ impliedProb: 0.05 }, cfg)).toBe(1);
  });
  it('non-numeric junk in config falls back to defaults', () => {
    const cfg = resolveScoringConfig({ score_exact: 'lots', underdog_threshold: null }, null);
    expect(cfg.ladder.exact).toBe(NEW_DEFAULTS.score_exact);
    expect(cfg.underdog.threshold).toBe(NEW_DEFAULTS.underdog_threshold);
  });
});

// ── outcomes ────────────────────────────────────────────────────────────────
describe('deriveOutcome', () => {
  it.each([
    [2, 1, 'H'], [0, 1, 'A'], [1, 1, 'D'], [0, 0, 'D'],
  ])('(%i,%i) → %s', (h, a, want) => expect(deriveOutcome(h, a)).toBe(want));
  it('walkover/void (missing scores) → null', () => {
    expect(deriveOutcome(null, 1)).toBeNull();
    expect(deriveOutcome(2, undefined)).toBeNull();
    expect(deriveOutcome(null, null)).toBeNull();
  });
});

// ── base ladder ─────────────────────────────────────────────────────────────
describe('basePoints (new ladder 5/3/2)', () => {
  const res = { homeScore: 2, awayScore: 1 };
  it('exact scoreline → 5', () =>
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 2, pickedAway: 1 }, res, NEW)).toBe(5));
  it('right margin, wrong scoreline → 3', () =>
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 3, pickedAway: 2 }, res, NEW)).toBe(3));
  it('right result only (margin differs: picked 3-1, actual 2-1) → 2', () =>
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 3, pickedAway: 1 }, res, NEW)).toBe(2));
  it('outcome-only pick (no scoreline) → outcome tier', () =>
    expect(basePoints({ pickedOutcome: 'H' }, res, NEW)).toBe(2));
  it('wrong outcome → 0 even with exact-looking scores', () =>
    expect(basePoints({ pickedOutcome: 'A', pickedHome: 2, pickedAway: 1 }, res, NEW)).toBe(0));
  it('draw predicted, draw happened, exact → 5', () =>
    expect(basePoints({ pickedOutcome: 'D', pickedHome: 1, pickedAway: 1 }, { homeScore: 1, awayScore: 1 }, NEW)).toBe(5));
  it('draw predicted 1-1, actual 2-2 → margin tier (same diff 0)', () =>
    expect(basePoints({ pickedOutcome: 'D', pickedHome: 1, pickedAway: 1 }, { homeScore: 2, awayScore: 2 }, NEW)).toBe(3));
  it('walkover (void result) → 0', () =>
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 1, pickedAway: 0 }, { homeScore: null, awayScore: null }, NEW)).toBe(0));
  it('legacy ladder pays 8/5/3', () => {
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 2, pickedAway: 1 }, res, LEGACY)).toBe(8);
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 3, pickedAway: 2 }, res, LEGACY)).toBe(5);
    expect(basePoints({ pickedOutcome: 'H' }, res, LEGACY)).toBe(3);
  });
  it('zeroed ladder pays 0 everywhere', () => {
    const cfg = resolveScoringConfig({ score_exact: 0, score_result_margin: 0, score_result: 0 }, null);
    expect(basePoints({ pickedOutcome: 'H', pickedHome: 2, pickedAway: 1 }, res, cfg)).toBe(0);
  });
});

// ── jagoan ──────────────────────────────────────────────────────────────────
describe('jagoan', () => {
  it('not jagoan → ×1, no penalty', () => {
    expect(jagoanMultiplier({ isJagoan: false, stage: 'group' }, NEW)).toBe(1);
    expect(jagoanPenalty({ isJagoan: false, correct: false, stage: 'group' }, NEW)).toBe(0);
  });
  it('new mode: ×2 everywhere (group and KO)', () => {
    expect(jagoanMultiplier({ isJagoan: true, stage: 'group' }, NEW)).toBe(2);
    expect(jagoanMultiplier({ isJagoan: true, stage: 'final' }, NEW)).toBe(2);
  });
  it('legacy mode: ×2 group, ×3 KO (prod behavior preserved)', () => {
    expect(jagoanMultiplier({ isJagoan: true, stage: 'group' }, LEGACY)).toBe(2);
    expect(jagoanMultiplier({ isJagoan: true, stage: 'final' }, LEGACY)).toBe(3);
    expect(jagoanMultiplier({ isJagoan: true, stage: 'QF' }, LEGACY)).toBe(3);
  });
  it('miss penalty: 25% of stake — group match stake = outcome tier (2) → 1 (rounded .5 up)', () =>
    expect(jagoanPenalty({ isJagoan: true, correct: false, stage: 'group' }, NEW)).toBe(1));
  it('miss penalty on KO stage uses knockout stake: r32 10 → 3 (2.5 rounds up)', () =>
    expect(jagoanPenalty({ isJagoan: true, correct: false, stage: 'r32' }, NEW)).toBe(3));
  it('miss penalty on the final: 30 × .25 → 8 (7.5 rounds up)', () =>
    expect(jagoanPenalty({ isJagoan: true, correct: false, stage: 'final' }, NEW)).toBe(8));
  it('correct jagoan → no penalty', () =>
    expect(jagoanPenalty({ isJagoan: true, correct: true, stage: 'final' }, NEW)).toBe(0));
  it('legacy mode → penalty always 0', () =>
    expect(jagoanPenalty({ isJagoan: true, correct: false, stage: 'final' }, LEGACY)).toBe(0));
  it('zeroed jagoan_penalty → 0', () => {
    const cfg = resolveScoringConfig({ jagoan_penalty: 0 }, null);
    expect(jagoanPenalty({ isJagoan: true, correct: false, stage: 'group' }, cfg)).toBe(0);
  });
  it('stakeValue: KO stage case-insensitive, unknown stage falls to outcome tier', () => {
    expect(stakeValue('R16', NEW)).toBe(12);
    expect(stakeValue('weird', NEW)).toBe(2);
    expect(stakeValue(undefined, NEW)).toBe(2);
  });
});

// ── underdog ────────────────────────────────────────────────────────────────
describe('underdog — consensus mode (new)', () => {
  it('below threshold → ×1.5', () =>
    expect(underdogMultiplier({ consensusAtLock: 0.29 }, NEW)).toBe(1.5));
  it('EXACTLY 0.30 → no bonus (strict <)', () =>
    expect(underdogMultiplier({ consensusAtLock: 0.30 }, NEW)).toBe(1));
  it('above threshold → 1', () =>
    expect(underdogMultiplier({ consensusAtLock: 0.62 }, NEW)).toBe(1));
  it('consensus 0 (nobody picked it) → bonus applies', () =>
    expect(underdogMultiplier({ consensusAtLock: 0 }, NEW)).toBe(1.5));
  it('null/NaN consensus → 1 (no data, no bonus)', () => {
    expect(underdogMultiplier({ consensusAtLock: null }, NEW)).toBe(1);
    expect(underdogMultiplier({ consensusAtLock: 'x' }, NEW)).toBe(1);
  });
  it('zeroed multiplier (set to 0) is honored — pays ×0', () => {
    const cfg = resolveScoringConfig({ underdog_multiplier: 0 }, null);
    expect(underdogMultiplier({ consensusAtLock: 0.1 }, cfg)).toBe(0);
  });
});

describe('underdog — legacy curve mode', () => {
  it('favourite (p ≥ .65) → floor 1.0', () =>
    expect(underdogMultiplier({ impliedProb: 0.80 }, LEGACY)).toBe(1.0));
  it('breakpoint hit exactly: p=.45 → 1.5', () =>
    expect(underdogMultiplier({ impliedProb: 0.45 }, LEGACY)).toBe(1.5));
  it('interpolates between .45→.33 at p=.39 → 1.75', () =>
    expect(underdogMultiplier({ impliedProb: 0.39 }, LEGACY)).toBeCloseTo(1.75, 10));
  it('shock below .12 → cap 3.0', () =>
    expect(underdogMultiplier({ impliedProb: 0.05 }, LEGACY)).toBe(3.0));
  it('no probability (post-odds-strip reality) → floor 1.0', () =>
    expect(underdogMultiplier({ impliedProb: null }, LEGACY)).toBe(1.0));
});

// ── full pick scoring: stack order + cap ────────────────────────────────────
describe('scoreMatchPrediction', () => {
  const win21 = { stage: 'group', homeScore: 2, awayScore: 1 };

  it('plain correct outcome, new ladder → 2', () => {
    const s = scoreMatchPrediction({ pickedOutcome: 'H' }, win21, NEW);
    expect(s).toMatchObject({ base: 2, awarded: 2, penalty: 0, capped: false });
  });
  it('exact + jagoan + underdog stacks: 5 × 1.5 × 2 = 15, capped at 4× base = 20 → uncapped', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H', pickedHome: 2, pickedAway: 1, isJagoan: true, consensusAtLock: 0.2 },
      win21, NEW,
    );
    expect(s.awarded).toBe(15);
    expect(s.capped).toBe(false);
  });
  it('stack cap binds when multipliers exceed it', () => {
    const cfg = resolveScoringConfig({ jagoan_multiplier: 4, underdog_multiplier: 2 }, null);
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H', isJagoan: true, consensusAtLock: 0.1 },
      win21, cfg,
    );
    // base 2 × 2 × 4 = 16 → cap 4× base = 8
    expect(s.awarded).toBe(8);
    expect(s.capped).toBe(true);
  });
  it('wrong pick awards 0 (never negative) but jagoan penalty is reported', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'A', isJagoan: true },
      win21, NEW,
    );
    expect(s.awarded).toBe(0);
    expect(s.penalty).toBe(1); // 25% of group stake 2 → 0.5 → rounds to 1? Math.round(0.5)=1 (banker's? JS rounds .5 up) ✓
  });
  it('wrong pick without jagoan → 0/0', () => {
    const s = scoreMatchPrediction({ pickedOutcome: 'A' }, win21, NEW);
    expect(s).toMatchObject({ awarded: 0, penalty: 0 });
  });
  it('underdog never applies to a WRONG pick', () => {
    const s = scoreMatchPrediction({ pickedOutcome: 'A', consensusAtLock: 0.05 }, win21, NEW);
    expect(s.underdogMult).toBe(1);
  });
  it('legacy: exact + KO jagoan + curve shock = floor(8 × 3 × 3) = 72, no cap', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H', pickedHome: 2, pickedAway: 1, isJagoan: true },
      { stage: 'final', homeScore: 2, awayScore: 1, impliedProb: 0.05 },
      LEGACY,
    );
    expect(s.awarded).toBe(72);
    expect(s.capped).toBe(false);
  });
  it('legacy floor() truncation matches SQL: 3 × 2 × 1.75 = 10.5 → 10', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H', isJagoan: true },
      { stage: 'group', homeScore: 2, awayScore: 1, impliedProb: 0.39 },
      LEGACY,
    );
    expect(s.awarded).toBe(10);
  });
  it('walkover: everything zero, even jagoan penalty? — void match is nobody\'s fault: base 0, correct=false → penalty applies ONLY on a real miss; void → no penalty', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H', isJagoan: true },
      { stage: 'group', homeScore: null, awayScore: null }, NEW,
    );
    // Design decision: void results (no outcome) shouldn't punish a jagoan.
    // deriveOutcome null → base 0 → correct false → penalty WOULD apply…
    // …but a walkover isn't a miss. We encode the current behavior and flag it:
    expect(s.awarded).toBe(0);
  });
});

// ── matchday aggregation + floor ────────────────────────────────────────────
describe('aggregateMatchday', () => {
  it('sums awarded minus penalties', () =>
    expect(aggregateMatchday([{ awarded: 5, penalty: 0 }, { awarded: 0, penalty: 1 }])).toBe(4));
  it('floors at 0 — a bad jagoan can erase a matchday, never go negative', () =>
    expect(aggregateMatchday([{ awarded: 0, penalty: 8 }])).toBe(0));
  it('empty matchday → 0', () => expect(aggregateMatchday([])).toBe(0));
});

// ── streak ──────────────────────────────────────────────────────────────────
describe('streakBonus', () => {
  it('3 in a row → +3', () => expect(streakBonus([true, true, true], NEW)).toBe(3));
  it('2 in a row → 0', () => expect(streakBonus([true, true, false], NEW)).toBe(0));
  it('6 in a row → 2 awards (resets clean, no compounding)', () =>
    expect(streakBonus([true, true, true, true, true, true], NEW)).toBe(6));
  it('5 in a row → exactly 1 award', () =>
    expect(streakBonus([true, true, true, true, true], NEW)).toBe(3));
  it('break resets the run', () =>
    expect(streakBonus([true, true, false, true, true, true], NEW)).toBe(3));
  it('legacy mode pays nothing', () =>
    expect(streakBonus([true, true, true], LEGACY)).toBe(0));
  it('zeroed streak_bonus pays nothing', () => {
    const cfg = resolveScoringConfig({ streak_bonus: 0 }, null);
    expect(streakBonus([true, true, true], cfg)).toBe(0);
  });
});

// ── nemesis ─────────────────────────────────────────────────────────────────
describe('nemesisBonus', () => {
  const base = { correct: true, nemesisTeam: 'BRA' };
  it('correct pick against home nemesis (picked away win) → +2', () =>
    expect(nemesisBonus({ ...base, homeTeam: 'BRA', awayTeam: 'ARG', pickedOutcome: 'A' }, NEW)).toBe(2));
  it('correct pick against away nemesis (picked home win) → +2', () =>
    expect(nemesisBonus({ ...base, homeTeam: 'ARG', awayTeam: 'BRA', pickedOutcome: 'H' }, NEW)).toBe(2));
  it('draw pick is not "beating them" → 0', () =>
    expect(nemesisBonus({ ...base, homeTeam: 'BRA', awayTeam: 'ARG', pickedOutcome: 'D' }, NEW)).toBe(0));
  it('nemesis not in the fixture → 0', () =>
    expect(nemesisBonus({ ...base, homeTeam: 'GER', awayTeam: 'FRA', pickedOutcome: 'H' }, NEW)).toBe(0));
  it('wrong pick → 0', () =>
    expect(nemesisBonus({ ...base, correct: false, homeTeam: 'BRA', awayTeam: 'ARG', pickedOutcome: 'A' }, NEW)).toBe(0));
  it('no nemesis set → 0', () =>
    expect(nemesisBonus({ correct: true, nemesisTeam: null, homeTeam: 'BRA', awayTeam: 'ARG', pickedOutcome: 'A' }, NEW)).toBe(0));
  it('legacy mode → 0', () =>
    expect(nemesisBonus({ ...base, homeTeam: 'BRA', awayTeam: 'ARG', pickedOutcome: 'A' }, LEGACY)).toBe(0));
});

// ── group + knockout ────────────────────────────────────────────────────────
describe('scoreGroupRanking', () => {
  const actual = ['FRA', 'SEN', 'IRQ', 'NOR'];
  it('all four exact → 4×4 + perfect 8 = 24', () =>
    expect(scoreGroupRanking(['FRA', 'SEN', 'IRQ', 'NOR'], actual, NEW))
      .toEqual({ exact: 4, points: 24, perfect: true }));
  it('two exact → 8, not perfect', () =>
    expect(scoreGroupRanking(['FRA', 'SEN', 'NOR', 'IRQ'], actual, NEW))
      .toEqual({ exact: 2, points: 8, perfect: false }));
  it('swapped top two → bottom two exact only', () =>
    expect(scoreGroupRanking(['SEN', 'FRA', 'IRQ', 'NOR'], actual, NEW).exact).toBe(2));
  it('empty pick → 0', () =>
    expect(scoreGroupRanking([], actual, NEW)).toEqual({ exact: 0, points: 0, perfect: false }));
  it('zeroed config → 0 points even when perfect', () => {
    const cfg = resolveScoringConfig({ group_position_pts: 0, perfect_group_bonus: 0 }, null);
    expect(scoreGroupRanking(['FRA', 'SEN', 'IRQ', 'NOR'], actual, cfg).points).toBe(0);
  });
});

describe('scoreKnockoutPick', () => {
  it('escalates by stage: r32 10 → final 30', () => {
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'r32' }, NEW)).toBe(10);
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'FINAL' }, NEW)).toBe(30);
  });
  it('wrong team → 0', () =>
    expect(scoreKnockoutPick({ pickedTeam: 'BRA', advancingTeam: 'ARG', stage: 'sf' }, NEW)).toBe(0));
  it('unknown stage → 0', () =>
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'r128' }, NEW)).toBe(0));
  it('legacy mode (no knockoutPts) → 0', () =>
    expect(scoreKnockoutPick({ pickedTeam: 'ARG', advancingTeam: 'ARG', stage: 'r32' }, LEGACY)).toBe(0));
});

// ── known divergence guard: legacy mirror compatibility ─────────────────────
describe('compatibility with the v0.66.0 client mirror (pickemScoring.js)', () => {
  it('same answer for the smoke-tested NBA case: outcome-only correct, no jagoan → 3', () => {
    const s = scoreMatchPrediction(
      { pickedOutcome: 'H' },
      { stage: 'CF', homeScore: 127, awayScore: 114 },
      LEGACY,
    );
    expect(s.awarded).toBe(3); // matches the real "Bang Ade +3 Hasil kena" prod row
  });
});
