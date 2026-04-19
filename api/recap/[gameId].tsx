/**
 * GET /api/recap/[gameId]?variant=story|og|square
 *
 * Thin redirect shim — recap PNGs are pre-rendered at build time and served
 * as static assets from /og/. This handler preserves the legacy URL shape
 * (?variant=X) by 302-redirecting to the correct static file.
 *
 * Dynamic @vercel/og generation is deferred until we have a live game feed
 * and a build pipeline to regenerate cards automatically.
 */

export const config = { runtime: 'nodejs' };

const ALLOWED = new Set(['story', 'og', 'square']);

export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const gameId = decodeURIComponent(url.pathname.split('/').pop() || '');
  const variant = url.searchParams.get('variant') || 'story';
  const v = ALLOWED.has(variant) ? variant : 'story';

  if (!gameId) {
    res.statusCode = 404;
    res.end('gameId required');
    return;
  }

  res.statusCode = 302;
  res.setHeader('Location', `/og/${encodeURIComponent(gameId)}-${v}.png`);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.end();
}
