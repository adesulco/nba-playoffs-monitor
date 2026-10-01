#!/usr/bin/env node
// Seam rule (doc 17 §2.3): screens under src/pickem/ talk to the server only
// through src/pickem/api.js. Any other file importing lib/supabase is a build
// failure. eslint is not installed in this repo, so the rule lives here and
// runs inside `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'pickem');
const ALLOWED = new Set(['src/pickem/api.js']);
const offenders = [];
(function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(js|jsx)$/.test(name) || /\.test\./.test(name)) continue;
    const rel = relative(ROOT, p);
    if (ALLOWED.has(rel)) continue;
    const src = readFileSync(p, 'utf8');
    if (/from\s+['"][^'"]*lib\/supabase(\.js)?['"]/.test(src) || /@supabase\/supabase-js/.test(src)) offenders.push(rel);
  }
})(DIR);
if (offenders.length) {
  console.error('❌ Seam guard FAILED — screens must call src/pickem/api.js, never Supabase directly:');
  for (const f of offenders) console.error(`   ${f}`);
  process.exit(1);
}
console.log('✓ Seam guard passed — only src/pickem/api.js touches Supabase');
