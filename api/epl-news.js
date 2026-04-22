/**
 * /api/epl-news — bilingual Premier League news aggregator (Bahasa + English).
 *
 * Same pattern as /api/f1-news (v0.2.6): fetches RSS feeds per language,
 * parses XML server-side, filters for EPL-relevant items, dedupes, sorts
 * newest-first, returns JSON.
 *
 *   GET /api/epl-news?lang=id         (default)
 *   GET /api/epl-news?lang=en
 *   GET /api/epl-news?lang=id&limit=10
 *
 * Cache: s-maxage=900, stale-while-revalidate=1800 (15 min / 30 min).
 *
 * Sources picked to survive flake: BBC and the Guardian both expose
 * dedicated Premier League RSS feeds (no keyword filtering needed).
 * Bahasa sources are general sports feeds — we filter with a keyword
 * regex that matches league name, the big-6 clubs, and a few famous
 * player surnames.
 */

// EPL-relevant keyword regex for Bahasa general-sports feeds.
// English feeds use dedicated Premier League URLs and skip this filter.
const ID_EPL_KEYWORD = new RegExp(
  '\\b(' + [
    'premier league',
    'liga inggris',
    'liga primer',
    // Big-6 + traditionally-covered clubs
    'arsenal', 'liverpool', 'chelsea', 'tottenham', 'man city', 'manchester city',
    'man utd', 'manchester united', 'man united', 'newcastle', 'aston villa',
    // Household names whose surnames unambiguously identify them
    'haaland', 'salah', 'saka', 'odegaard', 'rice', 'kane', 'son heung',
    'van dijk', 'rashford', 'de bruyne', 'ødegaard',
  ].join('|') + ')\\b',
  'i'
);

const SOURCES = [
  // ── Bahasa Indonesia ─────────────────────────────────────────────────────
  { name: 'detikSport',    url: 'https://sport.detik.com/rss',                lang: 'id', keyword: ID_EPL_KEYWORD },
  { name: 'CNN Indonesia', url: 'https://www.cnnindonesia.com/olahraga/rss',  lang: 'id', keyword: ID_EPL_KEYWORD },
  { name: 'Antara',        url: 'https://www.antaranews.com/rss/olahraga.xml', lang: 'id', keyword: ID_EPL_KEYWORD },

  // ── English ──────────────────────────────────────────────────────────────
  // Dedicated Premier League feeds — no keyword filter needed.
  { name: 'BBC Sport',  url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml',   lang: 'en' },
  { name: 'Guardian',   url: 'https://www.theguardian.com/football/premierleague/rss',           lang: 'en' },
];

// ─── Minimal RSS parser ─────────────────────────────────────────────────────
function parseFeed(xml) {
  const items = [];
  const rssMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);
  for (const m of rssMatches) {
    const body = m[1];
    const title = extractTag(body, 'title');
    const link = extractTag(body, 'link');
    const pubDate = extractTag(body, 'pubDate') || extractTag(body, 'dc:date');
    if (title && link) items.push({ title, url: link, pubDate });
  }
  if (items.length) return items;

  const atomMatches = xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi);
  for (const m of atomMatches) {
    const body = m[1];
    const title = extractTag(body, 'title');
    const linkAttr = body.match(/<link[^>]*href="([^"]+)"[^>]*\/?\s*>/i);
    const link = linkAttr?.[1];
    const pubDate = extractTag(body, 'updated') || extractTag(body, 'published');
    if (title && link) items.push({ title, url: link, pubDate });
  }
  return items;
}

function extractTag(body, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = body.match(re);
  if (!m) return null;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchOne(src, signal) {
  try {
    const r = await fetch(src.url, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; gibol.co/1.0; +https://www.gibol.co/about) Feedfetcher',
        accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
      },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const raw = parseFeed(xml);
    return raw
      .filter((it) => !src.keyword || src.keyword.test(it.title))
      .map((it) => ({
        title: it.title,
        url: it.url,
        source: src.name,
        lang: src.lang,
        pubDate: normaliseDate(it.pubDate),
      }));
  } catch {
    return [];
  }
}

function normaliseDate(s) {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export default async function handler(req, res) {
  const lang = (req.query?.lang || 'id').toString().toLowerCase() === 'en' ? 'en' : 'id';
  const limit = Math.max(5, Math.min(30, Number(req.query?.limit) || 15));

  const chosen = SOURCES.filter((s) => s.lang === lang);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000);

  let items = [];
  try {
    const batches = await Promise.all(chosen.map((s) => fetchOne(s, controller.signal)));
    items = batches.flat();
  } finally {
    clearTimeout(to);
  }

  const seen = new Set();
  items = items.filter((it) => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  items.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  items = items.slice(0, limit);

  if (items.length === 0) {
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      lang,
      updatedAt: new Date().toISOString(),
      items: [],
    });
  }

  res.setHeader('cache-control', 'public, s-maxage=900, stale-while-revalidate=1800');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(200).json({
    lang,
    updatedAt: new Date().toISOString(),
    items,
  });
}
