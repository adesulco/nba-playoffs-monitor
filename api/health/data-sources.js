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
  { name: 'polymarket-gamma', url: 'https://gamma-api.polymarket.com/events?slug=2026-nba-champion' },
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
];

async function pingOne(check) {
  const t0 = Date.now();
  try {
    const headers = { accept: 'application/json' };
    const res = await fetch(check.url, { headers });
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
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
