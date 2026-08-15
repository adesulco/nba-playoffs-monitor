/**
 * GET /api/pickem?_action=survivor-board
 *
 * The grup's Gugur board — every member's survivor status for the grup's
 * competition. This is what the eliminated "pantau" mode watches, and what
 * the alive players trash-talk over. R4a-1 (M1 Gugur).
 *
 * Public read by invite code (same posture as league-detail: the board is
 * gengsi, not PII — display names + alive/eliminated only).
 *
 * Query params:
 *   code   invite code of the grup (case-sensitive, as always)
 *
 * Response:
 *   {
 *     ok: true,
 *     competition,
 *     rows: [{ user_id, display_name, status: 'alive'|'eliminated'|'not_started',
 *              eliminated_matchday, used_count }],
 *     alive_count, total_count,
 *   }
 */

import { getSupabaseAdmin } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = String(req.query.code || '');
  if (!code) return res.status(400).json({ error: 'code required' });

  const admin = getSupabaseAdmin();
  const { data: league } = await admin
    .from('leagues')
    .select('id, competition, enabled_modes')
    .eq('invite_code', code)
    .maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (!league.enabled_modes?.survivor) {
    return res.status(200).json({ ok: true, enabled: false, rows: [] });
  }

  const { data: members } = await admin
    .from('league_members')
    .select('user_id, status')
    .eq('league_id', league.id)
    .eq('status', 'active');
  const userIds = (members || []).map((m) => m.user_id);
  if (!userIds.length) {
    return res.status(200).json({ ok: true, enabled: true, competition: league.competition, rows: [], alive_count: 0, total_count: 0 });
  }

  const [{ data: profiles }, { data: entries }] = await Promise.all([
    admin.from('profiles').select('id, nickname, username').in('id', userIds),
    admin
      .from('survivor_entries')
      .select('user_id, status, eliminated_matchday, used_team_ids')
      .eq('competition', league.competition)
      .in('user_id', userIds),
  ]);

  const nameOf = new Map((profiles || []).map((p) => [p.id, p.nickname || p.username || p.id.slice(0, 8)]));
  const entryOf = new Map((entries || []).map((e) => [e.user_id, e]));

  const rows = userIds.map((id) => {
    const e = entryOf.get(id);
    return {
      user_id: id,
      display_name: nameOf.get(id) || id.slice(0, 8),
      // DB values are 'alive' | 'out' (migration 0017); the API speaks
      // 'alive' | 'eliminated' | 'not_started' so the UI never leaks a
      // schema token into copy.
      status: !e ? 'not_started' : e.status === 'out' ? 'eliminated' : 'alive',
      eliminated_matchday: e?.eliminated_matchday ?? null,
      used_count: e?.used_team_ids?.length ?? 0,
    };
  });
  // Alive first (most used-teams first = furthest along), then not-started,
  // then eliminated by how far they got — the board reads as a story.
  const rank = { alive: 0, not_started: 1, eliminated: 2 };
  rows.sort((a, b) =>
    (rank[a.status] - rank[b.status]) ||
    (b.used_count - a.used_count) ||
    ((b.eliminated_matchday ?? 0) - (a.eliminated_matchday ?? 0))
  );

  return res.status(200).json({
    ok: true,
    enabled: true,
    competition: league.competition,
    rows,
    alive_count: rows.filter((r) => r.status === 'alive').length,
    total_count: rows.length,
  });
}
