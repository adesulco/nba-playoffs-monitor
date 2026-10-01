#!/usr/bin/env node
/**
 * Generic football fixtures backfill + score — ships v0.81.0 (R0-1/R0-2).
 *
 * One script for every football competition (WC2026 now, AFF 2026 + EPL
 * 2026/27 next). Pulls results from the configured source, upserts into
 * public.fixtures, then triggers the scoring RPCs so the loop is
 * autonomous — the structural fix for the WC2026 blackout (72 group
 * fixtures sat `scheduled` from Jun 12 to Jul 20 because scoring
 * depended on a human running a script from one Mac).
 *
 * Sources per competition (first available wins):
 *   espn         — free, no key. Soccer scoreboard by date range.
 *                  WC2026 verified 2026-07-21: all 104 games present,
 *                  FIFA tricodes, shootoutScore on penalty games.
 *   api-football — the paid plan lapsed to free on/before 2026-07-21
 *                  ("Free plans do not have access to this season").
 *                  Config is kept so renewing the plan re-enables it
 *                  (pass --source api-football).
 *
 * Scoring semantics (frozen schema, migrations 0015/0016 untouched):
 *   - group/league fixtures: outcome H/D/A from the final score.
 *   - knockout fixtures: outcome is the ADVANCING side (H/A, never D) —
 *     score ties are broken by the penalty shootout. This is what
 *     pickem_score_bracket expects (outcome→advancer mapping); a 'D' on
 *     a KO fixture would zero every bracket pick on that match.
 *     Exception: a 3rd-place match can't produce a 'D' either (it maps
 *     to stage SF for scoring weight) — same shootout tiebreak applies.
 *   - AET scores include extra time; PEN scores are the 120' score
 *     (shootout tallies never enter home_score/away_score).
 *
 * Existing rows are matched by (home,away,UTC kickoff date) and keep
 * their id and matchday. kickoff_at follows the source and lock_at
 * follows kickoff_at (Spec v1, doc 17 §1 Lock) — a rescheduled kickoff
 * moves the pick window with it. New rows (the KO
 * games) get a provider-agnostic deterministic UUID from
 * `gibol-football-fixture:{league}:{stage}:{home}:{away}` so re-runs
 * and source switches never duplicate.
 *
 * After the upsert every final fixture is scored via the
 * pickem_score_fixture RPC (idempotent, v0.79.11 NBA pattern), and for
 * tournament-shaped competitions every bracket is re-scored via
 * pickem_score_bracket.
 *
 * Usage:
 *   node scripts/backfill-fixtures-football.mjs --competition WC2026 --dry-run
 *   node scripts/backfill-fixtures-football.mjs --competition WC2026
 *
 * Env required: SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS).
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  process.exit(1);
}

// ─── Competition registry ───────────────────────────────────────────────────
// shape 'tournament' = group stage + KO bracket (WC template; AFF re-points
// this). shape 'league' = matchday rounds only (EPL, Liga 1).
const COMPETITIONS = {
  WC2026: {
    league: 'WC2026',
    season: '2026',
    shape: 'tournament',
    espn: { code: 'fifa.world', from: '2026-06-11', to: '2026-07-19' },
    apiFootball: { leagueId: 1, season: 2026 },
    // ESPN season.slug → { stage, matchday }. Stage names match
    // pickem_rules.ko_stages; KO matchdays continue the group sequence
    // (4..8) so jagoan's one-per-matchday rule keeps working (A8 pattern).
    espnRounds: {
      'group-stage':      { stage: 'group', matchday: null }, // matchday from the seeded row
      'round-of-32':      { stage: 'R32',   matchday: 4 },
      'round-of-16':      { stage: 'R16',   matchday: 5 },
      'quarterfinals':    { stage: 'QF',    matchday: 6 },
      'semifinals':       { stage: 'SF',    matchday: 7 },
      // Deliberately NOT 'SF' (deviates from the A8 KO_ROUNDS map):
      // pickem_score_bracket validates sf_winner picks against ANY final
      // fixture with stage='SF', so a 3rd-place winner (a team that LOST
      // its semi) would earn phantom bracket points. Stage '3rd' is
      // invisible to bracket scoring; match predictions on it still score
      // via the outcome ladder (is_ko=false → group jagoan multiplier).
      '3rd-place-match':  { stage: '3rd',   matchday: 7 },
      'final':            { stage: 'final', matchday: 8 },
    },
    // ESPN abbreviation → teams.tricode where they differ. Everything
    // else passes through (verified against the 48 seeded tricodes).
    tricodeOverrides: { POR: 'PRT' }, // NBA Portland owns 'POR'
  },
  AFF2026: {
    league: 'AFF2026',
    season: '2026',
    shape: 'tournament',
    espn: { code: 'aff.championship', from: '2026-07-24', to: '2026-08-26' },
    // ESPN verified 2026-07-21: 26 events (20 group + 4 SF legs + 2 final
    // legs), 10 real teams; KO slots show placeholder pseudo-teams
    // (2A/1B/SFW1…) until the group stage resolves — those events are
    // skipped by the nations allowlist and picked up by the cron later.
    espnRounds: {
      // Group matchdays aren't numbered by ESPN — derive by clustering
      // kickoff dates (gap ≤1 day = same matchday; 5 matchdays of 4 games).
      'group-stage': { stage: 'group', matchday: 'cluster' },
      // Two-legged rounds: stage gets a -L1/-L2 suffix per pairing (by
      // kickoff order). Deliberately NOT plain 'SF'/'final': a single leg's
      // outcome is not the aggregate advancer, and pickem_score_bracket
      // reads stage='SF'/'final' outcomes as advancement — leg-suffixed
      // stages are invisible to it (and to ko_stages: is_ko=false, group
      // jagoan weight — acceptable; brackets stay off for AFF).
      'semifinals':  { stage: 'SF', legs: true, baseMatchday: 6 },
      'finals':      { stage: 'F',  legs: true, baseMatchday: 8 },
    },
    tricodeOverrides: { PHI: 'PHL' }, // NBA Philadelphia owns 'PHI'
    // Seed these into teams (idempotent) before writing fixtures — the
    // AFF nations aren't in the table. Keyed by tricode AFTER overrides.
    nations: {
      CAM: 'Cambodia', SIN: 'Singapore', TLS: 'Timor-Leste', VIE: 'Vietnam',
      MYA: 'Myanmar', MAS: 'Malaysia', LAO: 'Laos', THA: 'Thailand',
      IDN: 'Indonesia', PHL: 'Philippines',
    },
  },
  'EPL-2026-27': {
    league: 'EPL-2026-27',
    season: '2026-27',
    shape: 'league',
    // Rolling ESPN window for the every-2h score updates (the seed run
    // uses --source fixturedownload). ESPN never creates rows for a
    // league-shape comp — it only updates the 380 seeded ones (matched
    // rows keep their matchday), so matchweek numbers can't drift.
    espn: { code: 'eng.1', rolling: true },
    espnRounds: {
      'regular-season': { stage: 'regular', matchday: null },
    },
    tricodeOverrides: {},
    // One-time seed source: fixturedownload.com has all 380 fixtures with
    // RoundNumber (= matchweek 1..38). Verified 2026-07-22 — and it
    // corrected the calendar: MW1 is Aug 21–24 2026, NOT Aug 15.
    fixtureDownload: { url: 'https://fixturedownload.com/feed/json/epl-2026' },
    // Feed team name → tricode (ESPN abbreviations, so the ESPN update
    // path matches rows without a mapping layer). No collisions in the
    // teams table (checked 2026-07-22).
    clubs: {
      'Arsenal': 'ARS', 'Aston Villa': 'AVL', 'Bournemouth': 'BOU',
      'Brentford': 'BRE', 'Brighton': 'BHA', 'Chelsea': 'CHE',
      'Coventry': 'COV', 'Crystal Palace': 'CRY', 'Everton': 'EVE',
      'Fulham': 'FUL', 'Hull': 'HUL', 'Ipswich': 'IPS', 'Leeds': 'LEE',
      'Liverpool': 'LIV', 'Man City': 'MNC', 'Man Utd': 'MAN',
      'Newcastle': 'NEW', "Nott'm Forest": 'NFO', 'Spurs': 'TOT',
      'Sunderland': 'SUN',
    },
  },
};

// ─── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
const DRY_RUN = args.includes('--dry-run');
const COMP_KEY = argValue('--competition');
const comp = COMPETITIONS[COMP_KEY];
if (!comp) {
  console.error(`FATAL: --competition required. Known: ${Object.keys(COMPETITIONS).join(', ')}`);
  process.exit(1);
}

// ─── Deterministic UUID (provider-agnostic) ─────────────────────────────────
function deterministicUuid(key) {
  const hash = createHash('sha1').update(`gibol-football-fixture:${key}`).digest('hex');
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return [hash.slice(0, 8), hash.slice(8, 12), '5' + hash.slice(13, 16),
          variant + hash.slice(17, 20), hash.slice(20, 32)].join('-');
}

// ─── Supabase helpers ────────────────────────────────────────────────────────
const sbHeaders = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'content-type': 'application/json',
};

async function sbSelect(pathAndQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`select ${pathAndQuery}: HTTP ${res.status}\n${await res.text()}`);
  return res.json();
}

// PostgREST caps a single select at 1000 rows by default. A 380-row EPL
// season fits, but a second league in the same table would not — and a
// truncated list silently drops fixtures from the idle check and the
// match step. Page until a short page comes back.
async function sbSelectAll(pathAndQuery, pageSize = 1000) {
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await sbSelect(`${pathAndQuery}&order=id&limit=${pageSize}&offset=${offset}`);
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}

async function sbUpsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} upsert HTTP ${res.status}\n${await res.text()}`);
  return (await res.json()).length;
}

async function sbRpc(fn, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rpc ${fn}: HTTP ${res.status} ${text.slice(0, 160)}`);
  try { return JSON.parse(text); } catch { return null; }
}

// ─── ESPN source ─────────────────────────────────────────────────────────────
function* dateRange(fromIso, toIso) {
  const d = new Date(`${fromIso}T00:00:00Z`);
  const end = new Date(`${toIso}T00:00:00Z`);
  while (d <= end) {
    yield d.toISOString().slice(0, 10).replaceAll('-', '');
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

// Rolling window never reaches back further than this, so a competition
// with ancient abandoned rows can't turn every cron run into 100+ calls.
const MAX_LOOKBACK_DAYS = 120;

async function fetchEspnEvents(cfg, dbFixtures = []) {
  let { from, to } = cfg;
  if (cfg.rolling) {
    const day = (offset) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    from = day(-3);
    to = day(10);
    // Self-healing window: reach back to the earliest past fixture that is
    // still not final (capped), so one run after an outage catches up on
    // its own instead of forever covering only the last three days.
    const now = Date.now();
    const staleDays = dbFixtures
      .filter((f) => f.status !== 'final' && new Date(f.kickoff_at).getTime() < now)
      .map((f) => f.kickoff_at.slice(0, 10))
      .sort();
    if (staleDays.length) {
      const floor = day(-MAX_LOOKBACK_DAYS);
      const earliest = staleDays[0] < floor ? floor : staleDays[0];
      if (earliest < from) from = earliest;
    }
  }
  console.log(`[espn] ${cfg.code} window ${from} → ${to}`);
  const events = new Map();
  for (const dstr of dateRange(from, to)) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${cfg.code}/scoreboard?dates=${dstr}`;
    // A non-200 is a job failure, not a warning: a skipped day is exactly
    // how results go missing while the run still exits 0. One retry
    // absorbs a transient blip; a second failure stops the run.
    let res = await fetch(url);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await fetch(url);
    }
    if (!res.ok) throw new Error(`espn ${cfg.code} ${dstr}: HTTP ${res.status}`);
    const data = await res.json();
    for (const e of data.events || []) events.set(e.id, e);
  }
  return [...events.values()];
}

function parseScoreInt(s) {
  if (s == null || s === '') return null;
  const n = typeof s === 'object' ? s.value : s;
  const i = parseInt(n, 10);
  return Number.isFinite(i) ? i : null;
}

// Post-mapping pass: resolve 'cluster' matchdays and two-legged rounds.
// - cluster: distinct UTC kickoff dates of the stage, sorted; dates ≤1 day
//   apart share a matchday (AFF group stage: 5 matchdays × 4 games).
// - legs: within (stage, unordered team pair), order by kickoff → stage
//   'SF-L1'/'SF-L2', matchday = baseMatchday + leg - 1.
function assignRounds(records) {
  const clusterStages = new Set(records.filter((r) => r.matchday === 'cluster').map((r) => r.stage));
  for (const stage of clusterStages) {
    const recs = records.filter((r) => r.stage === stage && r.matchday === 'cluster');
    const days = [...new Set(recs.map((r) => r.kickoff_at.slice(0, 10)))].sort();
    const dayToMd = new Map();
    let md = 0, prev = null;
    for (const day of days) {
      if (prev === null || (new Date(day) - new Date(prev)) / 86400000 > 1) md++;
      dayToMd.set(day, md);
      prev = day;
    }
    for (const r of recs) r.matchday = dayToMd.get(r.kickoff_at.slice(0, 10));
  }
  const legGroups = new Map();
  for (const r of records) {
    if (!r._legs) continue;
    const key = `${r.stage}:${[r.home_team, r.away_team].sort().join('-')}`;
    if (!legGroups.has(key)) legGroups.set(key, []);
    legGroups.get(key).push(r);
  }
  for (const group of legGroups.values()) {
    group.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    group.forEach((r, i) => {
      r.matchday = r._baseMatchday + i;
      r.stage = `${r.stage}-L${i + 1}`;
    });
  }
  return records;
}

// Map one ESPN event → a normalized result record (not yet a db row).
function mapEspnEvent(event, cfg) {
  const slug = event.season?.slug;
  // League-shape competitions (EPL, Liga 1) have exactly one round type, so
  // ANY season.slug is the regular season. ESPN renamed eng.1's slug from
  // 'regular-season' to '2026-27-english-premier-league' and every MW1–MW5
  // event was skipped for 40 days while this cron exited green (audit
  // 2026-10-01). Tournament shapes keep the explicit lookup — there the
  // slug carries the stage.
  const round = comp.shape === 'league'
    ? { stage: 'regular', matchday: null }
    : comp.espnRounds[slug];
  if (!round) return { skip: `unknown round slug '${slug}'` };

  const c = event.competitions?.[0];
  if (!c) return { skip: 'no competition block' };
  const home = c.competitors?.find((t) => t.homeAway === 'home');
  const away = c.competitors?.find((t) => t.homeAway === 'away');
  const homeAbbr = home?.team?.abbreviation;
  const awayAbbr = away?.team?.abbreviation;
  if (!homeAbbr || !awayAbbr) return { skip: 'missing team abbreviation' };
  const tri = (a) => comp.tricodeOverrides[a] || a;

  const state = c.status?.type?.state; // 'pre' | 'in' | 'post'
  const status = state === 'post' ? 'final' : state === 'in' ? 'live' : 'scheduled';
  const completed = c.status?.type?.completed === true || state === 'post';

  const homeScore = completed ? parseScoreInt(home.score) : null;
  const awayScore = completed ? parseScoreInt(away.score) : null;

  // Outcome: H/D/A where a draw is a legitimate 1X2 result (group play
  // and individual legs of two-legged ties — a level leg is a D even if
  // the tie later goes to pens); the advancer (H/A, shootout tiebreak)
  // for single-match KO rounds, which bracket scoring reads.
  const drawable = comp.shape === 'league' || round.stage === 'group' || round.legs === true;
  let outcome = null;
  if (completed && homeScore != null && awayScore != null) {
    if (homeScore !== awayScore) {
      outcome = homeScore > awayScore ? 'H' : 'A';
    } else if (drawable) {
      outcome = 'D';
    } else {
      const hs = parseScoreInt(home.shootoutScore);
      const as = parseScoreInt(away.shootoutScore);
      if (hs != null && as != null && hs !== as) outcome = hs > as ? 'H' : 'A';
      else return { skip: `KO draw without shootout data (${homeAbbr} v ${awayAbbr})` };
    }
  }

  return {
    stage: round.stage,
    matchday: round.legs ? 'pending-leg' : round.matchday,
    home_team: tri(homeAbbr),
    away_team: tri(awayAbbr),
    kickoff_at: new Date(event.date).toISOString(),
    status,
    home_score: homeScore,
    away_score: awayScore,
    outcome,
    _legs: round.legs === true,
    _baseMatchday: round.baseMatchday ?? null,
    _detail: c.status?.type?.detail || '',
  };
}

// ─── API-Football source (kept for the plan renewal; unused while lapsed) ──
async function fetchApiFootballResults(cfg) {
  const url = `https://www.gibol.co/api/proxy/api-football/fixtures?league=${cfg.leagueId}&season=${cfg.season}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`api-football proxy: HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }
  return data.response || [];
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[football] mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'} competition=${comp.league} shape=${comp.shape}`);

  // 1. Existing db state: fixtures (for id/lock preservation + matchday)
  //    and the teams allowlist (FK guard).
  const dbFixtures = await sbSelectAll(`fixtures?league=eq.${comp.league}&select=*`);
  const nowMs = Date.now();
  const dbPastNonFinal = dbFixtures.filter(
    (f) => f.status !== 'final' && new Date(f.kickoff_at).getTime() < nowMs
  ).length;

  // Machine-readable run summary — the workflow's verify step reads it
  // (fails the job when past non-final fixtures exist but nothing
  // matched), and it is the one line a human needs from the log.
  const summary = {
    competition: comp.league, shape: comp.shape, dryRun: DRY_RUN, idle: false,
    dbFixtures: dbFixtures.length, dbPastNonFinal,
    sourceEvents: 0, mapped: 0, matched: 0, created: 0, drifted: 0,
    finals: 0, scoredPredictions: 0, awardedPoints: 0, scoreErrors: 0,
  };
  const writeSummary = () => {
    console.log(`[football] summary ${JSON.stringify(summary)}`);
    if (process.env.BACKFILL_SUMMARY) writeFileSync(process.env.BACKFILL_SUMMARY, JSON.stringify(summary, null, 2));
  };

  // Cron cheap-exit: with --skip-if-idle, bail before any source fetch
  // unless a non-final fixture kicks off within ±6h (matchday window) —
  // keeps the every-2h cron nearly free between matchdays.
  if (args.includes('--skip-if-idle')) {
    const now = Date.now();
    const SIX_H = 6 * 3600 * 1000;
    const active = dbFixtures.some((f) =>
      f.status !== 'final' && Math.abs(new Date(f.kickoff_at).getTime() - now) <= SIX_H
    );
    if (!active) {
      console.log('[football] idle (no non-final fixture within ±6h) — exiting.');
      summary.idle = true;
      writeSummary();
      return;
    }
  }
  const allowed = new Set(
    (await sbSelect(`teams?league=eq.${comp.league}&select=tricode`)).map((r) => r.tricode)
  );
  console.log(`[football] db: ${dbFixtures.length} fixtures, ${allowed.size} teams`);

  const byPairDate = new Map(); // 'HOME:AWAY:YYYY-MM-DD' -> row
  const byPair = new Map();     // 'HOME:AWAY' -> row (league shape only)
  for (const f of dbFixtures) {
    byPairDate.set(`${f.home_team}:${f.away_team}:${f.kickoff_at.slice(0, 10)}`, f);
    byPair.set(`${f.home_team}:${f.away_team}`, f);
  }
  // League shape: each (home, away) pair plays exactly once a season, so
  // the pair alone identifies the row and a fixture moved to another date
  // (TV picks, cup clashes — 5 of 59 EPL events on 2026-10-01) still
  // matches and drifts instead of being skipped as 'no seeded row'.
  // Tournament shapes keep the date in the key: a KO pairing can repeat a
  // group-stage pairing.
  const findExisting = (m) => comp.shape === 'league'
    ? byPair.get(`${m.home_team}:${m.away_team}`)
    : byPairDate.get(`${m.home_team}:${m.away_team}:${m.kickoff_at.slice(0, 10)}`);

  // 2. Fetch + map source events.
  const source = argValue('--source') || 'espn';
  let mapped = [];
  if (source === 'espn') {
    const events = await fetchEspnEvents(comp.espn, dbFixtures);
    console.log(`[football] espn: ${events.length} events`);
    summary.sourceEvents = events.length;
    mapped = events.map((e) => mapEspnEvent(e, comp.espn));
  } else if (source === 'fixturedownload' && comp.fixtureDownload) {
    // One-time season seed (league shape): full fixture list with
    // RoundNumber = matchweek. Score updates come from ESPN afterwards.
    const res = await fetch(comp.fixtureDownload.url);
    if (!res.ok) throw new Error(`fixturedownload: HTTP ${res.status}`);
    const feed = await res.json();
    console.log(`[football] fixturedownload: ${feed.length} fixtures`);
    mapped = feed.map((m) => {
      const home = comp.clubs[m.HomeTeam];
      const away = comp.clubs[m.AwayTeam];
      if (!home || !away) return { skip: `unmapped club '${!home ? m.HomeTeam : m.AwayTeam}'` };
      const played = m.HomeTeamScore != null && m.AwayTeamScore != null;
      return {
        stage: 'regular',
        matchday: m.RoundNumber,
        home_team: home,
        away_team: away,
        kickoff_at: new Date(m.DateUtc).toISOString(),
        status: played ? 'final' : 'scheduled',
        home_score: played ? m.HomeTeamScore : null,
        away_score: played ? m.AwayTeamScore : null,
        outcome: played
          ? (m.HomeTeamScore > m.AwayTeamScore ? 'H' : m.HomeTeamScore < m.AwayTeamScore ? 'A' : 'D')
          : null,
      };
    });
  } else {
    throw new Error(`source '${source}' not available for ${comp.league} (api-football plan lapsed)`);
  }

  const skips = mapped.filter((m) => m.skip);
  for (const s of skips) console.warn(`[football] skip: ${s.skip}`);
  mapped = mapped.filter((m) => !m.skip);

  // Teams this competition should seed: nations map (tournament) or the
  // inverted clubs map (league). Placeholder KO slots (ESPN pseudo-teams
  // like '2A'/'SFW1') and anything unmapped drop here; the cron re-runs
  // pick real pairings up once the group stage resolves.
  const seedMap = comp.nations
    || (comp.clubs ? Object.fromEntries(Object.entries(comp.clubs).map(([n, t]) => [t, n])) : null);
  if (seedMap) {
    mapped = mapped.filter((m) => {
      const ok = seedMap[m.home_team] && seedMap[m.away_team];
      if (!ok) console.warn(`[football] unresolved pairing skipped: ${m.away_team} @ ${m.home_team} (${m.stage})`);
      return ok;
    });
  }
  assignRounds(mapped);

  // Seed missing teams before fixtures (FK on teams.tricode).
  if (seedMap && !DRY_RUN) {
    const teamRows = Object.entries(seedMap)
      .filter(([tricode]) => !allowed.has(tricode))
      .map(([tricode, name]) => ({ tricode, name, city: name, league: comp.league }));
    if (teamRows.length) {
      const seeded = await sbUpsert('teams', teamRows, 'tricode');
      console.log(`[football] seeded ${seeded} ${comp.league} teams`);
    }
  }
  if (seedMap) for (const t of Object.keys(seedMap)) allowed.add(t);

  // 3. Build db rows: matched rows keep id/kickoff/lock/matchday; new rows
  //    get deterministic ids and source kickoff (lock_at = kickoff).
  const rows = [];
  let matchedN = 0, newN = 0, unknownTeamN = 0, driftedN = 0;
  for (const m of mapped) {
    if (!allowed.has(m.home_team) || !allowed.has(m.away_team)) {
      unknownTeamN++;
      console.warn(`[football] unknown tricode pair ${m.away_team} @ ${m.home_team} — not in teams(league=${comp.league})`);
      continue;
    }
    const existing = findExisting(m);
    const finalized = m.status === 'final';
    if (existing) {
      matchedN++;
      // Reschedules: the source is the truth for kickoff time, and lock_at
      // follows it (Spec v1: lock = kickoff, per fixture). The July seed
      // put every MD6 game at 14:00Z; ESPN has ARS v LEE at 11:30Z, so
      // picks would have stayed open 2.5 h into the match. League rows
      // match by pair so date moves drift too; tournament rows match by
      // pair + UTC date, so there a date move lands as a new row.
      const kickoffChanged = new Date(existing.kickoff_at).getTime() !== new Date(m.kickoff_at).getTime();
      const lockOffsetMs = new Date(existing.lock_at).getTime() - new Date(existing.kickoff_at).getTime();
      if (kickoffChanged) {
        driftedN++;
        console.log(`[football] kickoff drift ${m.away_team} @ ${m.home_team}: ${existing.kickoff_at} → ${m.kickoff_at}`);
      }
      rows.push({
        id: existing.id,
        league: comp.league,
        season: comp.season,
        stage: existing.stage,
        matchday: existing.matchday,
        home_team: existing.home_team,
        away_team: existing.away_team,
        kickoff_at: kickoffChanged ? m.kickoff_at : existing.kickoff_at,
        lock_at: kickoffChanged
          ? new Date(new Date(m.kickoff_at).getTime() + lockOffsetMs).toISOString()
          : existing.lock_at,
        status: m.status,
        home_score: m.home_score,
        away_score: m.away_score,
        outcome: m.outcome,
        finalized_at: finalized ? (existing.finalized_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      });
    } else {
      if (m.matchday == null) {
        console.warn(`[football] no seeded row for group game ${m.away_team} @ ${m.home_team} ${m.kickoff_at.slice(0, 10)} — skipped (matchday unknown)`);
        continue;
      }
      newN++;
      rows.push({
        id: deterministicUuid(`${comp.league}:${m.stage}:${m.home_team}:${m.away_team}`),
        league: comp.league,
        season: comp.season,
        stage: m.stage,
        matchday: m.matchday,
        home_team: m.home_team,
        away_team: m.away_team,
        kickoff_at: m.kickoff_at,
        lock_at: m.kickoff_at,
        status: m.status,
        home_score: m.home_score,
        away_score: m.away_score,
        outcome: m.outcome,
        finalized_at: finalized ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  console.log(`[football] rows: ${rows.length} (${matchedN} matched existing, ${newN} new, ${driftedN} kickoff drift, ${unknownTeamN} unknown-team, ${skips.length} skipped)`);
  const finals = rows.filter((r) => r.status === 'final' && r.outcome);
  Object.assign(summary, { mapped: mapped.length, matched: matchedN, created: newN, drifted: driftedN, finals: finals.length });
  if (dbPastNonFinal > 0 && matchedN === 0) {
    console.error(`[football] VERIFY: ${dbPastNonFinal} past non-final fixture(s) in db but 0 source events matched — the feed mapping is broken, not idle.`);
  }
  for (const r of rows.slice(0, 6).concat(rows.slice(-3))) {
    console.log(`   ${String(r.stage).padEnd(6)} md${r.matchday} ${r.away_team} @ ${r.home_team}  ${r.status}${r.status === 'final' ? ` ${r.home_score}-${r.away_score} (${r.outcome})` : ''}`);
  }

  if (DRY_RUN) {
    console.log(`[football] DRY-RUN — would upsert ${rows.length} rows (${finals.length} final). Re-run without --dry-run.`);
    writeSummary();
    return;
  }

  // 4. Upsert.
  const wrote = await sbUpsert('fixtures', rows, 'id');
  console.log(`[football] upserted ${wrote} fixtures`);

  // 5. Score every final fixture (idempotent RPC, NBA v0.79.11 pattern).
  let scored = 0, awarded = 0, errors = 0;
  for (const r of finals) {
    try {
      const result = await sbRpc('pickem_score_fixture', { p_fixture_id: r.id });
      if (result?.ok === false) {
        console.warn(`[score] ${r.away_team}@${r.home_team}: rpc declined (${result.error || result.reason || 'no reason'})`);
        continue;
      }
      scored += result?.scored_count ?? 0;
      awarded += result?.total_awarded ?? 0;
    } catch (err) {
      console.warn(`[score] ${r.away_team}@${r.home_team}: ${String(err.message || err)}`);
      errors++;
    }
  }
  console.log(`[football] fixture scoring: ${finals.length} finals → ${scored} prediction(s) scored, ${awarded} pts awarded${errors ? `, ${errors} error(s)` : ''}`);
  Object.assign(summary, { scoredPredictions: scored, awardedPoints: awarded, scoreErrors: errors });

  // 6. Tournament shape: re-score every bracket of this competition.
  if (comp.shape === 'tournament') {
    const brackets = await sbSelect(`brackets?competition=eq.${comp.league}&select=id&limit=10000`);
    let bScored = 0, bErrors = 0;
    for (const b of brackets) {
      try {
        await sbRpc('pickem_score_bracket', { p_bracket_id: b.id });
        bScored++;
      } catch (err) {
        console.warn(`[bracket] ${b.id}: ${String(err.message || err)}`);
        bErrors++;
      }
    }
    console.log(`[football] bracket scoring: ${bScored}/${brackets.length} brackets scored${bErrors ? `, ${bErrors} error(s)` : ''}`);
  }

  writeSummary();
  console.log('[football] done.');
}

main().catch((e) => { console.error('[football] FAILED:', e); process.exit(1); });
