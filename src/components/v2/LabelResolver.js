// ============================================================================
// v0.64.0 — LabelResolver (paper-grey P2 systems).
//
// Picks the largest abbreviation tier that fits a given width budget for a
// pair of entities (home + away, driver + team, etc.). Replaces ad-hoc
// `text-overflow: ellipsis` on names — ellipsis on a name is failure
// (audit UX-011, UX-012).
//
// Four tiers per entity, from design_handoff_gibol_v1/js/systems.jsx:
//
//   Tier   | Width budget   | Example (F1)
//   -------|----------------|-----------------------
//   full   | >= 240px       | Andrea Kimi Antonelli
//   medium | 120-240px      | A. Antonelli
//   short  | 60-120px       | Antonelli
//   code   | <= 60px / mono | ANT
//
// Rule: a component declares its width budget; the resolver returns the
// largest tier that fits BOTH entities in a pair. If one side fits Medium
// and the other only Short, both step down to Short. Never mix tiers in
// one row. The Code tier is typeset in mono inside a --bg-deep pill —
// it reads as an identifier, not as a truncated name.
//
// Entity shape:
//   { full: 'Andrea Kimi Antonelli', medium: 'A. Antonelli',
//     short: 'Antonelli', code: 'ANT' }
//
// Any of medium/short/code may be omitted — the resolver falls back to
// the next-shorter present tier so callers can supply only what they have.
// `code` should always be supplied for sports that use it (NBA/EPL/F1).
// ============================================================================

export const TIER_ORDER = ['full', 'medium', 'short', 'code'];

// Width budget per tier (px). The resolver picks the LARGEST tier whose
// budget is <= the per-entity slot width. Edges are inclusive on the low
// side so a slot of exactly 120px gets "short" (not "medium").
export const TIER_BUDGETS = {
  full: 240,
  medium: 120,
  short: 60,
  code: 0,
};

// Approximate average glyph width in pixels for the UI sans, used by
// `fitsWidth` when no measureText is available. Conservative — overcounts
// slightly so the resolver errs on the side of stepping down to a smaller
// tier, which is preferable to mid-word truncation.
const APPROX_CHAR_PX = {
  full: 8.4,
  medium: 8.4,
  short: 8.4,
  code: 9.6, // mono is wider per glyph
};

/**
 * pickTier(slotWidth) → tier
 *
 * Pure budget lookup. Returns the largest tier whose budget fits the
 * given slot width. Use this when the caller knows the slot width
 * precisely and doesn't need to account for the actual rendered string
 * length (e.g. fixed-width table columns).
 */
export function pickTier(slotWidth) {
  if (slotWidth == null || slotWidth < 0) return 'code';
  for (const tier of TIER_ORDER) {
    if (slotWidth >= TIER_BUDGETS[tier]) return tier;
  }
  return 'code';
}

/**
 * Read a tier from an entity, falling back through narrower tiers when
 * the requested tier is absent. Returns null only when the entity has
 * no usable form at all.
 */
export function readEntityTier(entity, tier) {
  if (!entity) return null;
  const idx = TIER_ORDER.indexOf(tier);
  if (idx === -1) return entity.full || entity.short || entity.code || null;
  for (let i = idx; i < TIER_ORDER.length; i++) {
    const t = TIER_ORDER[i];
    if (entity[t]) return entity[t];
  }
  return entity.full || null;
}

/**
 * fitsWidth(text, tier, slotWidth) → boolean
 *
 * Rough width check using the approximate glyph widths above. Avoids
 * dragging a canvas into the hot path — for precise measurement, supply
 * a `measure` function via resolvePair (e.g. a memoized canvas
 * measureText call). The approximation is wrong by a few percent for
 * proportional fonts, which is fine: the resolver steps down one tier
 * sooner than strictly necessary, never the other way around.
 */
export function fitsWidth(text, tier, slotWidth) {
  if (!text || slotWidth == null) return true;
  const px = APPROX_CHAR_PX[tier] || APPROX_CHAR_PX.short;
  return text.length * px <= slotWidth;
}

/**
 * resolvePair({ a, b, slotWidth, measure? }) → { tier, a, b }
 *
 * Returns the largest tier at which BOTH entities fit the per-entity slot
 * width. The symmetric step-down is the whole point — "Cleveland
 * Cavaliers vs OKC" is never allowed, so when one side has to drop to
 * Short the other does too.
 *
 * - `a`, `b`: entity objects (see top-of-file shape).
 * - `slotWidth`: pixel budget PER ENTITY (so a 280px header divided
 *   between home and away passes ~140 here, not 280).
 * - `measure?`: optional function (text, tier) → px. Provide one for
 *   precise canvas measurement; the default uses the approximation in
 *   `fitsWidth`.
 *
 * Returns the resolved tier and the rendered text for each side.
 */
export function resolvePair({ a, b, slotWidth, measure }) {
  const checkFit = (text, tier) => {
    if (measure) return measure(text, tier) <= slotWidth;
    return fitsWidth(text, tier, slotWidth);
  };

  // Start at the largest tier whose BUDGET fits the slot, then verify
  // both rendered strings actually fit. If either overruns, step down.
  let startIdx = 0;
  for (let i = 0; i < TIER_ORDER.length; i++) {
    if (slotWidth == null || slotWidth >= TIER_BUDGETS[TIER_ORDER[i]]) {
      startIdx = i;
      break;
    }
  }

  for (let i = startIdx; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const aText = readEntityTier(a, tier);
    const bText = readEntityTier(b, tier);
    if (!aText || !bText) continue;
    if (checkFit(aText, tier) && checkFit(bText, tier)) {
      return { tier, a: aText, b: bText };
    }
  }

  // Final fallback — return the code tier (or whatever the entity has).
  return {
    tier: 'code',
    a: readEntityTier(a, 'code') || '',
    b: readEntityTier(b, 'code') || '',
  };
}

/**
 * resolveOne({ entity, slotWidth, measure? }) → { tier, text }
 *
 * Single-entity variant — for sport surfaces with no opponent (a club
 * hub hero, a driver page). The "never mix tiers in a row" rule doesn't
 * apply, but the same tier ladder is honored so the visual vocabulary
 * stays consistent across the app.
 */
export function resolveOne({ entity, slotWidth, measure }) {
  const checkFit = (text, tier) => {
    if (measure) return measure(text, tier) <= slotWidth;
    return fitsWidth(text, tier, slotWidth);
  };
  let startIdx = 0;
  for (let i = 0; i < TIER_ORDER.length; i++) {
    if (slotWidth == null || slotWidth >= TIER_BUDGETS[TIER_ORDER[i]]) {
      startIdx = i;
      break;
    }
  }
  for (let i = startIdx; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const text = readEntityTier(entity, tier);
    if (!text) continue;
    if (checkFit(text, tier)) return { tier, text };
  }
  return { tier: 'code', text: readEntityTier(entity, 'code') || '' };
}
