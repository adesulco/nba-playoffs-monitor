/**
 * Admin-token check shared by every admin-only action (audit 2026-10-01:
 * "admin token compare not timing-safe", and two of three sites accepted the
 * token from the Authorization header as well, which collides with user
 * JWTs on the same dispatcher).
 *
 * One header only — `x-admin-token` — compared with crypto.timingSafeEqual
 * on equal-length buffers. ADMIN_TOKEN is honoured as a legacy alias of
 * PICKEM_ADMIN_TOKEN.
 */
import { timingSafeEqual } from 'node:crypto';

export function isAdminRequest(req) {
  const expected = process.env.PICKEM_ADMIN_TOKEN || process.env.ADMIN_TOKEN || '';
  const provided = req.headers?.['x-admin-token'];
  if (!expected || typeof provided !== 'string' || provided.length === 0) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
