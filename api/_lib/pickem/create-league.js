/**
 * POST /api/pickem/create-league
 *
 * Creates a grup ("league" in DB; "grup" in product copy per
 * Pickem-Gamification-Spec §10) owned by the authenticated user. The
 * invite_code is generated server-side. Owner is auto-attached as a
 * league_members row with their most recent bracket (legacy NBA flow).
 *
 * v0.68.0 — extended for Pick'em P3 with the new columns added in
 * migration 0015 (visibility / competition / enabled_modes / theme /
 * color). All new fields are optional; omit them and the DB defaults
 * kick in. Backward compat: the legacy LeagueNew.jsx page sends only
 * { name } and continues to work unchanged.
 *
 * Body:
 *   {
 *     name:           string (required, 2-60 chars),
 *     visibility?:    'private' | 'public',
 *     competition?:   'WC2026' | …            // Pickem competition key
 *     enabled_modes?: { match, jagoan, upset, bracket, survivor },
 *     theme?:         string,                 // e.g. 'garuda-faithful'
 *     color?:         string,                 // hex, e.g. '#F59E0B'
 *   }
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';

const VALID_VISIBILITY = new Set(['private', 'public']);
const VALID_MODE_KEYS = new Set(['match', 'jagoan', 'upset', 'bracket', 'survivor']);
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'Nama liga 2–60 karakter.' });
  }

  // Optional P3 fields — validate each individually so a bad enabled_modes
  // doesn't silently degrade to the default.
  const insertRow = { owner_id: user.id, name };

  if (body.visibility != null) {
    if (!VALID_VISIBILITY.has(body.visibility)) {
      return res.status(400).json({ error: "visibility must be 'private' or 'public'" });
    }
    insertRow.visibility = body.visibility;
  }

  if (body.competition != null) {
    const comp = String(body.competition).trim();
    if (comp.length < 1 || comp.length > 60) {
      return res.status(400).json({ error: 'competition must be 1-60 chars' });
    }
    insertRow.competition = comp;
  }

  if (body.enabled_modes != null) {
    if (typeof body.enabled_modes !== 'object' || Array.isArray(body.enabled_modes)) {
      return res.status(400).json({ error: 'enabled_modes must be an object' });
    }
    const cleaned = {};
    for (const [k, v] of Object.entries(body.enabled_modes)) {
      if (!VALID_MODE_KEYS.has(k)) {
        return res.status(400).json({
          error: `Unknown mode key '${k}'. Allowed: ${[...VALID_MODE_KEYS].join(', ')}`,
        });
      }
      cleaned[k] = v === true;
    }
    insertRow.enabled_modes = cleaned;
  }

  if (body.theme != null) {
    const t = String(body.theme).trim();
    if (t.length > 40) return res.status(400).json({ error: 'theme too long' });
    if (t) insertRow.theme = t;
  }

  if (body.color != null) {
    const c = String(body.color).trim();
    if (c && !HEX_RE.test(c)) return res.status(400).json({ error: 'color must be hex #RRGGBB' });
    if (c) insertRow.color = c;
  }

  const admin = getSupabaseAdmin();

  const { data: league, error } = await admin
    .from('leagues')
    .insert(insertRow)
    .select('id, invite_code, visibility, competition, enabled_modes, theme, color')
    .single();
  if (error || !league) {
    console.error('[create-league] insert failed', error);
    return res.status(400).json({ error: error?.message || 'Failed' });
  }

  // Owner auto-joins. Attach the most-recent 2026 bracket if one exists
  // (legacy NBA-flow); harmless for a Pick'em-only grup since bracket_id
  // is nullable.
  const { data: bracketRow } = await admin
    .from('brackets')
    .select('id')
    .eq('user_id', user.id)
    .eq('season', '2026')
    .order('updated_at', { ascending: false })
    .limit(1);

  await admin.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    bracket_id: bracketRow?.[0]?.id ?? null,
  });

  return res.status(200).json({
    id: league.id,
    invite_code: league.invite_code,
    visibility: league.visibility,
    competition: league.competition,
    enabled_modes: league.enabled_modes,
    theme: league.theme,
    color: league.color,
  });
}
