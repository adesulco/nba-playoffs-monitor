/**
 * GET /api/pickem?_action=list-survivor
 *
 * Returns the authenticated user's Survivor state for a competition —
 * the entry row + the full pick history (each predictions row where
 * survivor_pick is true).
 *
 * Query params:
 *   competition?  defaults to 'WC2026'
 *
 * Response:
 *   {
 *     ok: true,
 *     entry: { id, status, eliminated_matchday, used_team_ids, ... } | null,
 *     picks: [{ id, fixture_id, picked_outcome, picked_team_id, matchday,
 *               result }] sorted by matchday asc,
 *   }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const competition = String(req.query?.competition || '').trim() || 'WC2026';
  const admin = getSupabaseAdmin();

  const [{ data: entry, error: entryErr }, { data: picks, error: picksErr }] = await Promise.all([
    admin
      .from('survivor_entries')
      .select('id, status, eliminated_matchday, used_team_ids, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('competition', competition)
      .maybeSingle(),
    admin
      .from('predictions')
      .select(
        'id, fixture_id, picked_outcome, awarded_points, base_points, scored_at, fixtures!inner(id, matchday, stage, home_team, away_team, home_score, away_score, outcome, status)',
      )
      .eq('user_id', user.id)
      .eq('league', competition)
      .eq('survivor_pick', true)
      .order('fixtures(matchday)', { ascending: true }),
  ]);

  if (entryErr) return res.status(500).json({ error: entryErr.message });
  if (picksErr) return res.status(500).json({ error: picksErr.message });

  const enriched = (picks || []).map((p) => {
    const fx = p.fixtures || {};
    const pickedTeam =
      p.picked_outcome === 'H' ? fx.home_team
      : p.picked_outcome === 'A' ? fx.away_team
      : null;
    let result = 'pending';
    if (fx.status === 'final' && fx.outcome != null) {
      result = p.picked_outcome === fx.outcome ? 'win' : 'loss';
    }
    return {
      id: p.id,
      fixture_id: p.fixture_id,
      matchday: fx.matchday,
      stage: fx.stage,
      picked_outcome: p.picked_outcome,
      picked_team_id: pickedTeam,
      result,
      scored_at: p.scored_at,
      home_team: fx.home_team,
      away_team: fx.away_team,
      home_score: fx.home_score,
      away_score: fx.away_score,
    };
  });

  res.setHeader('Cache-Control', 'private, max-age=15');
  return res.status(200).json({
    ok: true,
    entry: entry || null,
    picks: enriched,
  });
}
