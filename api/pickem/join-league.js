/**
 * POST /api/pickem/join-league
 *
 * Adds the authenticated user to a private league (after the client has
 * already confirmed the invite_code is valid). Also attaches the user's
 * most recent bracket to the membership row.
 *
 * Body: { leagueId, inviteCode }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = req.body && typeof req.body === 'object'
    ? req.body
    : (() => { try { return JSON.parse(req.body || '{}'); } catch { return null; } })();
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { leagueId, inviteCode } = body;
  if (!leagueId || !inviteCode) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const admin = getSupabaseAdmin();

  // Verify the league + invite code server-side.
  const { data: league } = await admin
    .from('leagues')
    .select('id, invite_code')
    .eq('id', leagueId)
    .maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.invite_code !== inviteCode) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }

  // Attach the user's most-recent 2026 bracket if one exists.
  const { data: bracketRow } = await admin
    .from('brackets')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', '2026')
    .order('updated_at', { ascending: false })
    .limit(1);

  const { error } = await admin
    .from('league_members')
    .upsert(
      {
        league_id: league.id,
        user_id: user.id,
        bracket_id: bracketRow?.[0]?.id ?? null,
      },
      { onConflict: 'league_id,user_id' },
    );

  if (error) {
    console.error('[join-league] upsert failed', error);
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, leagueId: league.id });
}
