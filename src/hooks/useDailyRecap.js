import { useState, useEffect, useMemo } from 'react';
import { fetchScoreboardForLocalDate, fetchGameSummary } from '../lib/api.js';

const summaryCache = new Map(); // eventId -> { at, data }
const TTL = 30 * 60 * 1000;

async function cachedSummary(eventId) {
  const hit = summaryCache.get(eventId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const s = await fetchGameSummary(eventId);
    summaryCache.set(eventId, { at: Date.now(), data: s });
    return s;
  } catch { return null; }
}

/**
 * Build a 1–2 sentence storyline for a single game.
 * Language-aware — returns ID or EN copy depending on `lang`.
 */
function buildGameNarrative({ game, top, secondScorer, lang }) {
  const awayScore = parseInt(game.away?.score || 0);
  const homeScore = parseInt(game.home?.score || 0);
  const margin = Math.abs(awayScore - homeScore);
  // Derive winner from the scores directly — ESPN's `winner` flag is
  // not reliably set on freshly-completed games, and when both flags
  // come back false the old `game.away?.winner ? away : home` ternary
  // silently defaulted to the home team, inverting the narrative
  // ("BOS beat PHI 111-97" when the scoreboard shows PHI 111, BOS 97).
  // Score comparison is truth: the team with the higher final score won.
  const awayIsWinner = awayScore > homeScore;
  const winnerAbbr = awayIsWinner ? game.away?.abbr : game.home?.abbr;
  const loserAbbr = awayIsWinner ? game.home?.abbr : game.away?.abbr;
  const winScore = Math.max(awayScore, homeScore);
  const loseScore = Math.min(awayScore, homeScore);
  const topName = top?.short || top?.name || '';
  const pts = top?.pts || 0;
  const reb = top?.reb || 0;
  const ast = top?.ast || 0;
  const doubles = [pts >= 10, reb >= 10, ast >= 10].filter(Boolean).length;
  const isTripleDouble = doubles >= 3;
  const isThriller = margin <= 3;
  const isBlowout = margin >= 20;
  const isClose = margin <= 7;
  const is40Plus = pts >= 40;

  // Build first sentence: the result
  const id1 = isThriller
    ? `${winnerAbbr} menang tipis atas ${loserAbbr} ${winScore}-${loseScore}, selisih ${margin} poin sampai peluit akhir.`
    : isBlowout
    ? `${winnerAbbr} bantai ${loserAbbr} ${winScore}-${loseScore} dengan margin ${margin} poin.`
    : isClose
    ? `${winnerAbbr} unggul ${winScore}-${loseScore} atas ${loserAbbr} dalam laga ketat.`
    : `${winnerAbbr} kalahkan ${loserAbbr} ${winScore}-${loseScore}.`;

  const en1 = isThriller
    ? `${winnerAbbr} edged ${loserAbbr} ${winScore}-${loseScore} in a ${margin}-point thriller that went down to the final buzzer.`
    : isBlowout
    ? `${winnerAbbr} blew out ${loserAbbr} ${winScore}-${loseScore}, winning by ${margin}.`
    : isClose
    ? `${winnerAbbr} held off ${loserAbbr} ${winScore}-${loseScore} in a tightly-contested game.`
    : `${winnerAbbr} beat ${loserAbbr} ${winScore}-${loseScore}.`;

  // Build second sentence: the star + stat line
  let id2 = '';
  let en2 = '';
  if (topName) {
    if (isTripleDouble) {
      id2 = ` ${topName} cetak triple-double ${pts}/${reb}/${ast}${top.teamAbbr === winnerAbbr ? ' untuk pemenang' : ''}.`;
      en2 = ` ${topName} recorded a triple-double (${pts} PTS, ${reb} REB, ${ast} AST)${top.teamAbbr === winnerAbbr ? ' in the win' : ''}.`;
    } else if (is40Plus) {
      id2 = ` ${topName} meledak ${pts} poin — top scorer malam ini.`;
      en2 = ` ${topName} went off for ${pts} points to lead all scorers.`;
    } else if (pts >= 30) {
      id2 = ` ${topName} bukukan ${pts} PTS, ${reb} REB, ${ast} AST untuk ${top.teamAbbr}.`;
      en2 = ` ${topName} finished with ${pts} points, ${reb} rebounds, and ${ast} assists for ${top.teamAbbr}.`;
    } else if (pts >= 20) {
      id2 = ` ${topName} memimpin ${top.teamAbbr} dengan ${pts} poin.`;
      en2 = ` ${topName} paced ${top.teamAbbr} with ${pts} points.`;
    } else {
      id2 = ` ${topName} top scorer dengan ${pts} PTS.`;
      en2 = ` ${topName} led all scorers with ${pts}.`;
    }
  }

  return lang === 'id' ? (id1 + id2) : (en1 + en2);
}

