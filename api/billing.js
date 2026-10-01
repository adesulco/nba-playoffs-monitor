/**
 * /api/billing — Midtrans Snap (S4, doc 17 §3). Own Node function (9/12).
 *
 *   POST ?_action=create-order   { product, competition? }   auth required
 *     → { ok, order_id, token, redirect_url }   (Snap transaction)
 *   POST ?_action=webhook        Midtrans HTTP notification (no auth header;
 *     the body carries signature_key = sha512(order_id + status_code +
 *     gross_amount + SERVER_KEY))
 *     → upserts public.entitlements with provider 'midtrans' and
 *       provider_ref = order_id; the unique index on (provider, provider_ref)
 *       makes every retry idempotent
 *   GET  ?_action=status&order_id=…   auth required → the entitlement if any
 *
 * Until MIDTRANS_SERVER_KEY is set (KYB), every action answers 503
 * `billing_not_configured` and the upgrade sheet keeps using VITE_ORDER_URL.
 * Prices come from src/pickem/pricing.js; the order_id encodes product and
 * competition so the webhook needs no lookup table.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin, getUserFromAuthHeader } from './_lib/supabaseAdmin.js';
import { PRICING } from '../src/pickem/pricing.js';

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_ENV === 'production';
const SNAP_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const SITE = 'https://www.gibol.co';

const PRODUCTS = {
  season_pass: PRICING.season,
  lifetime: PRICING.lifetime,
  gibol_plus: PRICING.plus,
};

export default async function handler(req, res) {
  const action = String(req.query?._action || '').trim().toLowerCase();
  if (!SERVER_KEY) {
    return res.status(503).json({ error: 'billing_not_configured', order_url: PRICING.orderUrl || null });
  }
  switch (action) {
    case 'create-order': return createOrder(req, res);
    case 'webhook':      return webhook(req, res);
    case 'status':       return status(req, res);
    default:
      return res.status(400).json({ error: 'unknown_action', allowed: ['create-order', 'webhook', 'status'] });
  }
}

// order_id: gb-<product>-<competition|all>-<base36 time>-<4 random hex>
function makeOrderId(product, competition) {
  const comp = (competition || 'all').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  return `gb-${product}-${comp}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
}
function parseOrderId(orderId) {
  const m = /^gb-(season_pass|lifetime|gibol_plus)-([A-Za-z0-9]+)-[0-9a-z]+-[0-9a-f]{4}$/.exec(String(orderId || ''));
  if (!m) return null;
  return { product: m[1], competition: m[2] === 'all' ? null : m[2] };
}

async function createOrder(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const body = parseBody(req);
  const spec = body && PRODUCTS[body.product];
  if (!spec) return res.status(400).json({ error: `product must be one of: ${Object.keys(PRODUCTS).join(', ')}` });
  const competition = spec.product === 'lifetime' ? null : (String(body.competition || '').trim() || null);
  if (spec.product === 'season_pass' && !competition) return res.status(400).json({ error: 'competition required for a season pass' });

  // Competition keys contain '-' which the order_id grammar strips; keep the
  // original in the webhook-safe `custom_field1` for the entitlement row.
  const order_id = makeOrderId(spec.product, competition);
  const payload = {
    transaction_details: { order_id, gross_amount: spec.amount },
    item_details: [{ id: spec.product, price: spec.amount, quantity: 1, name: `Gibol ${spec.label.en}` }],
    customer_details: { email: user.email || undefined },
    custom_field1: competition || '',
    custom_field2: user.id,
    callbacks: { finish: `${SITE}/profil?order=${order_id}` },
  };
  const r = await fetch(SNAP_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return res.status(502).json({ error: 'midtrans', detail: data?.error_messages || data?.status_message || r.status });
  return res.status(200).json({ ok: true, order_id, token: data.token, redirect_url: data.redirect_url });
}

async function webhook(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const n = parseBody(req);
  if (!n?.order_id || !n?.status_code || n?.gross_amount == null || !n?.signature_key) {
    return res.status(400).json({ error: 'malformed notification' });
  }
  const expected = createHash('sha512').update(`${n.order_id}${n.status_code}${n.gross_amount}${SERVER_KEY}`).digest('hex');
  if (expected !== String(n.signature_key)) return res.status(401).json({ error: 'bad signature' });

  const parsed = parseOrderId(n.order_id);
  if (!parsed) return res.status(400).json({ error: 'unknown order_id grammar' });
  const settled = ['settlement', 'capture'].includes(n.transaction_status) && (n.fraud_status == null || n.fraud_status === 'accept');
  const userId = n.custom_field2 || null;
  if (!settled) return res.status(200).json({ ok: true, ignored: n.transaction_status });
  if (!userId) return res.status(400).json({ error: 'notification carries no user (custom_field2)' });

  const expires = parsed.product === 'gibol_plus' ? new Date(Date.now() + 31 * 86400000).toISOString() : null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('entitlements')
    .upsert({
      user_id: userId,
      product: parsed.product,
      competition: n.custom_field1 || parsed.competition,
      provider: 'midtrans',
      provider_ref: n.order_id,     // (provider, provider_ref) is unique → idempotent on retries
      expires_at: expires,
    }, { onConflict: 'provider,provider_ref' })
    .select('id, user_id, product, competition')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // A paid Season Pass lifts the cap for every grup this user owns on the competition.
  if (parsed.product !== 'gibol_plus') {
    let q = admin.from('leagues').update({ tier: parsed.product === 'lifetime' ? 'lifetime' : 'season' }).eq('owner_id', userId);
    if (data.competition) q = q.eq('competition', data.competition);
    await q;
  }
  return res.status(200).json({ ok: true, entitlement: data });
}

async function status(req, res) {
  const user = await getUserFromAuthHeader(req.headers.authorization || req.headers.Authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const orderId = String(req.query?.order_id || '').trim();
  if (!orderId) return res.status(400).json({ error: 'order_id required' });
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('entitlements').select('id, product, competition, expires_at, created_at')
    .eq('user_id', user.id).eq('provider', 'midtrans').eq('provider_ref', orderId).maybeSingle();
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ ok: true, entitlement: data || null });
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return null; }
}
