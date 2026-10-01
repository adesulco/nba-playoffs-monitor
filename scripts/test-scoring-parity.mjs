#!/usr/bin/env node
/**
 * test-scoring-parity.mjs — runs api/_lib/pickem/scoring-vectors.json
 * against the SQL pure functions in the live database (pickem_resolve_config,
 * pickem_tier, pickem_points_for; all read-only) and against the JS engine,
 * and fails if any case disagrees. The SQL is the truth; the JS must match.
 *
 * Penalty parity is covered by supabase/tests/0021_scoring_v1.test.sql (the
 * penalty lives inside pickem_score_fixture / pickem_member_points, which
 * need rows) — here it is computed from the SQL-resolved config with the
 * same round() rule.
 *
 *   node scripts/test-scoring-parity.mjs
 * Env: SUPABASE_URL (default prod), SUPABASE_SERVICE_ROLE_KEY or an anon key.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveScoringConfig, scoreMatchPrediction } from '../api/_lib/pickem/scoring-core.js';

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
const URL = process.env.SUPABASE_URL || 'https://egzacjfbmgbcwhtvqixc.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!KEY) { console.error('FATAL: no Supabase key in env'); process.exit(2); }

async function rpc(fn, args) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const vectors = JSON.parse(readFileSync(join(ROOT, 'api/_lib/pickem/scoring-vectors.json'), 'utf8'));
let bad = 0;
for (const c of vectors.cases) {
  // SQL side: resolve against a league whose pickem_rules row matches the
  // vector's `rules` (history rows live in prod under their league key), or
  // a key with no row at all so the Spec v1 defaults apply.
  const league = c.rules?.league || 'VECTORS-NO-ROW';
  const cfg = await rpc('pickem_resolve_config', { p_league: league, p_scoring_config: c.config });
  const p = c.prediction;
  const tier = await rpc('pickem_tier', {
    p_picked_outcome: p.picked_outcome, p_picked_home: p.picked_home ?? null, p_picked_away: p.picked_away ?? null,
    p_home_score: c.fixture.home_score ?? null, p_away_score: c.fixture.away_score ?? null,
  });
  const awarded = await rpc('pickem_points_for', { p_tier: tier, p_is_jagoan: p.is_jagoan === true, p_consensus: p.consensus_at_lock ?? null, p_cfg: cfg });
  const penalty = (p.is_jagoan === true && (tier === 'miss' || tier === 'nyaris') && Number(cfg.jagoan_penalty) > 0)
    ? Math.round(Number(cfg.jagoan_penalty) * Number(cfg.score_result)) : 0;
  const sql = { tier, awarded, penalty };

  const jsCfg = resolveScoringConfig(c.config, c.rules || null);
  const s = scoreMatchPrediction(
    { pickedOutcome: p.picked_outcome, pickedHome: p.picked_home ?? null, pickedAway: p.picked_away ?? null, isJagoan: p.is_jagoan === true, consensusAtLock: p.consensus_at_lock ?? null },
    { homeScore: c.fixture.home_score ?? null, awayScore: c.fixture.away_score ?? null }, jsCfg,
  );
  const js = { tier: s.tier, awarded: s.awarded, penalty: s.penalty };
  const okSql = JSON.stringify(sql) === JSON.stringify(c.expect);
  const okJs = JSON.stringify(js) === JSON.stringify(c.expect);
  if (!okSql || !okJs) bad++;
  console.log(`${okSql && okJs ? ' ok ' : 'DIFF'}  ${c.name.padEnd(78)}  sql=${JSON.stringify(sql)}  js=${JSON.stringify(js)}  want=${JSON.stringify(c.expect)}`);
}
console.log(bad ? `\n${bad} case(s) disagree.` : `\nParity holds: ${vectors.cases.length} cases, SQL = JS = expected.`);
process.exit(bad ? 1 : 0);
