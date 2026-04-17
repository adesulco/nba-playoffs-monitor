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
 * Pull the full playoff recap for a given date (YYYY-MM-DD).
 *  - scoreboard for that date
 *  - per-game summary (boxscore + plays) for each completed game
 *
 * Also derives:
 *  - topPerformerByGame: top scorer with full line (pts/reb/ast)
 *  - biggestMoment: the one story the whole day should lead with
 *    (upset / OT / monster performance / nail-biter / blowout)
 */
export function useDailyRecap(dateIso) {
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

  // Derive the single "biggest moment" of the day across all games
  // Score each game, pick the highest
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

      let score = 0;
      let tag = 'REKAP';
      let headline = `${winnerAbbr} kalahkan ${loserAbbr} ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)}`;
      let caption = '';

      if (margin <= 3) {
        score += 25; tag = 'NAIL-BITER';
        headline = `${winnerAbbr} menang tipis ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)} · selisih ${margin}`;
        caption = 'Laga ketat sampai detik terakhir.';
      } else if (margin >= 20) {
        score += 12; tag = 'BLOWOUT';
        headline = `${winnerAbbr} bantai ${loserAbbr} dengan selisih ${margin} poin`;
        caption = 'Pesta angka sejak kuarter pertama.';
      }

      if (top && (top.pts || 0) >= 40) {
        score += 30; tag = `${top.pts} POIN`;
        headline = `${top.short || top.name} meledak ${top.pts} poin, ${winnerAbbr} menang ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)}`;
        caption = `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — pertunjukan individu malam ini.`;
      } else if (top && (top.pts || 0) >= 30 && margin <= 8) {
        score += 20; tag = `${top.pts} POIN`;
        headline = `${top.short || top.name} ${top.pts} poin bawa ${winnerAbbr} menang ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)}`;
        caption = `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — clutch sampai detik akhir.`;
      }

      if (top) {
        const doubles = [top.pts >= 10, top.reb >= 10, top.ast >= 10].filter(Boolean).length;
        if (doubles >= 3) {
          score += 35; tag = 'TRIPLE-DOUBLE';
          headline = `${top.short || top.name} cetak triple-double, ${winnerAbbr} menang ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)}`;
          caption = `${top.pts} PTS · ${top.reb} REB · ${top.ast} AST — catatan bersejarah playoff.`;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = { game: g, tag, headline, caption, topPerformer: top, margin };
      }
    }
    return best;
  }, [games, topPerformers]);

  return { games, summaries, topPerformers, biggestMoment, loading, error };
}
