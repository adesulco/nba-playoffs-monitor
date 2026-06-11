/**
 * POST /api/pickem?_action=merge-guest   (A3 · R1-2)
 *
 * Batch-merges guest predictions (made pre-login, stored in
 * guestStore.js localStorage) into the authenticated user's account.
 * Dedupe rule (handover §3 A3): SERVER WINS if the fixture is locked,
 * GUEST WINS if it's still open. Lock validation is server-side — a
 * tampered client can't backfill picks into locked fixtures.
 *
 * Body: { predictions: [{ fixture_id, picked_outcome, picked_home?,
 *                          picked_away?, is_jagoan? }] }   (max 100)
 * Response: { ok, merged: n, skipped_locked: n, errors: [...] }
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import { parseBody } from './league-config.js';

const OUTCOMES = new Set(['H', 'D', 'A']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  const list = Array.isArray(body?.predictions) ? body.predictions.slice(0, 100) : null;
  if (!list || list.length === 0) {
    return res.status(400).json({ error: 'predictions array required' });
  }

  const admin = getSupabaseAdmin();
  const ids = [...new Set(list.map((p) => p.fixture_id).filter(Boolean))];
  const { data: fixtures, error: fxErr } = await admin
    .from('fixtures')
    .select('id, league, matchday, lock_at')
    .in('id', ids);
  if (fxErr) return res.status(400).json({ error: fxErr.message });
  const fxById = new Map((fixtures || []).map((f) => [f.id, f]));

  const now = Date.now();
  let merged = 0;
  let skippedLocked = 0;
  const errors = [];

  for (const p of list) {
    const fx = fxById.get(p.fixture_id);
    if (!fx) { errors.push({ fixture_id: p.fixture_id, error: 'unknown fixture' }); continue; }
    if (new Date(fx.lock_at).getTime() <= now) { skippedLocked += 1; continue; } // server wins
    if (!OUTCOMES.has(p.picked_outcome)) {
      errors.push({ fixture_id: p.fixture_id, error: 'bad outcome' });
      continue;
    }
    const row = {
      user_id: user.id,
      fixture_id: fx.id,
      league: fx.league,
      matchday: fx.matchday,
      picked_outcome: p.picked_outcome,
      picked_home: Number.isInteger(p.picked_home) && p.picked_home >= 0 && p.picked_home <= 300 ? p.picked_home : null,
      picked_away: Number.isInteger(p.picked_away) && p.picked_away >= 0 && p.picked_away <= 300 ? p.picked_away : null,
      // is_jagoan deliberately NOT merged — the one-jagoan-per-matchday
      // partial unique index could reject the batch; the user re-stars
      // their jagoan post-login (one tap, and it's an intentional act).
    };
    const { error } = await admin
      .from('predictions')
      .upsert(row, { onConflict: 'user_id,fixture_id' });
    if (error) errors.push({ fixture_id: fx.id, error: error.message });
    else merged += 1;
  }

  return res.status(200).json({ ok: true, merged, skipped_locked: skippedLocked, errors });
}
