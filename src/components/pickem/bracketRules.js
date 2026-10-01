// Legacy NBA bracket point values (pickem_rules.points_* in migration 0002).
// Used only by the NBA bracket editor to show potential points; the DB is
// the source of truth. Moved out of src/lib/pickemScoring.js when that
// mirror was retired for Scoring Spec v1 (api/_lib/pickem/scoring-core.js).
export const DEFAULT_RULES = { R1: 1, R2: 2, CF: 4, F: 8, exactGamesBonus: 1, finalsMvpBonus: 5 };

export function pointsForRoundPick(round) {
  return DEFAULT_RULES[round] ?? 0;
}

export function maxBracketPoints() {
  const roundBase = 8 * DEFAULT_RULES.R1 + 4 * DEFAULT_RULES.R2 + 2 * DEFAULT_RULES.CF + 1 * DEFAULT_RULES.F;
  return roundBase + 15 * DEFAULT_RULES.exactGamesBonus + DEFAULT_RULES.finalsMvpBonus;
}
