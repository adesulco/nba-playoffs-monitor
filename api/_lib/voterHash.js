/**
 * voter-hash — anonymous-but-stable identifier for engagement primitives.
 *
 * v0.15.0. We never store IPs or user agents — we hash them with a
 * server-side secret + the day-bucket, so the resulting hash:
 *   - dedups same-session votes (same IP/UA on the same day → same hash)
 *   - rotates daily (different day → different hash, no long-term tracking)
 *   - can't be reversed even if the DB leaks (HMAC-SHA256 with secret)
 *
 * If VOTER_HASH_SECRET isn't set, fall back to the supabase service role
 * (it's already secret + present in this env). Not ideal but won't ever
 * be empty in production.
 */

import crypto from 'crypto';

function getSecret() {
  return (
    process.env.VOTER_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'gibol-fallback-not-secure'
  );
}

function todayBucket() {
  // YYYY-MM-DD in UTC. Rotates the hash space at midnight UTC, which is
  // 07:00 WIB — fine for derby polls that close before kick-off.
  return new Date().toISOString().slice(0, 10);
}

export function getVoterHash(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'noip';
  const ua = (req.headers['user-agent'] || 'noua').toString().slice(0, 200);
  const bucket = todayBucket();
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${ip}|${ua}|${bucket}`)
    .digest('hex');
}
