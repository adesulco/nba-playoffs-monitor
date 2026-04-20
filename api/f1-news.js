/**
 * /api/f1-news — bilingual F1 news aggregator (Bahasa + English).
 *
 * v0.2.6. Fetches RSS feeds from reputable sources per language, parses the
 * XML server-side (no browser RSS dependency), filters for F1-relevant items,
 * dedupes, and returns a compact JSON list ready for the F1News component.
 *
 * Per project rule (feedback_news_bilingual): the ID dashboard must source
 * real Bahasa feeds and the EN dashboard must source real English feeds.
 * We do NOT machine-translate.
 *
 * Request:
 *   GET /api/f1-news?lang=id         (default)
 *   GET /api/f1-news?lang=en
 *   GET /api/f1-news?lang=id&limit=10
 *
 * Response (200):
 *   {
 *     "lang": "id",
 *     "updatedAt": "2026-04-20T09:05:00.000Z",
 *     "items": [
 *       { "title": "...", "url": "https://...", "source": "detikSport",
 *         "pubDate": "2026-04-20T07:00:00.000Z" },
 *       ...
 *     ]
 *   }
 *
 * Cache: s-maxage=900, stale-while-revalidate=1800 (15 min fresh, 30 min stale).
 * That keeps upstream RSS feeds from getting hit per-viewer while still
 * feeling live within a post-race window.
 *
 * Failure mode: if N-1 of N sources fail, we still return the union of what
 * worked. Only 500 if ALL sources failed AND we have zero items.
 */

// ─── Source registry ────────────────────────────────────────────────────────
// Each source: { name, url, lang, keyword? }.
// `keyword` (optional) filters items by title regex — used for general-news
// feeds where we only want F1 stories (e.g. Kompas Olahraga).
const SOURCES = [
  // ── Bahasa Indonesia ─────────────────────────────────────────────────────
  // v0.2.6 hotfix 2026-04-20: three of the four original URLs were dead.
  //   - rss.detik.com/index.php/sport   → connection refused (subdomain moved)
  //   - bola.com/feed/rss2/otomotif      → 301 → feed.bola.com 404
  //   - kompas.com/tag/formula-1/rss     → 404 (Kompas moved tag RSS to indeks.)
  // Replacements below verified live. Added detikOto (motorsport vertical) and
  // Antara (national wire) for resilience; 5 sources means up to 2 can fail
  // silently and the feed still looks populated.
  {
    name: 'detikSport',
    url: 'https://sport.detik.com/rss',
    lang: 'id',
    keyword: /formula ?1|f1|verstappen|hamilton|norris|leclerc|ferrari|mercedes|red bull|mclaren|gp|grand prix|balap/i,
  },
  {
    name: 'detikOto',
    url: 'https://oto.detik.com/rss',
    lang: 'id',
    keyword: /formula ?1|f1|verstappen|hamilton|norris|leclerc|ferrari|mercedes|red bull|mclaren|gp|grand prix/i,
  },
  {
    name: 'CNN Indonesia',
    url: 'https://www.cnnindonesia.com/olahraga/rss',
    lang: 'id',
    keyword: /formula ?1|f1|verstappen|ferrari|mclaren|mercedes|red bull|hamilton|norris|leclerc/i,
  },
  {
    name: 'Kompas.com',
    url: 'https://indeks.kompas.com/tag/formula-1/rss',
    lang: 'id',
  },
  {
    name: 'Antara',
    url: 'https://www.antaranews.com/rss/olahraga.xml',
    lang: 'id',
    keyword: /formula ?1|f1|verstappen|ferrari|mclaren|mercedes|red bull|hamilton|norris|leclerc|gp|grand prix/i,
  },

  // ── English ──────────────────────────────────────────────────────────────
  {
    name: 'Autosport',
    url: 'https://www.autosport.com/rss/feed/f1',
    lang: 'en',
  },
  {
    name: 'Motorsport.com',
    url: 'https://www.motorsport.com/rss/f1/news/',
    lang: 'en',
  },
  {
    name: 'BBC Sport',
    url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml',
    lang: 'en',
  },
  {
    name: 'Formula1.com',
    url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml',
    lang: 'en',
  },
];

// ─── Minimal RSS parser ─────────────────────────────────────────────────────
// No xml2js / fast-xml-parser etc. — we only need <item><title>/<link>/<pubDate>.
// Works for RSS 2.0 (<item>) and Atom (<entry>) feeds.
function parseFeed(xml) {
  const items = [];
  // RSS 2.0
  const rssMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);
  for (const m of rssMatches) {
    const body = m[1];
    const title = extractTag(body, 'title');
    const link = extractTag(body, 'link');
    const pubDate = extractTag(body, 'pubDate') || extractTag(body, 'dc:date');
    if (title && link) items.push({ title, url: link, pubDate });
  }
  if (items.length) return items;

  // Atom fallback
  const atomMatches = xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi);
  for (const m of atomMatches) {
    const body = m[1];
    const title = extractTag(body, 'title');
    // <link href="..." /> in Atom
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
  // Strip CDATA wrapper, decode common entities.
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '') // drop any inner tags
    .trim();
}

// ─── Fetch + filter one source ──────────────────────────────────────────────
async function fetchOne(src, signal) {
  try {
    const r = await fetch(src.url, {
      signal,
      headers: {
        // Mimic a well-known feed reader — some publishers 403 unknown UAs.
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

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const lang = (req.query?.lang || 'id').toString().toLowerCase() === 'en' ? 'en' : 'id';
  const limit = Math.max(5, Math.min(30, Number(req.query?.limit) || 15));

  const chosen = SOURCES.filter((s) => s.lang === lang);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000); // 8s hard timeout across all fetches

  let items = [];
  try {
    const batches = await Promise.all(chosen.map((s) => fetchOne(s, controller.signal)));
    items = batches.flat();
  } finally {
    clearTimeout(to);
  }

  // Dedup by URL (some sources cross-post).
  const seen = new Set();
  items = items.filter((it) => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  // Sort newest-first, cap to `limit`.
  items.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  items = items.slice(0, limit);

  if (items.length === 0) {
    res.setHeader('cache-control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(503).json({
      error: 'all sources failed',
      lang,
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
