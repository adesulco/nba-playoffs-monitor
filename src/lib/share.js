/**
 * Sport-generic share-text builders.
 *
 * All builders return a single string (not multi-line) — the consumer
 * (ShareButton) is free to join with a URL, add a hashtag row, or hand
 * it to navigator.share. Bahasa-first; English alternates passed via
 * the `lang` arg.
 *
 * Parallel to the inline helpers already living in EPL.jsx. When we
 * consolidate those, move them in here and let the EPL page import them.
 *
 * Contract: return plain UTF-8; no HTML, no markdown, no explicit
 * emojis that might clash with the share surface's own iconography.
 * One sport emoji at the front is OK — it's how WhatsApp/X readers
 * scan the feed for "oh, a basketball post."
 */

// ─── NBA ────────────────────────────────────────────────────────────────────
// Matches the copy style already shipped in src/components/DayScoreboard.jsx
// (live/final) for consistency. Diff: this helper works from a game object
// shaped by useDailyRecap (richer — includes narrative, top scorer etc.)
// rather than the live-feed shape.
//
// Example (id):
//   "FINAL · LAL 101 — 94 HOU 🏀 LeBron 28/8/7 · recap di gibol.co"
// Example (en):
//   "FINAL · LAL 101 — 94 HOU 🏀 LeBron 28/8/7 · recap on gibol.co"

/**
 * Derive the winner from scores — not from ESPN's `winner` flag, which
 * isn't reliably set on freshly-completed games. The score is truth.
 * Matches the fix applied in useDailyRecap.js::buildGameNarrative.
 */
function decideWinner(game) {
  const awayScore = parseInt(game?.away?.score || 0);
  const homeScore = parseInt(game?.home?.score || 0);
  const awayWins = awayScore > homeScore;
  return {
    awayScore,
    homeScore,
    awayWins,
    winnerAbbr: awayWins ? game?.away?.abbr : game?.home?.abbr,
    loserAbbr: awayWins ? game?.home?.abbr : game?.away?.abbr,
    winScore: Math.max(awayScore, homeScore),
    loseScore: Math.min(awayScore, homeScore),
  };
}

/**
 * Build a short "top scorer" tail like " · LeBron 28/8/7". Returns empty
 * string if no scorer or the numbers don't meet a 10-point floor (keeps
 * the share clean when bench players come up as the "top" in low-minute
 * situations).
 */
function topScorerTail(top, lang) {
  if (!top || !top.pts || top.pts < 10) return '';
  const who = top.short || top.name;
  if (!who) return '';
  const reb = top.reb || 0;
  const ast = top.ast || 0;
  // Compact stat line — "28/8/7" reads instantly to any NBA fan.
  return ` · ${who} ${top.pts}/${reb}/${ast}`;
}

/**
 * Share copy for a FINAL NBA game. Feeds the recap ShareButton so every
 * game card becomes its own shareable unit.
 *
 * `game` shape comes from useDailyRecap (same as GameRecapCard uses):
 *   { id, away: { abbr, score }, home: { abbr, score } }
 * `top` is the per-game top scorer (overall, across both teams):
 *   { short, name, pts, reb, ast }
 * `lang` is 'id' | 'en'.
 */
export function buildNBAFinalShareText(game, top, lang = 'id') {
  const { winnerAbbr, loserAbbr, winScore, loseScore } = decideWinner(game);
  if (!winnerAbbr || !loserAbbr) return '';

  const tail = topScorerTail(top, lang);
  return lang === 'id'
    ? `FINAL · ${winnerAbbr} ${winScore} — ${loseScore} ${loserAbbr} 🏀${tail} · recap di gibol.co`
    : `FINAL · ${winnerAbbr} ${winScore} — ${loseScore} ${loserAbbr} 🏀${tail} · recap on gibol.co`;
}

/**
 * Share URL for a single game. Today the deepest link we ship is the
 * date-scoped recap page (/recap/:date). When per-game `/recap/[gameId]`
 * pages ship, swap this to that route — share targets carry the updated
 * URL on their next tick without any call-site changes.
 */
