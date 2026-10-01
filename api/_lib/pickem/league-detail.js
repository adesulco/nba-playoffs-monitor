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
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

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
    .select('id, name, invite_code, competition, formats, late_join_policy, scoring_config, max_members, tier, owner_id, description, enabled_modes');
  q = code ? q.eq('invite_code', code) : q.eq('id', id);
  const { data: league } = await q.maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });

  // D4 (08-teardown-deltas) — "who hasn't picked" is P0: per-member
  // picked_current_matchday so the grup-home nudge row ("no pick yet ·
  // nudge on WA →") costs zero extra client queries. Current matchday =
  // the earliest matchday that still has an open fixture (what members
  // should be picking right now).
  let currentMatchday = null;
  const pickedSet = new Set();
  if (league.competition) {
    const { data: openFx } = await admin
      .from('fixtures')
      .select('matchday')
      .eq('league', league.competition)
      .gt('lock_at', new Date().toISOString())
      .order('matchday', { ascending: true })
      .limit(1);
    currentMatchday = openFx?.[0]?.matchday ?? null;
    if (currentMatchday != null) {
      const { data: picks } = await admin
        .from('predictions')
        .select('user_id')
        .eq('league', league.competition)
        .eq('matchday', currentMatchday);
      for (const p of picks || []) pickedSet.add(p.user_id);
    }
  }

  // Members + cached points (refreshed by the scoring cron via
  // pickem_score_fixture; 0015).
  //
  // R2 fix (2026-07-25): this used a PostgREST embed
  // `profiles:user_id(nickname)`, which threw "Could not find a
  // relationship between 'league_members' and 'user_id'" for EVERY call —
  // league_members.user_id and profiles.id both reference auth.users, so
  // there is no FK between the two tables for PostgREST to infer. The
  // action was therefore 400-ing in production, which broke the /g/:code
  // invite landing and the grup home. Fixed as a second query + client-side
  // merge (code-only; no migration needed mid-window).
  const { data: members, error } = await admin
    .from('league_members')
    .select('user_id, points_cache, exact_count_cache, status, managed_by')
    .eq('league_id', league.id);
  if (error) return res.status(400).json({ error: error.message });

  const memberIds = (members || []).map((m) => m.user_id);
  const nicknameById = new Map();
  const nyarisById = new Map();
  if (memberIds.length) {
    const [{ data: profs }, { data: boardRows }] = await Promise.all([
      admin.from('profiles').select('id, nickname').in('id', memberIds),
      // S3: the Nyaris column comes from the 0021 view (tier-based count).
      admin.from('leaderboard_league').select('user_id, nyaris_count').eq('league_id', league.id),
    ]);
    for (const p of profs || []) nicknameById.set(p.id, p.nickname);
    for (const r of boardRows || []) nyarisById.set(r.user_id, Number(r.nyaris_count) || 0);
  }

  const rows = (members || [])
    .filter((m) => m.status !== 'removed')
    .map((m) => ({
      user_id: m.user_id,
      display_name: nicknameById.get(m.user_id) || `Pemain ${String(m.user_id).slice(0, 4)}`,
      points: m.points_cache ?? 0,
      exact_count: m.exact_count_cache ?? 0,
      nyaris_count: nyarisById.get(m.user_id) ?? 0,
      status: m.status || 'active',
      is_owner: m.user_id === league.owner_id,
      is_managed: !!m.managed_by,
      picked_current_matchday: pickedSet.has(m.user_id), // D4 — drives the WA-nudge row
    }))
    .sort((a, b) => b.points - a.points || b.exact_count - a.exact_count);

  const memberCount = rows.filter((r) => r.status === 'active').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  // The invite code is the key to the grup. Looking a grup up BY its code
  // proves you have it; looking it up by id does not (audit 2026-10-01:
  // `league-detail?id=` leaked every invite code). By id, the code is
  // returned only to the owner or an active member, and that response is
  // private so the edge never serves one member's copy to the next.
  let exposeCode = !!code;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!exposeCode && authHeader) {
    const caller = await getUserFromAuthHeader(authHeader);
    if (caller && (caller.id === league.owner_id || rows.some((r) => r.user_id === caller.id && r.status === 'active'))) {
      exposeCode = true;
    }
  }
  if (!exposeCode) delete league.invite_code;

  res.setHeader('Cache-Control', authHeader ? 'private, no-store' : 'public, max-age=15, s-maxage=30');
  return res.status(200).json({
    ok: true,
    league: {
      ...league,
      member_count: memberCount,
      pending_count: pendingCount,
      current_matchday: currentMatchday,
    },
    members: rows,
  });
}
