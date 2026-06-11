#!/usr/bin/env node
/**
 * WC2026 Pick'em seed + fixtures backfill — ships v0.79.17.
 *
 * Un-blocked 2026-06-02: the paid API-Football plan (dev@kultura.co.id)
 * now serves the WC2026 schedule (league=1, season=2026) — 72 group-stage
 * fixtures, 48 nations, opener Mexico vs South Africa 2026-06-11. The old
 * "waiting on FIFA's machine-readable schedule" blocker is gone.
 *
 * Two jobs (the WC nations aren't in the teams table yet, unlike NBA):
 *   1. SEED the 48 national teams into public.teams (idempotent upsert on
 *      tricode). FIFA 3-letter codes, EXCEPT Portugal → 'PRT' to avoid a
 *      PK collision with NBA's 'POR' (Portland). teams.tricode is a global
 *      primary key shared across all sports.
 *   2. BACKFILL the fixtures into public.fixtures (league='WC2026',
 *      season='2026', stage='group', matchday 1-3 from "Group Stage - N").
 *      Deterministic UUIDs from the API-Football fixture id → idempotent.
 *
 * The Pick'em UI already supports WC2026 (competition registry +
 * switcher pill; bracket + survivor enabled). Once this runs, the
 * WC2026 competition shows real group-stage fixtures to predict.
 *
 * Football CAN draw, so the Pick'em OutcomePicker shows the draw option
 * for WC2026 (competition.shape === 'tournament-bracket', allowDraw=true).
 *
 * Usage:
 *   npx vercel env pull .env.production.fresh --environment=production  # for the service key
 *   node scripts/backfill-wc2026.mjs --dry-run
 *   node scripts/backfill-wc2026.mjs
 *
 * Env required: SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS —
 * Pick'em fixtures + teams have no public-write policy, by design).
 *
 * Data source: the gibol.co API-Football proxy (server-side paid key),
 * same path the live web app + content engine use. No key needed locally.
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// ─── Env loading (same pattern as backfill-fixtures-nba.mjs) ────────────────
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
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not set.');
  console.error('Run: npx vercel env pull .env.production.fresh --environment=production');
  process.exit(1);
}

const PROXY_BASE = 'https://www.gibol.co/api/proxy/api-football';
const DRY_RUN = process.argv.includes('--dry-run');
const COMPETITION = 'WC2026';
const SEASON = '2026';
const AF_LEAGUE = 1; // API-Football World Cup league id

// ─── Nation → tricode map (FIFA codes; Portugal→PRT avoids NBA POR clash) ───
// Keyed by the EXACT API-Football team name. If API-Football renames a
// team or a knockout-stage nation appears that's not here, the fixture is
// skipped + logged (so we never write a fixture with an unseeded team).
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

// ─── Deterministic UUID from API-Football fixture id ────────────────────────
function deterministicUuid(afFixtureId) {
  const hash = createHash('sha1').update(`gibol-wc2026-fixture:${afFixtureId}`).digest('hex');
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return [hash.slice(0, 8), hash.slice(8, 12), '5' + hash.slice(13, 16),
          variant + hash.slice(17, 20), hash.slice(20, 32)].join('-');
}

// ─── Fetch WC2026 fixtures via the proxy ────────────────────────────────────
async function fetchWcFixtures() {
  const res = await fetch(`${PROXY_BASE}/fixtures?league=${AF_LEAGUE}&season=${SEASON}`);
  if (!res.ok) throw new Error(`proxy fixtures: HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }
  return data.response || [];
}

// ─── Map API-Football round → { stage, matchday } ──────────────────────────
// A8 (2026-06-11): extended beyond "Group Stage - N" for the Jun 28
// knockout re-run — KO fixtures were silently SKIPPED before this.
// KO matchdays continue the group sequence (4..8) so jagoan's
// one-per-matchday rule + matchday aggregation keep working.
// Stage names match pickem_rules.ko_stages: ['R32','R16','QF','SF','final'].
const KO_ROUNDS = [
  [/round of 32/i,            { stage: 'R32',   matchday: 4 }],
  [/round of 16/i,            { stage: 'R16',   matchday: 5 }],
  [/quarter/i,                { stage: 'QF',    matchday: 6 }],
  [/3rd place|third place/i,  { stage: 'SF',    matchday: 7 }], // scores with SF weight
  [/semi/i,                   { stage: 'SF',    matchday: 7 }],
  [/\bfinal\b/i,              { stage: 'final', matchday: 8 }],
];
function roundToStage(round) {
  const r = round || '';
  const m = r.match(/Group Stage\s*-\s*(\d+)/i);
  if (m) return { stage: 'group', matchday: parseInt(m[1], 10) };
  for (const [re, val] of KO_ROUNDS) {
    if (re.test(r)) return val;
  }
  return null;
}

// ─── PostgREST upsert helper ────────────────────────────────────────────────
async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} upsert HTTP ${res.status}\n${await res.text()}`);
  return (await res.json()).length;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[wc2026] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'} competition=${COMPETITION}`);
  const raw = await fetchWcFixtures();
  console.log(`[wc2026] fetched ${raw.length} fixtures from API-Football`);

  // 1. Collect the participating nations actually present in the schedule.
  const nations = new Map(); // name -> tricode
  const unmapped = new Set();
  for (const f of raw) {
    for (const side of ['home', 'away']) {
      const name = f.teams?.[side]?.name;
      if (!name) continue;
      const tri = NATION_TRICODE[name];
      if (!tri) { unmapped.add(name); continue; }
      nations.set(name, tri);
    }
  }
  if (unmapped.size) {
    console.warn(`[wc2026] WARNING — ${unmapped.size} unmapped nations (fixtures with these are skipped):`);
    for (const n of unmapped) console.warn(`           • ${n}  (add to NATION_TRICODE)`);
  }

  // 2. Build team rows. league='WC2026' scopes them; name = country.
  // teams.city is NOT NULL (only conference was made nullable in
  // migration 0002). National teams have no city, so mirror the country
  // name into city — the Pick'em UI shows `name` + `tricode` badge, and
  // city as a secondary label reads fine as the country.
  const teamRows = [...nations.entries()].map(([name, tricode]) => ({
    tricode,
    name,
    city: name,
    league: COMPETITION,
  }));

  // 3. Build fixture rows (group stage only; knockouts appear later w/ TBD teams).
  const fixtureRows = [];
  let skipped = 0;
  for (const f of raw) {
    const st = roundToStage(f.league?.round);
    const homeName = f.teams?.home?.name;
    const awayName = f.teams?.away?.name;
    const home = NATION_TRICODE[homeName];
    const away = NATION_TRICODE[awayName];
    if (!st || !home || !away) { skipped++; continue; } // TBD KO teams skip until resolved
    const kickoff = f.fixture?.date;
    if (!kickoff) { skipped++; continue; }
    fixtureRows.push({
      id: deterministicUuid(f.fixture.id),
      league: COMPETITION,
      season: SEASON,
      stage: st.stage,
      matchday: st.matchday,
      home_team: home,
      away_team: away,
      kickoff_at: kickoff,
      lock_at: kickoff,
      status: 'scheduled',
      home_score: null,
      away_score: null,
      outcome: null,
      updated_at: new Date().toISOString(),
      _label: `${st.stage === 'group' ? `MD${st.matchday}` : st.stage} ${away} @ ${home} ${kickoff.slice(0, 10)}`,
    });
  }
  fixtureRows.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

  console.log(`[wc2026] teams to seed: ${teamRows.length}`);
  console.log(`[wc2026] fixtures to write: ${fixtureRows.length} (skipped ${skipped})`);
  for (const r of fixtureRows.slice(0, 8)) console.log(`   ${r._label}`);
  if (fixtureRows.length > 8) console.log(`   … +${fixtureRows.length - 8} more`);

  if (DRY_RUN) {
    console.log('[wc2026] DRY-RUN — no writes. Re-run without --dry-run to apply.');
    return;
  }

  // 4. Seed teams FIRST (fixtures FK to teams.tricode), then fixtures.
  const teamPayload = teamRows;
  const seeded = await upsert('teams', teamPayload, 'tricode');
  console.log(`[wc2026] seeded/updated ${seeded} teams`);

  const fxPayload = fixtureRows.map(({ _label, ...rest }) => rest);
  const wrote = await upsert('fixtures', fxPayload, 'id');
  console.log(`[wc2026] upserted ${wrote} fixtures`);
  console.log('[wc2026] done.');
}

main().catch((e) => { console.error('[wc2026] FAILED:', e); process.exit(1); });
