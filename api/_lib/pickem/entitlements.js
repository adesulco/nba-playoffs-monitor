/**
 * entitlements.js — gate logic for the freemium ladder (A5 · R2-6).
 *
 * Two layers:
 *   1. Pure decision functions (exported, unit-tested) — given the facts,
 *      what's allowed? No I/O.
 *   2. hasEntitlement(admin, userId, product, competition) — the one DB
 *      read, used by handlers.
 *
 * Products (entitlements.product):
 *   season_pass — per-competition commissioner pass (competition column set)
 *   lifetime    — all competitions forever (competition null)
 *   gibol_plus  — player premium (pre-pick consensus etc.)
 *
 * Gates (01-strategy §2 + 03 §C + 06):
 *   host >1 grup            → season_pass(competition) | lifetime
 *   member #11+ approval    → league.tier !== 'free' (flipped by webhook/grant)
 *   multi-entry (cap 3)     → season_pass | lifetime; HARD cap 3 even paid
 *   manual entries          → season_pass | lifetime
 *   pre-pick consensus      → gibol_plus
 */

/** True when any entitlement row covers (product, competition) right now. */
export function entitlementCovers(rows, product, competition, nowMs = Date.now()) {
  return (rows || []).some((r) => {
    if (r.product !== product) return false;
    if (r.expires_at && new Date(r.expires_at).getTime() <= nowMs) return false;
    // lifetime + gibol_plus rows are competition-null = cover everything;
    // season_pass covers only its competition.
    if (r.product === 'season_pass') {
      return r.competition == null || r.competition === competition;
    }
    return true;
  });
}

/** Commissioner wants to create/host another grup beyond the first. */
export function canHostAnotherGrup({ hostedCount, rows, competition }, nowMs = Date.now()) {
  if (hostedCount < 1) return { allowed: true };
  const paid = entitlementCovers(rows, 'season_pass', competition, nowMs)
    || entitlementCovers(rows, 'lifetime', competition, nowMs);
  return paid
    ? { allowed: true }
    : { allowed: false, gate: 'host_limit', needs: 'season_pass' };
}

/** Player adds another entry to the same grup. HARD cap 3 even paid (anti-brute-force). */
export const MULTI_ENTRY_CAP = 3;
export function canAddEntry({ entryCount, rows, competition }, nowMs = Date.now()) {
  if (entryCount >= MULTI_ENTRY_CAP) {
    return { allowed: false, gate: 'entry_cap', hardCap: true };
  }
  if (entryCount < 1) return { allowed: true };
  const paid = entitlementCovers(rows, 'season_pass', competition, nowMs)
    || entitlementCovers(rows, 'lifetime', competition, nowMs)
    || entitlementCovers(rows, 'gibol_plus', competition, nowMs);
  return paid
    ? { allowed: true }
    : { allowed: false, gate: 'multi_entry', needs: 'gibol_plus' };
}

/** Commissioner creates a manual entry for an offline player. */
export function canManageManualEntry({ rows, competition }, nowMs = Date.now()) {
  const paid = entitlementCovers(rows, 'season_pass', competition, nowMs)
    || entitlementCovers(rows, 'lifetime', competition, nowMs);
  return paid
    ? { allowed: true }
    : { allowed: false, gate: 'manual_entry', needs: 'season_pass' };
}

/** Pre-pick consensus visibility (anti-anchoring: free users see it post-pick only). */
export function canSeePrePickConsensus({ rows, competition }, nowMs = Date.now()) {
  return entitlementCovers(rows, 'gibol_plus', competition, nowMs)
    ? { allowed: true }
    : { allowed: false, gate: 'premium_consensus', needs: 'gibol_plus' };
}

/**
 * The one DB read. Returns the user's live entitlement rows; pass them to
 * the pure gates above (so a handler does ONE query for several checks).
 */
export async function fetchEntitlements(admin, userId) {
  const { data } = await admin
    .from('entitlements')
    .select('product, competition, expires_at')
    .eq('user_id', userId);
  return data || [];
}

/** Convenience single-check used by simple handlers. */
export async function hasEntitlement(admin, userId, product, competition) {
  const rows = await fetchEntitlements(admin, userId);
  return entitlementCovers(rows, product, competition);
}
