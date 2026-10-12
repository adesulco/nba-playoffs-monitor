// ============================================================================
// scoring-core.js — THE Pick'em money math. Pure functions only.
// Flagship Track A ticket A2 (pickem-flagship/00-HANDOVER.md §3).
//
// Single source of truth for every point computed anywhere: the scoring
// cron handlers (score-fixture/score-bracket), the client preview surfaces,
// and useProvisionalPoints (A9). No I/O, no Date.now, no randomness — every
// function is (input) → output so the Vitest suite can be exhaustive.
//
// CONFIG RESOLUTION (two shapes, one normalized form):
//
//   NEW  — leagues.scoring_config jsonb (migration 0019; commissioner-set):
//     { group_position_pts, perfect_group_bonus,
//       knockout_pts: {r32,r16,qf,sf,final},
//       score_exact, score_result_margin, score_result,
//       underdog_threshold, underdog_multiplier,
//       streak_len, streak_bonus,
//       jagoan_multiplier, jagoan_penalty, stack_cap, nemesis_bonus }
//
//   LEGACY — pickem_rules row (migration 0015; live in prod, has already
//     scored real NBA picks — its semantics MUST be preserved for leagues
//     without scoring_config):
//     { pts_exact: 8, pts_goaldiff: 5, pts_outcome: 3,
//       jagoan_mult_group: 2, jagoan_mult_ko: 3 (NO miss penalty),
//       enable_upset_bonus, upset_floor, upset_cap,
//       upset_curve: [{p, mult}…] (probability-curve, pre-match implied
//       prob — inert in practice since the odds-provider strip),
//       grup_bonus_points, ko_stages: ['R32','R16','QF','SF','final'] }
//
// resolveScoringConfig() maps either into the canonical shape below; all
// other functions take ONLY the canonical config. Commissioners may zero
// any value (06-gamification-audit §3.5) — every function must behave
// sanely with 0/false/empty.
//
// JAGOAN (06 GAP-1): ×jagoan_multiplier when correct; when WRONG, a
// penalty of jagoan_penalty × the pick's stake value (knockout_pts[stage]
// for KO picks, score_result/pts_outcome for match picks) is deducted from
// the MATCHDAY total, which floors at 0 (aggregateMatchday). Legacy
// configs have penalty 0 (prod behavior unchanged). A single pick's
// awarded points are capped at stack_cap × base (4× in the new system —
// jagoan ×2 stacked on underdog ×1.5 = 3 ≤ 4 ✓).
//
// UNDERDOG (06/03): NEW mode — correct pick whose consensus_at_lock is
// STRICTLY below underdog_threshold (0.30) earns ×underdog_multiplier
// (1.5). Exactly 0.30 → no bonus. LEGACY mode — piecewise-linear curve on
// pre-match implied probability (ported verbatim from pickemScoring.js).
// ============================================================================

// ── Canonical config ────────────────────────────────────────────────────────

/** @typedef {Object} CanonConfig — output of resolveScoringConfig */

export const NEW_DEFAULTS = Object.freeze({
  group_position_pts: 4,
  perfect_group_bonus: 8,
  knockout_pts: Object.freeze({ r32: 10, r16: 12, qf: 15, sf: 20, final: 30 }),
  score_exact: 5,
  score_result_margin: 3,
  score_result: 2,
  underdog_threshold: 0.30,
  underdog_multiplier: 1.5,
  streak_len: 3,
  streak_bonus: 3,
  jagoan_multiplier: 2,
  jagoan_penalty: 0.25,
  stack_cap: 4,
  nemesis_bonus: 2,
});

const LEGACY_KO_STAGES = Object.freeze(['R32', 'R16', 'QF', 'SF', 'final']);

/**
 * Resolve the effective config for a league.
 * @param {object|null|undefined} scoringConfig  leagues.scoring_config (new shape)
 * @param {object|null|undefined} pickemRules    pickem_rules row (legacy shape)
 * @returns {object} canonical config
 *
 * Precedence per ticket A2: league.scoring_config ?? pickem_rules.
 * A partial scoring_config is filled from NEW_DEFAULTS (NOT from
 * pickem_rules — mixing the two ladders inside one league would make
 * scores unexplainable to commissioners).
 */
