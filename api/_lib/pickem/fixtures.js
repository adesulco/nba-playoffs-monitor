/**
 * GET /api/pickem?_action=list-fixtures
 *
 * Lists fixtures for a Pick'em competition. Public — no auth required;
 * the fixtures table has an anon-read RLS policy.
 *
 * Query params:
 *   league      required — competition key ('WC2026', 'EPL', …)
 *   season      optional — defaults to all seasons for that league
 *   matchday    optional — int; restricts to one matchday
 *   status      optional — 'scheduled' | 'live' | 'final' (single value)
 *   after_iso   optional — ISO timestamp; only fixtures with kickoff_at >= this
 *   limit       optional — default 200, max 500
 *
 * Response:
 *   { ok: true, fixtures: [...] }
 *
 * Errors map to JSON { error: '...' } with appropriate HTTP status.
 */

import { getSupabaseAdmin } from '../supabaseAdmin.js';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const league = String(req.query?.league || '').trim();
  if (!league) return res.status(400).json({ error: 'league required' });

  const season = String(req.query?.season || '').trim() || null;
  const matchdayRaw = req.query?.matchday;
  const matchday = matchdayRaw != null && matchdayRaw !== '' ? Number(matchdayRaw) : null;
  if (matchday != null && !Number.isInteger(matchday)) {
    return res.status(400).json({ error: 'matchday must be int' });
  }

  const status = String(req.query?.status || '').trim() || null;
  if (status && !['scheduled', 'live', 'final'].includes(status)) {
    return res.status(400).json({ error: "status must be 'scheduled'|'live'|'final'" });
  }

  const afterIso = String(req.query?.after_iso || '').trim() || null;
  if (afterIso && Number.isNaN(Date.parse(afterIso))) {
    return res.status(400).json({ error: 'after_iso must be ISO timestamp' });
  }

  const limit = Math.min(
    Math.max(parseInt(String(req.query?.limit || ''), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const admin = getSupabaseAdmin();
  let q = admin
    .from('fixtures')
    .select(
      'id, league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at, status, home_score, away_score, outcome, p_home, p_draw, p_away, finalized_at',
    )
    .eq('league', league)
    .order('kickoff_at', { ascending: true })
    .limit(limit);

  if (season)        q = q.eq('season', season);
  if (matchday != null) q = q.eq('matchday', matchday);
  if (status)        q = q.eq('status', status);
  if (afterIso)      q = q.gte('kickoff_at', afterIso);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // Edge cache 60s — fixtures change at matchday cadence; clients can re-poll.
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ ok: true, fixtures: data || [] });
}
