/**
 * GET /api/pickem?_action=list-grups
 *
 * Lists the authenticated user's grup memberships ("leagues" in the DB;
 * "grup" in product copy). Each row carries the cached point/exact-count
 * aggregates from migration 0015's league_members extension so the
 * /pickem/grup hub can render without a follow-up roundtrip per grup.
 *
 * Auth: Authorization: Bearer <access_token>.
 *
 * Query params:
 *   competition?  optional — filter to grups tracking one Pick'em
 *                  competition (e.g. 'WC2026').
 *
 * Response:
 *   { ok: true, grups: [
 *       { id, name, invite_code, visibility, competition, theme, color,
 *         enabled_modes, owner_id, member_count, my_rank, my_points,
 *         my_exact_count, my_matchday_rank, my_previous_rank }
 *   ] }
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

  const admin = getSupabaseAdmin();

  // 1) The user's memberships — carries the cached aggregates.
  let memQ = admin
    .from('league_members')
    .select(
      'league_id, points_cache, exact_count_cache, matchday_rank, previous_rank, leagues!inner(id, name, invite_code, visibility, competition, theme, color, enabled_modes, owner_id)',
    )
    .eq('user_id', user.id);
  if (competition) memQ = memQ.eq('leagues.competition', competition);

  const { data: memberships, error: memErr } = await memQ;
  if (memErr) return res.status(500).json({ error: memErr.message });

  const leagueIds = (memberships || []).map((m) => m.league_id);
  if (leagueIds.length === 0) {
    return res.status(200).json({ ok: true, grups: [] });
  }

  // 2) Per-grup member count + the user's rank within that grup.
  //    Pulls the rank from leaderboard_league view (already sorted by
  //    points_cache desc, exact_count_cache desc, last_predicted_at asc).
  const { data: ranks, error: rkErr } = await admin
    .from('leaderboard_league')
    .select('league_id, user_id, rank')
    .in('league_id', leagueIds);
  if (rkErr) return res.status(500).json({ error: rkErr.message });

  const memberCount = new Map();
  const myRank = new Map();
  for (const row of ranks || []) {
    memberCount.set(row.league_id, (memberCount.get(row.league_id) || 0) + 1);
    if (row.user_id === user.id) myRank.set(row.league_id, row.rank);
  }

  const grups = (memberships || []).map((m) => {
    const l = m.leagues || {};
    return {
      id: l.id || m.league_id,
      name: l.name,
      invite_code: l.invite_code,
      visibility: l.visibility,
      competition: l.competition,
      theme: l.theme,
      color: l.color,
      enabled_modes: l.enabled_modes,
      owner_id: l.owner_id,
      member_count: memberCount.get(m.league_id) || 1,
      my_rank: myRank.get(m.league_id) || null,
      my_points: m.points_cache || 0,
      my_exact_count: m.exact_count_cache || 0,
      my_matchday_rank: m.matchday_rank || null,
      my_previous_rank: m.previous_rank || null,
    };
  });

  res.setHeader('Cache-Control', 'private, max-age=15');
  return res.status(200).json({ ok: true, grups });
}