export function resolveScoringConfig(scoringConfig, pickemRules) {
  if (scoringConfig && typeof scoringConfig === 'object') {
    const c = { ...NEW_DEFAULTS, ...scoringConfig };
    return {
      mode: 'new',
      ladder: {
        exact: num(c.score_exact, NEW_DEFAULTS.score_exact),
        margin: num(c.score_result_margin, NEW_DEFAULTS.score_result_margin),
        outcome: num(c.score_result, NEW_DEFAULTS.score_result),
      },
      knockoutPts: { ...NEW_DEFAULTS.knockout_pts, ...(c.knockout_pts || {}) },
      koStages: LEGACY_KO_STAGES,
      groupPositionPts: num(c.group_position_pts, NEW_DEFAULTS.group_position_pts),
      perfectGroupBonus: num(c.perfect_group_bonus, NEW_DEFAULTS.perfect_group_bonus),
      jagoan: {
        multGroup: num(c.jagoan_multiplier, NEW_DEFAULTS.jagoan_multiplier),
        multKo: num(c.jagoan_multiplier, NEW_DEFAULTS.jagoan_multiplier),
        penalty: num(c.jagoan_penalty, NEW_DEFAULTS.jagoan_penalty),
      },
      underdog: {
        mode: 'consensus',
        threshold: num(c.underdog_threshold, NEW_DEFAULTS.underdog_threshold),
        multiplier: num(c.underdog_multiplier, NEW_DEFAULTS.underdog_multiplier),
      },
      stackCap: num(c.stack_cap, NEW_DEFAULTS.stack_cap),
      streak: { len: num(c.streak_len, NEW_DEFAULTS.streak_len), bonus: num(c.streak_bonus, NEW_DEFAULTS.streak_bonus) },
      nemesisBonus: num(c.nemesis_bonus, NEW_DEFAULTS.nemesis_bonus),
    };
  }

  const r = pickemRules || {};
  return {
    mode: 'legacy',
    ladder: {
      exact: num(r.pts_exact, 8),
      margin: num(r.pts_goaldiff, 5),
      outcome: num(r.pts_outcome, 3),
    },
    knockoutPts: null, // legacy match scoring has no per-stage KO points
    koStages: Array.isArray(r.ko_stages) ? r.ko_stages : LEGACY_KO_STAGES,
    groupPositionPts: 0,
    perfectGroupBonus: 0,
    jagoan: {
      multGroup: num(r.jagoan_mult_group, 2),
      multKo: num(r.jagoan_mult_ko, 3),
      penalty: 0, // legacy prod behavior: no miss penalty — MUST stay 0
    },
    underdog: r.enable_upset_bonus === false
      ? { mode: 'off' }
      : {
          mode: 'curve',
          curve: Array.isArray(r.upset_curve) && r.upset_curve.length
            ? r.upset_curve
            : [
                { p: 0.65, mult: 1.0 },
                { p: 0.45, mult: 1.5 },
                { p: 0.33, mult: 2.0 },
                { p: 0.18, mult: 2.2 },
                { p: 0.12, mult: 3.0 },
              ],
          floor: num(r.upset_floor, 1.0),
          cap: num(r.upset_cap, 3.0),
        },
    stackCap: Infinity, // legacy: bounded by upset_cap × jagoan_mult_ko already
    streak: { len: 0, bonus: 0 }, // streak bonus is a new-system feature
    nemesisBonus: 0,
  };
}

