/**
 * POST /api/pickem/create-league
 *
 * Creates a private league owned by the authenticated user. The league's
 * invite_code is generated server-side (by a DB default or trigger, per
 * supabase/migrations/0002_multi_sport.sql). The owner is auto-attached as
 * a league_members row with their most recent bracket.
 *
 * Body: { name: string }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'Nama liga 2–60 karakter.' });
  }

  const admin = getSupabaseAdmin();

  const { data: league, error } = await admin
    .from('leagues')
    .insert({ owner_id: user.id, name })
    .select('id, invite_code')
    .single();
  if (error || !league) {
    console.error('[create-league] insert failed', error);
    return res.status(400).json({ error: error?.message || 'Failed' });
  }

  // Owner auto-joins with their most recent 2026 bracket (if any).
  const { data: bracketRow } = await admin
    .from('brackets')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', '2026')
    .order('updated_at', { ascending: false })
    .limit(1);

  await admin.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    bracket_id: bracketRow?.[0]?.id ?? null,
  });

  return res.status(200).json({ id: league.id, invite_code: league.invite_code });
}
