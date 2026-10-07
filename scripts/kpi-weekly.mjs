#!/usr/bin/env node
/**
 * kpi-weekly.mjs — the DB half of the weekly metrics read (doc 17 S3 exit
 * check "WPP measured weekly"). GA4/PostHog own the behavioural funnel;
 * this owns what only the database knows. Last 7 days vs the 7 before.
 *
 *   WPP              distinct users who made or edited a pick
 *   picks            predictions created (jagoan share alongside)
 *   new grups        leagues created, by competition
 *   joins            league_members joined (active / pending)
 *   WAP              grups with ≥3 active members picking in the window
 *                    (the north-star from 0019's pickem_kpi_daily)
 *   sign-ups         auth users created (test domains excluded)
 *
 * Plain REST, no dependencies, so the workflow needs no npm install.
 * Writes markdown to stdout and, in Actions, to $GITHUB_STEP_SUMMARY.
 *
 *   node scripts/kpi-weekly.mjs [--days 7]
 * Env: SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_URL), or .env.local.
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
const DAYS = process.argv.includes('--days') ? Number(process.argv[process.argv.indexOf('--days') + 1]) || 7 : 7;
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };
const TEST_EMAIL = /@gibol\.test$/i;

async function selectAll(table, query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SB}/rest/v1/${table}?${query}`, { headers: { ...H, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${(await r.text()).slice(0, 160)}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}
async function allUsers() {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${SB}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: H });
    if (!r.ok) throw new Error(`auth users: ${r.status}`);
    const { users = [] } = await r.json();
    out.push(...users);
    if (users.length < 1000) return out;
  }
}

const now = Date.now();
const DAY = 86400000;
const cur = { from: now - DAYS * DAY, to: now };
const prev = { from: now - 2 * DAYS * DAY, to: now - DAYS * DAY };
const inW = (iso, w) => { const t = iso ? Date.parse(iso) : NaN; return t >= w.from && t < w.to; };
const since = new Date(prev.from).toISOString();

const [users, preds, members, leagues] = await Promise.all([
  allUsers(),
  selectAll('predictions', `select=user_id,league,is_jagoan,created_at&created_at=gte.${since}`),
  selectAll('league_members', 'select=league_id,user_id,status,joined_at,last_predicted_at'),
  selectAll('leagues', `select=id,competition,created_at`),
]);
const testIds = new Set(users.filter((u) => TEST_EMAIL.test(u.email || '')).map((u) => u.id));
const real = (uid) => !testIds.has(uid);

function measure(w) {
  const p = preds.filter((x) => real(x.user_id) && inW(x.created_at, w));
  const editors = members.filter((m) => real(m.user_id) && inW(m.last_predicted_at, w)).map((m) => m.user_id);
  const wpp = new Set([...p.map((x) => x.user_id), ...editors]);
  const joins = members.filter((m) => real(m.user_id) && inW(m.joined_at, w));
  const newGrups = leagues.filter((l) => inW(l.created_at, w));
  const byComp = {};
  for (const l of newGrups) byComp[l.competition] = (byComp[l.competition] || 0) + 1;
  // WAP: grups where ≥3 active members picked in the window.
  const pickers = new Set(wpp);
  const perGrup = new Map();
  for (const m of members) {
    if (m.status && m.status !== 'active') continue;
    if (!pickers.has(m.user_id)) continue;
    perGrup.set(m.league_id, (perGrup.get(m.league_id) || 0) + 1);
  }
  return {
    wpp: wpp.size,
    picks: p.length,
    jagoanPct: p.length ? Math.round((100 * p.filter((x) => x.is_jagoan).length) / p.length) : 0,
    newGrups: newGrups.length,
    byComp,
    joinsActive: joins.filter((m) => !m.status || m.status === 'active').length,
    joinsPending: joins.filter((m) => m.status === 'pending').length,
    wap: [...perGrup.values()].filter((n) => n >= 3).length,
    signups: users.filter((u) => !TEST_EMAIL.test(u.email || '') && inW(u.created_at, w)).length,
  };
}

const a = measure(cur);
const b = measure(prev);
const d = (x, y) => (x === y ? '·' : x > y ? `+${x - y}` : `${x - y}`);
const day = (t) => new Date(t).toISOString().slice(0, 10);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const md = [
  `## Gibol weekly KPIs · ${day(cur.from)} → ${day(cur.to)}`,
  '',
  `| metric | last ${DAYS} days | previous ${DAYS} | change |`,
  '|---|---:|---:|---:|',
  `| WPP (weekly picking players) | ${a.wpp} | ${b.wpp} | ${d(a.wpp, b.wpp)} |`,
  `| WAP (grups with ≥3 picking) | ${a.wap} | ${b.wap} | ${d(a.wap, b.wap)} |`,
  `| picks made | ${a.picks} | ${b.picks} | ${d(a.picks, b.picks)} |`,
  `| jagoan share | ${a.jagoanPct}% | ${b.jagoanPct}% | |`,
  `| sign-ups | ${a.signups} | ${b.signups} | ${d(a.signups, b.signups)} |`,
  `| grups created | ${a.newGrups} | ${b.newGrups} | ${d(a.newGrups, b.newGrups)} |`,
  `| joins (active) | ${a.joinsActive} | ${b.joinsActive} | ${d(a.joinsActive, b.joinsActive)} |`,
  `| joins held pending | ${a.joinsPending} | ${b.joinsPending} | ${d(a.joinsPending, b.joinsPending)} |`,
  '',
  Object.keys(a.byComp).length
    ? `New grups by competition: ${Object.entries(a.byComp).map(([k, v]) => `${k} ${v}`).join(', ')}.`
    : 'No new grups this week.',
  '',
  `Totals: ${plural(users.filter((u) => !TEST_EMAIL.test(u.email || '')).length, 'account')}, ${plural(leagues.length, 'grup')}. Test accounts (@gibol.test) excluded. The behavioural funnel (invite → first pick, share CTR, upgrade) is in GA4/PostHog.`,
].join('\n');

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
