/**
 * Shared validation for per-league pool config (migration 0019 columns).
 * Used by create-league (template at creation) and update-league-settings.
 * Flagship Track A ticket A3.
 */

// Whitelisted scoring_config keys + per-key validators. Anything not here
// is rejected (never silently dropped — commissioners should know).
// Shape doc: migration 0019 header + scoring-core.js NEW_DEFAULTS.
const SCORING_KEYS = {
  group_position_pts: nonNegInt,
  perfect_group_bonus: nonNegInt,
  knockout_pts: knockoutShape,
  score_exact: nonNegInt,
  score_result_margin: nonNegInt,
  score_result: nonNegInt,
  underdog_threshold: fraction,
  underdog_multiplier: nonNegNum,
  streak_len: nonNegInt,
  streak_bonus: nonNegInt,
  jagoan_multiplier: nonNegNum,
  jagoan_penalty: fraction,
  stack_cap: nonNegNum,
  nemesis_bonus: nonNegInt,
};

const KO_KEYS = new Set(['r32', 'r16', 'qf', 'sf', 'final']);
const VALID_FORMATS = new Set(['match', 'score', 'bracket', 'survivor']);
const VALID_LATE_JOIN = new Set(['median', 'zero']);

function nonNegInt(v) { return Number.isInteger(v) && v >= 0 && v <= 1000; }
function nonNegNum(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100; }
function fraction(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1; }
function knockoutShape(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.entries(v).every(([k, n]) => KO_KEYS.has(k) && nonNegInt(n));
}

/**
 * Validate a scoring_config object. Returns { ok:true, value } with only
 * whitelisted keys, or { ok:false, error }.
 */
export function validateScoringConfig(input) {
  if (input == null) return { ok: true, value: null };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'scoring_config must be an object' };
  }
  const value = {};
  for (const [k, v] of Object.entries(input)) {
    const check = SCORING_KEYS[k];
    if (!check) return { ok: false, error: `Unknown scoring_config key '${k}'` };
    if (!check(v)) return { ok: false, error: `Invalid value for scoring_config.${k}` };
    value[k] = v;
  }
  return { ok: true, value };
}

/** Validate formats array. */
export function validateFormats(input) {
  if (input == null) return { ok: true, value: null };
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'formats must be a non-empty array' };
  }
  for (const f of input) {
    if (!VALID_FORMATS.has(f)) {
      return { ok: false, error: `Unknown format '${f}'. Allowed: ${[...VALID_FORMATS].join(', ')}` };
    }
  }
  return { ok: true, value: [...new Set(input)] };
}

// D2 (08-teardown-deltas) — the commissioner rules/prizes box is where
// judi-adjacent copy will try to enter the product. Server-side reject of
// betting vocabulary + money-prize phrasing, both locales. Friendly error.
const BANNED_VOCAB = /\b(pasang(an)?|taruhan|bertaruh|odds|judi|bandar|jackpot|deposit|withdraw)\b/i;
const MONEY_PRIZE = /\b(hadiah|prize|pot|pool\s*prize)\b[^.\n]{0,48}\b(uang|rp\.?|rupiah|idr|usd|cash|\$|€)|\b(uang|rp\.?|rupiah|idr|usd|cash)\b[^.\n]{0,48}\b(hadiah|prize)\b/i;

/** Validate leagues.description (D2): ≤2000 chars, no betting vocabulary. */
export function validateDescription(input) {
  if (input == null) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'description must be a string' };
  const value = input.trim();
  if (value.length === 0) return { ok: true, value: null };
  if (value.length > 2000) return { ok: false, error: 'Description is too long (max 2000 characters).' };
  if (BANNED_VOCAB.test(value) || MONEY_PRIZE.test(value)) {
    return {
      ok: false,
      error: "Keep it friendly — betting or cash-prize wording isn't allowed. Merch and voucher prizes are fine. (Bahasa: bahasa taruhan/hadiah uang nggak diizinkan; hadiah merch/voucher boleh.)",
    };
  }
  return { ok: true, value };
}

/** Validate late_join_policy. */
export function validateLateJoinPolicy(input) {
  if (input == null) return { ok: true, value: null };
  if (!VALID_LATE_JOIN.has(input)) {
    return { ok: false, error: "late_join_policy must be 'median' or 'zero'" };
  }
  return { ok: true, value: input };
}

/** Parse a request body that may arrive as object or JSON string. */
export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return null; }
}
