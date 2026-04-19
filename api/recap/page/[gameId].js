/**
 * GET /recap/[gameId] (rewritten from /api/recap/page/[gameId])
 *
 * Returns HTML with proper OG meta so WhatsApp / Twitter / IG link previews
 * show the dynamic recap card. The page itself shows the PNG and has share
 * buttons — keeps v1 simple without a full React route.
 */

export const config = { runtime: 'edge' };

const MOCK_GAMES = {
  '2026-R1-LAL-DEN-G3': {
    headline: 'Lakers unggul 2–1, Denver makin keteteran.',
    title: 'DEN 108 – 112 LAL · Gibol',
    league: 'NBA',
    series: 'Round 1 · Game 3',
    home: 'Lakers',
    away: 'Nuggets',
    scoreHome: 112,
    scoreAway: 108,
  },
};

export default async function handler(req) {
  const url = new URL(req.url, 'http://localhost');
  const gameId = decodeURIComponent(url.pathname.split('/').pop() || '');
  const game = MOCK_GAMES[gameId] || null;

  const title = game ? game.title : 'Recap · Gibol';
  const desc = game ? game.headline : 'Recap NBA · Gibol';
  const origin = 'https://www.gibol.co';
  // Static PNGs pre-rendered at build time and served from public/og/
  const ogUrl = `${origin}/og/${encodeURIComponent(gameId)}-og.png`;
  const storyUrl = `${origin}/og/${encodeURIComponent(gameId)}-story.png`;
  const squareUrl = `${origin}/og/${encodeURIComponent(gameId)}-square.png`;
  const pageUrl = `${origin}/recap/${encodeURIComponent(gameId)}`;
  const waText = encodeURIComponent(`${desc}\n${pageUrl}`);

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="id_ID" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(desc)}" />
<meta property="og:image" content="${ogUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${pageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(desc)}" />
<meta name="twitter:image" content="${ogUrl}" />
<meta name="theme-color" content="#FF5722" />
<link rel="manifest" href="/manifest.webmanifest" />
<style>
  *{box-sizing:border-box} html,body{margin:0;background:#08111f;color:#f4f4f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
  .wrap{max-width:640px;margin:0 auto;padding:24px 16px}
  h1{font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-.4px}
  p.sub{color:#a1a1aa;margin:0 0 20px;font-size:14px}
  .card{border-radius:18px;overflow:hidden;border:1px solid #1a2d4a;background:#0c1a2e}
  .card img{display:block;width:100%;height:auto}
  .cap{padding:12px 14px;font-size:12px;color:#71717a;border-top:1px solid #1a2d4a}
  .actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
  a.btn,button.btn{display:flex;align-items:center;justify-content:center;padding:14px;border-radius:10px;border:1px solid #1a2d4a;background:#0c1a2e;color:#f4f4f5;font-weight:700;text-decoration:none;font-size:14px;cursor:pointer}
  a.wa{background:#10b981;border-color:#10b981;color:#041b12}
  a.ig{background:#FF5722;border-color:#FF5722;color:#0a0a0a}
  .foot{margin-top:24px;text-align:center;color:#71717a;font-size:12px}
  .foot a{color:#FF5722;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(desc)}</p>
  <div class="card">
    <img src="${storyUrl}" alt="${escapeHtml(desc)}" width="1080" height="1920" loading="eager" />
    <div class="cap">Tekan lama pada gambar untuk simpan ke galeri · ukuran IG Story</div>
  </div>
  <div class="actions">
    <a class="btn wa" href="https://wa.me/?text=${waText}" target="_blank" rel="noopener">Share WhatsApp</a>
    <a class="btn ig" href="${storyUrl}" download="gibol-recap-${escapeHtml(gameId)}.png">Download IG Story</a>
  </div>
  <div class="foot">gila bola · <a href="/">gibol.co</a></div>
</div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=3600',
    },
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
