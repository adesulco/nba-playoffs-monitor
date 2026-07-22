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
 * their id, kickoff_at, lock_at and matchday — lock_at is what
 * predictions locked against and must never drift. New rows (the KO
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
  // EPL-2026-27 lands with R0-3 (ESPN eng.1 or API-Football after renewal).
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

async function fetchEspnEvents(cfg) {
  const events = new Map();
  for (const dstr of dateRange(cfg.from, cfg.to)) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${cfg.code}/scoreboard?dates=${dstr}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[espn] ${dstr}: HTTP ${res.status}`); continue; }
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
  const round = comp.espnRounds[slug];
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
  const drawable = round.stage === 'group' || round.legs === true;
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
  const dbFixtures = await sbSelect(`fixtures?league=eq.${comp.league}&select=*&limit=1000`);

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
      return;
    }
  }
  const allowed = new Set(
    (await sbSelect(`teams?league=eq.${comp.league}&select=tricode`)).map((r) => r.tricode)
  );
  console.log(`[football] db: ${dbFixtures.length} fixtures, ${allowed.size} teams`);

  const byPairDate = new Map(); // 'HOME:AWAY:YYYY-MM-DD' -> row
  for (const f of dbFixtures) {
    byPairDate.set(`${f.home_team}:${f.away_team}:${f.kickoff_at.slice(0, 10)}`, f);
  }

  // 2. Fetch + map source events.
  const source = argValue('--source') || 'espn';
  let mapped = [];
  if (source === 'espn') {
    const events = await fetchEspnEvents(comp.espn);
    console.log(`[football] espn: ${events.length} events`);
    mapped = events.map((e) => mapEspnEvent(e, comp.espn));
  } else {
    throw new Error(`source '${source}' not implemented yet (api-football plan lapsed)`);
  }

  const skips = mapped.filter((m) => m.skip);
  for (const s of skips) console.warn(`[football] skip: ${s.skip}`);
  mapped = mapped.filter((m) => !m.skip);

  // Placeholder KO slots (ESPN pseudo-teams like '2A'/'SFW1') and anything
  // not in the nations map drop here; the cron re-runs pick real pairings
  // up once the group stage resolves.
  if (comp.nations) {
    mapped = mapped.filter((m) => {
      const ok = comp.nations[m.home_team] && comp.nations[m.away_team];
      if (!ok) console.warn(`[football] unresolved pairing skipped: ${m.away_team} @ ${m.home_team} (${m.stage})`);
      return ok;
    });
  }
  assignRounds(mapped);

  // Seed missing teams before fixtures (FK on teams.tricode).
  if (comp.nations && !DRY_RUN) {
    const teamRows = Object.entries(comp.nations)
      .filter(([tricode]) => !allowed.has(tricode))
      .map(([tricode, name]) => ({ tricode, name, city: name, league: comp.league }));
    if (teamRows.length) {
      const seeded = await sbUpsert('teams', teamRows, 'tricode');
      console.log(`[football] seeded ${seeded} ${comp.league} teams`);
    }
  }
  if (comp.nations) for (const t of Object.keys(comp.nations)) allowed.add(t);

  // 3. Build db rows: matched rows keep id/kickoff/lock/matchday; new rows
  //    get deterministic ids and source kickoff (lock_at = kickoff).
  const rows = [];
  let matchedN = 0, newN = 0, unknownTeamN = 0;
  for (const m of mapped) {
    if (!allowed.has(m.home_team) || !allowed.has(m.away_team)) {
      unknownTeamN++;
      console.warn(`[football] unknown tricode pair ${m.away_team} @ ${m.home_team} — not in teams(league=${comp.league})`);
      continue;
    }
    const existing = byPairDate.get(`${m.home_team}:${m.away_team}:${m.kickoff_at.slice(0, 10)}`);
    const finalized = m.status === 'final';
    if (existing) {
      matchedN++;
      rows.push({
        id: existing.id,
        league: comp.league,
        season: comp.season,
        stage: existing.stage,
        matchday: existing.matchday,
        home_team: existing.home_team,
        away_team: existing.away_team,
        kickoff_at: existing.kickoff_at,
        lock_at: existing.lock_at, // never drift what picks locked against
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

  console.log(`[football] rows: ${rows.length} (${matchedN} matched existing, ${newN} new, ${unknownTeamN} unknown-team, ${skips.length} skipped)`);
  const finals = rows.filter((r) => r.status === 'final' && r.outcome);
  for (const r of rows.slice(0, 6).concat(rows.slice(-3))) {
    console.log(`   ${String(r.stage).padEnd(6)} md${r.matchday} ${r.away_team} @ ${r.home_team}  ${r.status}${r.status === 'final' ? ` ${r.home_score}-${r.away_score} (${r.outcome})` : ''}`);
  }

  if (DRY_RUN) {
    console.log(`[football] DRY-RUN — would upsert ${rows.length} rows (${finals.length} final). Re-run without --dry-run.`);
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
      if (result?.ok === false) continue;
      scored += result?.scored_count ?? 0;
      awarded += result?.total_awarded ?? 0;
    } catch (err) {
      console.warn(`[score] ${r.away_team}@${r.home_team}: ${String(err.message || err)}`);
      errors++;
    }
  }
  console.log(`[football] fixture scoring: ${finals.length} finals → ${scored} prediction(s) scored, ${awarded} pts awarded${errors ? `, ${errors} error(s)` : ''}`);

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

  console.log('[football] done.');
}

main().catch((e) => { console.error('[football] FAILED:', e); process.exit(1); });
