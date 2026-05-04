/**
 * Card design tokens for the per-game OG endpoint (v0.12.0 Theme A).
 *
 * Mirrors src/lib/constants.js COLORS so the card matches the live
 * dashboard palette. Sourced from the existing static template
 * (ops/generate_recap.py) — same brand orange, page bg, ink scale —
 * but with three lifted contrast values for the card's plain-text
 * surfaces (verdict body, player-card stat line, footer tagline)
 * which were rendered as near-invisible #4a4a5c on the static
 * template (the audit's NEW-4 catastrophe is fixed in the live UI;
 * here we close the same bug on the share-card surface so the
 * verdict and stat lines are readable).
 */
export const COLORS = {
  bg: '#08111F',
  panel: '#0F1B2E',
  ink: '#F4F4F5',
  ink2: '#D4D4D8',  // bumped from #A1A1AA — verdict + body text now ~13:1
  ink3: '#9FB4CC',  // matches the live --ink-3 lift from v0.11.19
  muted: '#71717A',
  amber: '#FF5722',
  amberSoft: '#FFB088',
  red: '#F25757',
  green: '#3DDB84',
  blue: '#3B82F6',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(255,255,255,0.08)',
  liveDot: '#F25757',
};

/**
 * Brighten a hex toward white by mix factor (0–1). Lifted from
 * src/lib/contrast.js so this serverless function doesn't need to
 * import from src/. Used to ensure team-color foreground passes 4.5:1
 * against the dark page bg.
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
 * Hex with alpha (0–1) → rgba string. Used for radial-gradient overlays
 * over the team color background.
 */
export function hexa(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
