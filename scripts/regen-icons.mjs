import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });
const svg = readFileSync('public/brand/gibol-mark.svg', 'utf-8');
const sizes = [
  { out: 'public/favicon-16.png', w: 16 },
  { out: 'public/favicon-32.png', w: 32 },
  { out: 'public/favicon-64.png', w: 64 },
  { out: 'public/apple-touch-icon.png', w: 180 },
  { out: 'public/icons/icon-192.png', w: 192 },
  { out: 'public/icons/icon-512.png', w: 512 },
  { out: 'public/icons/icon-maskable-192.png', w: 192 },
  { out: 'public/icons/icon-maskable-512.png', w: 512 },
];

for (const { out, w } of sizes) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: w } });
  writeFileSync(out, r.render().asPng());
  console.log(`✓ ${out} (${w}×${w})`);
}
