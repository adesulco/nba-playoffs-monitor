/**
 * GET /api/pickem?_action=leaderboard-national
 *       &league=EPL-2026-27&board=points|streak&limit=50&offset=0
 *
 * Papan Nasional (doc 17 S3): the competition-wide board every grup feeds.
 *   board=points  → leaderboard_competition (Spec v1 totals, shared ranks,
 *                   exact → nyaris → earliest-pick tiebreak)
 *   board=streak  → streaks(kind='correct') ranked by current then longest
 * With a bearer token the caller's own row is returned as `me` even when it
 * is outside the page. Public, cacheable for 30 s.
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import { isCompetitionKey, defaultCompetitionKey } from './registry.js';

const MAX_LIMIT = 100;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const league = String(req.query?.league || '').trim() || defaultCompetitionKey();
  if (!isCompetitionKey(league)) return res.status(400).json({ error: `Unknown competition '${league}'` });
  const board = String(req.query?.board || 'points').trim();
  if (!['points', 'streak'].includes(board)) return res.status(400).json({ error: "board must be 'points'|'streak'" });
  const limit = Math.min(Math.max(parseInt(String(req.query?.limit || ''), 10) || 50, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(String(req.query?.offset || ''), 10) || 0, 0);

  const admin = getSupabaseAdmin();
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const caller = authHeader ? await getUserFromAuthHeader(authHeader) : null;

  let rows = [];
  let me = null;
  let total = 0;

  if (board === 'points') {
    const { data, error, count } = await admin
      .from('leaderboard_competition')
      .select('user_id, username, avatar_url, points, exact_count, nyaris_count, rank', { count: 'exact' })
      .eq('competition', league)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    rows = data || [];
    total = count ?? rows.length;
    if (caller && !rows.some((r) => r.user_id === caller.id)) {
      const { data: mine } = await admin
        .from('leaderboard_competition')
        .select('user_id, username, avatar_url, points, exact_count, nyaris_count, rank')
        .eq('competition', league).eq('user_id', caller.id).maybeSingle();
      me = mine || null;
    } else if (caller) {
      me = rows.find((r) => r.user_id === caller.id) || null;
    }
  } else {
    const { data, error, count } = await admin
      .from('streaks')
      .select('user_id, current_streak, longest_streak, last_matchday', { count: 'exact' })
      .eq('competition', league).eq('kind', 'correct')
      .gt('longest_streak', 0)
      .order('current_streak', { ascending: false })
      .order('longest_streak', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    const base = data || [];
    total = count ?? base.length;
    const ids = base.map((r) => r.user_id);
    if (caller && !ids.includes(caller.id)) ids.push(caller.id);
    const { data: profs } = ids.length
      ? await admin.from('profiles').select('id, nickname, avatar_url').in('id', ids)
      : { data: [] };
    const nameOf = new Map((profs || []).map((p) => [p.id, p]));
    rows = base.map((r, i) => ({
      user_id: r.user_id,
      username: nameOf.get(r.user_id)?.nickname || null,
      avatar_url: nameOf.get(r.user_id)?.avatar_url || null,
      current_streak: r.current_streak,
      longest_streak: r.longest_streak,
      last_matchday: r.last_matchday,
      rank: offset + i + 1,
    }));
    if (caller) {
      me = rows.find((r) => r.user_id === caller.id) || null;
      if (!me) {
        const { data: mine } = await admin.from('streaks').select('current_streak, longest_streak, last_matchday')
          .eq('competition', league).eq('kind', 'correct').eq('user_id', caller.id).maybeSingle();
        if (mine) me = { user_id: caller.id, username: nameOf.get(caller.id)?.nickname || null, ...mine, rank: null };
      }
    }
  }

  res.setHeader('Cache-Control', caller ? 'private, no-store' : 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({ ok: true, league, board, rows, me, total, limit, offset });
}
