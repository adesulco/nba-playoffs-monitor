/**
 * POST /api/pickem?_action=enter-result   (doc 17 §2.3 "enter-result (ops entry)")
 *
 * Ops entry for competitions without a feed (Mandalika, a sponsor's local
 * cup) and for corrections the feed gets wrong. Admin only (x-admin-token).
 *
 * Two shapes, one call can carry both:
 *   fixtures: [{ league, season, stage, matchday, home_team, away_team,
 *                kickoff_at, lock_at? }]
 *     Upserts scheduled fixtures. The id is deterministic on
 *     (league, stage, home, away, kickoff date) so re-sending is safe.
 *     league must be a registry key; teams must exist in `teams`.
 *   result: { fixture_id, home_score, away_score, advancer? }
 *     Finalises one fixture and scores it — the same path as score-fixture
 *     (consensus snapshot, Spec v1 RPC, caches, Gugur, badges).
 *
 * Response: { ok, fixtures?: [{id, ...}], scoring?: {...} }
 */
import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isAdminRequest } from '../adminToken.js';
import { isCompetitionKey, COMPETITIONS } from './registry.js';
import { parseBody } from './league-config.js';
import scoreFixtureHandler from './score-fixture.js';

function fixtureId(f) {
  const hash = createHash('sha1')
    .update(`gibol-ops-fixture:${f.league}:${f.stage}:${f.home_team}:${f.away_team}:${String(f.kickoff_at).slice(0, 10)}`)
    .digest('hex');
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  return [hash.slice(0, 8), hash.slice(8, 12), '5' + hash.slice(13, 16), variant + hash.slice(17, 20), hash.slice(20, 32)].join('-');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });
  const body = parseBody(req);
  if (!body || (!Array.isArray(body.fixtures) && !body.result)) {
    return res.status(400).json({ error: 'send fixtures[] and/or result{}' });
  }

  const out = { ok: true };
  if (Array.isArray(body.fixtures) && body.fixtures.length) {
    if (body.fixtures.length > 200) return res.status(400).json({ error: 'at most 200 fixtures per call' });
    const rows = [];
    for (const [i, f] of body.fixtures.entries()) {
      const bad = (msg) => res.status(400).json({ error: `fixtures[${i}]: ${msg}` });
      if (!isCompetitionKey(f.league)) return bad(`unknown competition '${f.league}'`);
      if (!f.home_team || !f.away_team || f.home_team === f.away_team) return bad('home_team and away_team must differ');
      if (!Number.isInteger(f.matchday) || f.matchday < 1) return bad('matchday must be a positive integer');
      if (Number.isNaN(Date.parse(f.kickoff_at))) return bad('kickoff_at must be ISO');
      const kickoff = new Date(f.kickoff_at).toISOString();
      const lock = f.lock_at && !Number.isNaN(Date.parse(f.lock_at)) ? new Date(f.lock_at).toISOString() : kickoff;
      const row = {
        league: f.league,
        season: f.season || COMPETITIONS[f.league].season,
        stage: f.stage || 'regular',
        matchday: f.matchday,
        home_team: f.home_team,
        away_team: f.away_team,
        kickoff_at: kickoff,
        lock_at: lock,
        status: 'scheduled',
      };
      rows.push({ id: fixtureId(row), ...row });
    }
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('fixtures')
      .upsert(rows, { onConflict: 'id' })
      .select('id, league, stage, matchday, home_team, away_team, kickoff_at, lock_at, status');
    if (error) return res.status(400).json({ error: error.message });
    out.fixtures = data;
  }

  if (body.result) {
    // Delegate to score-fixture so there is exactly one finalise+score path.
    const captured = { statusCode: 200, payload: null, headers: {} };
    const fakeRes = {
      setHeader: (k, v) => { captured.headers[k] = v; },
      status(code) { captured.statusCode = code; return this; },
      json(p) { captured.payload = p; return this; },
    };
    await scoreFixtureHandler({ ...req, method: 'POST', body: body.result }, fakeRes);
    if (captured.statusCode !== 200) return res.status(captured.statusCode).json(captured.payload);
    out.result = captured.payload;
  }

  return res.status(200).json(out);
}
