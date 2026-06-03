#!/usr/bin/env node
/**
 * WC2026 group-letter seed — ships v0.79.18.
 *
 * The WC2026 nations were seeded into `teams` by backfill-wc2026.mjs with
 * conference=null. This script stamps the real group letter (A–L) onto
 * teams.conference, read live from the API-Football WC2026 standings draw
 * (league=1, season=2026), mapped through the SAME NATION_TRICODE table as
 * the fixtures backfill so codes stay consistent (Portugal → PRT, etc.).
 *
 * Why teams.conference: it's the existing nullable group/division column
 * (NBA used East/West; WC uses A–L). Stamping it lets any surface group
 * fixtures by their real group, and gives the future bracket-scoring RPC a
 * DB-side source of truth for the group draw instead of a client constant.
 *
 * Idempotent: re-running overwrites conference with the same letter.
 *
 * Usage:
 *   npx vercel env pull .env.production.fresh --environment=production
 *   node scripts/seed-wc2026-groups.mjs --dry-run
 *   node scripts/seed-wc2026-groups.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.production.fresh', '.env.production.local', '.env.local']) {
    const p = join(REPO_ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[k] && v) process.env[k] = v;
    }
    console.log(`[env] loaded ${name}`);
    break;
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://egzacjfbmgbcwhtvqixc.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not set. Run: npx vercel env pull .env.production.fresh --environment=production');
  process.exit(1);
}

const PROXY_BASE = 'https://www.gibol.co/api/proxy/api-football';
const DRY_RUN = process.argv.includes('--dry-run');

// Same map as backfill-wc2026.mjs (Portugal → PRT avoids NBA POR clash).
const NATION_TRICODE = {
  'Algeria': 'ALG', 'Argentina': 'ARG', 'Australia': 'AUS', 'Austria': 'AUT',
  'Belgium': 'BEL', 'Bosnia & Herzegovina': 'BIH', 'Brazil': 'BRA', 'Canada': 'CAN',
  'Cape Verde Islands': 'CPV', 'Colombia': 'COL', 'Congo DR': 'COD', 'Croatia': 'CRO',
  'Curaçao': 'CUW', 'Czech Republic': 'CZE', 'Ecuador': 'ECU', 'Egypt': 'EGY',
  'England': 'ENG', 'France': 'FRA', 'Germany': 'GER', 'Ghana': 'GHA',
  'Haiti': 'HAI', 'Iran': 'IRN', 'Iraq': 'IRQ', 'Ivory Coast': 'CIV',
  'Japan': 'JPN', 'Jordan': 'JOR', 'Mexico': 'MEX', 'Morocco': 'MAR',
  'Netherlands': 'NED', 'New Zealand': 'NZL', 'Norway': 'NOR', 'Panama': 'PAN',
  'Paraguay': 'PAR', 'Portugal': 'PRT', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA',
  'Scotland': 'SCO', 'Senegal': 'SEN', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI', 'Tunisia': 'TUN',
  'Türkiye': 'TUR', 'USA': 'USA', 'Uruguay': 'URU', 'Uzbekistan': 'UZB',
};

async function patchTeam(tricode, conference) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/teams?tricode=eq.${tricode}&league=eq.WC2026`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
      'content-type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify({ conference }),
  });
  if (!res.ok) throw new Error(`PATCH ${tricode} HTTP ${res.status}\n${await res.text()}`);
  return (await res.json()).length;
}

async function main() {
  console.log(`[wc-groups] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'}`);
  const res = await fetch(`${PROXY_BASE}/standings?league=1&season=2026`);
  if (!res.ok) throw new Error(`standings HTTP ${res.status}`);
  const data = await res.json();
  const standings = data?.response?.[0]?.league?.standings || [];

  const updates = []; // { tricode, letter, name }
  const unmapped = new Set();
  for (const groupRows of standings) {
    const rawGroup = groupRows?.[0]?.group || '';
    const m = rawGroup.match(/Group\s+([A-L])/i); // skip "Ranking of third-placed teams"
    if (!m) continue;
    const letter = m[1].toUpperCase();
    for (const row of groupRows) {
      const name = row?.team?.name;
      const tri = NATION_TRICODE[name];
      if (!tri) { unmapped.add(name); continue; }
      updates.push({ tricode: tri, letter, name });
    }
  }

  if (unmapped.size) {
    console.warn(`[wc-groups] WARNING — ${unmapped.size} unmapped nations (skipped):`);
    for (const n of unmapped) console.warn(`           • ${n}`);
  }

  console.log(`[wc-groups] ${updates.length} team→group assignments:`);
  const byLetter = {};
  for (const u of updates) (byLetter[u.letter] ||= []).push(u.tricode);
  for (const L of Object.keys(byLetter).sort()) console.log(`   ${L}: ${byLetter[L].join(', ')}`);

  if (DRY_RUN) { console.log('[wc-groups] DRY-RUN — no writes.'); return; }

  let patched = 0;
  for (const u of updates) patched += await patchTeam(u.tricode, u.letter);
  console.log(`[wc-groups] patched ${patched} teams.conference`);
  console.log('[wc-groups] done.');
}

main().catch((e) => { console.error('[wc-groups] FAILED:', e); process.exit(1); });
