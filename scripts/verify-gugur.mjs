#!/usr/bin/env node
/**
 * verify-gugur.mjs — the two-grup Gugur test (doc 17 S1 exit check), against
 * PROD with a throwaway user and two throwaway grups, both with survivor on.
 *
 * The matchday's survivor pick is one shared predictions row; each grup has
 * its own life (survivor_entries). This proves the two stay consistent:
 *   1. pick X from grup A                → A used [X]
 *   2. switch to Y from grup B           → A and B both used [Y]
 *   3. switch back to X from grup A      → both [X] (Y released everywhere)
 *   4. a team used last week in A only   → refused from B (team_already_used)
 *   5. B eliminated                      → B refuses picks; a pick from A
 *                                          leaves B's life untouched
 * Everything it creates is deleted at the end.
 *
 *   node scripts/verify-gugur.mjs [--competition EPL-2026-27]
 * Env: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY.
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
const SITE = process.env.SITE_URL || 'https://www.gibol.co';
const COMP = process.argv.includes('--competition') ? process.argv[process.argv.indexOf('--competition') + 1] : 'EPL-2026-27';
if (!SERVICE || !ANON) { console.error('FATAL: need service + anon keys'); process.exit(2); }

const admin = createClient(SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok, detail });
async function call(action, { method = 'GET', params = {}, body, token } = {}) {
  const res = await fetch(`${SITE}/api/pickem?${new URLSearchParams({ _action: action, ...params })}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const used = async (leagueId) => {
  const { data } = await admin.from('survivor_entries').select('status, used_team_ids').eq('user_id', uid).eq('league_id', leagueId).maybeSingle();
  return data;
};
const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b);

let uid = null;
try {
  // An open matchday with at least two fixtures.
  const nowIso = new Date().toISOString();
  const { data: open } = await admin.from('fixtures').select('id, matchday, home_team, away_team, lock_at')
    .eq('league', COMP).gt('lock_at', nowIso).neq('status', 'final').order('lock_at').limit(40);
  const md = open?.[0]?.matchday;
  const fx = (open || []).filter((f) => f.matchday === md);
  if (fx.length < 2) { console.error(`FATAL: need 2 open fixtures in one ${COMP} matchday`); process.exit(2); }
  const [f1, f2] = fx;
  const X = f1.home_team; const Y = f2.home_team; const Z = f2.away_team;

  const email = `gugur-${Date.now()}@gibol.test`;
  const password = randomBytes(18).toString('base64url');
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (cErr) { console.error('FATAL createUser', cErr.message); process.exit(2); }
  uid = created.user.id;
  const userClient = createClient(SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: sErr } = await userClient.auth.signInWithPassword({ email, password });
  if (sErr) { console.error('FATAL signIn', sErr.message); process.exit(2); }
  const jwt = signed.session.access_token;

  const mk = (name) => call('create-league', { method: 'POST', token: jwt, body: { name, competition: COMP, enabled_modes: { match: true, survivor: true } } });
  const gA = await mk('Gugur Test A'); const gB = await mk('Gugur Test B');
  check('create two survivor grups', gA.status === 200 && gB.status === 200 && gA.data?.enabled_modes?.survivor && gB.data?.enabled_modes?.survivor, `${gA.status}/${gB.status} ${gA.data?.error || ''}`);
  const A = gA.data.id; const B = gB.data.id;
  const pick = (league_id, fixture, team) => call('upsert-survivor-pick', { method: 'POST', token: jwt, body: { fixture_id: fixture.id, picked_team_id: team, league_id } });

  // 1
  const p1 = await pick(A, f1, X);
  check(`1 pick ${X} from A`, p1.status === 200, `${p1.status} ${p1.data?.error || ''}`);
  check('1 A used = [X]', same((await used(A))?.used_team_ids, [X]), JSON.stringify((await used(A))?.used_team_ids));
  // 2
  const p2 = await pick(B, f2, Y);
  check(`2 switch to ${Y} from B`, p2.status === 200, `${p2.status} ${p2.data?.error || ''}`);
  check('2 B used = [Y]', same((await used(B))?.used_team_ids, [Y]), JSON.stringify((await used(B))?.used_team_ids));
  check('2 A used = [Y] (shared pick synced)', same((await used(A))?.used_team_ids, [Y]), JSON.stringify((await used(A))?.used_team_ids));
  const { data: sp } = await admin.from('predictions').select('fixture_id').eq('user_id', uid).eq('survivor_pick', true);
  check('2 exactly one survivor pick, on f2', sp?.length === 1 && sp[0].fixture_id === f2.id, JSON.stringify(sp));
  // 3
  const p3 = await pick(A, f1, X);
  check(`3 switch back to ${X} from A`, p3.status === 200, `${p3.status} ${p3.data?.error || ''}`);
  check('3 A and B used = [X]', same((await used(A))?.used_team_ids, [X]) && same((await used(B))?.used_team_ids, [X]));
  // 4: Z "used last week" in A only.
  await admin.from('survivor_entries').update({ used_team_ids: [Z, X] }).eq('user_id', uid).eq('league_id', A);
  const p4 = await pick(B, f2, Z);
  check(`4 ${Z} used in A is refused from B`, p4.status === 409 && p4.data?.error === 'team_already_used', `${p4.status} ${p4.data?.error || ''}`);
  // 5
  await admin.from('survivor_entries').update({ status: 'out' }).eq('user_id', uid).eq('league_id', B);
  const p5 = await pick(B, f2, Y);
  check('5 eliminated B refuses a pick', p5.status === 409 && p5.data?.error === 'survivor_eliminated', `${p5.status} ${p5.data?.error || ''}`);
  const p6 = await pick(A, f2, Y);
  const bAfter = await used(B);
  check(`5 pick ${Y} from A still works`, p6.status === 200, `${p6.status} ${p6.data?.error || ''}`);
  check('5 B life untouched (out, [X])', bAfter?.status === 'out' && same(bAfter.used_team_ids, [X]), JSON.stringify(bAfter));
} finally {
  if (uid) {
    await admin.from('survivor_entries').delete().eq('user_id', uid);
    await admin.from('predictions').delete().eq('user_id', uid);
    await admin.from('league_members').delete().eq('user_id', uid);
    await admin.from('leagues').delete().eq('owner_id', uid);
    await admin.from('streaks').delete().eq('user_id', uid);
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }
}
const w = Math.max(...results.map((r) => r.label.length));
let bad = 0;
for (const r of results) { if (!r.ok) bad++; console.log(`${r.ok ? ' ok ' : 'FAIL'}  ${r.label.padEnd(w)}  ${r.detail}`); }
console.log(bad ? `\n${bad} check(s) failed.` : '\nTwo-grup Gugur verified in prod.');
process.exit(bad ? 1 : 0);
