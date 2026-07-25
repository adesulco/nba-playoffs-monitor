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

// ─── R0-7 · scoring liveness ────────────────────────────────────────────────
// The WC2026 blackout (72 group fixtures left `scheduled` from Jun 12 to
// Jul 20) was invisible because every upstream probe above was green: the
// FEEDS were fine, the SCORING was dead. This checks the thing that
// actually matters — did a fixture finalize recently for each competition
// that has games in the past?
//
// Per competition: days since the most recent finalized fixture, and the
// count of fixtures whose kickoff has passed but are still not final
// ("stale"). Amber at 2 days, red at 3+ — a competition mid-window should
// score within hours (the football cron runs every 2h).
//
// A competition with no past fixtures (seeded, not started — e.g. EPL
// before Aug 21) is reported as `pending`, never as an alarm.
//
// The stale window is BOUNDED (STALE_WINDOW_DAYS): only fixtures that
// kicked off within the window count. Older past-kickoff-but-unscored
// rows are abandoned data, not an outage — e.g. the 5 NBA "if necessary"
// CF/Finals games ESPN scheduled for series that ended early. They will
// never finalize, and an unbounded check would sit red forever and train
// us to ignore it. The WC blackout is still caught on day 2: fixtures
// kicked off daily through June, so recent ones were always in-window.
const LIVENESS_AMBER_DAYS = 2;
const LIVENESS_RED_DAYS = 3;
const STALE_WINDOW_DAYS = 14;

async function checkScoringLiveness() {
  const url = process.env.SUPABASE_URL || 'https://egzacjfbmgbcwhtvqixc.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return { ok: true, skipped: 'no supabase key in env' };

  try {
    const res = await fetch(
      `${url}/rest/v1/fixtures?select=league,status,kickoff_at,finalized_at&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return { ok: false, error: `fixtures query HTTP ${res.status}` };
    const rows = await res.json();

    const now = Date.now();
    const windowStart = now - STALE_WINDOW_DAYS * 86400000;
    const byLeague = new Map();
    for (const f of rows) {
      if (!byLeague.has(f.league)) {
        byLeague.set(f.league, { lastFinalizedMs: null, stale: 0, abandoned: 0, past: 0 });
      }
      const g = byLeague.get(f.league);
      const kickoffMs = new Date(f.kickoff_at).getTime();
      const isPast = kickoffMs <= now;
      if (isPast) g.past++;
      if (f.status === 'final') {
        const finMs = new Date(f.finalized_at || f.kickoff_at).getTime();
        if (g.lastFinalizedMs === null || finMs > g.lastFinalizedMs) g.lastFinalizedMs = finMs;
      } else if (isPast) {
        if (kickoffMs >= windowStart) g.stale++;
        else g.abandoned++;
      }
    }

    const competitions = {};
    let worst = 0;
    for (const [league, g] of byLeague) {
      if (g.past === 0) {
        competitions[league] = { state: 'pending', staleFixtures: 0 };
        continue;
      }
      const extra = g.abandoned ? { abandonedFixtures: g.abandoned } : {};
      const days = g.lastFinalizedMs === null
        ? Infinity
        : Math.floor((now - g.lastFinalizedMs) / 86400000);
      // Only alarm when there is unscored work sitting there: a finished
      // competition (WC2026 post-final) legitimately goes quiet forever.
      const alarming = g.stale > 0;
      const state = !alarming ? 'ok'
        : days >= LIVENESS_RED_DAYS ? 'red'
        : days >= LIVENESS_AMBER_DAYS ? 'amber'
        : 'ok';
      if (alarming) worst = Math.max(worst, days === Infinity ? 999 : days);
      competitions[league] = {
        state,
        daysSinceLastScoredFixture: days === Infinity ? null : days,
        staleFixtures: g.stale,
        ...extra,
      };
    }

    const anyRed = Object.values(competitions).some((c) => c.state === 'red');
    return {
      ok: !anyRed,
      thresholdDays: { amber: LIVENESS_AMBER_DAYS, red: LIVENESS_RED_DAYS },
      worstStaleDays: worst || 0,
      competitions,
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err).slice(0, 200) };
  }
}

export default async function handler(req, res) {
  const [settled, scoring] = await Promise.all([
    Promise.all(CHECKS.map(pingOne)),
    checkScoringLiveness(),
  ]);
  const providers = Object.fromEntries(
    CHECKS.map((c, i) => [c.name, settled[i]])
  );
  const allOk = settled.every((r) => r.ok) && scoring.ok !== false;

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.status(allOk ? 200 : 207).json({
    ok: allOk,
    checkedAt: new Date().toISOString(),
    providers,
    scoring,
  });
}
