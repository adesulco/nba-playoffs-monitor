/**
 * ESPN summary → normalized game shape for the OG card layout.
 *
 * Hits the same ESPN endpoint the live dashboard uses (via our edge
 * proxy). The proxy's per-provider cache TTL applies, so per-game OG
 * generation is essentially free during a hot share window.
 *
 * Returns a normalised object the layout expects:
 *   {
 *     id, league, series, status: 'pre'|'in'|'post', statusDetail,
 *     seriesRecord,
 *     home: { tri, name, color, score },
 *     away: { tri, name, color, score },
 *     quarters: [{ home, away }, ...],   // length 4 (or 5+ for OT)
 *     winProb: { home, away } | null,
 *     leaders: [{ team, name, statline }, ...],  // top 3
 *     verdict: { headline, body, author } | null,
 *   }
 */

import { COLORS } from './_theme.js';

// Team-color map for the chip backgrounds. Mirrors src/lib/constants.js
// TEAM_META.color so the card matches the live dashboard accents. Kept
// inline here so this file doesn't need to import from src/.
const TEAM_COLORS = {
  ATL: '#E03A3E', BOS: '#007A33', BKN: '#000000', CHA: '#1D1160',
  CHI: '#CE1141', CLE: '#860038', DAL: '#00538C', DEN: '#0E2240',
  DET: '#C8102E', GSW: '#1D428A', HOU: '#CE1141', IND: '#FDBB30',
  LAC: '#C8102E', LAL: '#552583', MEM: '#5D76A9', MIA: '#98002E',
  MIL: '#00471B', MIN: '#0C2340', NOP: '#0C2340', NYK: '#006BB6',
  OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160',
  POR: '#E03A3E', SAC: '#5A2D81', SAS: '#C4CED4', TOR: '#CE1141',
  UTA: '#002B5C', WAS: '#002B5C',
};

const TEAM_SHORT = {
  ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', CHA: 'Hornets',
  CHI: 'Bulls', CLE: 'Cavaliers', DAL: 'Mavericks', DEN: 'Nuggets',
  DET: 'Pistons', GSW: 'Warriors', HOU: 'Rockets', IND: 'Pacers',
  LAC: 'Clippers', LAL: 'Lakers', MEM: 'Grizzlies', MIA: 'Heat',
  MIL: 'Bucks', MIN: 'Timberwolves', NOP: 'Pelicans', NYK: 'Knicks',
  OKC: 'Thunder', ORL: 'Magic', PHI: '76ers', PHX: 'Suns',
  POR: 'Trail Blazers', SAC: 'Kings', SAS: 'Spurs', TOR: 'Raptors',
  UTA: 'Jazz', WAS: 'Wizards',
};

/**
 * Fetch ESPN summary by event id. Uses the production proxy on Vercel.
 * Returns null on failure so the endpoint can fall back to a static card
 * or render a "data not available" variant.
 */
export async function fetchGame(gameId, { origin } = {}) {
  if (!gameId) return null;
  // Origin defaults to the deployed URL when run on Vercel; locally a
  // VERCEL_URL fallback works too. The /api/proxy/espn/* path mirrors
  // the live frontend's hook (see src/hooks/usePlayoffData.js).
  const base = origin || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.gibol.co');
  const url = `${base}/api/proxy/espn/basketball/nba/summary?event=${encodeURIComponent(gameId)}`;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const j = await r.json();
    return normalize(j, gameId);
  } catch (e) {
    return null;
  }
}

