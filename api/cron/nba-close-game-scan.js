import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/**
 * NBA close-game push scanner — runs every 2 minutes during playoff days
 * via vercel.json crons. Sends a OneSignal push when any live game is in
 * Q4 with <2:00 left AND a margin of ≤5 points.
 *
 * Dedupe strategy:
 *   Each (gameId, bucket) combo is written to push_log with a UNIQUE
 *   constraint. The bucket key is "minute-margin" (e.g. "q4-01:47-3"),
 *   so if the same game stays close for 90 seconds we only fire once.
 *   Buckets roll every ~30s of game clock so a second call-to-action
 *   can fire if the score swings past the margin threshold and back.
 *
 * Rate discipline:
 *   - One cron call every 2 minutes is 30 invocations/hour, well inside
 *     Vercel's Hobby cron budget.
 *   - OneSignal REST limit is 600 notif/min on free tier — we send at
 *     most one per close game per cron tick (≤3 concurrent NBA games
 *     during playoffs), so we're nowhere near that.
 *   - Upstream ESPN is unauthenticated + cached at their edge; each
 *     cron tick is ~1 request.
 *
 * Auth:
 *   Vercel Cron calls add the `authorization: Bearer <CRON_SECRET>` header
 *   automatically per their docs (v2 crons). We reject anything without
 *   the right token so a leaked URL can't abuse the scanner.
 */

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const ONESIGNAL_API = 'https://api.onesignal.com/notifications?c=push';

// Tunables — keep conservative so the notification stays valuable.
const MARGIN_THRESHOLD = 5;     // points
const MINUTES_THRESHOLD = 2;    // minutes remaining in Q4
const MIN_PERIOD = 4;           // only Q4 or OT (ESPN: period >=4)

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // ─── Auth ────────────────────────────────────────────────────────────
  // Vercel crons send the Authorization header automatically.
  const auth = req.headers?.authorization || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET env missing' });
  }
  if (auth !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // ─── Fetch live scoreboard ──────────────────────────────────────────
  let events;
  try {
    const r = await fetch(ESPN_SCOREBOARD, { headers: { 'user-agent': 'gibol.co-cron/1' } });
    if (!r.ok) throw new Error(`ESPN ${r.status}`);
    const data = await r.json();
    events = data?.events || [];
  } catch (e) {
    return res.status(502).json({ error: 'espn', detail: String(e?.message || e) });
  }

  // ─── Filter to in-progress games meeting close-game criteria ────────
  const candidates = events.flatMap((ev) => {
    const c = ev.competitions?.[0];
    const status = c?.status?.type;
    if (!status || status.state !== 'in') return [];
    const period = status.period || 0;
    if (period < MIN_PERIOD) return [];

    const clock = status.displayClock || '';
    const minutes = clock.split(':')[0] ? parseInt(clock.split(':')[0], 10) : 99;
    if (minutes > MINUTES_THRESHOLD) return [];

    const comps = c?.competitors || [];
    const home = comps.find((x) => x.homeAway === 'home');
    const away = comps.find((x) => x.homeAway === 'away');
    if (!home || !away) return [];

    const homeScore = parseInt(home.score || 0, 10);
    const awayScore = parseInt(away.score || 0, 10);
    const margin = Math.abs(homeScore - awayScore);
    if (margin > MARGIN_THRESHOLD) return [];

    return [{
      id: ev.id,
      shortName: ev.shortName, // "LAL @ HOU"
      homeAbbr: home.team?.abbreviation,
      awayAbbr: away.team?.abbreviation,
      homeScore, awayScore, margin,
      clock, period,
    }];
  });

  // Cheap-exit: nothing matches, bail. Most cron ticks end here outside
  // of a live close-game window.
  if (candidates.length === 0) {
    return res.status(200).json({ scanned: events.length, close: 0, sent: 0, skippedDupe: 0 });
  }

  // ─── Supabase dedupe ────────────────────────────────────────────────
  let sb;
  try {
    sb = getSupabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'supabase_init', detail: String(e?.message || e) });
  }

  let sent = 0;
  let skippedDupe = 0;
  const results = [];

  for (const g of candidates) {
    // Bucket roughly every 30s of game clock so a tight back-and-forth
    // game can fire a second push if the margin opens + re-closes.
    const [mm, ss] = g.clock.split(':');
    const halfMinute = parseInt(ss, 10) >= 30 ? '30' : '00';
    const bucket = `q${g.period}-${mm}:${halfMinute}-m${g.margin}`;

    // UNIQUE (game_id, bucket) enforces dedupe. Insert-first, catch the
    // 23505 unique_violation to skip.
    const { error: insertErr } = await sb
      .from('push_log')
      .insert({
        channel: 'nba_close',
        game_id: g.id,
        bucket,
        payload: {
          short: g.shortName,
          home: g.homeAbbr, away: g.awayAbbr,
          homeScore: g.homeScore, awayScore: g.awayScore,
          margin: g.margin, clock: g.clock,
        },
      });

    if (insertErr) {
      // 23505 = unique violation → already notified this bucket
      if (insertErr.code === '23505' || /duplicate key/i.test(insertErr.message || '')) {
        skippedDupe++;
        results.push({ game: g.id, status: 'skipped_dupe', bucket });
        continue;
      }
      results.push({ game: g.id, status: 'log_error', err: insertErr.message });
      continue;
    }

    // ─── Send the push ────────────────────────────────────────────────
    const leader = g.homeScore > g.awayScore ? g.homeAbbr : g.awayAbbr;
    const trail = g.homeScore > g.awayScore ? g.awayAbbr : g.homeAbbr;
    const leaderScore = Math.max(g.homeScore, g.awayScore);
    const trailScore = Math.min(g.homeScore, g.awayScore);

    const heading = `🏀 Close game · Q${g.period} ${g.clock}`;
    const content = `${leader} ${leaderScore} — ${trailScore} ${trail} · margin ${g.margin}`;

    const ok = await sendOneSignal({
      headings: { en: heading, id: heading },
      contents: { en: content, id: content },
      url: `https://www.gibol.co/nba-playoff-2026?game=${g.id}`,
      filterTag: { key: 'nba_close', relation: '=', value: 'on' },
      ttl: 180, // don't deliver anything older than 3 min — the moment is gone
    });

    if (ok) sent++;
    results.push({ game: g.id, status: ok ? 'sent' : 'send_fail', bucket });
  }

  return res.status(200).json({
    scanned: events.length,
    close: candidates.length,
    sent,
    skippedDupe,
    results,
  });
}

// ─── OneSignal REST call ──────────────────────────────────────────────
async function sendOneSignal({ headings, contents, url, filterTag, ttl }) {
  const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return false;

  try {
    const r = await fetch(ONESIGNAL_API, {
      method: 'POST',
      headers: {
        // v16 REST keys use the "Key <value>" auth form (per
        // https://documentation.onesignal.com/reference/create-notification).
        // Legacy REST keys work with "Basic <value>"; both formats are
        // accepted by OneSignal's ingestion.
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        headings, contents, url, ttl,
        filters: [
          { field: 'tag', key: filterTag.key, relation: filterTag.relation, value: filterTag.value },
        ],
        web_push_topic: 'nba-close',
        chrome_web_image: 'https://www.gibol.co/gibol-logo-512.png',
        chrome_web_icon: 'https://www.gibol.co/gibol-logo-512.png',
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
