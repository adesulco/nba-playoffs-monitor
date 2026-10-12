/**
 * Data-source health ping — multi-sport build plan §2.5.
 *
 * Hits a cheap endpoint on every upstream we depend on and returns a per-
 * provider pass/fail. Used both for a quick "is F1 down?" gut-check in the
 * browser and for scheduled Vercel cron checks later.
 *
 * GET /api/health/data-sources
 *   → { ok: boolean, checkedAt: ISOString, providers: {name: {ok, status, ms}} }
 */

const CHECKS = [
  { name: 'espn-nba', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
  // v0.79.0 — futures-odds-gamma probe removed (Komdigi de-risk 2026-05-23).
  // The upstream is blocked by the regulator; we no longer relay or check it.
  // v0.60.5 — `&limit=1` is not a valid OpenF1 filter; the API treats
  // unrecognised query params as zero-match filters and returns 404
  // with body `{"detail":"No results found."}`. Reported red since
  // v0.2.0 in audits/2026-05-15-state-and-proposals.md item #3.
  // Probe a stable historical meeting (Abu Dhabi GP 2024,
  // meeting_key=1252) — year-independent, deterministic, ~800 bytes.
  { name: 'openf1', url: 'https://api.openf1.org/v1/meetings?meeting_key=1252' },
  { name: 'jolpica-f1', url: 'https://api.jolpi.ca/ergast/f1/current.json' },
  { name: 'espn-soccer-eng1', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' },
  // v0.60.6 — football-data-eng probe dropped. Audit ref item #4:
  // free football-data tier doesn't serve EPL data, no hook in src/
  // calls it through the proxy (verified via grep), and the FOOTBALL_DATA_TOKEN
  // env was either expired or removed (probe was 403 since v0.59.x). The
  // `football-data` provider config in api/proxy.js is left in place
  // (dead but harmless) in case a future paid-tier use case revives it.
  //
  // v0.79.16 — API-Football probe added (audit gap). The /status
  // endpoint returns subscription + quota and is the cheapest call
  // that proves the key is alive AND on an active paid plan. The
  // body-validator below marks it red on a plan downgrade / dead key,
  // not just on an HTTP failure — important because a free-tier key
  // still returns HTTP 200 (just with empty current-season data).
  // Only probed when API_FOOTBALL_KEY is set (skipped in envs without it).
  ...(process.env.API_FOOTBALL_KEY
    ? [{
        name: 'api-football',
        url: 'https://v3.football.api-sports.io/status',
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
        // ok only if the subscription is active (catches plan lapse).
        validate: (body) => body?.response?.subscription?.active === true,
      }]
    : []),
];

async function pingOne(check) {
  const t0 = Date.now();
  try {
    const headers = { accept: 'application/json', ...(check.headers || {}) };
    const res = await fetch(check.url, { headers });
    let ok = res.ok;
    let detail;
    // Optional body-validator: a provider can return HTTP 200 while
    // being functionally degraded (e.g. API-Football free tier, or a
    // lapsed plan). When present, the validator decides ok.
    if (check.validate) {
      try {
        const body = await res.json();
        const valid = !!check.validate(body);
        ok = res.ok && valid;
        if (res.ok && !valid) detail = 'reachable but validation failed (plan/quota?)';
      } catch (e) {
        ok = false;
        detail = 'invalid JSON body';
      }
    }
    return {
      ok,
      status: res.status,
      ms: Date.now() - t0,
      ...(detail ? { detail } : {}),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      error: String(err?.message || err).slice(0, 200),
    };
  }
}

export default async function handler(req, res) {
  const settled = await Promise.all(CHECKS.map(pingOne));
  const providers = Object.fromEntries(
    CHECKS.map((c, i) => [c.name, settled[i]])
  );
  const allOk = settled.every((r) => r.ok);

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.status(allOk ? 200 : 207).json({
    ok: allOk,
    checkedAt: new Date().toISOString(),
    providers,
  });
}
