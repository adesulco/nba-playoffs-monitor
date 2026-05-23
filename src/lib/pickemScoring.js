/**
 * Client-side Pick'em scoring helpers — mirror of the SQL rules in
 * supabase/migrations/0002_multi_sport.sql. Used in the bracket UI to show
 * potential points in real time without a roundtrip. DB is the source of
 * truth; these constants must stay aligned with pickem_rules table defaults.
 */

export const DEFAULT_RULES = {
  R1: 1,
  R2: 2,
  CF: 4,
  F: 8,
  exactGamesBonus: 1,
  finalsMvpBonus: 5,
};

export function pointsForRoundPick(round) {
  return DEFAULT_RULES[round] ?? 0;
}

export function maxBracketPoints() {
  // 8 R1 + 4 R2 + 2 CF + 1 F; plus 15 exact-games bonuses + Finals MVP
  const roundBase =
    8 * DEFAULT_RULES.R1 +
    4 * DEFAULT_RULES.R2 +
    2 * DEFAULT_RULES.CF +
    1 * DEFAULT_RULES.F;
  const bonuses = 15 * DEFAULT_RULES.exactGamesBonus + DEFAULT_RULES.finalsMvpBonus;
  return roundBase + bonuses;
}

// ============================================================================
// v0.66.0 — Match-prediction client mirror (Pick'em P1).
//
// Mirrors the SQL pickem_score_fixture() RPC + pickem_upset_mult() helper
// from supabase/migrations/0015_pickem_match_prediction.sql. Used by the
// match-predictor UI to show potential points BEFORE the fixture finalizes
// (so the user sees "Skor pas → 8 poin · ×2 Jagoan = 16 poin" preview).
//
// DB is the source of truth; these constants must stay aligned with
// pickem_rules defaults in migration 0015. The spec is
// Gibol-Pickem-Gamification-Spec.docx §5–§7.
// ============================================================================

/** Default match-prediction rules — identical to migration 0015 defaults. */
export const DEFAULT_MATCH_RULES = {
  pts_exact: 8,         // §5.1 — Skor pas
  pts_goaldiff: 5,      // §5.1 — Selisih gol pas
  pts_outcome: 3,       // §5.1 — Tebakan benar
  // pts_miss is implicit 0
  jagoan_mult_group: 2.0, // §5.2 — group stage banker ×2
  jagoan_mult_ko: 3.0,    // §5.2 — knockout banker ×3
  enable_upset_bonus: true,
  upset_floor: 1.0,
  upset_cap: 3.0,
  // §7.2 — piecewise-linear curve breakpoints, sorted by p DESCENDING
  upset_curve: [
    { p: 0.65, mult: 1.0 },
    { p: 0.45, mult: 1.5 },
    { p: 0.33, mult: 2.0 },
    { p: 0.18, mult: 2.2 },
    { p: 0.12, mult: 3.0 },
  ],
  grup_bonus_points: 2,
  enable_survivor: true,
  ko_stages: ['R32', 'R16', 'QF', 'SF', 'final'],
};

/**
 * Derive the H/D/A outcome from a final scoreline. Returns null if
 * either score is missing.
 */
export function deriveOutcome(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

/**
 * Base points (§5.1 ladder). Returns the LARGEST tier the prediction
 * qualifies for; tiers do not stack.
 *
 *   exact scoreline   → pts_exact (8)
 *   right margin      → pts_goaldiff (5)
 *   right result only → pts_outcome (3)
 *   wrong             → 0
 */
export function basePointsForPrediction({
  pickedOutcome,
  pickedHome,
  pickedAway,
  homeScore,
  awayScore,
  rules = DEFAULT_MATCH_RULES,
}) {
  const actual = deriveOutcome(homeScore, awayScore);
  if (!actual || pickedOutcome !== actual) return 0;

  if (pickedHome != null && pickedAway != null) {
    if (pickedHome === homeScore && pickedAway === awayScore) return rules.pts_exact;
    if (pickedHome - pickedAway === homeScore - awayScore) return rules.pts_goaldiff;
  }
  return rules.pts_outcome;
}

/**
 * Jagoan multiplier (§5.2). 1 by default; 2 for group-stage banker;
 * 3 for knockout banker.
 */
export function jagoanMultiplier({ isJagoan, stage, rules = DEFAULT_MATCH_RULES }) {
  if (!isJagoan) return 1;
  const ko = (rules.ko_stages || DEFAULT_MATCH_RULES.ko_stages).includes(stage);
  return ko ? rules.jagoan_mult_ko : rules.jagoan_mult_group;
}

/**
 * Upset multiplier (§7.2) — piecewise-linear interpolation through the
 * curve breakpoints, clamped to [floor, cap]. Mirror of SQL
 * pickem_upset_mult(). Returns 1.0 when no probability is supplied.
 */
export function upsetMultiplier(impliedProb, rules = DEFAULT_MATCH_RULES) {
  if (impliedProb == null || Number.isNaN(impliedProb)) return rules.upset_floor;
  const curve = rules.upset_curve || DEFAULT_MATCH_RULES.upset_curve;
  if (!curve.length) return rules.upset_floor;
  const floor = rules.upset_floor ?? 1.0;
  const cap = rules.upset_cap ?? 3.0;

  // Above the highest-probability breakpoint → floor (favourites = ×1).
  if (impliedProb >= curve[0].p) {
    return Math.max(floor, curve[0].mult);
  }
  // Below the lowest-probability breakpoint → cap (shocks).
  const last = curve[curve.length - 1];
  if (impliedProb <= last.p) {
    return Math.min(cap, last.mult);
  }
  // Interpolate between the bracketing breakpoints.
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1];
    const cur = curve[i];
    if (impliedProb <= prev.p && impliedProb >= cur.p) {
      if (prev.p === cur.p) return cur.mult;
      const t = (prev.p - impliedProb) / (prev.p - cur.p);
      const v = prev.mult + (cur.mult - prev.mult) * t;
      return Math.max(floor, Math.min(cap, v));
    }
  }
  return floor;
}