/**
 * Pull the top scorer from EACH team (not just the overall top).
 * Used to render head-to-head "hero" chips on each recap card.
 */
function topByTeam(boxscore) {
  const out = {};
  if (!Array.isArray(boxscore)) return out;
  for (const team of boxscore) {
    let best = null;
    for (const p of team.players || []) {
      if (p.dnp) continue;
      if (!best || (p.pts || 0) > (best.pts || 0)) best = { ...p, teamAbbr: team.abbr };
    }
    if (best) out[team.abbr] = best;
  }
  return out;
}

/**
 * Derive 2-3 "stat edges" — cases where one team clearly won a stat category.
 * Pulled from ESPN's team totals (FG%, 3P%, REB, TO, etc.). Only include edges
 * that are materially different (>= threshold per stat).
 */
function pickStatEdges(teamTotals, awayAbbr, homeAbbr, lang) {
  if (!Array.isArray(teamTotals) || teamTotals.length < 2) return [];
  const away = teamTotals.find((t) => t.abbr === awayAbbr);
  const home = teamTotals.find((t) => t.abbr === homeAbbr);
  if (!away || !home) return [];

  const pick = (stats, aliases) => {
    for (const a of aliases) {
      if (stats?.[a] !== undefined && stats?.[a] !== null) return stats[a];
    }
    return null;
  };
  const toNum = (v) => {
    if (v === null || v === undefined) return null;
    const n = parseFloat(String(v).replace('%', '').trim());
    return Number.isFinite(n) ? n : null;
  };

  const CANDIDATES = [
    { key: 'fg%',  label: 'FG%',     aliases: ['Field Goal %', 'FG %', 'FG%'], threshold: 5, pct: true },
    { key: '3p%',  label: '3P%',     aliases: ['Three Point %', '3P %', '3P%'], threshold: 8, pct: true },
    { key: 'reb',  label: lang === 'id' ? 'REB' : 'REB', aliases: ['Rebounds', 'Total Rebounds', 'REB'], threshold: 6 },
    { key: 'ast',  label: 'AST', aliases: ['Assists', 'AST'], threshold: 5 },
    { key: 'to',   label: 'TO', aliases: ['Turnovers', 'TO'], threshold: 4, lowerWins: true },
  ];

  const edges = [];
  for (const row of CANDIDATES) {
    const aRaw = pick(away.stats, row.aliases);
    const hRaw = pick(home.stats, row.aliases);
    const aN = toNum(aRaw);
    const hN = toNum(hRaw);
    if (aN === null || hN === null) continue;
    const diff = Math.abs(aN - hN);
    if (diff < row.threshold) continue;
    const awayWins = row.lowerWins ? aN < hN : aN > hN;
    const winnerAbbr = awayWins ? awayAbbr : homeAbbr;
    const winnerVal = awayWins ? aRaw : hRaw;
    const loserVal = awayWins ? hRaw : aRaw;
    edges.push({
      label: row.label,
      winnerAbbr,
      winnerVal,
      loserVal,
      diff: row.pct ? `+${diff.toFixed(1)}pp` : `+${Math.round(diff)}`,
    });
  }
  // Prioritize shooting % edges (they drive outcomes); cap at 3.
  const priority = { 'FG%': 0, '3P%': 1, 'REB': 2, 'AST': 3, 'TO': 4 };
  edges.sort((a, b) => (priority[a.label] ?? 9) - (priority[b.label] ?? 9));
  return edges.slice(0, 3);
}

/**
 * Build a 2-4 sentence "detail" paragraph giving richer context beyond the
 * headline narrative. Covers: losing team's top scorer, stat-edge callout,
 * and a secondary standout player if one exists (25+ pts not being the
 * overall top scorer).
 */
