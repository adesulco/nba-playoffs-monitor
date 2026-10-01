// ============================================================================
// scoring-core.js — THE Pick'em money math, Scoring Spec v1 (doc 17 §1).
//
// A line-for-line mirror of the SQL in supabase/migrations/0021_scoring_v1.sql:
//   pickem_resolve_config  ↔ resolveScoringConfig
//   pickem_template_config ↔ templateConfig
//   pickem_tier            ↔ tierFor
//   pickem_points_for      ↔ pointsFor
//   pickem_member_points   ↔ memberPoints
// The SQL RPC is the only writer of predictions.awarded_points; this file is
// the client's provisional engine and the admin tooling's cross-check. Both
// are driven by the same vectors (scoring-vectors.json): scoring-core.test.js
// runs them here, scripts/test-scoring-parity.mjs runs them against the SQL
// pure functions in prod. If the two ever disagree, the SQL wins and this
// file is wrong.
//
// Pure functions only. No I/O, no Date.now, no randomness.
// ============================================================================

/** Spec v1 defaults — identical to the jsonb literal in pickem_resolve_config. */
export const SPEC_V1_DEFAULTS = Object.freeze({
  score_exact: 5,
  score_result_margin: 3,
  score_result: 2,
  score_nyaris: 1,
  jagoan_multiplier: 2,
  jagoan_penalty: 0,
  underdog_threshold: 0.30,
  underdog_multiplier: 1.5,
  stack_cap: 4,
  streak_len: 3,
  streak_bonus: 0,
  group_position_pts: 4,
  perfect_group_bonus: 8,
  knockout_pts: Object.freeze({ r32: 10, r16: 12, qf: 15, sf: 20, final: 30 }),
  ko_stages: Object.freeze(['R32', 'R16', 'QF', 'SF', 'final']),
});
/** @deprecated name kept for older imports; same object. */
export const NEW_DEFAULTS = SPEC_V1_DEFAULTS;

/** Templates — identical to pickem_template_config. */
export const TEMPLATES = Object.freeze({
  santai:  Object.freeze({ jagoan_multiplier: 1, jagoan_penalty: 0, underdog_multiplier: 1, streak_bonus: 0 }),
  standar: Object.freeze({ jagoan_multiplier: 2, jagoan_penalty: 0, underdog_threshold: 0.30, underdog_multiplier: 1.5, stack_cap: 4, streak_len: 3, streak_bonus: 0 }),
  sultan:  Object.freeze({ jagoan_multiplier: 2, jagoan_penalty: 0.25, underdog_threshold: 0.30, underdog_multiplier: 1.5, stack_cap: 4, streak_len: 3, streak_bonus: 3 }),
});

export function templateConfig(name) {
  return TEMPLATES[String(name || 'standar').toLowerCase()] || TEMPLATES.standar;
}

const TIERS_CORRECT = new Set(['exact', 'margin', 'result']);

/**
 * Map a pickem_rules row (0021 column names; the 0015 names are accepted
 * too so a stale row shape can't zero anyone) onto scoring_config keys.
 * Undefined values are dropped, mirroring jsonb_strip_nulls.
 */
export function rulesRowToConfig(row) {
  if (!row || typeof row !== 'object') return {};
  const out = {
    score_exact: row.pts_exact,
    score_result_margin: row.pts_goaldiff,
    score_result: row.pts_outcome,
    score_nyaris: row.pts_nyaris,
    jagoan_multiplier: row.jagoan_mult ?? row.jagoan_mult_group,
    jagoan_penalty: row.jagoan_penalty,
    underdog_threshold: row.underdog_threshold,
    underdog_multiplier: row.underdog_mult,
    stack_cap: row.stack_cap,
    streak_len: row.streak_len,
    streak_bonus: row.streak_bonus,
    group_position_pts: row.bracket_pts_group_slot,
    perfect_group_bonus: row.bracket_pts_perfect_group,
    ko_stages: Array.isArray(row.ko_stages) ? row.ko_stages : undefined,
  };
  const ko = {
    r32: row.bracket_pts_r32, r16: row.bracket_pts_r16, qf: row.bracket_pts_qf,
    sf: row.bracket_pts_sf, final: row.bracket_pts_final ?? row.bracket_pts_finalist,
  };
  if (Object.values(ko).some((v) => v != null)) out.knockout_pts = ko;
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k];
  return out;
}

