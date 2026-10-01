/**
 * GET /api/pickem?_action=get-fixture&id=<fixture_id>
 *
 * One fixture with its teams embedded — the same row shape list-fixtures
 * returns. PickSheet used to load four pages of 500 fixtures to find one
 * (audit 2026-10-01); this is the single-row read. Public, cacheable.
 */
import { getSupabaseAdmin } from '../supabaseAdmin.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id = String(req.query?.id || '').trim();
  if (!UUID.test(id)) return res.status(400).json({ error: 'id must be a fixture uuid' });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('fixtures')
    .select(
      'id, league, season, stage, matchday, home_team, away_team, kickoff_at, lock_at, status, home_score, away_score, outcome, finalized_at, home:teams!home_team(tricode, name, city, conference, league, primary_color), away:teams!away_team(tricode, name, city, conference, league, primary_color)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'fixture not found' });

  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({ ok: true, fixture: data });
}
