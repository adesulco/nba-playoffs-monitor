/**
 * GET /api/pickem?_action=list-profile
 *
 * Aggregates everything the /pickem/profile screen needs in one
 * roundtrip — stats grid (points / rank / accuracy), streak, badges
 * (earned + catalog for the gallery), and the recent-prediction
 * history strip. Auth required.
 *
 * Query params:
 *   competition?  optional — defaults to 'WC2026'.
 *   history_limit  optional — number of recent predictions to return
 *                  (default 10, max 50).
 *
 * Response:
 *   {
 *     ok: true,
 *     profile: {
 *       user_id, username, avatar_url, created_at,
 *       points, rank, accuracy_pct, exact_count,
 *       streak: { current_streak, longest_streak },
 *       badges: { earned: [...], catalog: [...] },
 *       recent_predictions: [...]
 *     }
 *   }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

const HISTORY_DEFAULT = 10;
const HISTORY_MAX = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const competition = String(req.query?.competition || '').trim() || 'WC2026';
  const historyLimit = Math.min(
    Math.max(parseInt(String(req.query?.history_limit || ''), 10) || HISTORY_DEFAULT, 1),
    HISTORY_MAX,
  );

  const admin = getSupabaseAdmin();

  // 1) Profile row (username, avatar). Falls back to email-prefix when
  //    no profile row exists yet.
  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  // 2) Stats from the leaderboard_competition view — single query
  //    returns rank + points + exact_count + tiebreak data.
  const { data: lbRow } = await admin
    .from('leaderboard_competition')
    .select('rank, points, exact_count, first_submitted_at')
    .eq('competition', competition)
    .eq('user_id', user.id)
    .maybeSingle();

  // 3) Accuracy: scored predictions where base_points > 0 / total scored.
  const { data: scoredRows } = await admin
    .from('predictions')
    .select('base_points', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('league', competition)
    .not('scored_at', 'is', null);

  const totalScored = scoredRows?.length ?? 0;
  const correctCount = (scoredRows || []).filter((r) => (r.base_points ?? 0) > 0).length;
  const accuracyPct = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : null;

  // 4) Streak.
  const { data: streakRow } = await admin
    .from('streaks')
    .select('current_streak, longest_streak, last_matchday')
    .eq('user_id', user.id)
    .eq('competition', competition)
    .maybeSingle();

  // 5) Badges — earned (joined with catalog) + full catalog for the gallery
  //    (locked badges grey out).
  const [{ data: earned }, { data: catalog }] = await Promise.all([
    admin
      .from('user_badges')
      .select('badge_code, awarded_at, matchday, badges(code, name_id, name_en, description, rarity)')
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false }),
    admin
      .from('badges')
      .select('code, name_id, name_en, description, rarity'),
  ]);

  // 6) Recent prediction history with the fixture join.
  const { data: recent } = await admin
    .from('predictions')
    .select('id, picked_outcome, picked_home, picked_away, is_jagoan, base_points, jagoan_mult_applied, upset_mult_applied, awarded_points, grup_bonus_points, scored_at, fixture_id, fixtures!inner(id, matchday, stage, home_team, away_team, home_score, away_score, outcome)')
    .eq('user_id', user.id)
    .eq('league', competition)
    .not('scored_at', 'is', null)
    .order('scored_at', { ascending: false })
    .limit(historyLimit);

  const earnedBadges = (earned || []).map((row) => ({
    code: row.badge_code,
    name_id: row.badges?.name_id,
    name_en: row.badges?.name_en,
    description: row.badges?.description,
    rarity: row.badges?.rarity,
    awarded_at: row.awarded_at,
    matchday: row.matchday,
  }));

  res.setHeader('Cache-Control', 'private, max-age=15');
  return res.status(200).json({
    ok: true,
    profile: {
      user_id: user.id,
      email: user.email,
      username: profile?.username || (user.email ? user.email.split('@')[0] : null),
      avatar_url: profile?.avatar_url || null,
      created_at: profile?.created_at || user.created_at,
      points: lbRow?.points ?? 0,
      rank: lbRow?.rank ?? null,
      exact_count: lbRow?.exact_count ?? 0,
      accuracy_pct: accuracyPct,
      total_scored: totalScored,
      correct_count: correctCount,
      streak: {
        current_streak: streakRow?.current_streak ?? 0,
        longest_streak: streakRow?.longest_streak ?? 0,
        last_matchday: streakRow?.last_matchday ?? null,
      },
      badges: {
        earned: earnedBadges,
        catalog: catalog || [],
      },
      recent_predictions: recent || [],
    },
  });
}
