/**
 * POST /api/pickem?_action=score-fixture
 *
 * Admin-only. Finalizes a fixture (writes home_score / away_score and
 * flips status to 'final', which triggers outcome derivation), then
 * invokes the pickem_score_fixture(p_fixture_id) RPC to score every
 * prediction on it, refresh league_members caches, apply Survivor
 * advance/elimination, and tally grup-relative bonuses.
 *
 * Requires the x-admin-token header (or Authorization: Bearer ...) to
 * match ADMIN_TOKEN or PICKEM_ADMIN_TOKEN.
 *
 * Body:
 *   { fixture_id, home_score, away_score }
 *
 * Idempotent — re-running with the same scores is a no-op (the RPC
 * overwrites awarded_points cleanly). Score corrections (different
 * home_score/away_score) re-derive outcome via the fixtures trigger
 * and re-score every prediction.
 *
 * Response:
 *   { ok: true, fixture: {...}, scoring: { scored_count, total_awarded, ... } }
 */

import { getSupabaseAdmin } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.ADMIN_TOKEN || process.env.PICKEM_ADMIN_TOKEN;
  const provided =
    req.headers['x-admin-token'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || provided !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { fixture_id } = body;
  const home_score = Number(body.home_score);
  const away_score = Number(body.away_score);

  if (!fixture_id) return res.status(400).json({ error: 'fixture_id required' });
  if (!Number.isInteger(home_score) || home_score < 0 || home_score > 99) {
    return res.status(400).json({ error: 'home_score must be integer 0..99' });
  }
  if (!Number.isInteger(away_score) || away_score < 0 || away_score > 99) {
    return res.status(400).json({ error: 'away_score must be integer 0..99' });
  }

  const admin = getSupabaseAdmin();

  // 1) Finalize the fixture (the trigger derives outcome + finalized_at).
  const { data: fx, error: fxErr } = await admin
    .from('fixtures')
    .update({
      home_score,
      away_score,
      status: 'final',
      outcome: null,        // cleared so the trigger re-derives from the new score
      finalized_at: null,   // re-set by the trigger to now()
    })
    .eq('id', fixture_id)
    .select('id, league, season, stage, matchday, home_score, away_score, outcome, status, finalized_at')
    .maybeSingle();
  if (fxErr) return res.status(500).json({ error: fxErr.message });
  if (!fx) return res.status(404).json({ error: 'fixture not found' });

  // 2) Run the scoring RPC.
  const { data: scoring, error: rpcErr } = await admin.rpc('pickem_score_fixture', {
    p_fixture_id: fixture_id,
  });
  if (rpcErr) return res.status(500).json({ error: rpcErr.message });

  return res.status(200).json({
    ok: true,
    fixture: fx,
    scoring,
  });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return null;
  }
}
