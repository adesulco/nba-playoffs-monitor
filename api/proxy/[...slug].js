/**
 * Edge-cached multi-provider proxy — multi-sport build plan §2.2.
 *
 * v0.2.3 fix: flattened from api/proxy/[provider]/[...path].js to
 * api/proxy/[...slug].js. Reason: Vercel's classic (non-Next.js) function
 * router drops the [...path] capture when it's nested under another dynamic
 * segment. Symptom: /api/proxy/jolpica-f1/2026.json was calling upstream
 * without the year, returning 1950 race data and causing the F1 calendar to
 * show historical dates. Single-level catch-all works correctly.
 *
 * Why this exists:
 *   - API-Football (Phase 4, Liga 1) ships a paid key that MUST NOT reach the
 *     browser. A server proxy is the only safe way.
 *   - ESPN / Polymarket / OpenF1 / Jolpica hosted endpoints get hit by every
 *     browser × poll frequency × live-window concurrency. Without edge cache,
 *     one viral share = easy rate-limit. With `s-maxage` headers below, N users
 *     in 20s cost 1 upstream request instead of N.
 *   - Observability: one place to see which provider is flaky.
 *
 * Usage from the browser (unchanged — URL structure is identical):
 *   fetch('/api/proxy/polymarket-gamma/events?slug=2026-nba-champion')
 *   fetch('/api/proxy/espn/basketball/nba/scoreboard')
 *   fetch('/api/proxy/openf1/drivers?session_key=latest')
 *   fetch('/api/proxy/jolpica-f1/2026/driverStandings.json')
 *
 * The first path segment after /api/proxy/ selects the upstream via the
 * whitelist in PROVIDERS below. Unknown providers → 404. Query string is
 * passed through (minus the Next.js-style `slug` synthetic key).
 *
 * NOTE: NBA hooks still talk to ESPN/Polymarket directly in v0.2.0. The
 * migration through this proxy lands per-sport as each phase ships — so a
 * broken proxy change can't take down the live NBA dashboard during the
 * playoff window.
 */

// ─── Provider registry ───────────────────────────────────────────────────────
// Each entry: base URL, optional header factory that runs server-side (safe to
// read process.env), and the default edge cache TTL in seconds.
const PROVIDERS = {
  // NBA / basketball (ESPN unofficial — no key required, no formal ToS)
  'espn': {
    base: 'https://site.api.espn.com/apis/site/v2/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,              // live windows dominate; 20s edge cache is a good default
  },
  'espn-core': {
    base: 'https://sports.core.api.espn.com/v2/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,
  },

  // Polymarket — Gamma (markets/events metadata) + CLOB (price history)
  'polymarket-gamma': {
    base: 'https://gamma-api.polymarket.com',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,
  },
  'polymarket-clob': {
    base: 'https://clob.polymarket.com',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 300,             // price-history sparklines — 5 min is plenty
  },

  // Formula 1 — OpenF1 (real-time) + Jolpica (historical, Ergast successor)
  'openf1': {
    base: 'https://api.openf1.org/v1',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 15,              // live positions / intervals — keep tight during sessions
  },
  'jolpica-f1': {
    base: 'https://api.jolpi.ca/ergast/f1',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 3600,            // standings / calendar — slow-moving
  },

  // Soccer — free tiers
  'football-data': {
    base: 'https://api.football-data.org/v4',
    headers: (env) => ({
      accept: 'application/json',
      'X-Auth-Token': env.FOOTBALL_DATA_TOKEN || '',
    }),
    cacheS: 300,             // 5 min is fine; their free tier rate limit is strict
  },

  // Phase 4 only — API-Football (paid, NEVER expose key in browser)
  'api-football': {
    base: 'https://v3.football.api-sports.io',
    headers: (env) => ({
      accept: 'application/json',
      'x-apisports-key': env.API_FOOTBALL_KEY || '',
    }),
    cacheS: 60,              // live Liga 1 match polling
  },
};

// Per-path-prefix TTL overrides (tuned for the multi-sport build plan §2.2):
//   - Scoreboard live-window → 20s
//   - Scoreboard off-window → 5 min
//   - Schedules → 1 hr
//   - Team/player stats → 1 hr
function effectiveTtl(provider, pathParts) {
  const provCfg = PROVIDERS[provider];
  if (!provCfg) return 30;
  const joined = pathParts.join('/').toLowerCase();
  if (joined.includes('schedule') || joined.includes('calendar')) return 3600;
  if (joined.includes('statistics') || joined.includes('standings')) return 300;
  return provCfg.cacheS ?? 30;
}

export default async function handler(req, res) {
  try {
    // Single catch-all: slug[0] = provider, slug[1..] = upstream path.
    const { slug = [] } = req.query;
    const slugParts = Array.isArray(slug) ? slug : (slug ? [slug] : []);
    const providerKey = slugParts[0];
    const pathParts = slugParts.slice(1);

    const cfg = PROVIDERS[providerKey];
    if (!cfg) {
      res.status(404).json({ error: `unknown provider: ${providerKey || '(none)'}` });
      return;
    }

    // Rebuild the upstream URL. Strip the synthetic slug key from query.
    const upstreamPath = pathParts.join('/');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'slug') continue;
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
      else if (v !== undefined && v !== null) qs.append(k, v);
    }
    const qsStr = qs.toString();
    const url = `${cfg.base}${upstreamPath ? '/' + upstreamPath : ''}${qsStr ? '?' + qsStr : ''}`;

    const headers = cfg.headers(process.env || {});

    const upstreamRes = await fetch(url, { headers, method: req.method || 'GET' });
    const body = await upstreamRes.text();

    const ttl = effectiveTtl(providerKey, pathParts);
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${Math.max(60, ttl * 4)}`);
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('X-Gibol-Proxy', providerKey);
    res.setHeader('X-Gibol-Upstream-Status', String(upstreamRes.status));
    res.setHeader('X-Gibol-Upstream-Url', url);
    res.status(upstreamRes.status).send(body);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'proxy_error', detail: String(err?.message || err) });
  }
}
