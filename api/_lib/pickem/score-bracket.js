/**
 * POST /api/pickem?_action=score-bracket
 *
 * Admin-only. Invokes the pickem_score_bracket(p_bracket_id) RPC to
 * score every WC-slot pick on a bracket against the current fixtures.
 * Idempotent — safe to re-run after results land.
 *
 * Requires the x-admin-token header (or Authorization: Bearer ...) to
 * match ADMIN_TOKEN or PICKEM_ADMIN_TOKEN — same auth model as
 * /api/pickem?_action=score-fixture.
 *
 * Body:
 *   { bracket_id: uuid }
 *
 * Response:
 *   { ok: true, bracket_id, scored, total_pts }
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

  const { bracket_id } = body;
  if (!bracket_id) return res.status(400).json({ error: 'bracket_id required' });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('pickem_score_bracket', {
    p_bracket_id: bracket_id,
  });
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, ...data });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return null;
  }
}
