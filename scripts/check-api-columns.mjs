#!/usr/bin/env node
/**
 * check-api-columns.mjs — every literal `.from('t').select('cols')` in api/
 * and scripts/, probed against the PROD schema with limit=0 (no rows read).
 *
 * Why: a select naming a column that a migration removed or never added
 * fails the whole query, and most handlers treat a failed read as "no data"
 * — so the screen quietly shows zeros. Found 2026-10-07: survivor-board
 * asked profiles for `username` (every Gugur board showed id prefixes) and
 * list-profile asked leaderboard_competition for `first_submitted_at`
 * (profile rank and points always empty). Run after every migration; the
 * Health watch workflow runs it daily.
 *
 *   node scripts/check-api-columns.mjs
 * Env: SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_URL), or .env.local.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env.production.local', '.env.local']) {
  const p = join(ROOT, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (!line || line.startsWith('#') || eq === -1) continue;
    const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[k] && v) process.env[k] = v;
  }
  break;
}
const SB = process.env.SUPABASE_URL || 'https://egzacjfbmgbcwhtvqixc.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(2); }

const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p, out); }
    else if (/\.m?js$/.test(n) && !/\.test\./.test(n) && n !== 'check-api-columns.mjs') out.push(p);
  }
  return out;
};

const seen = new Map();
for (const f of [...walk(join(ROOT, 'api')), ...walk(join(ROOT, 'scripts'))]) {
  const src = readFileSync(f, 'utf8').replace(/\s+/g, ' ');
  const re = /\.from\(\s*['"]([a-z_]+)['"]\s*\)\s*\.select\(\s*(['"`])([^'"`]*)\2/g;
  let m;
  while ((m = re.exec(src))) {
    const [, table, , cols] = m;
    if (cols.includes('${')) continue;
    const key = `${table}|${cols}`;
    if (!seen.has(key)) seen.set(key, { table, cols, file: relative(ROOT, f) });
  }
}

const bad = [];
for (const { table, cols, file } of seen.values()) {
  const r = await fetch(`${SB}/rest/v1/${table}?select=${encodeURIComponent(cols)}&limit=0`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  });
  if (r.status >= 400) {
    const body = await r.text();
    bad.push(`${file}  ${table}(${cols.slice(0, 80)})  → ${r.status} ${body.slice(0, 140)}`);
  }
}
console.log(`probed ${seen.size} selects against ${SB}`);
if (bad.length) {
  console.error(`\n${bad.length} select(s) fail against the prod schema:`);
  for (const b of bad) console.error(`  ${b}`);
  process.exit(1);
}
console.log('✓ every API select matches the prod schema');
