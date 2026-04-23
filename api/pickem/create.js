/**
 * POST /api/pickem/create
 *
 * Creates a fresh bracket for the authenticated user. Mirrors the logic that
 * lived in /app/bracket/new/page.tsx as a Next server action: picks a unique
 * name, inserts the row, returns { id }.
 *
 * Body (all optional):
 *   { season?: string, name?: string, leagueId?: string }
 *
 * Auth: Authorization: Bearer <access_token> from Supabase client.
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
    : (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })();

  const season = typeof body.season === 'string' && body.season.trim() ? body.season.trim() : '2026';
  const requestedName = typeof body.name === 'string' ? body.name.trim() : '';

  const admin = getSupabaseAdmin();

  // Derive a unique name if the default is taken.
  const { data: existing } = await admin
    .from('brackets')
    .select('name')
    .eq('user_id', user.id)
    .eq('season', season);
  const existingNames = new Set((existing || []).map((b) => b.name));

  let name = requestedName || 'Bracket saya';
  if (!requestedName) {
    let i = 2;
    while (existingNames.has(name)) {
      name = `Bracket saya #${i++}`;
    }
  }

  const { data: created, error } = await admin
    .from('brackets')
    .insert({ user_id: user.id, season, name })
    .select('id')
    .single();

  if (error || !created) {
    console.error('[create] bracket insert failed', error);
    return res.status(400).json({ error: error?.message || 'Failed to create bracket' });
  }

  // Optional: if a leagueId was supplied, attach the new bracket to the
  // caller's existing league_members row for that league.
  const leagueId = typeof body.leagueId === 'string' && body.leagueId ? body.leagueId : null;
  if (leagueId) {
    await admin
      .from('league_members')
      .upsert(
        { league_id: leagueId, user_id: user.id, bracket_id: created.id },
        { onConflict: 'league_id,user_id' },
      );
  }

  return res.status(200).json({ id: created.id, name });
}
