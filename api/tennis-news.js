/**
 * /api/tennis-news — bilingual tennis news aggregator (Bahasa + English).
 *
 * v0.5.0 (Tennis Phase 1A). Mirrors the f1-news shape/handler so the UI can
 * reuse the same component contract. Fetches RSS feeds from reputable sources
 * per language, parses the XML server-side, filters for tennis-relevant items,
 * dedupes, and returns a compact JSON list ready for the TennisNews component.
 *
 * Per project rule (feedback_news_bilingual): the ID dashboard sources real
 * Bahasa feeds and the EN dashboard sources real English feeds. We do NOT
 * machine-translate.
 *
 * Request:
 *   GET /api/tennis-news?lang=id         (default)
 *   GET /api/tennis-news?lang=en
 *   GET /api/tennis-news?lang=id&limit=10
 *
 * Cache: s-maxage=900, stale-while-revalidate=1800 (15 min fresh, 30 min stale).
 */

// ─── Keyword filter for Bahasa general-news feeds ───────────────────────────
// Bahasa general-sport feeds cover everything — we need to scope to tennis.
// Uses word boundaries to avoid false positives (e.g. `atp` could match other
// acronyms). Player surnames are only kept when they're tennis-unique (so we
// include `djokovic` but NOT `williams`, which also collides with football's
// Ashley Williams, etc.).
const ID_TENNIS_KEYWORD = new RegExp(
  '\\b(' + [
    'tenis',                                    // Bahasa generic
    'tennis',                                   // English generic seen in ID outlets
    'wimbledon',
    'roland garros',
    'french open',
    'australian open',
    'us open tenis',                            // disambiguates from golf US Open
    'atp tour',
    'wta tour',
    // Top singles players (tennis-unique surnames only)
    'djokovic','alcaraz','sinner','medvedev','zverev','fritz','rune','rublev',
    'dimitrov','tsitsipas','shelton','draper','musetti',
    'sabalenka','świątek','swiatek','gauff','rybakina','pegula','paolini',
    'navarro','kasatkina','krejčíková','krejcikova','andreeva','muchová','muchova',
    // Indonesian tennis
    'sutjiadi','rungkat','nugroho',
  ].join('|') + ')\\b',
  'i'
);

const EN_TENNIS_KEYWORD = new RegExp(
  '\\b(' + [
    'tennis','wimbledon','roland garros','french open','australian open',
    'atp','wta','grand slam',
    'djokovic','alcaraz','sinner','medvedev','zverev','fritz','rune',
    'rublev','dimitrov','tsitsipas','shelton','draper','musetti',
    'sabalenka','świątek','swiatek','gauff','rybakina','pegula','paolini',
    'navarro','kasatkina','krejčíková','krejcikova','andreeva','muchová','muchova',
    'sutjiadi','rungkat','nugroho',
  ].join('|') + ')\\b',
  'i'
);

const SOURCES = [
  // ── Bahasa Indonesia ─────────────────────────────────────────────────────
  { name: 'detikSport',     url: 'https://sport.detik.com/rss',                 lang: 'id', keyword: ID_TENNIS_KEYWORD },
  { name: 'CNN Indonesia',  url: 'https://www.cnnindonesia.com/olahraga/rss',   lang: 'id', keyword: ID_TENNIS_KEYWORD },
  { name: 'Antara',         url: 'https://www.antaranews.com/rss/olahraga.xml', lang: 'id', keyword: ID_TENNIS_KEYWORD },

  // ── English ──────────────────────────────────────────────────────────────
  { name: 'BBC Sport',      url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml', lang: 'en' },
  { name: 'Reuters',        url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best&best-sectors=tennis', lang: 'en', keyword: EN_TENNIS_KEYWORD },
  { name: 'Tennis.com',     url: 'https://www.tennis.com/rss/news/',              lang: 'en', keyword: EN_TENNIS_KEYWORD },
  // ATPTour.com intentionally excluded — feed returns 403 for non-browser UAs
  // more often than not. BBC + Reuters + Tennis.com is sufficient coverage.
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

  // Empty-but-valid state: most Bahasa outlets go dark between slams. UI
  // renders "Belum ada berita tenis terbaru" rather than erroring.
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
