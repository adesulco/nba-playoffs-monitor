/**
 * GET /api/pickem?_action=list-predictions
 *
 * v0.79.9 — closes the rehydration gap surfaced in the launch smoke.
 * Previously, a user's predictions saved to the DB but the PredictingHub
 * couldn't reload them on page refresh (no API to read them back). Now
 * the hub fetches the user's predictions on mount + after sign-in claim
 * + on competition switch.
 *
 * Auth: Authorization: Bearer <access_token>.
 *
 * Query params:
 *   competition?  optional league key (e.g. 'NBA-Playoffs-2026'). When
 *                 set, scopes the result to that competition; otherwise
 *                 returns every prediction the user has made (capped at
 *                 limit so a multi-tournament account doesn't ship 10k
 *                 rows on first load).
 *   limit?        cap — defaults to 200, max 500. The Pick'em hub asks
 *                 for "every prediction in this competition" so 200 is
 *                 a generous cap for a single tournament (WC2026 ≈ 104
 *                 matches; NBA Playoffs ≈ 80 games).
 *
 * Response:
 *   { ok: true, predictions: [
 *       { id, fixture_id, league, picked_outcome, picked_home,
 *         picked_away, is_jagoan, awarded_points, base_points,
 *         created_at, scored_at }
 *   ] }
 *
 * Cache: private, max-age=15. The hub overrides via cache-busting on
 * the optimistic-write path; the cache exists for navigation re-mounts.
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const competition = String(req.query?.competition || '').trim() || null;
  const rawLimit = parseInt(req.query?.limit || '200', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, rawLimit)) : 200;

  const admin = getSupabaseAdmin();

  let q = admin
    .from('predictions')
    .select(
      'id, fixture_id, league, picked_outcome, picked_home, picked_away, is_jagoan, awarded_points, base_points, created_at, scored_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (competition) q = q.eq('league', competition);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'private, max-age=15');
  return res.status(200).json({ ok: true, predictions: data || [] });
}
