/**
 * GET /api/pickem?_action=get-prediction&fixture_id=<uuid>
 *
 * The authenticated user's pick on one fixture, or null. PickSheet prefill
 * without the list-predictions round trip. Auth required; never cached.
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const fixtureId = String(req.query?.fixture_id || '').trim();
  if (!UUID.test(fixtureId)) return res.status(400).json({ error: 'fixture_id must be a uuid' });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('predictions')
    .select('id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick, tier, awarded_points, base_points, penalty_points, streak_bonus, consensus_at_lock, created_at, scored_at')
    .eq('user_id', user.id)
    .eq('fixture_id', fixtureId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ ok: true, prediction: data || null });
}
