#!/usr/bin/env node
/**
 * rls-attack.mjs — proves the Supabase RLS/grant posture with a REAL user
 * JWT, the way an attacker would (migration 0022, audit 2026-10-01).
 *
 * Creates a throwaway auth user with the service role, signs in with the
 * anon key to get a user JWT, then tries the four holes plus a few extras.
 * Every attack must FAIL; the one legitimate action (a pick on an open
 * fixture, pick columns only) must SUCCEED. The user and its pick are
 * deleted at the end. Exit 0 = posture holds, exit 1 = at least one hole.
 *
 *   node scripts/rls-attack.mjs            # against prod (reads .env.local)
 *   node scripts/rls-attack.mjs --keep     # keep the test user for inspection
 *
 * Env: SUPABASE_URL (default prod), SUPABASE_SERVICE_ROLE_KEY,
 *      VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env.production.local', '.env.local']) {
  const p = join(REPO_ROOT, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (!line || line.startsWith('#') || eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[k] && v) process.env[k] = v;
  }
  break;
}

const URL = process.env.SUPABASE_URL || 'https://egzacjfbmgbcwhtvqixc.supabase.co';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SERVICE || !ANON) { console.error('FATAL: need SUPABASE_SERVICE_ROLE_KEY and an anon key'); process.exit(2); }
const KEEP = process.argv.includes('--keep');

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
function record(label, mustFail, error, extra = '') {
  const failed = !!error;
  const ok = mustFail ? failed : !failed;
  results.push({ label, mustFail, ok, detail: error ? `${error.code || ''} ${error.message || error}`.trim().slice(0, 90) : extra || 'succeeded' });
}

async function main() {
  // 0. Targets: a grup, a locked fixture, an open fixture.
  const { data: league } = await admin.from('leagues').select('id, name, invite_code').limit(1).maybeSingle();
  const nowIso = new Date().toISOString();
  const { data: locked } = await admin.from('fixtures').select('id, league, matchday').lt('lock_at', nowIso).limit(1).maybeSingle();
  const { data: open } = await admin.from('fixtures').select('id, league, matchday').gt('lock_at', nowIso).neq('status', 'final').order('lock_at').limit(1).maybeSingle();
  if (!league || !locked || !open) { console.error('FATAL: need at least one league, one locked and one open fixture'); process.exit(2); }

  // 1. Throwaway user + user JWT.
  const email = `rls-attack-${Date.now()}@gibol.test`;
  const password = randomBytes(18).toString('base64url');
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (cErr) { console.error('FATAL: createUser', cErr.message); process.exit(2); }
  const uid = created.user.id;
  const user = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: sErr } = await user.auth.signInWithPassword({ email, password });
  if (sErr) { console.error('FATAL: signIn', sErr.message); await cleanup(uid); process.exit(2); }
  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // H1 — join a grup without its invite code.
    record('H1 join grup without invite code', true,
      (await user.from('league_members').insert({ league_id: league.id, user_id: uid })).error);

    // H2 — forge standings on a membership row (any row; privilege is checked before rows).
    record('H2 forge league_members.points_cache', true,
      (await user.from('league_members').update({ points_cache: 999 }).eq('user_id', uid)).error);
    record('H2 forge league_members.status', true,
      (await user.from('league_members').update({ status: 'active' }).eq('user_id', uid)).error);

    // H3 — picks: locked fixture, server-only columns. A hole that succeeds
    // leaves a row behind, so wipe the user's picks between attempts or the
    // unique (user, fixture) key masks the next result.
    const wipePicks = () => admin.from('predictions').delete().eq('user_id', uid);
    record('H3 pick on a LOCKED fixture', true,
      (await user.from('predictions').insert({ user_id: uid, fixture_id: locked.id, league: locked.league, matchday: locked.matchday, picked_outcome: 'H', picked_home: 1, picked_away: 0 })).error);
    await wipePicks();
    record('H3 pick carrying awarded_points', true,
      (await user.from('predictions').insert({ user_id: uid, fixture_id: open.id, league: open.league, matchday: open.matchday, picked_outcome: 'H', awarded_points: 50 })).error);
    await wipePicks();
    record('H3 pick carrying tier', true,
      (await user.from('predictions').insert({ user_id: uid, fixture_id: open.id, league: open.league, matchday: open.matchday, picked_outcome: 'H', tier: 'exact' })).error);
    await wipePicks();
    record('H3 pick carrying base_points', true,
      (await user.from('predictions').insert({ user_id: uid, fixture_id: open.id, league: open.league, matchday: open.matchday, picked_outcome: 'H', base_points: 8 })).error);
    await wipePicks();

    // Positive control — the real pick path must still work.
    const legit = await user.from('predictions').insert({ user_id: uid, fixture_id: open.id, league: open.league, matchday: open.matchday, picked_outcome: 'H', picked_home: 2, picked_away: 1 }).select('id').maybeSingle();
    record('control: legit pick on an open fixture', false, legit.error, 'inserted');
    if (!legit.error) {
      record('H3 edit own pick to set awarded_points', true,
        (await user.from('predictions').update({ awarded_points: 99 }).eq('id', legit.data.id)).error);
      const edit = await user.from('predictions').update({ picked_home: 3 }).eq('id', legit.data.id);
      record('control: legit edit before lock', false, edit.error, 'updated');
    }

    // H4 — scoring / badge / streak RPCs as a user and as anon.
    record('H4 user runs pickem_score_fixture', true, (await user.rpc('pickem_score_fixture', { p_fixture_id: locked.id })).error);
    record('H4 user runs pickem_award_badges', true, (await user.rpc('pickem_award_badges', { p_user_id: uid, p_competition: open.league, p_matchday: open.matchday })).error);
    record('H4 user runs pickem_update_streak', true, (await user.rpc('pickem_update_streak', { p_user_id: uid, p_competition: open.league, p_matchday: open.matchday })).error);
    record('H4 user runs pickem_refresh_league_caches', true, (await user.rpc('pickem_refresh_league_caches', { p_competition: open.league })).error);
    record('H4 anon runs pickem_score_fixture', true, (await anon.rpc('pickem_score_fixture', { p_fixture_id: locked.id })).error);

    // Extras.
    record('create a league directly', true,
      (await user.from('leagues').insert({ name: 'evil', invite_code: `Evil${Date.now()}`, owner_id: uid, competition: open.league })).error);
    record('forge a badge', true,
      (await user.from('user_badges').insert({ user_id: uid, badge_code: 'juara_grup', competition: open.league })).error);
    record('anon reads league_members', true, (await anon.from('league_members').select('user_id').limit(1)).error);
    // 0024: the leaderboard views are server-only (they used to bypass RLS).
    for (const v of ['leaderboard_league', 'leaderboard_competition', 'leaderboard_matchday']) {
      record(`anon reads ${v}`, true, (await anon.from(v).select('user_id').limit(1)).error);
      record(`user reads ${v}`, true, (await user.from(v).select('user_id').limit(1)).error);
    }
    const tier = await user.rpc('pickem_tier', { p_picked_outcome: 'H', p_picked_home: 2, p_picked_away: 1, p_home_score: 2, p_away_score: 1 });
    record('control: pure helper pickem_tier callable', false, tier.error, `→ ${tier.data}`);
  } finally {
    await cleanup(uid);
  }

  const w = Math.max(...results.map((r) => r.label.length));
  let holes = 0;
  for (const r of results) {
    if (!r.ok) holes++;
    console.log(`${r.ok ? ' ok ' : 'HOLE'}  ${r.label.padEnd(w)}  ${r.mustFail ? 'must fail' : 'must pass'}  ${r.detail}`);
  }
  console.log(holes ? `\n${holes} HOLE(S) — RLS posture is open.` : '\nRLS posture holds.');
  process.exit(holes ? 1 : 0);
}

async function cleanup(uid) {
  if (KEEP) { console.log(`[keep] test user ${uid} left in place`); return; }
  await admin.from('predictions').delete().eq('user_id', uid);
  await admin.from('streaks').delete().eq('user_id', uid);
  await admin.from('league_members').delete().eq('user_id', uid);
  await admin.from('leagues').delete().eq('owner_id', uid);
  await admin.from('user_badges').delete().eq('user_id', uid);
  await admin.auth.admin.deleteUser(uid);
}

main().catch(async (e) => { console.error('FATAL', e); process.exit(2); });