/**
 * Resolve the effective config. Order (same as SQL):
 *   Spec v1 defaults ← pickem_rules row ← scoring_config.template ← scoring_config.
 * Returns the canonical shape every other function takes.
 */
export function resolveScoringConfig(scoringConfig, pickemRules) {
  let c = { ...SPEC_V1_DEFAULTS, knockout_pts: { ...SPEC_V1_DEFAULTS.knockout_pts } };
  const fromRow = rulesRowToConfig(pickemRules);
  c = { ...c, ...fromRow, knockout_pts: { ...c.knockout_pts, ...(fromRow.knockout_pts || {}) } };
  let template = null;
  if (scoringConfig && typeof scoringConfig === 'object' && !Array.isArray(scoringConfig)) {
    if (scoringConfig.template) {
      template = String(scoringConfig.template).toLowerCase();
      c = { ...c, ...templateConfig(template) };
    }
    const { template: _t, knockout_pts, ...rest } = scoringConfig;
    c = { ...c, ...rest, knockout_pts: { ...c.knockout_pts, ...(knockout_pts || {}) } };
  }
  return {
    template,
    ladder: {
      exact: num(c.score_exact, 5),
      margin: num(c.score_result_margin, 3),
      outcome: num(c.score_result, 2),
      nyaris: num(c.score_nyaris, 1),
    },
    jagoan: { mult: num(c.jagoan_multiplier, 2), penalty: num(c.jagoan_penalty, 0) },
    underdog: { threshold: num(c.underdog_threshold, 0.30), multiplier: num(c.underdog_multiplier, 1.5) },
    stackCap: num(c.stack_cap, 4),
    streak: { len: num(c.streak_len, 3), bonus: num(c.streak_bonus, 0) },
    groupPositionPts: num(c.group_position_pts, 4),
    perfectGroupBonus: num(c.perfect_group_bonus, 8),
    knockoutPts: Object.fromEntries(Object.entries(c.knockout_pts).map(([k, v]) => [k, num(v, 0)])),
    koStages: Array.isArray(c.ko_stages) ? c.ko_stages : [...SPEC_V1_DEFAULTS.ko_stages],
  };
}