export function buildNBAGameShareUrl(game, dateIso) {
  const id = game?.id;
  // Prefer per-game anchor so readers open directly to THIS game on the
  // date page, not the top of the list. Matches Recap.jsx's game IDs.
  if (dateIso && id) return `https://www.gibol.co/recap/${dateIso}#game-${id}`;
  if (dateIso) return `https://www.gibol.co/recap/${dateIso}`;
  return 'https://www.gibol.co/recap';
}

// ─── Dynamic IG Story / OG / Square PNG URL builder ─────────────────────────
// Backed by /api/recap/[gameId]?v=story|og|square. The endpoint is a
// @vercel/og edge function that renders a 1080×1920 (story) / 1200×630 (og)
// / 1080×1080 (square) PNG with the game data baked in. All inputs go
// through the URL so the endpoint is fully deterministic + aggressively
// cacheable at the CDN edge.

/**
 * Derive the game-card data (winner/loser/scores/top-scorer) from the
 * shape useDailyRecap already produces, using the same score-derived
 * winner logic as the rest of the codebase.
 */
function extractGameFacts(game, topPerformer, teamMeta) {
  const awayScore = parseInt(game?.away?.score || 0, 10);
  const homeScore = parseInt(game?.home?.score || 0, 10);
  const awayWins = awayScore > homeScore;
  const winner = awayWins ? game?.away?.abbr : game?.home?.abbr;
  const loser = awayWins ? game?.home?.abbr : game?.away?.abbr;
  const winScore = Math.max(awayScore, homeScore);
  const loseScore = Math.min(awayScore, homeScore);

  const winColor = teamMeta?.[winner]?.color || null;
  const loseColor = teamMeta?.[loser]?.color || null;

  const top = topPerformer || {};
  const topName = top.short || top.name || '';
  const topTeam = top.teamAbbr || '';
  const topTeamColor = teamMeta?.[topTeam]?.color || winColor || null;

  return {
    winner, loser,
    winScore, loseScore,
    winColor, loseColor,
    top: topName,
    topPts: top.pts || 0,
    topReb: top.reb || 0,
    topAst: top.ast || 0,
    topTeam,
    topTeamColor,
  };
}

/**
 * Build the fully-qualified image URL for a game. Pass `variant` to get
 * IG Story ('story'), Twitter/OG ('og'), or IG feed ('square'). The
 * gameId becomes the path segment so CDN cache keys bucket per-game.
 *
 * Callers: Recap.jsx ShareButton wiring (igStoryUrl), OG meta on recap
 * pages (variant='og'), future /recap/[gameId] landing (variant='square').
 */
export function buildNBARecapPngUrl(game, topPerformer, teamMeta, {
  variant = 'story',
  dateIso = null,
  lang = 'id',
  absolute = true,
} = {}) {
  if (!game?.id) return null;
  const facts = extractGameFacts(game, topPerformer, teamMeta);
  const qs = new URLSearchParams();
  qs.set('v', variant);
  qs.set('lang', lang);
  if (dateIso) qs.set('date', dateIso);
  if (facts.winner) qs.set('winner', facts.winner);
  if (facts.loser) qs.set('loser', facts.loser);
  qs.set('winScore', String(facts.winScore));
  qs.set('loseScore', String(facts.loseScore));
  if (facts.winColor) qs.set('winColor', facts.winColor);
  if (facts.loseColor) qs.set('loseColor', facts.loseColor);
  if (facts.top) {
    qs.set('top', facts.top);
    qs.set('topPts', String(facts.topPts));
    qs.set('topReb', String(facts.topReb));
    qs.set('topAst', String(facts.topAst));
    if (facts.topTeam) qs.set('topTeam', facts.topTeam);
    if (facts.topTeamColor) qs.set('topTeamColor', facts.topTeamColor);
  }
  const path = `/api/recap/${encodeURIComponent(game.id)}?${qs.toString()}`;
  return absolute ? `https://www.gibol.co${path}` : path;
}