function buildDeepDetails({ game, summary, topByTeamMap, statEdges, lang }) {
  // Score-derived winner — same fix as buildGameNarrative. See note there.
  const awayScore = parseInt(game.away?.score || 0);
  const homeScore = parseInt(game.home?.score || 0);
  const awayIsWinner = awayScore > homeScore;
  const winnerAbbr = awayIsWinner ? game.away?.abbr : game.home?.abbr;
  const loserAbbr  = awayIsWinner ? game.home?.abbr : game.away?.abbr;
  const out = [];

  // Losing team's star — gives both fanbases a reason to read.
  const loserStar = topByTeamMap?.[loserAbbr];
  if (loserStar) {
    const pts = loserStar.pts || 0;
    const reb = loserStar.reb || 0;
    const ast = loserStar.ast || 0;
    const name = loserStar.short || loserStar.name;
    if (pts >= 20) {
      out.push(lang === 'id'
        ? `Dari kubu ${loserAbbr}, ${name} tampil solid dengan ${pts} PTS · ${reb} REB · ${ast} AST — sayang tak cukup bawa timnya menang.`
        : `For ${loserAbbr}, ${name} put up ${pts} PTS, ${reb} REB, ${ast} AST — not enough to steal the game.`);
    } else if (pts >= 12) {
      out.push(lang === 'id'
        ? `${name} jadi top scorer ${loserAbbr} dengan ${pts} poin.`
        : `${name} led ${loserAbbr} with ${pts} points.`);
    }
  }

  // Stat edge — the one thing that decided it on paper.
  const topEdge = statEdges?.[0];
  if (topEdge) {
    out.push(lang === 'id'
      ? `Kemenangan datang dari ${topEdge.label}: ${topEdge.winnerAbbr} ${topEdge.winnerVal} vs ${topEdge.loserVal} (${topEdge.diff}).`
      : `The edge came from ${topEdge.label}: ${topEdge.winnerAbbr} ${topEdge.winnerVal} to ${topEdge.loserVal} (${topEdge.diff}).`);
  }

  // Pivotal moment — if we have plays, surface the biggest single run or
  // largest lead. Cheap to compute from the scoring series.
  if (Array.isArray(summary?.plays)) {
    let biggestLead = 0;
    let biggestLeadAbbr = null;
    for (const p of summary.plays) {
      if (p.awayScore === undefined || p.homeScore === undefined) continue;
      const a = parseInt(p.awayScore, 10);
      const h = parseInt(p.homeScore, 10);
      if (!Number.isFinite(a) || !Number.isFinite(h)) continue;
      const lead = h - a;
      if (Math.abs(lead) > Math.abs(biggestLead)) {
        biggestLead = lead;
        biggestLeadAbbr = lead > 0 ? summary.homeAbbr : summary.awayAbbr;
      }
    }
    if (biggestLeadAbbr && Math.abs(biggestLead) >= 10) {
      const absLead = Math.abs(biggestLead);
      out.push(lang === 'id'
        ? `Unggul terbesar: ${biggestLeadAbbr} +${absLead} poin — cukup untuk menutup laga.`
        : `Biggest lead: ${biggestLeadAbbr} by ${absLead} — enough to ice the game.`);
    }
  }

  return out;
}

/**
 * Pull the full playoff recap for a given date (YYYY-MM-DD).
 *  - scoreboard for that date
 *  - per-game summary (boxscore + plays) for each completed game
 *
 * Also derives:
 *  - topPerformerByGame: top scorer with full line (pts/reb/ast)
 *  - narratives: per-game 1-2 sentence language-aware storyline
 *  - biggestMoment: the one story the whole day should lead with
 *    (upset / OT / monster performance / nail-biter / blowout)
 */