function num(v, fallback) {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

// ── Outcome + tier ──────────────────────────────────────────────────────────

/** 'H' | 'D' | 'A' | null — null when either score is missing (void). */
export function deriveOutcome(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

/**
 * Tier of one prediction against the SCORE at end of play (mirror of
 * pickem_tier). Never reads fixtures.outcome: a KO tie stores the shootout
 * advancer there, but a 1–1 pick on a 1–1 game is exact.
 *   exact  → scoreline matches
 *   margin → right result, same goal difference
 *   result → right result
 *   nyaris → wrong result, total goals within 1 (needs a scoreline pick)
 *   miss   → everything else
 *   void   → no score
 */
export function tierFor(prediction, result) {
  const { homeScore, awayScore } = result;
  const actual = deriveOutcome(homeScore, awayScore);
  if (!actual) return 'void';
  const { pickedOutcome, pickedHome, pickedAway } = prediction;
  const hasScore = pickedHome != null && pickedAway != null;
  if (pickedOutcome === actual) {
    if (hasScore && pickedHome === homeScore && pickedAway === awayScore) return 'exact';
    if (hasScore && pickedHome - pickedAway === homeScore - awayScore) return 'margin';
    return 'result';
  }
  if (hasScore && Math.abs((pickedHome + pickedAway) - (homeScore + awayScore)) <= 1) return 'nyaris';
  return 'miss';
}

/** Ladder value for a tier (0 for miss / void). */
export function ladderPoints(tier, cfg) {
  switch (tier) {
    case 'exact': return cfg.ladder.exact;
    case 'margin': return cfg.ladder.margin;
    case 'result': return cfg.ladder.outcome;
    case 'nyaris': return cfg.ladder.nyaris;
    default: return 0;
  }
}

/** @deprecated use tierFor + ladderPoints; kept for older callers. */
export function basePoints(prediction, result, cfg) {
  return ladderPoints(tierFor(prediction, result), cfg);
}

// ── Multipliers ─────────────────────────────────────────────────────────────

/** Jagoan is ×mult in every stage (Spec v1); 1 when not jagoan. */
export function jagoanMultiplier({ isJagoan }, cfg) {
  return isJagoan ? cfg.jagoan.mult : 1;
}

/** Underdog: consensus STRICTLY below the threshold → ×multiplier. No data → 1. */
export function underdogMultiplier({ consensusAtLock }, cfg) {
  if (consensusAtLock == null || Number.isNaN(Number(consensusAtLock))) return 1;
  return Number(consensusAtLock) < cfg.underdog.threshold ? cfg.underdog.multiplier : 1;
}

/** The stake a jagoan miss is measured against: the result tier (SQL: score_result). */
export function stakeValue(cfg) {
  return cfg.ladder.outcome;
}

/**
 * Jagoan miss penalty (positive number to deduct at matchday aggregation).
 * Only on a real miss or nyaris — never on a void match. round-half-up,
 * like SQL round().
 */
export function jagoanPenalty({ isJagoan, tier }, cfg) {
  if (!isJagoan || !(cfg.jagoan.penalty > 0)) return 0;
  if (tier !== 'miss' && tier !== 'nyaris') return 0;
  return Math.round(cfg.jagoan.penalty * stakeValue(cfg));
}

/**
 * Points for one pick under a config (mirror of pickem_points_for).
 * base × underdog × jagoan, floor(), then cap at stack_cap × base.
 * Nyaris pays its ladder value and takes no multipliers.
 */
export function pointsFor(tier, { isJagoan, consensusAtLock }, cfg) {
  const base = ladderPoints(tier, cfg);
  if (base <= 0) return 0;
  if (!TIERS_CORRECT.has(tier)) return base;
  let pts = base;
  pts *= underdogMultiplier({ consensusAtLock }, cfg);
  pts *= jagoanMultiplier({ isJagoan }, cfg);
  pts = Math.floor(pts);
  const cap = Math.floor(base * cfg.stackCap);
  return pts > cap ? cap : pts;
}

// ── Full match-prediction scoring ───────────────────────────────────────────

/**
 * Score one match prediction. Returns the audit breakdown the SQL writes
 * (tier, base_points, jagoan_mult_applied, upset_mult_applied,
 * awarded_points, penalty_points) plus `capped`.
 * @param {object} prediction { pickedOutcome, pickedHome, pickedAway, isJagoan, consensusAtLock }
 * @param {object} fixture    { homeScore, awayScore }
 * @param {object} cfg        canonical config from resolveScoringConfig
 */
export function scoreMatchPrediction(prediction, fixture, cfg) {
  const tier = tierFor(prediction, fixture);
  const correct = TIERS_CORRECT.has(tier);
  const base = ladderPoints(tier, cfg);
  const jagoanMult = correct ? jagoanMultiplier({ isJagoan: prediction.isJagoan }, cfg) : 1;
  const underdogMult = correct ? underdogMultiplier({ consensusAtLock: prediction.consensusAtLock }, cfg) : 1;
  const awarded = pointsFor(tier, { isJagoan: prediction.isJagoan, consensusAtLock: prediction.consensusAtLock }, cfg);
  const capped = correct && Math.floor(base * underdogMult * jagoanMult) > awarded;
  const penalty = jagoanPenalty({ isJagoan: prediction.isJagoan, tier }, cfg);
  return { tier, base, jagoanMult, underdogMult, awarded, penalty, capped };
}

/** Σ awarded − penalties, floored at 0 (a bad jagoan erases a matchday, never goes negative). */
export function aggregateMatchday(scored) {
  const sum = scored.reduce((acc, s) => acc + (s.awarded || 0) - (s.penalty || 0), 0);
  return Math.max(0, sum);
}

/**
 * Streak bonus over an ORDERED sequence of correctness booleans: every
 * completed run of `len` pays `bonus` once and the counter resets.
 */
export function streakBonus(correctSeq, cfg) {
  const { len, bonus } = cfg.streak || {};
  if (!len || len <= 0 || !bonus) return 0;
  let run = 0;
  let total = 0;
  for (const ok of correctSeq || []) {
    run = ok ? run + 1 : 0;
    if (run === len) { total += bonus; run = 0; }
  }
  return total;
}

/**
 * One member's points under one config (mirror of pickem_member_points):
 * rows ordered by (matchday, kickoffAt, id); per matchday Σ points −
 * penalties floored at 0; streak bonus on completed runs of correct picks;
 * plus the late-join par. Void rows are skipped. Unscored rows must be
 * filtered out by the caller.
 * @param {Array<{tier, isJagoan, consensusAtLock, matchday, kickoffAt, id}>} rows
 */
export function memberPoints(rows, cfg, basePointsPar = 0) {
  const sorted = [...(rows || [])]
    .filter((r) => r.tier && r.tier !== 'void')
    .sort((a, b) => (a.matchday - b.matchday) || cmp(a.kickoffAt, b.kickoffAt) || cmp(a.id, b.id));
  let total = 0, mdSum = 0, curMd = null, run = 0, exactCount = 0, nyarisCount = 0;
  const { len, bonus } = cfg.streak;
  for (const r of sorted) {
    if (curMd !== r.matchday) { total += Math.max(mdSum, 0); mdSum = 0; curMd = r.matchday; }
    mdSum += pointsFor(r.tier, { isJagoan: r.isJagoan, consensusAtLock: r.consensusAtLock }, cfg);
    mdSum -= jagoanPenalty({ isJagoan: r.isJagoan, tier: r.tier }, cfg);
    if (r.tier === 'exact') exactCount++;
    if (r.tier === 'nyaris') nyarisCount++;
    if (TIERS_CORRECT.has(r.tier)) {
      run++;
      if (len > 0 && bonus > 0 && run === len) { mdSum += bonus; run = 0; }
    } else {
      run = 0;
    }
  }
  total += Math.max(mdSum, 0);
  return { points: total + (basePointsPar || 0), exactCount, nyarisCount };
}

function cmp(a, b) { return a === b ? 0 : (a == null ? -1 : b == null ? 1 : (String(a) < String(b) ? -1 : 1)); }

/**
 * Preview for a pick sheet: what each tier would pay given the jagoan
 * flag. Underdog is unknown before lock, so it is never previewed.
 */
export function previewScoring({ pickedHome, pickedAway, isJagoan }, cfg) {
  const flags = { isJagoan, consensusAtLock: null };
  const hasExactPick = pickedHome != null && pickedAway != null;
  const exactPoints = pointsFor('exact', flags, cfg);
  const outcomePoints = pointsFor('result', flags, cfg);
  return {
    jagoanMult: isJagoan ? cfg.jagoan.mult : 1,
    exactPoints: hasExactPick ? exactPoints : null,
    goalDiffPoints: hasExactPick ? pointsFor('margin', flags, cfg) : null,
    outcomePoints,
    nyarisPoints: hasExactPick ? pointsFor('nyaris', flags, cfg) : null,
    bestCaseLabel: hasExactPick ? 'exact' : 'outcome',
    bestCasePoints: hasExactPick ? exactPoints : outcomePoints,
  };
}

// ── Group + knockout (bracket) ──────────────────────────────────────────────

/** Group ranking: group_position_pts per exact placement, perfect_group_bonus when all exact. */
export function scoreGroupRanking(picked, actual, cfg) {
  if (!Array.isArray(picked) || !Array.isArray(actual) || actual.length === 0) {
    return { exact: 0, points: 0, perfect: false };
  }
  let exact = 0;
  for (let i = 0; i < Math.min(picked.length, actual.length); i++) {
    if (picked[i] && picked[i] === actual[i]) exact += 1;
  }
  const perfect = exact === actual.length && picked.length >= actual.length;
  return { exact, points: exact * cfg.groupPositionPts + (perfect ? cfg.perfectGroupBonus : 0), perfect };
}

/** Knockout pick: correct advancing team at a stage pays knockout_pts[stage]. */
export function scoreKnockoutPick({ pickedTeam, advancingTeam, stage }, cfg) {
  if (!pickedTeam || pickedTeam !== advancingTeam) return 0;
  return cfg.knockoutPts[String(stage || '').toLowerCase()] ?? 0;
}
