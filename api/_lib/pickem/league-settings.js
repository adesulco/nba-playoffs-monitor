/**
 * POST /api/pickem?_action=update-league-settings  (A3 · R1-1)
 *
 * Commissioner-only update of a grup's pool config: scoring_config,
 * formats, late_join_policy. Rejected once play has started for this
 * league's competition (any fixture with lock_at <= now) — rules freeze
 * at first lock so scores stay explainable; commissioners set rules at
 * creation.
 *
 * Body: { league_id, scoring_config?, formats?, late_join_policy? }
 * Response: { ok: true, league: {...} }
 */
import { getSupabaseAdmin, getUserFromAuthHeader } from '../supabaseAdmin.js';
import {
  validateScoringConfig, validateFormats, validateLateJoinPolicy, parseBody,
} from './league-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const body = parseBody(req);
  if (!body?.league_id) return res.status(400).json({ error: 'league_id required' });

  const admin = getSupabaseAdmin();
  const { data: league } = await admin
    .from('leagues')
    .select('id, owner_id, competition')
    .eq('id', body.league_id)
    .maybeSingle();
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.owner_id !== user.id) {
    return res.status(403).json({ error: 'Only the commissioner can change settings' });
  }

  // Rules freeze: any locked fixture in this competition = play started.
  if (league.competition) {
    const { count } = await admin
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('league', league.competition)
      .lte('lock_at', new Date().toISOString());
    if ((count ?? 0) > 0 && body.scoring_config !== undefined) {
      return res.status(409).json({
        error: 'Scoring rules are locked — play has started for this competition.',
        error_id: 'Aturan skor terkunci — kompetisi sudah mulai.',
      });
    }
  }

  const patch = {};
  for (const [field, validator] of [
    ['scoring_config', validateScoringConfig],
    ['formats', validateFormats],
    ['late_join_policy', validateLateJoinPolicy],
  ]) {
    if (body[field] !== undefined) {
      const v = validator(body[field]);
      if (!v.ok) return res.status(400).json({ error: v.error });
      patch[field] = v.value;
    }
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data, error } = await admin
    .from('leagues')
    .update(patch)
    .eq('id', league.id)
    .select('id, name, invite_code, competition, scoring_config, formats, late_join_policy, max_members, tier')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true, league: data });
}