export function useDailyRecap(dateIso, lang = 'id') {
  const [games, setGames] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dateIso) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Use local-date bucketing so recap matches the homepage's day tabs.
        // ESPN's ?dates=YYYYMMDD is ET — a Jakarta Sunday would miss Sunday-
        // morning games that ESPN tagged Saturday-ET. fetchScoreboardForLocalDate
        // expands ±1 day and re-buckets by user-local date.
        const results = await fetchScoreboardForLocalDate(dateIso);
        if (cancelled) return;
        const completed = (results || []).filter((g) => g.statusState === 'post');
        setGames(completed);

        // Fetch summaries in parallel (throttled to 4 at a time)
        const summariesAcc = {};
        for (let i = 0; i < completed.length; i += 4) {
          const batch = completed.slice(i, i + 4);
          const batchResults = await Promise.all(batch.map((g) => cachedSummary(g.id)));
          batch.forEach((g, idx) => {
            if (batchResults[idx]) summariesAcc[g.id] = batchResults[idx];
          });
          if (cancelled) return;
        }
        setSummaries(summariesAcc);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [dateIso]);

  // Derive top performer per game from boxscore
  const topPerformers = useMemo(() => {
    const out = {};
    for (const [eventId, s] of Object.entries(summaries)) {
      if (!s?.boxscore) continue;
      let best = null;
      for (const team of s.boxscore) {
        for (const p of team.players || []) {
          if (p.dnp) continue;
          if (!best || (p.pts || 0) > (best.pts || 0)) {
            best = { ...p, teamAbbr: team.abbr };
          }
        }
      }
      if (best) out[eventId] = best;
    }
    return out;
  }, [summaries]);

  // Per-game 1-2 sentence narrative — rebuilt when lang flips so EN toggle
  // actually flips the prose. Used by <GameRecapCard> for the summary line.
  const narratives = useMemo(() => {
    const out = {};
    for (const g of games) {
      out[g.id] = buildGameNarrative({ game: g, top: topPerformers[g.id], lang });
    }
    return out;
  }, [games, topPerformers, lang]);

  // Per-game top scorer from EACH team (not just the overall top). Lets the
  // recap card show head-to-head hero chips — gives both fanbases a face.
  const topByTeamPerGame = useMemo(() => {
    const out = {};
    for (const [eventId, s] of Object.entries(summaries)) {
      out[eventId] = topByTeam(s?.boxscore);
    }
    return out;
  }, [summaries]);

  // Per-game stat edges (FG%, 3P%, REB, AST, TO) — computed from ESPN team
  // totals added in v0.1.3. Only edges above a material threshold are surfaced.
  const statEdgesPerGame = useMemo(() => {
    const out = {};
    for (const g of games) {
      const s = summaries[g.id];
      out[g.id] = pickStatEdges(s?.teamTotals, g.away?.abbr, g.home?.abbr, lang);
    }
    return out;
  }, [games, summaries, lang]);

  // Per-game deep details — 2-3 extra sentences beyond the headline narrative.
  // Covers losing team's star + stat edge + biggest lead.
  const deepDetailsPerGame = useMemo(() => {
    const out = {};
    for (const g of games) {
      out[g.id] = buildDeepDetails({
        game: g,
        summary: summaries[g.id],
        topByTeamMap: topByTeamPerGame[g.id],
        statEdges: statEdgesPerGame[g.id],
        lang,
      });
    }
    return out;
  }, [games, summaries, topByTeamPerGame, statEdgesPerGame, lang]);

  // One-line per-game "digest" used in the full-day share text. Bahasa-casual.
  // Example: "LAL 112-108 DEN · LeBron 32"
  const gameDigests = useMemo(() => {
    return games.map((g) => {
      const away = parseInt(g.away?.score || 0);
      const home = parseInt(g.home?.score || 0);
      // Score-derived winner (ESPN's winner flag isn't reliable — see buildGameNarrative).
      const awayIsWinner = away > home;
      const winner = awayIsWinner ? g.away?.abbr : g.home?.abbr;
      const loser  = awayIsWinner ? g.home?.abbr : g.away?.abbr;
      const winScore = Math.max(away, home);
      const loseScore = Math.min(away, home);
      const top = topPerformers[g.id];
      const tail = top ? ` · ${top.short || top.name} ${top.pts}` : '';
      return `${winner} ${winScore}-${loseScore} ${loser}${tail}`;
    });
  }, [games, topPerformers]);

  // Derive the single "biggest moment" of the day across all games
  // Score each game, pick the highest. Lang-aware — re-computes when user flips.
  const biggestMoment = useMemo(() => {
    if (games.length === 0) return null;
    let best = null;
    let bestScore = -1;
    for (const g of games) {
      const awayScore = parseInt(g.away?.score || 0);
      const homeScore = parseInt(g.home?.score || 0);
      const margin = Math.abs(awayScore - homeScore);
      // Score-derived winner — same fix as buildGameNarrative.
      const wonByAway = awayScore > homeScore;
      const winnerAbbr = wonByAway ? g.away?.abbr : g.home?.abbr;
      const loserAbbr = wonByAway ? g.home?.abbr : g.away?.abbr;
      const top = topPerformers[g.id];
      const winScore = Math.max(awayScore, homeScore);
      const loseScore = Math.min(awayScore, homeScore);

      let score = 0;
      let tag = lang === 'id' ? 'REKAP' : 'RECAP';
      let headline = lang === 'id'
        ? `${winnerAbbr} kalahkan ${loserAbbr} ${winScore}-${loseScore}`
        : `${winnerAbbr} beat ${loserAbbr} ${winScore}-${loseScore}`;
      let caption = '';

      if (margin <= 3) {
        score += 25; tag = 'NAIL-BITER';
        headline = lang === 'id'
          ? `${winnerAbbr} menang tipis ${winScore}-${loseScore} · selisih ${margin}`
          : `${winnerAbbr} edged ${loserAbbr} ${winScore}-${loseScore} in a ${margin}-point thriller`;
        caption = lang === 'id'
          ? 'Laga ketat sampai detik terakhir.'
          : 'A back-and-forth game that came down to the final possession.';
      } else if (margin >= 20) {
        score += 12; tag = 'BLOWOUT';
        headline = lang === 'id'
          ? `${winnerAbbr} bantai ${loserAbbr} dengan selisih ${margin} poin`
          : `${winnerAbbr} blew out ${loserAbbr} by ${margin}`;
        caption = lang === 'id'
          ? 'Pesta angka sejak kuarter pertama.'
          : 'A lopsided win from the opening tip.';
      }

      if (top && (top.pts || 0) >= 40) {
        score += 30; tag = `${top.pts} ${lang === 'id' ? 'POIN' : 'POINTS'}`;
        headline = lang === 'id'
          ? `${top.short || top.name} meledak ${top.pts} poin, ${winnerAbbr} menang ${winScore}-${loseScore}`
          : `${top.short || top.name} erupts for ${top.pts}, ${winnerAbbr} beat ${loserAbbr} ${winScore}-${loseScore}`;
        caption = lang === 'id'
          ? `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — pertunjukan individu malam ini.`
          : `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — the night's marquee performance.`;
      } else if (top && (top.pts || 0) >= 30 && margin <= 8) {
        score += 20; tag = `${top.pts} ${lang === 'id' ? 'POIN' : 'POINTS'}`;
        headline = lang === 'id'
          ? `${top.short || top.name} ${top.pts} poin bawa ${winnerAbbr} menang ${winScore}-${loseScore}`
          : `${top.short || top.name} drops ${top.pts} to lift ${winnerAbbr} past ${loserAbbr} ${winScore}-${loseScore}`;
        caption = lang === 'id'
          ? `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — clutch sampai detik akhir.`
          : `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — clutch down the stretch.`;
      }

      if (top) {
        const doubles = [top.pts >= 10, top.reb >= 10, top.ast >= 10].filter(Boolean).length;
        if (doubles >= 3) {
          score += 35; tag = 'TRIPLE-DOUBLE';
          headline = lang === 'id'
            ? `${top.short || top.name} cetak triple-double, ${winnerAbbr} menang ${winScore}-${loseScore}`
            : `${top.short || top.name} records a triple-double as ${winnerAbbr} beat ${loserAbbr} ${winScore}-${loseScore}`;
          caption = lang === 'id'
            ? `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — catatan bersejarah playoff.`
            : `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — a playoff triple-double.`;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = { game: g, tag, headline, caption, topPerformer: top, margin };
      }
    }
    return best;
  }, [games, topPerformers, lang]);

  return {
    games,
    summaries,
    topPerformers,
    topByTeamPerGame,
    statEdgesPerGame,
    deepDetailsPerGame,
    narratives,
    biggestMoment,
    gameDigests,
    loading,
    error,
  };
}
