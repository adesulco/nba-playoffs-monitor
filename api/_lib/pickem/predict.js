/**
 * POST /api/pickem?_action=upsert-prediction
 *
 * Upserts a match prediction for the authenticated user. The fixture must
 * still be open (lock_at > now()). If is_jagoan=true, any other prediction
 * the user has on the SAME (competition, matchday) gets its is_jagoan
 * cleared (spec §5.2: "exactly one fixture as their Jagoan" per matchday).
 *
 * Auth: Authorization: Bearer <access_token> (the SPA's Supabase session).
 *
 * Body:
 *   { fixture_id, picked_outcome, picked_home?, picked_away?, is_jagoan? }
 *
 * Response:
 *   { ok: true, prediction: {...} }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

const OUTCOMES = new Set(['H', 'D', 'A']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { fixture_id, picked_outcome } = body;
  if (!fixture_id) return res.status(400).json({ error: 'fixture_id required' });
  if (!picked_outcome || !OUTCOMES.has(picked_outcome)) {
    return res.status(400).json({ error: "picked_outcome must be 'H'|'D'|'A'" });
  }

  const picked_home = body.picked_home != null ? Number(body.picked_home) : null;
  const picked_away = body.picked_away != null ? Number(body.picked_away) : null;
  if ((picked_home == null) !== (picked_away == null)) {
    return res.status(400).json({ error: 'picked_home and picked_away must both be set or both null' });
  }
  // v0.79.6 — was capped at 99 (soccer-safe), broke for NBA (100+).
  // Match the score-fixture cap at 300 — sanity bound that catches
  // typos but admits any real sport's final score.
  for (const v of [picked_home, picked_away]) {
    if (v != null && (!Number.isInteger(v) || v < 0 || v > 300)) {
      return res.status(400).json({ error: 'scores must be integers 0..300' });
    }
  }

  // Optional exact-score must be CONSISTENT with picked_outcome — block
  // contradictory submissions (predicting Home win + entering 0–2).
  if (picked_home != null && picked_away != null) {
    const impliedOutcome =
      picked_home > picked_away ? 'H' : picked_home < picked_away ? 'A' : 'D';
    if (impliedOutcome !== picked_outcome) {
      return res.status(400).json({
        error: 'picked_outcome inconsistent with picked_home/picked_away',
      });
    }
  }

  const is_jagoan = body.is_jagoan === true;

  const admin = getSupabaseAdmin();

  // Lock-state check + league/matchday lookup in one query.
  const { data: fx, error: fxErr } = await admin
    .from('fixtures')
    .select('id, league, matchday, lock_at, status')
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

  // If marking as Jagoan, clear any other Jagoan on this (user, league, matchday).
  if (is_jagoan) {
    // Find the other fixture IDs on this matchday + league.
    const { data: matchdayFixtures } = await admin
      .from('fixtures')
      .select('id')
      .eq('league', fx.league)
      .eq('matchday', fx.matchday);
    const ids = (matchdayFixtures || []).map((r) => r.id).filter((id) => id !== fixture_id);
    if (ids.length) {
      const { error: clearErr } = await admin
        .from('predictions')
        .update({ is_jagoan: false })
        .eq('user_id', user.id)
        .in('fixture_id', ids);
      if (clearErr) return res.status(500).json({ error: clearErr.message });
    }
  }

  // Upsert the prediction on (user_id, fixture_id).
  const row = {
    user_id:         user.id,
    fixture_id:      fixture_id,
    league:          fx.league,
    picked_outcome,
    picked_home,
    picked_away,
    is_jagoan,
  };
  const { data: upserted, error: upErr } = await admin
    .from('predictions')
    .upsert(row, { onConflict: 'user_id,fixture_id' })
    .select(
      'id, user_id, fixture_id, league, picked_outcome, picked_home, picked_away, is_jagoan, awarded_points, base_points, jagoan_mult_applied, upset_mult_applied, grup_bonus_points, created_at, scored_at',
    )
    .maybeSingle();
  if (upErr) return res.status(500).json({ error: upErr.message });

  return res.status(200).json({ ok: true, prediction: upserted });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return null;
  }
}
