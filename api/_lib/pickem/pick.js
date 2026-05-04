/**
 * POST /api/pickem/pick
 *
 * Upserts a single pick for a user's bracket. Auth is carried as a
 *   Authorization: Bearer <access_token>
 * header from the Vite SPA — we validate it against Supabase auth and then
 * use the service-role admin client to perform the upsert (so RLS isn't
 * fighting us here, but we enforce ownership + state checks manually).
 *
 * Body:
 *   { bracket_id, series_id, picked_team, picked_games? }
 *
 * Matches the semantics of the Next.js /app/api/pickem/pick/route.ts:
 *   - defence-in-depth: series must not be final, team must be a valid
 *     option (R1 seed list OR a feeder winner OR the user's own feeder pick).
 *   - bracket must belong to the caller AND be in `open` status.
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = req.body && typeof req.body === 'object'
    ? req.body
    : (() => { try { return JSON.parse(req.body || '{}'); } catch { return null; } })();
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const { bracket_id, series_id, picked_team } = body;
  const picked_games = body.picked_games ?? null;

  if (!bracket_id || !series_id || !picked_team) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (picked_games != null) {
    const g = Number(picked_games);
    if (!Number.isInteger(g) || g < 4 || g > 7) {
      return res.status(400).json({ error: 'picked_games must be 4-7' });
    }
  }

  const admin = getSupabaseAdmin();

  // Ownership + state check on the bracket
  const { data: bracket, error: bracketErr } = await admin
    .from('brackets')
    .select('id, user_id, status')
    .eq('id', bracket_id)
    .maybeSingle();
  if (bracketErr) return res.status(400).json({ error: bracketErr.message });
  if (!bracket) return res.status(404).json({ error: 'Bracket not found' });
  if (bracket.user_id !== user.id) return res.status(403).json({ error: 'Not your bracket' });
  if (bracket.status !== 'open') return res.status(409).json({ error: 'Bracket locked' });

  // Series must exist + not already final
  const { data: series } = await admin
    .from('series')
    .select('id, team_high, team_low, feeder_high, feeder_low, winner, status')
    .eq('id', series_id)
    .maybeSingle();
  if (!series) return res.status(404).json({ error: 'Unknown series' });
  if (series.winner) return res.status(409).json({ error: 'Series already final' });

  // Validate picked team — R1 seed list + any feeder winners + user's feeder picks.
  const validTeams = [];
  if (series.team_high) validTeams.push(series.team_high);
  if (series.team_low) validTeams.push(series.team_low);
  const feederIds = [series.feeder_high, series.feeder_low].filter(Boolean);
  if (feederIds.length) {
    const { data: feeders } = await admin
      .from('series')
      .select('id, winner')
      .in('id', feederIds);
    for (const f of feeders || []) {
      if (f.winner) validTeams.push(f.winner);
    }
    const { data: feederPicks } = await admin
      .from('picks')
      .select('series_id, picked_team')
      .eq('bracket_id', bracket_id)
      .in('series_id', feederIds);
    for (const p of feederPicks || []) validTeams.push(p.picked_team);
  }
  if (validTeams.length && !validTeams.includes(picked_team)) {
    return res.status(400).json({ error: 'Team is not a valid option for this series' });
  }

  const { data: upserted, error: upsertErr } = await admin
    .from('picks')
    .upsert(
      {
        bracket_id,
        series_id,
        picked_team,
        picked_games: picked_games ?? null,
      },
      { onConflict: 'bracket_id,series_id' },
    )
    .select()
    .single();

  if (upsertErr) {
    console.error('[pick] upsert failed', upsertErr);
    return res.status(400).json({ error: upsertErr.message });
  }

  return res.status(200).json(upserted);
}
