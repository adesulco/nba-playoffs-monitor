/**
 * POST /api/pickem?_action=grant-entitlement   (A3 · R2-6 manual path)
 *
 * Manual entitlement grant — admin-token-guarded (same PICKEM_ADMIN_TOKEN
 * pattern as score-fixture). Used for testing the gates before billing
 * lands (R3) and as the IDR stopgap ("transfer + manual grant") if the
 * Midtrans KYB slips. Idempotent on (provider='comp', provider_ref).
 *
 * Headers: x-admin-token: <PICKEM_ADMIN_TOKEN>
 * Body: { user_id, product: 'season_pass'|'lifetime'|'gibol_plus',
 *         competition?, expires_at?, provider_ref? }
 * Response: { ok, entitlement }
 */
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { parseBody } from './league-config.js';

const PRODUCTS = new Set(['season_pass', 'lifetime', 'gibol_plus', 'sponsor_pool']); // D1: sponsor door open

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = req.headers['x-admin-token'];
  if (!process.env.PICKEM_ADMIN_TOKEN || token !== process.env.PICKEM_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const body = parseBody(req);
  if (!body?.user_id) return res.status(400).json({ error: 'user_id required' });
  if (!PRODUCTS.has(body.product)) {
    return res.status(400).json({ error: `product must be one of: ${[...PRODUCTS].join(', ')}` });
  }

  const admin = getSupabaseAdmin();
  const row = {
    user_id: body.user_id,
    product: body.product,
    competition: body.competition || null,
    provider: 'comp',
    provider_ref: body.provider_ref || `manual-${body.user_id}-${body.product}-${body.competition || 'all'}`,
    expires_at: body.expires_at || null,
  };
  const { data, error } = await admin
    .from('entitlements')
    .upsert(row, { onConflict: 'provider,provider_ref' })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true, entitlement: data });
}
