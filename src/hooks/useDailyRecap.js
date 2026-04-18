import { useState, useEffect, useMemo } from 'react';
import { fetchScoreboardForDate, fetchGameSummary } from '../lib/api.js';

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
  const winnerAbbr = game.away?.winner ? game.away?.abbr : game.home?.abbr;
  const loserAbbr = game.away?.winner ? game.home?.abbr : game.away?.abbr;
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
    const yyyymmdd = dateIso.replace(/-/g, '');

    async function load() {
      setLoading(true);
      try {
        const results = await fetchScoreboardForDate(yyyymmdd);
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
      const wonByAway = g.away?.winner;
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

  return { games, summaries, topPerformers, narratives, biggestMoment, loading, error };
}
