/**
 * POST /api/pickem?_action=update-profile
 *
 * The one write path for the user's own profile (doc 17 §2.3 seam rule —
 * screens never touch Supabase directly). Replaces the four direct
 * `profiles` updates in NicknameNudge4a, Profile, GrupJoin, PredictingHub.
 *
 * Body: { nickname?, favorite_teams?, favorite_team?, city? }
 *   nickname        2–20 chars after trim; the grup-description vocab
 *                   guard applies (no betting words in display names)
 *   favorite_teams  array of ≤ 10 tricodes (3–5 upper-case chars)
 *   favorite_team   one tricode or null
 *   city            ≤ 60 chars or null
 * Response: { ok: true, profile }
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import { parseBody, BANNED_VOCAB } from './league-config.js';

const TRICODE = /^[A-Z0-9]{2,5}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const body = parseBody(req);
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid JSON' });

  const patch = {};
  if ('nickname' in body) {
    const nick = String(body.nickname ?? '').trim();
    if (nick.length < 2 || nick.length > 20) return res.status(400).json({ error: 'nickname must be 2–20 characters' });
    if (BANNED_VOCAB.test(nick)) return res.status(400).json({ error: 'That name is not allowed here' });
    patch.nickname = nick;
  }
  if ('favorite_teams' in body) {
    const list = body.favorite_teams;
    if (list != null && (!Array.isArray(list) || list.length > 10 || !list.every((t) => typeof t === 'string' && TRICODE.test(t)))) {
      return res.status(400).json({ error: 'favorite_teams must be up to 10 tricodes' });
    }
    patch.favorite_teams = list == null ? [] : [...new Set(list)];
  }
  if ('favorite_team' in body) {
    const t = body.favorite_team;
    if (t != null && !(typeof t === 'string' && TRICODE.test(t))) return res.status(400).json({ error: 'favorite_team must be a tricode' });
    patch.favorite_team = t ?? null;
  }
  if ('city' in body) {
    const c = body.city == null ? null : String(body.city).trim().slice(0, 60);
    patch.city = c || null;
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'nothing to update' });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('profiles')
    .upsert({ id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('id, nickname, avatar_url, favorite_teams, favorite_team, city, updated_at')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ ok: true, profile: data });
}
