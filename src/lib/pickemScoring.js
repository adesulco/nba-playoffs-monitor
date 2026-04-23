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
