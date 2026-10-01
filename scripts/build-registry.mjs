#!/usr/bin/env node
/**
 * build-registry.mjs — writes src/pickem/competitions.json from the ESM
 * registry (doc 17 §2.1). Scripts, the edge OG card, the Node API and the
 * workflow matrix read the JSON; the SPA reads the module. check-registry
 * fails the build when the two drift.
 *   node scripts/build-registry.mjs          # write
 *   node scripts/build-registry.mjs --check  # exit 1 on drift
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registryRows, COMPETITION_ORDER, ACTIVE_FEED_KEYS } from '../src/pickem/competitions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/pickem/competitions.json');
const payload = {
  _generated: 'by scripts/build-registry.mjs from src/pickem/competitions.js — do not edit',
  order: COMPETITION_ORDER,
  activeFeeds: ACTIVE_FEED_KEYS,
  competitions: Object.fromEntries(registryRows().map((r) => [r.key, r])),
};
const next = JSON.stringify(payload, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== next) {
    console.error('[registry] competitions.json is out of date — run: node scripts/build-registry.mjs');
    process.exit(1);
  }
  console.log(`[registry] competitions.json in sync (${Object.keys(payload.competitions).length} rows)`);
} else {
  writeFileSync(OUT, next);
  console.log(`[registry] wrote ${OUT} (${Object.keys(payload.competitions).length} rows)`);
}
