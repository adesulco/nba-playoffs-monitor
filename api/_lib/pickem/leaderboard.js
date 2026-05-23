/**
 * GET /api/pickem?_action=list-leaderboard
 *
 * Reads one of the three leaderboard views shipped in migration 0015:
 *
 *   scope=competition    leaderboard_competition (global per league)
 *   scope=league         leaderboard_league      (per grup, requires league_id)
 *   scope=matchday       leaderboard_matchday    (per league + matchday)
 *
 * Public — no auth required (profiles + leaderboards are public).
 *
 * Query params:
 *   scope          required — 'competition' | 'league' | 'matchday'
 *   league         required for scope=competition|matchday — competition key
 *   matchday       required for scope=matchday
 *   league_id      required for scope=league — uuid of the grup
 *   around         optional — user_id; returns ±10 rows centered on that user
 *   limit          default 50, max 200
 *
 * Response:
 *   { ok: true, scope, rows: [...] }
 */

import { getSupabaseAdmin } from '../supabaseAdmin.js';

const SCOPES = new Set(['competition', 'league', 'matchday']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const WINDOW_HALF = 10;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const scope = String(req.query?.scope || '').trim();
  if (!SCOPES.has(scope)) {
    return res.status(400).json({ error: "scope must be 'competition'|'league'|'matchday'" });
  }

  const limit = Math.min(
    Math.max(parseInt(String(req.query?.limit || ''), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const around = String(req.query?.around || '').trim() || null;

  const admin = getSupabaseAdmin();
  let q;
  let view;

  if (scope === 'competition') {
    const league = String(req.query?.league || '').trim();
    if (!league) return res.status(400).json({ error: 'league required for scope=competition' });
    view = 'leaderboard_competition';
    q = admin.from(view).select('*').eq('competition', league);
  } else if (scope === 'league') {
    const leagueId = String(req.query?.league_id || '').trim();
    if (!leagueId) return res.status(400).json({ error: 'league_id required for scope=league' });
    view = 'leaderboard_league';
    q = admin.from(view).select('*').eq('league_id', leagueId);
  } else {
    const league = String(req.query?.league || '').trim();
    const matchdayRaw = req.query?.matchday;
    const matchday = matchdayRaw != null && matchdayRaw !== '' ? Number(matchdayRaw) : null;
    if (!league) return res.status(400).json({ error: 'league required for scope=matchday' });
    if (matchday == null || !Number.isInteger(matchday)) {
      return res.status(400).json({ error: 'matchday required for scope=matchday' });
    }
    view = 'leaderboard_matchday';
    q = admin.from(view).select('*').eq('competition', league).eq('matchday', matchday);
  }

  q = q.order('rank', { ascending: true });

  if (around) {
    // Two-pass: find the around-user's rank, then fetch ±WINDOW_HALF.
    const { data: meRow, error: meErr } = await admin
      .from(view)
      .select('rank')
      .match(scopeMatchClause(scope, req.query))
      .eq('user_id', around)
      .maybeSingle();
    if (meErr) return res.status(500).json({ error: meErr.message });
    if (!meRow) {
      return res.status(200).json({ ok: true, scope, rows: [], me_rank: null });
    }
    const lo = Math.max(1, meRow.rank - WINDOW_HALF);
    const hi = meRow.rank + WINDOW_HALF;
    q = q.gte('rank', lo).lte('rank', hi);
  } else {
    q = q.limit(limit);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({ ok: true, scope, rows: data || [] });
}

function scopeMatchClause(scope, qp) {
  if (scope === 'competition') return { competition: String(qp?.league || '') };
  if (scope === 'league')      return { league_id: String(qp?.league_id || '') };
  return { competition: String(qp?.league || ''), matchday: Number(qp?.matchday) };
}
