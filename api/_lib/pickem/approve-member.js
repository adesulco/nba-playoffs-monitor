/**
 * POST /api/pickem?_action=approve-member   (A3 · R1-5)
 *
 * Commissioner approves a pending member (the cap paywall flow: member
 * #11 lands in status='pending'; approval succeeds only when the active
 * count is under max_members OR the league tier isn't free — i.e. the
 * commissioner upgraded).
 *
 * Body: { league_id, user_id }
 * Response: { ok, status: 'active' } | 402 { error, needs_upgrade: true }
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import { parseBody } from './league-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body?.league_id || !body?.user_id) {
    return res.status(400).json({ error: 'league_id and user_id required' });
  }

  const admin = getSupabaseAdmin();
  const { data: league } = await admin
    .from('leagues')
    .select('id, owner_id, max_members, tier')
    .eq('id', body.league_id)
    .maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.owner_id !== user.id) {
    return res.status(403).json({ error: 'Only the commissioner can approve members' });
  }

  const { data: member } = await admin
    .from('league_members')
    .select('user_id, status')
    .eq('league_id', league.id)
    .eq('user_id', body.user_id)
    .maybeSingle();
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.status === 'active') return res.status(200).json({ ok: true, status: 'active' });

  if (league.tier === 'free') {
    const { count } = await admin
      .from('league_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('status', 'active');
    if ((count ?? 0) >= (league.max_members ?? 10)) {
      return res.status(402).json({
        error: 'Free slots are full — upgrade to approve.',
        error_id: 'Slot gratis penuh — upgrade untuk approve.',
        needs_upgrade: true,
      });
    }
  }

  const { error } = await admin
    .from('league_members')
    .update({ status: 'active' })
    .eq('league_id', league.id)
    .eq('user_id', body.user_id);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true, status: 'active' });
}
