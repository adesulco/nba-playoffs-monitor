/**
 * Game-summary refresh handler.
 *
 * Phase 2 ship v0.55.1. Called by api/approve.js when the editor (or
 * a future cron) sends action="refresh_game_summary". Fetches the
 * latest play-by-play from ESPN, summarizes via Haiku 4.5, writes
 * to ce_game_summaries.
 *
 * Architecture choice: NO new Vercel function. We're at 12/12 on
 * Hobby per CLAUDE.md. The refresh path lives inside api/approve.js
 * as another action; public reads happen client-side via Supabase
 * anon RLS (the SPA's LiveSummaryCard fetches the row directly,
 * doesn't need a server endpoint).
 *
 * Cost economics:
 *   • Per call: ~$0.005-0.015 (Haiku 4.5; ~3K input tokens for
 *     the prompt + last 30 plays, ~250 tokens output)
 *   • At 90s refresh × ~3hrs of live game × N parallel games:
 *     ~120 calls/game × $0.01 = $1.20/game; well under the
 *     $5/day NBA cap that lands in v0.55.2.
 *
 * v0.55.2 will add:
 *   • Per-sport daily cost cap (api/_lib/aiBudget.js)
 *   • GitHub Actions cron @ 90s for live games (auto-refresh)
 *   • Posthog event on every call
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are writing a 60-100 word Bahasa Indonesia live update for an in-progress NBA game.

INPUT: a structured data block with the latest play-by-play, score, period, and clock.

OUTPUT: 1-2 short paragraphs in Bahasa, casual register (matches Gibol voice rules), focused on:
1. Who's leading + by how much
2. The most-recent significant play (last 5)
3. ONE forward-looking observation (run, momentum, key foul trouble, etc.)

Hard rules:
- Every claim grounded in input. NO fabrication.
- Bahasa first. Code-switch English NBA terms naturally (run, fast break, three-point, clutch).
- No em-dashes — use period or comma.
- 60-100 words total. Don't pad.
- Don't restate the score in every sentence; once is enough.
- Don't use "telah" or "sudah" stuffing.

Output ONLY the body text. No headlines, no preamble like "Berikut update...", no markdown formatting.`;

function _formatLastPlays(plays, max = 12) {
  if (!Array.isArray(plays) || !plays.length) return '(no plays yet)';
  return plays.slice(-max).map((p) => {
    const period = p.period ? `Q${p.period}` : '';
    const clock = p.clock || '';
    const score = (p.awayScore != null && p.homeScore != null)
      ? `[${p.awayScore}-${p.homeScore}]`
      : '';
    return `  ${period} ${clock} ${score} ${p.text || ''}`.trim();
  }).join('\n');
}

async function fetchEspnSummary(gameId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`ESPN summary ${resp.status}`);
  return resp.json();
}

async function summarize(plays, header) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const home = (header?.competitors || []).find((c) => c.homeAway === 'home') || {};
  const away = (header?.competitors || []).find((c) => c.homeAway === 'away') || {};
  const homeAbbr = home.team?.abbreviation || '?';
  const awayAbbr = away.team?.abbreviation || '?';
  const homeScore = home.score ?? '—';
  const awayScore = away.score ?? '—';
  const status = header?.status?.type?.shortDetail || '?';
  const period = header?.status?.period;
  const clock = header?.status?.displayClock;

  const userMsg = `GAME: ${awayAbbr} @ ${homeAbbr}
STATUS: ${status} (Q${period} ${clock})
SCORE: ${awayAbbr} ${awayScore} · ${homeScore} ${homeAbbr}

LAST 12 PLAYS:
${_formatLastPlays(plays, 12)}`;

  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 350,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Anthropic API ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const body = (data.content && data.content[0] && data.content[0].text) || '';
  // Approximate cost: Haiku 4.5 = $1/$5 per 1M input/output tokens.
  // Each call: ~3K input + ~300 output ≈ $0.0045 ≈ 0.45 cents.
  // For now we record a flat 1-cent estimate; v0.55.2 makes this exact
  // by reading data.usage.{input_tokens, output_tokens}.
  const inputTokens = data.usage?.input_tokens || 3000;
  const outputTokens = data.usage?.output_tokens || 300;
  const costCents = Math.ceil(
    ((inputTokens / 1_000_000) * 1.0 + (outputTokens / 1_000_000) * 5.0) * 100
  );

  return {
    body: body.trim(),
    costCents,
    homeAbbr, awayAbbr, homeScore, awayScore,
    period, clock, status,
  };
}

/**
 * Public entry. Returns the upserted row (compact shape for the API
 * response) or { ok: false, message }.
 */
export async function refreshGameSummary({ gameId, admin, editorEmail }) {
  if (!gameId) return { ok: false, message: 'gameId required' };
  if (!admin) return { ok: false, message: 'supabase admin not available' };

  let espnData;
  try {
    espnData = await fetchEspnSummary(gameId);
  } catch (e) {
    return { ok: false, message: `ESPN fetch failed: ${e.message}` };
  }

  const plays = espnData?.plays || [];
  const header = espnData?.header?.competitions?.[0];
  const statusState = header?.status?.type?.state;
  const isLive = statusState === 'in';

  let summary;
  try {
    summary = await summarize(plays, header);
  } catch (e) {
    return { ok: false, message: `Summarize failed: ${e.message}` };
  }

  const row = {
    game_id: String(gameId),
    sport: 'nba',
    body_md: summary.body,
    sources: ['ESPN play-by-play'],
    editor: null,
    ai_model: HAIKU_MODEL,
    cost_cents: summary.costCents,
    is_live: isLive,
    updated_at: new Date().toISOString(),
    refreshed_by: editorEmail || 'cron',
  };

  const { error } = await admin
    .from('ce_game_summaries')
    .upsert(row, { onConflict: 'game_id' });
  if (error) {
    return { ok: false, message: `Supabase upsert failed: ${error.message}` };
  }

  return {
    ok: true,
    game_id: row.game_id,
    body_md: row.body_md,
    cost_cents: row.cost_cents,
    is_live: isLive,
    updated_at: row.updated_at,
  };
}
