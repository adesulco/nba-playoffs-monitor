/**
 * scripts/test-satori-fonts.mjs — parse-test font files against the SAME
 * satori that @vercel/og runs in production.
 *
 * Exists because the og-recap outage was undiagnosable from prod: Satori
 * throws while parsing a font ("Cannot read properties of undefined
 * (reading '256')") and Vercel converts the edge exception into an empty
 * HTTP 200. This script fails loudly and locally instead.
 *
 * Usage: node scripts/test-satori-fonts.mjs <font.ttf> [more.ttf...]
 * Exit 0 = every font renders; exit 1 = at least one throws.
 */

import satori from 'satori';
import { readFile } from 'node:fs/promises';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/test-satori-fonts.mjs <font.ttf> [...]');
  process.exit(2);
}

let failed = 0;
for (const f of files) {
  try {
    const data = await readFile(f);
    await satori(
      {
        type: 'div',
        props: {
          style: { display: 'flex', fontFamily: 'T', fontSize: 40 },
          children: 'Semua demi gengsi 0123',
        },
      },
      { width: 600, height: 100, fonts: [{ name: 'T', data, weight: 400, style: 'normal' }] }
    );
    console.log(`PASS  ${f}`);
  } catch (e) {
    console.log(`FAIL  ${f}  →  ${e.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
