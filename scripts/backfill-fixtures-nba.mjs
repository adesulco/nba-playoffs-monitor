#!/usr/bin/env node
/**
 * NBA Playoffs fixtures backfill — ships v0.79.1.
 *
 * Pulls the next ${WINDOW_DAYS} days of ESPN NBA scoreboard data and
 * UPSERTs into public.fixtures so the Pick'em UI has something to render.
 * Idempotent: each fixture's primary-key UUID is deterministically derived
 * from the ESPN event ID (SHA1 → UUIDv5 format), so re-running this script
 * updates existing rows instead of creating duplicates.
 *
 * What it does NOT do:
 *   - It does NOT score the fixtures (pickem_score_fixture RPC handles that
 *     separately, triggered when the score endpoint is called).
 *   - It does NOT touch the teams table — assumes the 30 NBA tricodes are
 *     already seeded (verified 2026-05-25: SELECT count(*) WHERE league='NBA'
 *     returned 30).
 *   - It does NOT pull regular-season games — postseason only. Filtered via
 *     ESPN's `season.type === 3` (post-season slug).
 *
 * Usage:
 *   # Pull live env from Vercel first if .env.production.fresh is stale
 *   npx vercel env pull .env.production.fresh --environment=production
 *
 *   # Dry run — print what would be upserted, don't write
 *   node scripts/backfill-fixtures-nba.mjs --dry-run
 *
 *   # Real run
 *   node scripts/backfill-fixtures-nba.mjs
 *
 *   # Custom window (default 14 days, max 30)
 *   WINDOW_DAYS=21 node scripts/backfill-fixtures-nba.mjs
 *
 * Env required:
 *   SUPABASE_SERVICE_ROLE_KEY — read from .env.production.fresh (or
 *                               .env.production.local, or set inline).
 *                               Service-role bypasses RLS, which we need
 *                               because Pick'em fixtures have no public-write
 *                               policy and shouldn't.
 *
 * Schema dependency: this script targets the columns defined in migration
 *   0015_pickem_match_prediction.sql:
 *     id (uuid PK) | league | season | stage | matchday | home_team |
 *     away_team | kickoff_at | lock_at | status | home_score | away_score |
 *     outcome | finalized_at
 *
 * Stage + matchday derivation (NBA postseason):
 *   ESPN's `notes[0].headline` shape:
 *     "1st Round - Game 1"
 *     "Conf. Semis - Game 3"     or  "East Semis - Game 3"
 *     "East Finals - Game 4"     or  "West Finals - Game 4"
 *     "NBA Finals - Game 2"
 *   → stage   = R1 / CSF / CF / F
 *   → matchday = 1 / 2 / 3 / 4 (round number, matches Pick'em §5 cadence
 *     groupings for Jagoan + Survivor scope)
 *
 * Outcome derivation: NBA has no draws, so outcome is H or A based on the
 * higher score. Schema check constraint `outcome in ('H','D','A')` accepts
 * H/D/A; we never emit D for NBA.
 *
 * Komdigi-aware: this script writes p_home / p_draw / p_away as NULL —
 * the futures-odds provider was removed in v0.79.0 and the schema accepts
 * (null,null,null) per the all-or-none check constraint. Pick'em scoring
 * still works (the upset multiplier just defaults to 1.0 when p_* is null;
 * see migration 0015 §7.2 RPC body).
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// ─── Env loading ────────────────────────────────────────────────────────────
// Prefer .env.production.fresh (just-pulled from Vercel) over the stale
// .env.production.local. Both have the same shape; the `fresh` variant is
// what `npx vercel env pull` produces.
function loadEnv() {
  const candidates = ['.env.production.fresh', '.env.production.local', '.env.local'];
  for (const name of candidates) {
    const p = join(REPO_ROOT, name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    const lines = raw.split('\n');
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      // Strip surrounding double quotes (Vercel CLI output format)
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      // Don't override pre-set env (CLI > file)
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
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('Run: npx vercel env pull .env.production.fresh --environment=production');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const WINDOW_DAYS = Math.min(30, parseInt(process.env.WINDOW_DAYS || '14', 10));
// v0.79.3 — also walk a small lookback window so games that finalized
// since the last run pick up scores + outcome. 3 days back is enough
// for NBA (no game stays in 'live' or 'scheduled' longer than that
// without ESPN's status flipping to 'post'). Tunable via env if needed.
const LOOKBACK_DAYS = Math.min(7, parseInt(process.env.LOOKBACK_DAYS || '3', 10));
const LEAGUE_KEY = 'NBA-Playoffs-2026';
const SEASON = '2025-26';

// ─── Deterministic UUID from ESPN event ID ─────────────────────────────────
// SHA1-based v5 UUID, namespaced to 'gibol-nba-fixture:' so the same ESPN
// event ID always maps to the same Supabase row UUID across runs.
function deterministicUuid(espnEventId) {
  const hash = createHash('sha1')
    .update(`gibol-nba-fixture:${espnEventId}`)
    .digest('hex');
  // Format as a UUIDv5: 8-4-4-4-12 with version nibble = 5, variant = 8/9/a/b
  const versionNibble = '5';
  const variantNibble = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    versionNibble + hash.slice(13, 16),
    variantNibble + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

// ─── ESPN tricode → DB tricode normalizer ──────────────────────────────────
// ESPN's NBA scoreboard returns 2-letter codes for a few teams while our
// teams table uses the canonical 3-letter NBA abbreviation everywhere.
// Verified mismatches as of 2026-05-25 by diffing ESPN scoreboard output
// against `SELECT tricode FROM teams WHERE league='NBA'`.
const ESPN_TO_DB_TRICODE = {
  SA: 'SAS',   // San Antonio Spurs
  NY: 'NYK',   // New York Knicks
  NO: 'NOP',   // New Orleans Pelicans
  GS: 'GSW',   // Golden State Warriors
  WSH: 'WAS',  // Washington Wizards
  UTAH: 'UTA', // Utah Jazz (ESPN sometimes returns "UTAH")
};
function normalizeTricode(espnAbbr) {
  if (!espnAbbr) return espnAbbr;
  return ESPN_TO_DB_TRICODE[espnAbbr] || espnAbbr;
}

// ─── Stage + matchday from ESPN notes headline ──────────────────────────────
// Returns { stage, matchday, gameNumber } or null when the headline doesn't
// match a known postseason pattern (regular-season or All-Star).
function parsePostseasonHeadline(headline) {
  if (!headline) return null;
  const m = headline.match(/Game\s+(\d+)/i);
  const gameNumber = m ? parseInt(m[1], 10) : null;

  // Order matters: NBA Finals matches first because "Finals" appears
  // in both NBA Finals and Conference Finals strings.
  if (/NBA Finals/i.test(headline)) return { stage: 'F',   matchday: 4, gameNumber };
  if (/(East|West) Finals/i.test(headline)) return { stage: 'CF',  matchday: 3, gameNumber };
  if (/Conf\.?\s*Finals/i.test(headline)) return { stage: 'CF',  matchday: 3, gameNumber };
  if (/(East|West) Semis/i.test(headline)) return { stage: 'CSF', matchday: 2, gameNumber };
  if (/Conf\.?\s*Semis/i.test(headline)) return { stage: 'CSF', matchday: 2, gameNumber };
  if (/1st Round|First Round/i.test(headline)) return { stage: 'R1', matchday: 1, gameNumber };
  return null;
}

// ─── ESPN fetch ─────────────────────────────────────────────────────────────
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

function yyyymmdd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function fetchEspnForDate(yyyymmddStr) {
  const url = `${ESPN_BASE}/scoreboard?dates=${yyyymmddStr}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[espn] ${yyyymmddStr}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.events || [];
}

// ─── Map ESPN event → fixtures row ──────────────────────────────────────────
function mapEvent(event) {
  // Filter: must be post-season (season.type === 3)
  if (event.season?.type !== 3) return null;

  const c = event.competitions?.[0];
  if (!c) return null;

  const headline = c.notes?.[0]?.headline || '';
  const stageInfo = parsePostseasonHeadline(headline);
  if (!stageInfo) {
    // Could be a Play-In game ("Play-In Tournament" headline); skip for now —
    // those games happen before R1 starts and the Pick'em window opens.
    return null;
  }

  const teams = c.competitors || [];
  const home = teams.find((t) => t.homeAway === 'home') || teams[0];
  const away = teams.find((t) => t.homeAway === 'away') || teams[1];
  if (!home?.team?.abbreviation || !away?.team?.abbreviation) return null;
  // ESPN uses "TBD" for not-yet-determined matchups (NBA Finals before
  // the conference finals end). Skip — teams.tricode FK would reject it
  // anyway. We'll pick these up on a subsequent backfill run once the
  // series resolves.
  if (home.team.abbreviation === 'TBD' || away.team.abbreviation === 'TBD') return null;

  const statusState = c.status?.type?.state; // 'pre' | 'in' | 'post'
  const status = statusState === 'post' ? 'final' : statusState === 'in' ? 'live' : 'scheduled';
  const completed = c.status?.type?.completed === true;

  // Score parsing — ESPN's score field is sometimes a string, sometimes an object {value}
  function parseScore(s) {
    if (s == null) return null;
    if (typeof s === 'number') return s;
    if (typeof s === 'string' && s !== '') return parseInt(s, 10);
    if (typeof s === 'object' && s.value != null) return parseInt(s.value, 10);
    return null;
  }
  const homeScore = completed ? parseScore(home.score) : null;
  const awayScore = completed ? parseScore(away.score) : null;

  let outcome = null;
  if (completed && homeScore != null && awayScore != null) {
    outcome = homeScore > awayScore ? 'H' : 'A';
  }

  return {
    id: deterministicUuid(event.id),
    league: LEAGUE_KEY,
    season: SEASON,
    stage: stageInfo.stage,
    matchday: stageInfo.matchday,
    home_team: normalizeTricode(home.team.abbreviation),
    away_team: normalizeTricode(away.team.abbreviation),
    kickoff_at: event.date,
    lock_at: event.date, // lock at tip-off; the spec allows overriding later
    status,
    home_score: homeScore,
    away_score: awayScore,
    outcome,
    finalized_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    // ─── meta for logging only, stripped before upsert ────────────────────
    _espn_id: event.id,
    _headline: headline,
    _game_no: stageInfo.gameNumber,
  };
}

// ─── Teams allowlist (defensive: skip events whose tricodes don't exist) ──
async function fetchAllowedTricodes() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/teams?league=eq.NBA&select=tricode`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!res.ok) throw new Error(`teams fetch failed: HTTP ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map((r) => r.tricode));
}

// ─── PostgREST upsert ───────────────────────────────────────────────────────
async function upsertFixtures(rows) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  // Strip meta fields
  const payload = rows.map(({ _espn_id, _headline, _game_no, ...rest }) => rest);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fixtures?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert failed: HTTP ${res.status}\n${err}`);
  }
  const returned = await res.json();
  return { inserted: returned.length, skipped: 0 };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[backfill] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'} window=${WINDOW_DAYS}d league=${LEAGUE_KEY}`);

  const today = new Date();
  const dates = [];
  for (let i = -LOOKBACK_DAYS; i < WINDOW_DAYS; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    dates.push(yyyymmdd(d));
  }
  console.log(`[backfill] fetching ESPN scoreboard for ${dates.length} dates: ${dates[0]} → ${dates[dates.length - 1]} (lookback=${LOOKBACK_DAYS}d, forward=${WINDOW_DAYS}d)`);

  const allowedTricodes = await fetchAllowedTricodes();
  console.log(`[backfill] allowed NBA tricodes in teams table: ${allowedTricodes.size}`);

  const eventsByDate = {};
  for (const dStr of dates) {
    eventsByDate[dStr] = await fetchEspnForDate(dStr);
  }

  // Dedupe events across the window (ESPN's date param has timezone spillover)
  const seen = new Set();
  const rows = [];
  let skippedNotPostseason = 0;
  let skippedUnparsed = 0;
  let skippedUnknownTricode = 0;
  for (const dStr of dates) {
    for (const event of eventsByDate[dStr]) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      if (event.season?.type !== 3) { skippedNotPostseason++; continue; }
      const row = mapEvent(event);
      if (!row) { skippedUnparsed++; continue; }
      if (!allowedTricodes.has(row.home_team) || !allowedTricodes.has(row.away_team)) {
        skippedUnknownTricode++;
        console.warn(`[backfill] skipping unknown tricode pair: ${row.away_team} @ ${row.home_team} (espn=${row._espn_id})`);
        continue;
      }
      rows.push(row);
    }
  }

  console.log(`[backfill] discovered ${rows.length} postseason fixtures with known teams`);
  console.log(`           (skipped ${skippedNotPostseason} non-postseason, ${skippedUnparsed} TBD/unparsed, ${skippedUnknownTricode} unknown-tricode)`);

  // Pretty-print
  for (const r of rows) {
    const stamp = `${r.stage}/G${r._game_no ?? '?'} md${r.matchday}`;
    const matchup = `${r.away_team} @ ${r.home_team}`;
    const score = r.status === 'final' ? `  FINAL ${r.away_score}-${r.home_score} (${r.outcome})` : `  [${r.status}]`;
    console.log(`  ${stamp.padEnd(14)} ${matchup.padEnd(12)} ${r.kickoff_at.slice(0, 16)}  ${score}  espn=${r._espn_id}`);
  }

  if (DRY_RUN) {
    console.log(`[backfill] DRY-RUN — would upsert ${rows.length} rows. Re-run without --dry-run to apply.`);
    return;
  }

  if (rows.length === 0) {
    console.log('[backfill] nothing to write');
    return;
  }

  console.log(`[backfill] writing ${rows.length} rows to Supabase...`);
  const result = await upsertFixtures(rows);
  console.log(`[backfill] done — upserted ${result.inserted} rows`);
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
