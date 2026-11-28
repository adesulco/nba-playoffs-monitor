/**
 * GET /api/pickem?_action=get-bracket&competition=M8-KO-2027&season=2027&entry_phase=full
 *
 * Reads the authenticated user's bracket + slot picks for a Playoff competition
 * (including Babak Baru Second Chance phases encoded in `season` as `${season}#${phase}`).
 *
 * Uses ONLY columns already live in prod (0016_pickem_bracket_scoring.sql) so
 * scripts/check-api-columns.mjs stays 100% green before and after 0025 is applied.
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

function resolveSeasonKey(season, entryPhase) {
  const base = String(season || '2027').trim().slice(0, 32);
  const phase = String(entryPhase || 'full').trim().toLowerCase();
  if (!phase || phase === 'full' || !/^[a-z0-9_-]{1,16}$/.test(phase)) return base;
  return `${base}#${phase}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const competition = String(req.query?.competition || '').trim();
  if (!competition) return res.status(400).json({ error: 'competition required' });
  const season = resolveSeasonKey(req.query?.season || '2027', req.query?.entry_phase);

  const admin = getSupabaseAdmin();
  const { data: bracket, error: brErr } = await admin
    .from('brackets')
    .select('id, user_id, status, competition, season, points_cache, locked_at, created_at')
    .eq('user_id', user.id)
    .eq('competition', competition)
    .eq('season', season)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (brErr) return res.status(500).json({ error: brErr.message });
  if (!bracket) {
    return res.status(200).json({ ok: true, bracket: null, slots: [] });
  }

  const { data: picks, error: pkErr } = await admin
    .from('picks')
    .select('bracket_id, slot_type, slot_index, picked_team_code, awarded_points, scored_at')
    .eq('bracket_id', bracket.id)
    .is('series_id', null);

  if (pkErr) return res.status(500).json({ error: pkErr.message });

  return res.status(200).json({
    ok: true,
    bracket,
    slots: picks || [],
  });
}
