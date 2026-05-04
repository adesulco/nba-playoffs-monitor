/**
 * Font loader for the per-game OG endpoint (v0.12.0 Theme A).
 *
 * Loads the variable-axis Inter Tight + JetBrains Mono TTFs from
 * api/og/_fonts/. Vercel includes the entire api/ subtree in the
 * function deployment, so these are read once at module init.
 *
 * Both are variable fonts. Satori 0.10+ supports variable fonts but
 * we pin the weight at the call site (700 for Inter Tight, 500 for
 * JetBrains Mono) so the rasterised glyph metrics stay consistent
 * across calls.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// process.cwd() at function runtime is the project root on Vercel.
const FONTS_DIR = join(process.cwd(), 'api', 'og', '_fonts');

let cached = null;

export function getFonts() {
  if (cached) return cached;
  const interTightBuf = readFileSync(join(FONTS_DIR, 'InterTight-Bold.ttf'));
  const jbmBuf = readFileSync(join(FONTS_DIR, 'JetBrainsMono-Regular.ttf'));
  // Satori font tuple: { name, data, weight, style }
  // We register multiple weights of Inter Tight pointing at the same
  // variable font so the layout can use 400/500/700 freely; Satori
  // walks the variable axis to pick the right weight.
  cached = [
    { name: 'Inter Tight', data: interTightBuf, weight: 400, style: 'normal' },
    { name: 'Inter Tight', data: interTightBuf, weight: 500, style: 'normal' },
    { name: 'Inter Tight', data: interTightBuf, weight: 600, style: 'normal' },
    { name: 'Inter Tight', data: interTightBuf, weight: 700, style: 'normal' },
    { name: 'Inter Tight', data: interTightBuf, weight: 800, style: 'normal' },
    { name: 'JetBrains Mono', data: jbmBuf, weight: 400, style: 'normal' },
    { name: 'JetBrains Mono', data: jbmBuf, weight: 600, style: 'normal' },
    { name: 'JetBrains Mono', data: jbmBuf, weight: 700, style: 'normal' },
  ];
  return cached;
}