function normalize(j, gameId) {
  const header = j?.header || {};
  const comp = (header?.competitions || [])[0] || {};
  const competitors = comp?.competitors || [];

  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

  const homeTri = (home?.team?.abbreviation || '').toUpperCase();
  const awayTri = (away?.team?.abbreviation || '').toUpperCase();

  // Status mapping
  const stateRaw = (comp?.status?.type?.state || '').toLowerCase(); // pre|in|post
  const status = stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre';
  const statusDetail = comp?.status?.type?.shortDetail || comp?.status?.type?.description || '';

  // Series record: ESPN sets `notes[0].headline` like "Lakers lead 2-1"
  // for playoff games. Pull it as the seriesRecord field.
  const note = (header?.notes || [])[0]?.headline || null;
  const seriesRecord = note && /lead|tied|wins/i.test(note) ? note : null;

  // Quarters: home/away linescores arrays. ESPN ships these as
  // `{ displayValue: "39" }` per quarter; older endpoints used `value`.
  // Read both for robustness.
  const homeLines = Array.isArray(home?.linescores) ? home.linescores : [];
  const awayLines = Array.isArray(away?.linescores) ? away.linescores : [];
  const maxQ = Math.max(homeLines.length, awayLines.length);
  const quarters = [];
  for (let i = 0; i < maxQ; i++) {
    const hRaw = homeLines[i]?.value ?? homeLines[i]?.displayValue;
    const aRaw = awayLines[i]?.value ?? awayLines[i]?.displayValue;
    if (hRaw == null && aRaw == null) continue;
    const hv = parseInt(hRaw, 10);
    const av = parseInt(aRaw, 10);
    quarters.push({
      home: Number.isFinite(hv) ? hv : 0,
      away: Number.isFinite(av) ? av : 0,
    });
  }

  // Win probability: pickcenter[0]?.awayTeamOdds?.winPercentage (live only)
  // Fall back to outcome-based prob for finished games.
  const pickcenter = j?.pickcenter || [];
  let homeProb = null;
  let awayProb = null;
  for (const pc of pickcenter) {
    if (pc?.homeTeamOdds?.winPercentage != null) {
      homeProb = pc.homeTeamOdds.winPercentage / 100;
      awayProb = 1 - homeProb;
      break;
    }
  }
  const winProb = homeProb != null ? { home: homeProb, away: awayProb } : null;

  // Leaders: ESPN ships these at the TOP-LEVEL `j.leaders[]` array,
  // not per-competitor. Each entry: { team: { abbreviation }, leaders:
  // [{ name: 'points'|'rebounds'|'assists'|..., leaders: [{ athlete,
  // value, displayValue }] }] }.
  const topLeaders = Array.isArray(j?.leaders) ? j.leaders : [];
  const leadersRaw = [];
  for (const entry of topLeaders) {
    const tri = (entry?.team?.abbreviation || '').toUpperCase();
    const cats = entry?.leaders || [];
    for (const block of cats) {
      if (block?.name === 'rating') continue;
      const item = block?.leaders?.[0];
      if (!item) continue;
      const ath = item?.athlete || {};
      leadersRaw.push({
        team: tri,
        name: ath?.shortName || ath?.displayName || '',
        statline: item?.displayValue || '',
        points: parseInt(item?.value, 10) || 0,
        category: block?.name,
      });
    }
  }
  // Build top-3 unique players: points-leader for each team first
  // (guaranteed 2 entries when both teams report), then fall through to
  // best assists / rebounds leader from either team for the 3rd slot.
  // Stat line is enriched with reb / ast when the same player leads
  // multiple categories (e.g. LeBron pts + reb).
  const seen = new Set();
  const leaders = [];
  const buildEntry = (player) => {
    const others = leadersRaw.filter(
      (x) => x.team === player.team && x.name === player.name && x.category !== player.category
    );
    const reb = others.find((x) => x.category === 'rebounds');
    const ast = others.find((x) => x.category === 'assists');
    const parts = [];
    if (player.category === 'points') {
      parts.push(`${player.points} pts`);
      if (reb?.statline) parts.push(`${parseInt(reb.statline, 10) || reb.statline} reb`);
      if (ast?.statline) parts.push(`${parseInt(ast.statline, 10) || ast.statline} ast`);
    } else if (player.category === 'rebounds') {
      parts.push(`${player.points} reb`);
    } else if (player.category === 'assists') {
      parts.push(`${player.points} ast`);
    } else {
      parts.push(player.statline);
    }
    return {
      team: player.team,
      name: player.name,
      statline: parts.filter(Boolean).join(' · '),
    };
  };

  // Pass 1: top points leader per team (typically 2 entries).
  const pointsLeaders = leadersRaw
    .filter((l) => l.category === 'points')
    .sort((a, b) => b.points - a.points);
  for (const l of pointsLeaders) {
    const key = `${l.team}-${l.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leaders.push(buildEntry(l));
    if (leaders.length >= 3) break;
  }

  // Pass 2: fill remaining slots from rebound + assist leaders, highest
  // category value first, deduped by player.
  if (leaders.length < 3) {
    const others = leadersRaw
      .filter((l) => l.category === 'rebounds' || l.category === 'assists')
      .sort((a, b) => b.points - a.points);
    for (const l of others) {
      const key = `${l.team}-${l.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      leaders.push(buildEntry(l));
      if (leaders.length >= 3) break;
    }
  }

  return {
    id: gameId,
    league: 'NBA',
    series: deriveSeriesLabel(header),
    status,
    statusDetail,
    seriesRecord,
    home: {
      tri: homeTri,
      name: TEAM_SHORT[homeTri] || home?.team?.shortDisplayName || homeTri,
      color: TEAM_COLORS[homeTri] || COLORS.ink3,
      score: parseScore(home?.score),
    },
    away: {
      tri: awayTri,
      name: TEAM_SHORT[awayTri] || away?.team?.shortDisplayName || awayTri,
      color: TEAM_COLORS[awayTri] || COLORS.ink3,
      score: parseScore(away?.score),
    },
    quarters,
    winProb,
    leaders,
    // Editorial verdict — empty by default; Theme D will populate when an
    // article exists for this game.
    verdict: null,
  };
}

function parseScore(v) {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function deriveSeriesLabel(header) {
  // ESPN's `season.slug` includes things like "post-season" but doesn't
  // give round names. Best-effort: pull from notes or fall back to a
  // generic "Playoff" string.
  const note = (header?.notes || [])[0]?.headline || '';
  if (/round 1|first round|r1/i.test(note)) return 'Round 1';
  if (/conf semis|round 2/i.test(note)) return 'Conf. Semifinals';
  if (/conf finals|round 3/i.test(note)) return 'Conf. Finals';
  if (/finals/i.test(note)) return 'NBA Finals';
  return 'Playoff';
}

/**
 * Fallback game shape for cases where ESPN returns nothing. Render with
 * an "Unavailable" headline so the endpoint never crashes.
 */
export function fallbackGame(gameId) {
  return {
    id: gameId,
    league: 'NBA',
    series: 'Playoff',
    status: 'pre',
    statusDetail: 'TBC',
    seriesRecord: null,
    home: { tri: '—', name: 'Home', color: COLORS.muted, score: null },
    away: { tri: '—', name: 'Away', color: COLORS.muted, score: null },
    quarters: [],
    winProb: null,
    leaders: [],
    verdict: {
      headline: 'Game data temporarily unavailable',
      body: 'Refresh in a moment — ESPN scoreboard sometimes lags by a few seconds.',
      author: 'gibol.co',
    },
  };
}
