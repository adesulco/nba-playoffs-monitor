/**
 * GET /g/:code for link crawlers (rewritten from /api/g/:code).
 *
 * WHY THIS EXISTS
 * ---------------
 * `/g/:code` rewrites to the static SPA shell, and crawlers don't execute
 * JS — so the <SEO> tags InviteLanding.jsx sets at runtime were never seen.
 * Sharing a grup invite on WhatsApp previewed "Skor Live NBA · F1 · Liga
 * Inggris" with the generic site image: someone sends "join my grup" and the
 * recipient sees a live-scores ad. The invite IS the acquisition loop, so
 * that was the most expensive broken thing on the site.
 *
 * Only crawlers reach this handler — vercel.json routes here on a
 * user-agent `has` condition, so human traffic keeps hitting the SPA and the
 * live invite flow is untouched. Same shape as api/recap/page/[gameId].js.
 *
 * The og:image points at the g4-invite share card at its 1200×630 crop
 * (`size=og`) — link unfurls are landscape; the 1080² crop is for a human
 * pasting the image itself into a chat.
 */

export const config = { runtime: 'edge' };

const ORIGIN = 'https://www.gibol.co';

/**
 * Human labels for competition keys. The edge runtime can't import the
 * client-side COMPETITIONS registry, and `league-detail` returns the raw key
 * — which put a literal "AFF2026" on the invite card, the single most-shared
 * image we produce. Unknown keys fall through to no season line at all,
 * because a blank line reads better than a slug.
 */
const COMPETITION_LABELS = {
  AFF2026: 'Piala AFF 2026',
  WC2026: 'Piala Dunia 2026',
  'EPL-2026-27': 'Liga Inggris 2026/27',
  'NBA-Playoffs-2026': 'NBA Playoff 2026',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // Vercel supplies the segment as ?code=… on the rewrite; fall back to the
  // path so the endpoint is still testable by hand.
  const code = url.searchParams.get('code') || url.pathname.split('/').filter(Boolean).pop() || '';

  const league = await fetchLeague(code);

  // A dead or mistyped code still has to unfurl as something sane — a
  // crawler must never see a 404 card for a link a human is about to open.
  const name = league?.name || 'Grup Pick’em';
  const members = league?.member_count ?? 0;
  const inviter = league?.members?.[0]?.display_name || '';
  const seasonLabel = COMPETITION_LABELS[league?.competition] || '';

  const title = inviter
    ? `${inviter} ngajak kamu ke ${name}`
    : `Gabung ${name} di gibol.co`;
  const desc = members
    ? `${members} orang udah gabung. Pick tiga tap, gratis — semua demi gengsi.`
    : 'Pick tiga tap, gratis — semua demi gengsi.';

  const pageUrl = `${ORIGIN}/g/${encodeURIComponent(code)}`;
  const ogImage =
    `${ORIGIN}/api/og-recap?type=g4-invite&size=og` +
    `&grup=${encodeURIComponent(name)}` +
    `&members=${encodeURIComponent(String(members))}` +
    `&code=${encodeURIComponent(code)}` +
    (seasonLabel ? `&season=${encodeURIComponent(seasonLabel)}` : '');

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="gibol.co" />
<meta property="og:locale" content="id_ID" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<link rel="canonical" href="${esc(pageUrl)}" />
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<p><a href="${esc(pageUrl)}">Buka undangan</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short edge TTL: member_count changes as people join, and a stale
      // "3 orang udah gabung" on a growing grup reads as dead.
      'cache-control': 'public, s-maxage=120, stale-while-revalidate=600',
    },
  });
}

async function fetchLeague(code) {
  if (!code) return null;
  try {
    const res = await fetch(
      `${ORIGIN}/api/pickem?_action=league-detail&code=${encodeURIComponent(code)}`,
      { headers: { accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !data.league) return null;
    return { ...data.league, members: data.members || [] };
  } catch {
    // Never fail the unfurl on a lookup error — generic copy beats no card.
    return null;
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