function num(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// ── Outcome + base ladder ───────────────────────────────────────────────────

/** 'H' | 'D' | 'A' | null — null when either score is missing (walkover/void). */
export function deriveOutcome(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

/**
 * Base points for a match prediction — the LARGEST tier that applies;
 * tiers never stack. Wrong/void → 0.
 *   exact scoreline → ladder.exact
 *   correct margin  → ladder.margin   (goal difference matches)
 *   correct result  → ladder.outcome
 */
export function basePoints(prediction, result, cfg) {
  const actual = deriveOutcome(result.homeScore, result.awayScore);
  if (!actual || prediction.pickedOutcome !== actual) return 0;
  const { pickedHome, pickedAway } = prediction;
  if (pickedHome != null && pickedAway != null) {
    if (pickedHome === result.homeScore && pickedAway === result.awayScore) return cfg.ladder.exact;
    if (pickedHome - pickedAway === result.homeScore - result.awayScore) return cfg.ladder.margin;
  }
  return cfg.ladder.outcome;
}

// ── Multipliers ─────────────────────────────────────────────────────────────

/** Jagoan multiplier for a CORRECT pick (1 when not jagoan). */
export function jagoanMultiplier({ isJagoan, stage }, cfg) {
  if (!isJagoan) return 1;
  const ko = (cfg.koStages || []).includes(stage);
  return ko ? cfg.jagoan.multKo : cfg.jagoan.multGroup;
}

/**
 * The stake value of a pick — what the jagoan miss-penalty is computed
 * against: knockout stage points when defined, else the outcome tier.
 */
export function stakeValue(stage, cfg) {
  if (cfg.knockoutPts) {
    const key = String(stage || '').toLowerCase();
    if (cfg.knockoutPts[key] != null) return cfg.knockoutPts[key];
  }
  return cfg.ladder.outcome;
}

/**
 * Jagoan miss-penalty (POSITIVE number of points to deduct from the
 * matchday total; 0 when not jagoan, when the pick was correct, or in
 * legacy mode). 06 GAP-1: −25% of the pick's stake value on a miss.
 */
export function jagoanPenalty({ isJagoan, correct, stage }, cfg) {
  if (!isJagoan || correct || !(cfg.jagoan.penalty > 0)) return 0;
  return roundPts(cfg.jagoan.penalty * stakeValue(stage, cfg));
}

/**
 * Underdog multiplier for a CORRECT pick.
 *   consensus mode: consensusAtLock STRICTLY < threshold → ×multiplier.
 *     Exactly threshold → 1 (06: "boundary consensus = 0.30 exactly → no
 *     bonus — strict <"). null/undefined consensus → 1 (no data, no bonus).
 *   curve mode (legacy): piecewise-linear on impliedProb, clamped to
 *     [floor, cap]; null prob → floor.
 */
export function underdogMultiplier({ consensusAtLock, impliedProb }, cfg) {
  const u = cfg.underdog;
  if (!u || u.mode === 'off') return 1;
  if (u.mode === 'consensus') {
    if (consensusAtLock == null || Number.isNaN(Number(consensusAtLock))) return 1;
    return Number(consensusAtLock) < u.threshold ? u.multiplier : 1;
  }
  // legacy curve
  const p = impliedProb;
  if (p == null || Number.isNaN(Number(p))) return u.floor;
  const curve = u.curve;
  if (!curve.length) return u.floor;
  if (p >= curve[0].p) return Math.max(u.floor, curve[0].mult);
  const last = curve[curve.length - 1];
  if (p <= last.p) return Math.min(u.cap, last.mult);
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1];
    const cur = curve[i];
    if (p <= prev.p && p >= cur.p) {
      if (prev.p === cur.p) return cur.mult;
      const t = (prev.p - p) / (prev.p - cur.p);
      const v = prev.mult + (cur.mult - prev.mult) * t;
      return Math.max(u.floor, Math.min(u.cap, v));
    }
  }
  return u.floor;
}

// ── Full match-prediction scoring ───────────────────────────────────────────

/**
 * Score one match prediction. Returns the audit breakdown the scoring
 * handlers persist (base_points, jagoan_mult_applied, upset_mult_applied,
 * awarded_points) plus `penalty` (deducted at matchday aggregation, NOT
 * from this pick's awarded value — a wrong pick awards 0, never negative).
 *
 * Stack order: base × underdog × jagoan, then floor(), then cap at
 * stack_cap × base (06 §3.1: "jagoan on an underdog" maxes at 4× base).
 *
 * @param {object} prediction { pickedOutcome, pickedHome, pickedAway, isJagoan, consensusAtLock }
 * @param {object} fixture    { stage, homeScore, awayScore, impliedProb? }
 * @param {object} cfg        canonical config from resolveScoringConfig
 */
export function scoreMatchPrediction(prediction, fixture, cfg) {
  const base = basePoints(prediction, fixture, cfg);
  const correct = base > 0;

  const jMult = correct ? jagoanMultiplier({ isJagoan: prediction.isJagoan, stage: fixture.stage }, cfg) : 1;
  const uMult = correct
    ? underdogMultiplier({ consensusAtLock: prediction.consensusAtLock, impliedProb: fixture.impliedProb }, cfg)
    : 1;

  let awarded = Math.floor(base * uMult * jMult);
  const cap = Number.isFinite(cfg.stackCap) ? Math.floor(base * cfg.stackCap) : Infinity;
  const capped = awarded > cap;
  if (capped) awarded = cap;

  const penalty = jagoanPenalty(
    { isJagoan: prediction.isJagoan, correct, stage: fixture.stage },
    cfg,
  );

  return { base, jagoanMult: jMult, underdogMult: uMult, awarded, penalty, capped };
}

