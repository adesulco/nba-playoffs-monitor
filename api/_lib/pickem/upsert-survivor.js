/**
 * POST /api/pickem?_action=upsert-survivor-pick
 *
 * Persists the user's Survivor pick for one fixture. The pick is a
 * single team to win the matchday's fixture; the server enforces:
 *   - one survivor_pick per (user, competition, matchday)
 *   - no team reuse (per spec §5.5)
 *   - lock-at gate (can't change after fixture.lock_at)
 *
 * The pick lives on the existing predictions row (sets survivor_pick =
 * true). If no prediction exists yet for (user, fixture), one is created
 * with picked_outcome derived from which side the chosen team is on.
 * survivor_entries.used_team_ids is appended to track no-reuse.
 *
 * Body:
 *   { fixture_id: uuid, picked_team_id: uuid }
 *
 * Response:
 *   { ok: true, prediction, survivor_entry }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { fixture_id, picked_team_id } = body;
  if (!fixture_id) return res.status(400).json({ error: 'fixture_id required' });
  if (!picked_team_id) return res.status(400).json({ error: 'picked_team_id required' });

  const admin = getSupabaseAdmin();

  // 1) Load fixture + verify team is one of (home, away) + check lock state.
  const { data: fx, error: fxErr } = await admin
    .from('fixtures')
    .select('id, league, matchday, lock_at, status, home_team, away_team')
    .eq('id', fixture_id)
    .maybeSingle();
  if (fxErr) return res.status(500).json({ error: fxErr.message });
  if (!fx) return res.status(404).json({ error: 'fixture not found' });
  if (new Date(fx.lock_at).getTime() <= Date.now()) {
    return res.status(409).json({ error: 'fixture locked' });
  }
  if (fx.status === 'final') {
    return res.status(409).json({ error: 'fixture already final' });
  }
  if (picked_team_id !== fx.home_team && picked_team_id !== fx.away_team) {
    return res.status(400).json({ error: 'picked_team_id is not in this fixture' });
  }
  const pickedOutcome = picked_team_id === fx.home_team ? 'H' : 'A';

  // 2) Enforce no-reuse against survivor_entries.used_team_ids.
  const { data: entry } = await admin
    .from('survivor_entries')
    .select('id, status, used_team_ids')
    .eq('user_id', user.id)
    .eq('competition', fx.league)
    .maybeSingle();
  if (entry?.status === 'out') {
    return res.status(409).json({ error: 'survivor_eliminated' });
  }
  const used = entry?.used_team_ids || [];
  if (used.includes(picked_team_id)) {
    return res.status(409).json({ error: 'team_already_used' });
  }

  // 3) Clear any other survivor_pick=true on the same matchday.
  const { data: matchdayFixtures } = await admin
    .from('fixtures')
    .select('id')
    .eq('league', fx.league)
    .eq('matchday', fx.matchday);
  const matchdayIds = (matchdayFixtures || []).map((r) => r.id).filter((id) => id !== fixture_id);
  if (matchdayIds.length) {
    await admin
      .from('predictions')
      .update({ survivor_pick: false })
      .eq('user_id', user.id)
      .in('fixture_id', matchdayIds)
      .eq('survivor_pick', true);
  }

  // 4) Upsert the prediction row with survivor_pick=true.
  //    The picked_outcome reflects the survivor's team-to-win.
  const { data: prediction, error: predErr } = await admin
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        fixture_id,
        league: fx.league,
        picked_outcome: pickedOutcome,
        survivor_pick: true,
      },
      { onConflict: 'user_id,fixture_id' },
    )
    .select(
      'id, user_id, fixture_id, league, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick, awarded_points, base_points, scored_at',
    )
    .maybeSingle();
  if (predErr) return res.status(500).json({ error: predErr.message });

  // 5) Upsert the survivor_entries row + append picked_team_id to used_team_ids.
  let survivorEntry = entry;
  if (!entry) {
    const { data: created, error: createErr } = await admin
      .from('survivor_entries')
      .insert({
        user_id: user.id,
        competition: fx.league,
        status: 'alive',
        used_team_ids: [picked_team_id],
      })
      .select('*')
      .single();
    if (createErr) return res.status(500).json({ error: createErr.message });
    survivorEntry = created;
  } else {
    const { data: updated, error: updErr } = await admin
      .from('survivor_entries')
      .update({
        used_team_ids: [...used, picked_team_id],
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
      .select('*')
      .single();
    if (updErr) return res.status(500).json({ error: updErr.message });
    survivorEntry = updated;
  }

  return res.status(200).json({
    ok: true,
    prediction,
    survivor_entry: survivorEntry,
  });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return null;
  }
}