/**
 * Look up the implied probability of the called outcome from a fixture's
 * (p_home, p_draw, p_away) triple. Returns null if any are missing.
 */
export function calledProbability(pickedOutcome, fixture) {
  if (!fixture) return null;
  const map = { H: fixture.p_home, D: fixture.p_draw, A: fixture.p_away };
  const p = map[pickedOutcome];
  return p == null ? null : Number(p);
}

/**
 * Full match-prediction scoring — mirror of pickem_score_fixture().
 * Returns the awarded total + audit fields so the UI can show the
 * breakdown ("8 × ×2 Jagoan × ×2.2 upset = 35 poin").
 *
 * Floor is applied at the end to match SQL `floor(...)::int`.
 */
export function scorePrediction({
  prediction,        // { pickedOutcome, pickedHome, pickedAway, isJagoan }
  fixture,           // { stage, homeScore, awayScore, p_home, p_draw, p_away }
  rules = DEFAULT_MATCH_RULES,
}) {
  const base = basePointsForPrediction({
    pickedOutcome: prediction.pickedOutcome,
    pickedHome:    prediction.pickedHome,
    pickedAway:    prediction.pickedAway,
    homeScore:     fixture.homeScore,
    awayScore:     fixture.awayScore,
    rules,
  });

  const jmult = jagoanMultiplier({
    isJagoan: prediction.isJagoan,
    stage:    fixture.stage,
    rules,
  });

  let umult = 1;
  if (rules.enable_upset_bonus && base > 0) {
    const p = calledProbability(prediction.pickedOutcome, fixture);
    if (p != null) umult = upsetMultiplier(p, rules);
  }

  const awarded = Math.floor(base * jmult * umult);
  return {
    base,
    jagoanMult: jmult,
    upsetMult: umult,
    awarded,
  };
}

/**
 * Preview-mode scoring — what the user would earn IF they get the
 * scoreline exactly right vs the goal-diff vs just the outcome. Used by
 * the OutcomePicker / ScoreStepper to show live point hints before
 * lock. Returns three preview tiers + the active multiplier stack.
 */
export function previewScoring({
  pickedOutcome,
  pickedHome,
  pickedAway,
  isJagoan,
  stage,
  fixture, // { p_home, p_draw, p_away }
  rules = DEFAULT_MATCH_RULES,
}) {
  const jmult = jagoanMultiplier({ isJagoan, stage, rules });
  const p = calledProbability(pickedOutcome, fixture);
  const umult = rules.enable_upset_bonus && p != null ? upsetMultiplier(p, rules) : 1;
  const apply = (base) => Math.floor(base * jmult * umult);
  const hasExactPick = pickedHome != null && pickedAway != null;
  return {
    impliedProb: p,
    jagoanMult: jmult,
    upsetMult: umult,
    exactPoints:     hasExactPick ? apply(rules.pts_exact) : null,
    goalDiffPoints:  hasExactPick ? apply(rules.pts_goaldiff) : null,
    outcomePoints:   apply(rules.pts_outcome),
    // The largest tier the current pick guarantees — outcome-only if no
    // exact scoreline supplied; otherwise the user can earn up to exact.
    bestCaseLabel:   hasExactPick ? 'exact' : 'outcome',
    bestCasePoints:  hasExactPick ? apply(rules.pts_exact) : apply(rules.pts_outcome),
  };
}
