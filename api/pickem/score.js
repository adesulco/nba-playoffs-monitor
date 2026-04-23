/**
 * POST /api/pickem/score
 *
 * Admin-only. Finalizes a series and recomputes awarded points across all
 * brackets for that series. Called by internal cron / webhook when a series
 * closes. Requires the x-admin-token header to match ADMIN_TOKEN (or legacy
 * PICKEM_ADMIN_TOKEN).
 *
 * Body:
 *   { series_id, winner, winner_games, loser_games }
 *
 * Uses the service-role admin client to bypass RLS for the update + score RPC.
 */

import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

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

  const body = req.body && typeof req.body === 'object'
    ? req.body
    : (() => { try { return JSON.parse(req.body || '{}'); } catch { return null; } })();
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { series_id, winner, winner_games, loser_games } = body;
  if (
    !series_id ||
    !winner ||
    winner_games !== 4 ||
    loser_games == null ||
    loser_games < 0 ||
    loser_games > 3
  ) {
    return res.status(400).json({ error: 'Bad payload' });
  }

  const admin = getSupabaseAdmin();

  // 1) Finalize the series
  const { error: updateErr } = await admin
    .from('series')
    .update({
      winner,
      winner_games,
      loser_games,
      status: 'final',
      finalized_at: new Date().toISOString(),
    })
    .eq('id', series_id);
  if (updateErr) return res.status(400).json({ error: updateErr.message });

  // 2) Re-score everyone via the DB RPC defined in 0002_multi_sport.sql
  const { error: scoreErr } = await admin.rpc('pickem_score_series', {
    p_series_id: series_id,
  });
  if (scoreErr) return res.status(500).json({ error: scoreErr.message });

  return res.status(200).json({ ok: true });
}
