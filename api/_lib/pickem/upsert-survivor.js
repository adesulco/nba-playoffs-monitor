/**
 * POST /api/pickem?_action=upsert-survivor-pick
 *
 * Persists the user's Gugur (Survivor) pick for one fixture, inside ONE
 * grup (0021: a survivor life is per grup, doc 17 §1 Gugur). The server
 * enforces:
 *   - the grup exists, has survivor switched on, and the user is an active
 *     member of it
 *   - one survivor_pick per (user, competition, matchday)
 *   - no team reuse; changing the matchday's pick RELEASES the old team
 *   - lock gate (fixture.lock_at)
 *   - an eliminated entry cannot pick
 *
 * The pick lives on the predictions row (survivor_pick = true) — shared by
 * every grup the user is in, since it is one real-world opinion. The LIFE
 * (survivor_entries) is per grup.
 *
 * Body:     { fixture_id: uuid, picked_team_id: tricode, league_id: uuid }
 * Response: { ok: true, prediction, survivor_entry }
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import { planSurvivorPick } from './survivor-core.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { fixture_id, picked_team_id, league_id } = body;
  if (!fixture_id) return res.status(400).json({ error: 'fixture_id required' });
  if (!picked_team_id) return res.status(400).json({ error: 'picked_team_id required' });
  if (!league_id || !UUID.test(String(league_id))) return res.status(400).json({ error: 'league_id required' });

  const admin = getSupabaseAdmin();

  // 1) Grup: exists, survivor on, caller is an active member.
  const { data: league } = await admin
    .from('leagues').select('id, competition, enabled_modes').eq('id', league_id).maybeSingle();
  if (!league) return res.status(404).json({ error: 'grup not found' });
  if (!league.enabled_modes?.survivor) return res.status(409).json({ error: 'survivor_disabled' });
  const { data: membership } = await admin
    .from('league_members').select('status').eq('league_id', league_id).eq('user_id', user.id).maybeSingle();
  if (!membership || (membership.status && membership.status !== 'active')) {
    return res.status(403).json({ error: 'not_a_member' });
  }

  // 2) Fixture: belongs to the grup's competition, team is in it, still open.
  const { data: fx, error: fxErr } = await admin
    .from('fixtures')
    .select('id, league, matchday, lock_at, status, home_team, away_team')
    .eq('id', fixture_id)
    .maybeSingle();
  if (fxErr) return res.status(500).json({ error: fxErr.message });
  if (!fx) return res.status(404).json({ error: 'fixture not found' });
  if (fx.league !== league.competition) return res.status(400).json({ error: 'fixture is not in this grup\'s competition' });
  if (new Date(fx.lock_at).getTime() <= Date.now()) return res.status(409).json({ error: 'fixture locked' });
  if (fx.status === 'final' || fx.status === 'postponed') return res.status(409).json({ error: `fixture ${fx.status}` });
  if (picked_team_id !== fx.home_team && picked_team_id !== fx.away_team) {
    return res.status(400).json({ error: 'picked_team_id is not in this fixture' });
  }
  const pickedOutcome = picked_team_id === fx.home_team ? 'H' : 'A';

  // 3) Every life the user holds in this competition: the pick is shared,
  //    so it is checked against and written to all of them (survivor-core).
  const { data: entries, error: entErr } = await admin
    .from('survivor_entries')
    .select('id, league_id, status, used_team_ids')
    .eq('user_id', user.id)
    .eq('competition', fx.league);
  if (entErr) return res.status(500).json({ error: entErr.message });
  if ((entries || []).find((e) => e.league_id === league_id)?.status === 'out') {
    return res.status(409).json({ error: 'survivor_eliminated' });
  }

  // 4) The matchday's current survivor pick (any fixture): its team is
  //    released when the pick changes, so a second thought before lock
  //    doesn't burn two teams.
  const { data: mdFixtures } = await admin
    .from('fixtures').select('id, home_team, away_team').eq('league', fx.league).eq('matchday', fx.matchday);
  const mdById = new Map((mdFixtures || []).map((f) => [f.id, f]));
  const { data: currentPicks } = await admin
    .from('predictions')
    .select('id, fixture_id, picked_outcome')
    .eq('user_id', user.id)
    .eq('survivor_pick', true)
    .in('fixture_id', [...mdById.keys()]);
  const releasedTeams = new Set();
  for (const p of currentPicks || []) {
    const f = mdById.get(p.fixture_id);
    if (!f) continue;
    const team = p.picked_outcome === 'H' ? f.home_team : p.picked_outcome === 'A' ? f.away_team : null;
    if (team) releasedTeams.add(team);
  }
  const plan = planSurvivorPick({
    entries: entries || [], leagueId: league_id, pickedTeam: picked_team_id, releasedTeams: [...releasedTeams],
  });
  if (plan.error) {
    return res.status(409).json({ error: plan.error, ...(plan.league_id !== league_id ? { other_grup: true } : {}) });
  }

  // 5) Clear any other survivor_pick on this matchday, then upsert the pick.
  const otherIds = (currentPicks || []).map((p) => p.fixture_id).filter((id) => id !== fixture_id);
  if (otherIds.length) {
    await admin.from('predictions').update({ survivor_pick: false })
      .eq('user_id', user.id).in('fixture_id', otherIds).eq('survivor_pick', true);
  }
  const { data: prediction, error: predErr } = await admin
    .from('predictions')
    .upsert(
      { user_id: user.id, fixture_id, league: fx.league, matchday: fx.matchday, picked_outcome: pickedOutcome, survivor_pick: true },
      { onConflict: 'user_id,fixture_id' },
    )
    .select('id, user_id, fixture_id, league, matchday, picked_outcome, picked_home, picked_away, is_jagoan, survivor_pick, tier, awarded_points, scored_at')
    .maybeSingle();
  if (predErr) return res.status(500).json({ error: predErr.message });

  // 6) Write the plan: every alive life gets the released-then-added list,
  //    and this grup's life is created on its first pick.
  let survivorEntry = null;
  const now = new Date().toISOString();
  for (const u of plan.updates) {
    const { data: updated, error: updErr } = await admin
      .from('survivor_entries')
      .update({ used_team_ids: u.used_team_ids, updated_at: now })
      .eq('id', u.id)
      .select('*').single();
    if (updErr) return res.status(500).json({ error: updErr.message });
    if (u.league_id === league_id) survivorEntry = updated;
  }
  if (plan.create) {
    const { data: created, error: createErr } = await admin
      .from('survivor_entries')
      .insert({ user_id: user.id, league_id, competition: fx.league, status: 'alive', used_team_ids: plan.create.used_team_ids })
      .select('*').single();
    if (createErr) return res.status(500).json({ error: createErr.message });
    survivorEntry = created;
  }

  return res.status(200).json({ ok: true, prediction, survivor_entry: survivorEntry });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return null; }
}
