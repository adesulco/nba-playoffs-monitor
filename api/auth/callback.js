/**
 * GET /api/auth/callback?code=xxx
 *
 * In the Next.js source this did a server-side exchangeCodeForSession and
 * set a session cookie. In the Vite SPA we do the exchange client-side
 * (see src/pages/AuthCallback.jsx + supabase.js with detectSessionInUrl: true).
 *
 * This function exists for two reasons:
 *   1. Backwards-compat with any Supabase project configured to redirect to
 *      /api/auth/callback — we 302 to /auth/callback so the SPA picks it up.
 *   2. Makes the contract explicit for ops who look at this directory.
 *
 * It never creates a session on its own and never reads the service-role key.
 */

export default function handler(req, res) {
  const u = new URL(req.url, `https://${req.headers.host || 'www.gibol.co'}`);
  const code = u.searchParams.get('code') || '';
  const next = u.searchParams.get('next') || '/bracket';
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : '/bracket';

  const qs = new URLSearchParams();
  if (code) qs.set('code', code);
  if (safeNext) qs.set('next', safeNext);

  const dest = `/auth/callback${qs.toString() ? `?${qs.toString()}` : ''}`;
  res.setHeader('Location', dest);
  res.status(302).end();
}
