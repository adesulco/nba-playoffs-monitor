/**
 * GET /api/pickem?_action=league-detail&code=<invite_code>   (A3 · R1-1)
 * GET /api/pickem?_action=league-detail&id=<league_id>
 *
 * PUBLIC read powering the /g/:inviteCode invite landing (social proof:
 * real standings before signup) and the grup home. No auth required —
 * by design (03 §A teach: "see grup name + live leaderboard… no signup
 * wall"). Member emails are NEVER returned; display = nickname or a
 * neutral fallback.
 *
 * Response: {
 *   ok, league: { id, name, invite_code, competition, formats,
 *                 late_join_policy, scoring_config, max_members, tier,
 *                 owner_id, member_count, pending_count },
 *   members: [{ user_id, display_name, points, exact_count, status,
 *               is_owner, is_managed }]  // points desc
 * }
 */
import { getSupabaseAdmin } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const code = String(req.query?.code || '').trim();
  const id = String(req.query?.id || '').trim();
  if (!code && !id) return res.status(400).json({ error: 'code or id required' });

  const admin = getSupabaseAdmin();
  let q = admin
    .from('leagues')
    .select('id, name, invite_code, competition, formats, late_join_policy, scoring_config, max_members, tier, owner_id');
  q = code ? q.eq('invite_code', code) : q.eq('id', id);
  const { data: league } = await q.maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });

  // Members + cached points (refreshed by the scoring cron via
  // pickem_score_fixture; 0015). Join profiles for the display name.
  const { data: members, error } = await admin
    .from('league_members')
    .select('user_id, points_cache, exact_count_cache, status, managed_by, profiles:user_id(nickname)')
    .eq('league_id', league.id);
  if (error) return res.status(400).json({ error: error.message });

  const rows = (members || [])
    .filter((m) => m.status !== 'removed')
    .map((m) => ({
      user_id: m.user_id,
      display_name: m.profiles?.nickname || `Pemain ${String(m.user_id).slice(0, 4)}`,
      points: m.points_cache ?? 0,
      exact_count: m.exact_count_cache ?? 0,
      status: m.status || 'active',
      is_owner: m.user_id === league.owner_id,
      is_managed: !!m.managed_by,
    }))
    .sort((a, b) => b.points - a.points || b.exact_count - a.exact_count);

  const memberCount = rows.filter((r) => r.status === 'active').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
  return res.status(200).json({
    ok: true,
    league: { ...league, member_count: memberCount, pending_count: pendingCount },
    members: rows,
  });
}
