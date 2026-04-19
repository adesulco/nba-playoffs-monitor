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
  { name: 'openf1', url: 'https://api.openf1.org/v1/meetings?year=2026&limit=1' },
  { name: 'jolpica-f1', url: 'https://api.jolpi.ca/ergast/f1/current.json' },
  { name: 'espn-soccer-eng1', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' },
  { name: 'football-data-eng', url: 'https://api.football-data.org/v4/competitions/PL' },
];

async function pingOne(check) {
  const t0 = Date.now();
  try {
    const headers = { accept: 'application/json' };
    if (check.name === 'football-data-eng' && process.env.FOOTBALL_DATA_TOKEN) {
      headers['X-Auth-Token'] = process.env.FOOTBALL_DATA_TOKEN;
    }
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
