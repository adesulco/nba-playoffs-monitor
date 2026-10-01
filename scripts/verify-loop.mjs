#!/usr/bin/env node
/**
 * verify-loop.mjs — proves the Pick'em loop against PROD with a throwaway
 * user, the same calls the screens make (S1 step 7 exit check, run after
 * every deploy that touches the loop):
 *
 *   guest pick (device) → sign in → claim → join grup → in the klasemen
 *
 * The browser half (guestStore + AuthCallback) is exercised in the UI; this
 * script drives the API half: upsert-prediction on the next open fixture,
 * join-league with the invite code, league-detail membership + invite_code
 * gating, get-prediction, get-fixture, update-profile, admin-token rules,
 * callback redirect guard. Everything it creates is deleted at the end.
 *
 *   node scripts/verify-loop.mjs [--grup FgdGibol]
 * Env: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, PICKEM_ADMIN_TOKEN.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN = process.env.PICKEM_ADMIN_TOKEN;
const SITE = process.env.SITE_URL || 'https://www.gibol.co';
const GRUP = process.argv.includes('--grup') ? process.argv[process.argv.indexOf('--grup') + 1] : 'FgdGibol';
if (!SERVICE || !ANON) { console.error('FATAL: need service + anon keys'); process.exit(2); }

const admin = createClient(SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
const check = (label, ok, detail = '') => { results.push({ label, ok, detail }); };
const api = (action, params = {}) => `${SITE}/api/pickem?${new URLSearchParams({ _action: action, ...params })}`;
async function call(action, { method = 'GET', params = {}, body, token, headers = {} } = {}) {
  const res = await fetch(api(action, params), {
    method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

let uid = null;
try {
  // Targets.
  const detail0 = await call('league-detail', { params: { code: GRUP } });
  const league = detail0.data?.league;
  if (!league) { console.error('FATAL: grup not found', GRUP); process.exit(2); }
  check('league-detail by code exposes invite_code', league.invite_code === GRUP);
  const byId = await call('league-detail', { params: { id: league.id } });
  check('league-detail by id hides invite_code (anon)', byId.status === 200 && byId.data?.league && !('invite_code' in byId.data.league), JSON.stringify(Object.keys(byId.data?.league || {})).slice(0, 60));

  const nowIso = new Date().toISOString();
  const { data: open } = await admin.from('fixtures').select('id, league, matchday, home_team, away_team, lock_at')
    .eq('league', league.competition).gt('lock_at', nowIso).neq('status', 'final').order('lock_at').limit(1).maybeSingle();
  if (!open) { console.error('FATAL: no open fixture'); process.exit(2); }

  // Throwaway user + JWT (what AuthCallback has after the magic link).
  const email = `loop-${Date.now()}@gibol.test`;
  const password = randomBytes(18).toString('base64url');
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (cErr) { console.error('FATAL createUser', cErr.message); process.exit(2); }
  uid = created.user.id;
  const userClient = createClient(SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: sErr } = await userClient.auth.signInWithPassword({ email, password });
  if (sErr) { console.error('FATAL signIn', sErr.message); process.exit(2); }
  const jwt = signed.session.access_token;

  // 1. Claim: replay a "guest" pick through upsert-prediction (claimGuestPredictions does exactly this).
  const pick = await call('upsert-prediction', { method: 'POST', token: jwt, body: { fixture_id: open.id, picked_outcome: 'H', picked_home: 2, picked_away: 1, is_jagoan: true } });
  check('claim: upsert-prediction on the next open fixture', pick.status === 200 && pick.data?.ok, `${pick.status} ${pick.data?.error || ''}`);
  check('prediction row carries matchday', pick.data?.prediction?.matchday === open.matchday, String(pick.data?.prediction?.matchday));

  // 2. Join with the invite code (AuthCallback → joinGrup).
  const joinRes = await call('join-league', { method: 'POST', token: jwt, body: { leagueId: league.id, inviteCode: GRUP } });
  check('join-league with invite code', joinRes.status === 200 && joinRes.data?.ok !== false, `${joinRes.status} ${JSON.stringify(joinRes.data).slice(0, 80)}`);
  const joinBad = await call('join-league', { method: 'POST', token: jwt, body: { leagueId: league.id, inviteCode: GRUP.toLowerCase() } });
  check('join-league rejects a wrong-case code (case-sensitive)', joinBad.status >= 400, `${joinBad.status}`);

  // 3. In the klasemen; invite_code now visible by id to the member; last_predicted_at stamped.
  const detail1 = await call('league-detail', { params: { id: league.id }, token: jwt, headers: { 'cache-control': 'no-cache' } });
  const meRow = (detail1.data?.members || []).find((m) => m.user_id === uid);
  check('member appears in league-detail', !!meRow, JSON.stringify(meRow || {}).slice(0, 80));
  check('league-detail by id exposes invite_code to a member', detail1.data?.league?.invite_code === GRUP);
  const pick2 = await call('upsert-prediction', { method: 'POST', token: jwt, body: { fixture_id: open.id, picked_outcome: 'H', picked_home: 3, picked_away: 1 } });
  const { data: lm } = await admin.from('league_members').select('last_predicted_at').eq('league_id', league.id).eq('user_id', uid).maybeSingle();
  check('last_predicted_at stamped after a pick', pick2.status === 200 && !!lm?.last_predicted_at, String(lm?.last_predicted_at));

  // 4. New reads + profile write.
  const gp = await call('get-prediction', { params: { fixture_id: open.id }, token: jwt });
  check('get-prediction returns my pick', gp.status === 200 && gp.data?.prediction?.picked_home === 3, `${gp.status}`);
  const gpAnon = await call('get-prediction', { params: { fixture_id: open.id } });
  check('get-prediction without auth → 401', gpAnon.status === 401, `${gpAnon.status}`);
  const gf = await call('get-fixture', { params: { id: open.id } });
  check('get-fixture returns the fixture with teams', gf.status === 200 && gf.data?.fixture?.id === open.id && gf.data.fixture.home?.tricode, `${gf.status}`);
  const up = await call('update-profile', { method: 'POST', token: jwt, body: { nickname: 'Loop Tester' } });
  check('update-profile sets nickname', up.status === 200 && up.data?.profile?.nickname === 'Loop Tester', `${up.status} ${up.data?.error || ''}`);
  const upBad = await call('update-profile', { method: 'POST', token: jwt, body: { nickname: 'bandar judi' } });
  check('update-profile rejects betting vocabulary', upBad.status === 400, `${upBad.status}`);
  const upAnon = await call('update-profile', { method: 'POST', body: { nickname: 'x' } });
  check('update-profile without auth → 401', upAnon.status === 401);

  // 5. Admin token rules (no state change: a wrong token never reaches the handler body).
  if (ADMIN) {
    const viaBearer = await call('score-fixture', { method: 'POST', token: ADMIN, body: { fixture_id: open.id, home_score: 0, away_score: 0 } });
    check('admin token via Authorization header is refused', viaBearer.status === 401, `${viaBearer.status}`);
    const wrong = await call('score-fixture', { method: 'POST', headers: { 'x-admin-token': ADMIN.slice(0, -1) + 'x' }, body: { fixture_id: open.id, home_score: 0, away_score: 0 } });
    check('wrong x-admin-token → 401', wrong.status === 401, `${wrong.status}`);
  }

  // 6. Callback guard.
  const cb = await fetch(`${SITE}/api/auth/callback?next=//evil.example/x`, { redirect: 'manual' });
  const loc = cb.headers.get('location') || '';
  check('auth/callback drops a //host next', cb.status === 302 && /next=%2F$/.test(loc), loc);
  const cb2 = await fetch(`${SITE}/api/auth/callback?next=/grup/${GRUP}`, { redirect: 'manual' });
  check('auth/callback keeps a same-origin next', (cb2.headers.get('location') || '').includes(encodeURIComponent(`/grup/${GRUP}`)), cb2.headers.get('location') || '');
} finally {
  if (uid) {
    await admin.from('predictions').delete().eq('user_id', uid);
    await admin.from('league_members').delete().eq('user_id', uid);
    await admin.from('streaks').delete().eq('user_id', uid);
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }
}
const w = Math.max(...results.map((r) => r.label.length));
let bad = 0;
for (const r of results) { if (!r.ok) bad++; console.log(`${r.ok ? ' ok ' : 'FAIL'}  ${r.label.padEnd(w)}  ${r.detail}`); }
console.log(bad ? `\n${bad} check(s) failed.` : '\nLoop verified in prod.');
process.exit(bad ? 1 : 0);