/**
 * Aggregate one member's matchday: sum of awarded minus jagoan penalties,
 * FLOORED AT 0 (06 GAP-1: "matchday floor 0" — a bad jagoan can erase a
 * matchday, never go negative).
 * @param {Array<{awarded:number, penalty:number}>} scored
 */
export function aggregateMatchday(scored) {
  const sum = scored.reduce((acc, s) => acc + (s.awarded || 0) - (s.penalty || 0), 0);
  return Math.max(0, sum);
}

// ── Streak + nemesis (new-system garnishes) ─────────────────────────────────

/**
 * Streak bonus over an ORDERED sequence of pick correctness booleans.
 * Every COMPLETED run of `len` correct picks pays `bonus` once and the
 * counter resets clean (6 in a row with len 3 = 2 bonuses; never
 * compounds). Returns total bonus points.
 */
export function streakBonus(correctSeq, cfg) {
  const { len, bonus } = cfg.streak || {};
  if (!len || len <= 0 || !bonus) return 0;
  let run = 0;
  let total = 0;
  for (const ok of correctSeq || []) {
    run = ok ? run + 1 : 0;
    if (run === len) {
      total += bonus;
      run = 0; // resets clean — no compounding
    }
  }
  return total;
}

/**
 * Nemesis ("Musuh Bersama", GAP-5) bonus: a CORRECT pick AGAINST the
 * member's nemesis team pays nemesis_bonus. "Against" = the nemesis
 * played in the fixture and the picked outcome means the nemesis did
 * not win it.
 * @param {object} args { nemesisTeam, homeTeam, awayTeam, pickedOutcome, correct }
 */
export function nemesisBonus(args, cfg) {
  const b = cfg.nemesisBonus;
  if (!b || !args.correct || !args.nemesisTeam) return 0;
  const { nemesisTeam, homeTeam, awayTeam, pickedOutcome } = args;
  const nemesisIsHome = nemesisTeam === homeTeam;
  const nemesisIsAway = nemesisTeam === awayTeam;
  if (!nemesisIsHome && !nemesisIsAway) return 0;
  // picked against the nemesis = picked the side that isn't them (or a draw
  // in a match they needed to win is NOT "beating them" — keep it strict:
  // only an outright opposite-side win pays).
  if (nemesisIsHome && pickedOutcome === 'A') return b;
  if (nemesisIsAway && pickedOutcome === 'H') return b;
  return 0;
}

// ── Group + knockout (bracket-side, new system) ─────────────────────────────

/**
 * Group-stage ranking points: group_position_pts per exactly-placed team,
 * plus perfect_group_bonus when ALL placements in the group are exact.
 * @param {string[]} picked  ordered team codes (rank 1..n) the member picked
 * @param {string[]} actual  ordered actual finishing order
 */
export function scoreGroupRanking(picked, actual, cfg) {
  if (!Array.isArray(picked) || !Array.isArray(actual) || actual.length === 0) {
    return { exact: 0, points: 0, perfect: false };
  }
  let exact = 0;
  for (let i = 0; i < Math.min(picked.length, actual.length); i++) {
    if (picked[i] && picked[i] === actual[i]) exact += 1;
  }
  const perfect = exact === actual.length && picked.length >= actual.length;
  const points = exact * cfg.groupPositionPts + (perfect ? cfg.perfectGroupBonus : 0);
  return { exact, points, perfect };
}

/**
 * Knockout pick points: correct advancing team at a stage pays
 * knockout_pts[stage]. Unknown stage or legacy mode (knockoutPts null) → 0.
 */
export function scoreKnockoutPick({ pickedTeam, advancingTeam, stage }, cfg) {
  if (!cfg.knockoutPts || !pickedTeam || pickedTeam !== advancingTeam) return 0;
  const key = String(stage || '').toLowerCase();
  return cfg.knockoutPts[key] ?? 0;
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Round to nearest int, .5 up — penalties stay integers like all points. */
function roundPts(x) {
  return Math.round(x);
}
