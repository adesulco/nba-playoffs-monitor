/**
 * Edge-cached multi-provider proxy — multi-sport build plan §2.2.
 *
 * v0.2.4 fix: Vercel's classic (non-Next.js) Serverless Functions do NOT
 * support `[...catchall].js` patterns — that's a Next.js pages-router feature.
 * v0.2.3 tried api/proxy/[...slug].js and Vercel returned HTTP 404
 * NOT_FOUND because the route was never registered. The real fix is a
 * bracket-free filename + a `vercel.json` rewrite that feeds the tail path
 * through a query parameter.
 *
 *   vercel.json:
 *     { "source": "/api/proxy/:path*", "destination": "/api/proxy?path=:path*" }
 *
 *   This file:  api/proxy.js   (no brackets — deterministic routing)
 *
 * Browser URL shape is UNCHANGED — hooks still call:
 *   fetch('/api/proxy/polymarket-gamma/events?slug=2026-nba-champion')
 *   fetch('/api/proxy/espn/basketball/nba/scoreboard')
 *   fetch('/api/proxy/openf1/drivers?session_key=latest')
 *   fetch('/api/proxy/jolpica-f1/2026/driverStandings.json')
 *
 * Why this proxy exists:
 *   - API-Football (Phase 4, Liga 1) ships a paid key that MUST NOT reach the
 *     browser. A server proxy is the only safe way.
 *   - ESPN / Polymarket / OpenF1 / Jolpica hosted endpoints get hit by every
 *     browser × poll frequency × live-window concurrency. Without edge cache,
 *     one viral share = easy rate-limit. With `s-maxage` headers below, N users
 *     in 20s cost 1 upstream request instead of N.
 *   - Observability: one place to see which provider is flaky.
 *
 * First path segment after /api/proxy/ selects the upstream via the whitelist
 * below. Unknown providers → 404. Query string passes through (minus the
 * synthetic `path` key set by the rewrite).
 *
 * NOTE: NBA hooks still talk to ESPN/Polymarket directly in v0.2.0. The
 * migration through this proxy lands per-sport as each phase ships — so a
 * broken proxy change can't take down the live NBA dashboard during the
 * playoff window.
 */

// ─── Provider registry ───────────────────────────────────────────────────────
const PROVIDERS = {
  'espn': {
    base: 'https://site.api.espn.com/apis/site/v2/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,
  },
  'espn-core': {
    base: 'https://sports.core.api.espn.com/v2/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,
  },
  // v0.4.0 — EPL needs these two extra ESPN bases:
  //   espn-v2     → /apis/v2/sports/...  (standings: groups + records)
  //   espn-common → /apis/common/v3/sports/... (athletes + leaders for
  //                 Golden Boot / top-scorer endpoint)
  // Kept as separate provider keys so we never silently cross paths —
  // ESPN's APIs are siblings, not substitutable.
  'espn-v2': {
    base: 'https://site.api.espn.com/apis/v2/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 60,
  },
  'espn-common': {
    base: 'https://site.web.api.espn.com/apis/common/v3/sports',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 300,
  },

  'polymarket-gamma': {
    base: 'https://gamma-api.polymarket.com',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 20,
  },
  'polymarket-clob': {
    base: 'https://clob.polymarket.com',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 300,
  },

  'openf1': {
    base: 'https://api.openf1.org/v1',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 15,
  },
  'jolpica-f1': {
    base: 'https://api.jolpi.ca/ergast/f1',
    headers: () => ({ accept: 'application/json' }),
    cacheS: 3600,
  },

  'football-data': {
    base: 'https://api.football-data.org/v4',
    headers: (env) => ({
      accept: 'application/json',
      'X-Auth-Token': env.FOOTBALL_DATA_TOKEN || '',
    }),
    cacheS: 300,
  },

  'api-football': {
    base: 'https://v3.football.api-sports.io',
    headers: (env) => ({
      accept: 'application/json',
      'x-apisports-key': env.API_FOOTBALL_KEY || '',
    }),
    cacheS: 60,
  },
};

function effectiveTtl(provider, pathParts) {
  const provCfg = PROVIDERS[provider];
  if (!provCfg) return 30;
  const joined = pathParts.join('/').toLowerCase();
  if (joined.includes('schedule') || joined.includes('calendar')) return 3600;
  if (joined.includes('statistics') || joined.includes('standings')) return 300;
  return provCfg.cacheS ?? 30;
}

/**
 * Parse the tail path (everything after /api/proxy/) into segments.
 *
 * Vercel's rewrite `/api/proxy/:path*` → `/api/proxy?path=:path*` gives us
 * `req.query.path` as either a single string with slashes preserved OR an
 * array of segments, depending on Vercel version. Handle both shapes.
 *
 * Fallback: if the rewrite is somehow missing, parse req.url ourselves.
 */
function extractPathParts(req) {
  const rawPath = req.query?.path;
  if (Array.isArray(rawPath)) {
    return rawPath.filter(Boolean);
  }
  if (typeof rawPath === 'string' && rawPath.length > 0) {
    return rawPath.split('/').filter(Boolean);
  }
  // Fallback: derive from req.url if the rewrite didn't fire.
  const urlPath = (req.url || '').split('?')[0];
  const match = urlPath.match(/^\/api\/proxy\/?(.*)$/);
  if (match && match[1]) {
    return match[1].split('/').filter(Boolean);
  }
  return [];
}

export default async function handler(req, res) {
  try {
    const pathParts = extractPathParts(req);
    const providerKey = pathParts[0];
    const upstreamParts = pathParts.slice(1);

    const cfg = PROVIDERS[providerKey];
    if (!cfg) {
      res.setHeader('X-Gibol-Proxy-Debug', `path=${pathParts.join('/') || '(empty)'}`);
      res.status(404).json({ error: `unknown provider: ${providerKey || '(none)'}` });
      return;
    }

    const upstreamPath = upstreamParts.join('/');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query || {})) {
      if (k === 'path') continue; // synthetic from rewrite
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
      else if (v !== undefined && v !== null) qs.append(k, v);
    }
    const qsStr = qs.toString();
    const url = `${cfg.base}${upstreamPath ? '/' + upstreamPath : ''}${qsStr ? '?' + qsStr : ''}`;

    const headers = cfg.headers(process.env || {});

    const upstreamRes = await fetch(url, { headers, method: req.method || 'GET' });
    const body = await upstreamRes.text();

    const ttl = effectiveTtl(providerKey, upstreamParts);
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
