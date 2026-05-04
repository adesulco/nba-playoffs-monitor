/**
 * Per-game recap card endpoint — v0.12.0 Theme A.
 *
 *   GET /api/recap/:gameId           → 1200×630 (og default)
 *   GET /api/recap/:gameId?v=og      → 1200×630
 *   GET /api/recap/:gameId?v=story   → 1080×1920
 *   GET /api/recap/:gameId?v=square  → 1080×1080
 *
 * Five visual enhancements (A–E) land on top of the static template
 * the Python script ships:
 *   A — fixed contrast on verdict body, stat-line, footer tagline
 *   B — quarter-by-quarter score row under main scores
 *   C — smarter status pill: FINAL · LAL leads 2-1 / LIVE · Q3 5:23
 *   D — top-3 stat-leaders strip filling the OG variant's right half
 *   E — win-probability bar (live during in-progress games)
 *
 * Cache by game state (amendment §10.4):
 *   live → s-maxage=10, stale-while-revalidate=30
 *   post → s-maxage=300, stale-while-revalidate=86400
 *   pre  → s-maxage=60, stale-while-revalidate=300
 *
 * Backward-compat: legacy callers (src/lib/share.js buildNBARecapPngUrl)
 * pass URL-encoded params (winner/loser/winScore/etc.). When ESPN fetch
 * fails AND those query params are present, we render from those
 * directly — preserves v0.9.x share-button behavior.
 *
 * Runtime: Edge (@vercel/og handles SVG → PNG inside the Edge runtime).
 * Edge functions don't count toward the Hobby 12-function limit, and
 * the previous version of this endpoint was already Edge.
 */

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';
import { buildCard } from '../og/_layout.js';
import { fetchGame, fallbackGame } from '../og/_game.js';

const SIZES = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

// Fonts — fetched once per Edge instance via HTTP from /og/_fonts/.
// Static-weight TTFs (latin subset, ~58 KB each) from fontsource CDN
// shipped via public/og/_fonts/. Variable fonts triggered a Satori
// "Cannot read properties of undefined (reading '272')" crash; static
// per-weight files render cleanly.
//
// Registration: each TTF maps to ONE Satori weight slot, matching the
// CSS `font-weight` values used in the layout (500, 600, 700). Satori
// picks the closest match when the layout asks for an unregistered
// weight (400, 800), so we cover the full layout vocabulary with three
// Inter Tight files + two JetBrains Mono files.
let cachedFonts = null;
async function loadFonts(origin) {
  if (cachedFonts) return cachedFonts;
  const base = origin || 'https://www.gibol.co';
  const fetchTtf = (file) => fetch(`${base}/og/_fonts/${file}`).then((r) => {
    if (!r.ok) throw new Error(`font fetch failed: ${file} ${r.status}`);
    return r.arrayBuffer();
  });
  const [interMed, interSemi, interBold, jbmMed, jbmBold] = await Promise.all([
    fetchTtf('InterTight-Medium.ttf'),
    fetchTtf('InterTight-SemiBold.ttf'),
    fetchTtf('InterTight-Bold.ttf'),
    fetchTtf('JetBrainsMono-Medium.ttf'),
    fetchTtf('JetBrainsMono-Bold.ttf'),
  ]);
  cachedFonts = [
    { name: 'Inter Tight', data: interMed, weight: 500, style: 'normal' },
    { name: 'Inter Tight', data: interSemi, weight: 600, style: 'normal' },
    { name: 'Inter Tight', data: interBold, weight: 700, style: 'normal' },
    // Map 800 to bold (Satori picks closest registered weight)
    { name: 'Inter Tight', data: interBold, weight: 800, style: 'normal' },
    { name: 'JetBrains Mono', data: jbmMed, weight: 500, style: 'normal' },
    { name: 'JetBrains Mono', data: jbmBold, weight: 700, style: 'normal' },
  ];
  return cachedFonts;
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    let gameId = decodeURIComponent(pathParts[pathParts.length - 1] || '')
      .replace(/\.png$/i, '')
      .replace(/\.jpg$/i, '');
    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawVariant = url.searchParams.get('variant') || url.searchParams.get('v') || 'og';
    const variant = ['og', 'story', 'square'].includes(rawVariant) ? rawVariant : 'og';
    const size = SIZES[variant];

    const origin = `${url.protocol}//${url.host}`;
    let game = await fetchGame(gameId, { origin });

    if (!game) {
      const winner = url.searchParams.get('winner');
      const winScore = url.searchParams.get('winScore');
      if (winner || winScore != null) {
        game = legacyGameFromQuery(url.searchParams, gameId);
      }
    }
    if (!game) game = fallbackGame(gameId);

    const tree = buildCard(game, variant);
    const fonts = await loadFonts(origin);

    let cacheControl;
    if (game.status === 'in') {
      cacheControl = 'public, s-maxage=10, stale-while-revalidate=30';
    } else if (game.status === 'post') {
      cacheControl = 'public, s-maxage=300, stale-while-revalidate=86400';
    } else {
      cacheControl = 'public, s-maxage=60, stale-while-revalidate=300';
    }

    return new ImageResponse(tree, {
      width: size.width,
      height: size.height,
      fonts,
      headers: {
        'Cache-Control': cacheControl,
        'X-Game-Status': game.status,
        'X-Card-Variant': variant,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'render_failed', detail: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=10' } },
    );
  }
}

/**
 * Fallback game shape built from URL-encoded query params — preserves
 * the v0.9.x share-button behavior when ESPN can't be reached. Only
 * used when fetchGame() returns null. Accepts a URLSearchParams instance
 * (Edge runtime).
 */
function legacyGameFromQuery(q, gameId) {
  const winner = String(q.get('winner') || '').toUpperCase();
  const loser = String(q.get('loser') || '').toUpperCase();
  const winScore = parseInt(q.get('winScore'), 10);
  const loseScore = parseInt(q.get('loseScore'), 10);
  if (!winner || Number.isNaN(winScore)) return null;
  const winColor = sanitizeHex(q.get('winColor')) || '#FF5722';
  const loseColor = sanitizeHex(q.get('loseColor')) || '#71717A';
  const home = { tri: winner, name: winner, color: winColor, score: winScore };
  const away = { tri: loser || '—', name: loser || 'Loser', color: loseColor, score: Number.isFinite(loseScore) ? loseScore : null };
  const leaders = [];
  const top = q.get('top');
  if (top) {
    const parts = [];
    const topPts = q.get('topPts'); if (topPts) parts.push(`${topPts} pts`);
    const topReb = q.get('topReb'); if (topReb) parts.push(`${topReb} reb`);
    const topAst = q.get('topAst'); if (topAst) parts.push(`${topAst} ast`);
    leaders.push({
      team: String(q.get('topTeam') || winner).toUpperCase(),
      name: String(top),
      statline: parts.join(' · '),
    });
  }
  return {
    id: gameId,
    league: 'NBA',
    series: 'Playoff',
    status: 'post',
    statusDetail: 'Final',
    seriesRecord: null,
    home,
    away,
    quarters: [],
    winProb: null,
    leaders,
    verdict: null,
  };
}

function sanitizeHex(v) {
  if (typeof v !== 'string') return null;
  const s = v.startsWith('#') ? v : `#${v}`;
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : null;
}
