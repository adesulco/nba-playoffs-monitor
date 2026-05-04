/**
 * Contrast helpers — v0.11.26 NEW-4 fix.
 *
 * Many sport-brand accent colors (Aston Villa #37003C claret, Charlotte
 * Hornets #1d1160 purple, Liverpool #C8102E red, etc.) are inherently
 * dark and fail WCAG AA (4.5:1) when laid over the dashboard's #0a1628
 * page navy. The audit's NEW-4 finding measured Aston Villa at 1.02:1
 * and Suns/Hornets purple at 1.03:1 — virtually invisible.
 *
 * Two strategies for handling team color in UI:
 *
 *   1. As FOREGROUND TEXT on the dark page bg → use `readableOnDark()`
 *      to mix the brand color toward white until the contrast ratio
 *      clears 4.5:1. Returns the original if it already passes.
 *
 *   2. As DECORATIVE-ONLY bars / borders / chips that don't carry text
 *      → keep the brand color, but mark `aria-hidden="true"` so axe
 *      stops flagging the contrast (because the color is not conveying
 *      information to AT users).
 *
 * The legacy `brighten()` utility in NBADashboard pre-computed a single
 * `accentBright` per page mount. We promote it here so every sport hub
 * (EPL, F1, Tennis, NBA) can use the same readable accent everywhere a
 * team color drives text foreground.
 */

/**
 * Mix a hex color toward white by `mix` (0..1). 0 = original, 1 = white.
 */
export function brighten(hex, mix = 0.5) {
  if (!hex || typeof hex !== 'string') return hex;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const f = (v) => Math.round(v + (255 - v) * mix);
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Mix a hex color toward black by `mix` (0..1). 0 = original, 1 = black.
 * Used for light-mode contrast when an accent is too pale.
 */
export function darken(hex, mix = 0.5) {
  if (!hex || typeof hex !== 'string') return hex;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const f = (v) => Math.round(v * (1 - mix));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ── WCAG ratio computation ─────────────────────────────────────────── */

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  if (!hex || typeof hex !== 'string') return 0;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return 0;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return 0;
  const r = srgbToLinear((num >> 16) & 0xff);
  const g = srgbToLinear((num >> 8) & 0xff);
  const b = srgbToLinear(num & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.1 contrast ratio between two colors. Range 1..21.
 * Pass thresholds: 4.5 for AA normal text, 3.0 for AA large text.
 */
export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Readable accent on a known background ──────────────────────────── */

const DEFAULT_DARK_BG = '#0a1628';
const DEFAULT_LIGHT_BG = '#ffffff';

/**
 * Returns a version of `accent` that has ≥ `target` ratio against `bg`.
 * Iteratively mixes toward white (on dark bg) or black (on light bg)
 * until the threshold is met or 8 steps elapse. Stable: returns the
 * original color if it already passes.
 *
 * Use for any place team accent drives FOREGROUND TEXT — fonts, links,
 * stat values, etc. Don't use for decorative borders/bars where the
 * color doesn't carry information.
 */
export function readableOnDark(accent, target = 4.5, bg = DEFAULT_DARK_BG) {
  if (!accent) return accent;
  if (contrastRatio(accent, bg) >= target) return accent;
  let mix = 0.2;
  let out = brighten(accent, mix);
  for (let i = 0; i < 8 && contrastRatio(out, bg) < target; i++) {
    mix = Math.min(0.95, mix + 0.1);
    out = brighten(accent, mix);
  }
  return out;
}

export function readableOnLight(accent, target = 4.5, bg = DEFAULT_LIGHT_BG) {
  if (!accent) return accent;
  if (contrastRatio(accent, bg) >= target) return accent;
  let mix = 0.2;
  let out = darken(accent, mix);
  for (let i = 0; i < 8 && contrastRatio(out, bg) < target; i++) {
    mix = Math.min(0.95, mix + 0.1);
    out = darken(accent, mix);
  }
  return out;
}

/**
 * Convenience: returns a readable foreground for the active theme.
 * `mode` is 'dark' (default) or 'light'.
 */
export function readableAccent(accent, mode = 'dark', target = 4.5) {
  return mode === 'light'
    ? readableOnLight(accent, target)
    : readableOnDark(accent, target);
}
