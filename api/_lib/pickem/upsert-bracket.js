/**
 * POST /api/pickem?_action=upsert-bracket
 *
 * Batch-saves a WC bracket (groups + KO winners + champion) to the
 * server in one round-trip. Idempotent: re-running with the same picks
 * is a no-op; replacing picks happens before lock. Auth required.
 *
 * Body:
 *   {
 *     bracket_id?:   uuid       - if present, update existing; else create
 *     competition:   'WC2026',
 *     season?:       string,
 *     groups:        { A: { ARG:1, BRA:2, ... }, B: {...}, ... },
 *     r32:           [{ slot_index, picked_team_code }] × 16,
 *     r16:           [{ slot_index, picked_team_code }] × 8,
 *     qf:            [{ slot_index, picked_team_code }] × 4,
 *     sf:            [{ slot_index, picked_team_code }] × 2,
 *     final:         { picked_team_code },
 *     champion:      { picked_team_code },
 *     lock?:         boolean    - if true, also flip status to 'locked'
 *   }
 *
 * Response:
 *   { ok: true, bracket_id, picks_written, locked, locked_at }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

const GROUP_LETTER_IDX = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11 };
const VALID_KO_KEYS = ['r32', 'r16', 'qf', 'sf'];
const KO_SLOT_TYPE = {
  r32:   'r32_winner',
  r16:   'r16_winner',
  qf:    'qf_winner',
  sf:    'sf_winner',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });

  const competition = String(body.competition || '').trim();
  const season = String(body.season || '2026').trim();
  if (!competition) return res.status(400).json({ error: 'competition required' });
  if (competition.length > 60) return res.status(400).json({ error: 'competition too long' });

  const admin = getSupabaseAdmin();

  // 1. Find or create the bracket for this user + competition + season.
  let bracketId = body.bracket_id;
  let existingBracket = null;
  if (bracketId) {
    const { data } = await admin
      .from('brackets')
      .select('id, user_id, status, competition, season, points_cache, locked_at')
      .eq('id', bracketId)
      .maybeSingle();
    if (!data) return res.status(404).json({ error: 'bracket not found' });
    if (data.user_id !== user.id) return res.status(403).json({ error: 'not your bracket' });
    if (data.status && data.status !== 'open') {
      return res.status(409).json({ error: 'bracket locked' });
    }
    existingBracket = data;
  } else {
    // Look up an open bracket; else create.
    const { data: existing } = await admin
      .from('brackets')
      .select('id, status, locked_at')
      .eq('user_id', user.id)
      .eq('competition', competition)
      .eq('season', season)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      bracketId = existing.id;
      existingBracket = existing;
    } else {
      const { data: created, error: createErr } = await admin
        .from('brackets')
        .insert({
          user_id: user.id,
          competition,
          season,
          status: 'open',
        })
        .select('id, status, locked_at')
        .single();
      if (createErr || !created) {
        return res.status(500).json({ error: createErr?.message || 'create bracket failed' });
      }
      bracketId = created.id;
      existingBracket = created;
    }
  }

  // 2. Build the full pick set from the body.
  const rows = [];

  if (body.groups && typeof body.groups === 'object') {
    for (const [letter, picks] of Object.entries(body.groups)) {
      const groupIdx = GROUP_LETTER_IDX[letter];
      if (groupIdx == null || !picks || typeof picks !== 'object') continue;
      for (const [code, rank] of Object.entries(picks)) {
        if (rank == null) continue;
        const r = Number(rank);
        if (!Number.isInteger(r) || r < 1 || r > 3) continue;
        rows.push({
          bracket_id: bracketId,
          slot_type: 'group_rank',
          slot_index: groupIdx * 3 + r,    // unique per (group, rank)
          picked_team_code: String(code).toUpperCase().slice(0, 3),
        });
      }
    }
  }

  for (const koKey of VALID_KO_KEYS) {
    const arr = body[koKey];
    if (!Array.isArray(arr)) continue;
    arr.forEach((entry, i) => {
      if (!entry?.picked_team_code) return;
      rows.push({
        bracket_id: bracketId,
        slot_type: KO_SLOT_TYPE[koKey],
        slot_index: entry.slot_index != null ? Number(entry.slot_index) : i + 1,
        picked_team_code: String(entry.picked_team_code).toUpperCase().slice(0, 3),
      });
    });
  }

  if (body.final?.picked_team_code) {
    rows.push({
      bracket_id: bracketId,
      slot_type: 'final_winner',
      slot_index: 1,
      picked_team_code: String(body.final.picked_team_code).toUpperCase().slice(0, 3),
    });
  }
  if (body.champion?.picked_team_code) {
    rows.push({
      bracket_id: bracketId,
      slot_type: 'champion',
      slot_index: 1,
      picked_team_code: String(body.champion.picked_team_code).toUpperCase().slice(0, 3),
    });
  }

  // 3. Replace-all strategy — delete WC picks for this bracket, then
  //    insert the new set. Idempotent + survives slot removals.
  const { error: delErr } = await admin
    .from('picks')
    .delete()
    .eq('bracket_id', bracketId)
    .is('series_id', null);
  if (delErr) return res.status(500).json({ error: delErr.message });

  let written = 0;
  if (rows.length) {
    const { error: insErr, count } = await admin
      .from('picks')
      .insert(rows, { count: 'exact' });
    if (insErr) return res.status(500).json({ error: insErr.message });
    written = count ?? rows.length;
  }

  // 4. Optional lock.
  let lockedAt = existingBracket?.locked_at || null;
  let status = existingBracket?.status || 'open';
  if (body.lock === true) {
    const { data: locked, error: lockErr } = await admin
      .from('brackets')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', bracketId)
      .select('status, locked_at')
      .single();
    if (lockErr) return res.status(500).json({ error: lockErr.message });
    status = locked.status;
    lockedAt = locked.locked_at;
  }

  return res.status(200).json({
    ok: true,
    bracket_id: bracketId,
    picks_written: written,
    status,
    locked: status === 'locked',
    locked_at: lockedAt,
  });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return null;
  }
}
