import { useState, useEffect } from 'react';
import { fetchScoreboardForDate, fetchGameSummary } from '../lib/api.js';

/**
 * Aggregate clutch stats across recent completed playoff games.
 *
 * Clutch definition: plays in the last 5:00 of Q4 or any OT, while the
 * game was within 5 points.
 *
 * For each player, aggregate:
 *   - clutchPts (points scored on successful shooting plays)
 *   - clutchAttempts (any shooting play)
 *   - clutchMade (makes)
 *   - appearances (unique games they played in clutch time)
 *
 * Fetches once per (startIso..endIso). Re-runs every 20 minutes.
 * In-memory cache of per-game summaries keeps re-runs cheap.
 */

const summaryCache = new Map(); // eventId -> { at, summary }
const SUMMARY_TTL = 20 * 60 * 1000;

function yyyymmdd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

async function cachedSummary(eventId) {
  const hit = summaryCache.get(eventId);
  if (hit && Date.now() - hit.at < SUMMARY_TTL) return hit.summary;
  try {
    const s = await fetchGameSummary(eventId);
    summaryCache.set(eventId, { at: Date.now(), summary: s });
    return s;
  } catch {
    return null;
  }
}

function isClutch(p) {
  if (!p || !p.period || p.clockSeconds == null) return false;
  // Final period (4) or OT (5+), last 5:00 (<=300s)
  if (p.period < 4) return false;
  if (p.clockSeconds > 300) return false;
  const margin = Math.abs((p.awayScore ?? 0) - (p.homeScore ?? 0));
  return margin <= 5;
}

export function useClutchLeaderboard(startIso = '2026-04-17', endIso = '2026-07-01') {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coveredGames, setCoveredGames] = useState(0);

  useEffect(() => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const today = new Date();
    const until = today < end ? today : end;

    const dates = [];
    for (let d = new Date(start); d <= until; d.setDate(d.getDate() + 1)) {
      dates.push(yyyymmdd(d));
    }
    if (dates.length === 0) { setLoading(false); return; }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Step 1: scoreboards → completed event IDs
        const boards = await Promise.allSettled(dates.map((d) => fetchScoreboardForDate(d)));
        const eventIds = [];
        for (const r of boards) {
          if (r.status !== 'fulfilled') continue;
          for (const g of r.value) {
            if (g.statusState === 'post' && g.id) eventIds.push(g.id);
          }
        }

        if (cancelled) return;

        // Step 2: fetch summaries (throttle to 4 in parallel)
        const summaries = [];
        for (let i = 0; i < eventIds.length; i += 4) {
          const batch = eventIds.slice(i, i + 4);
          const results = await Promise.all(batch.map((id) => cachedSummary(id)));
          summaries.push(...results.filter(Boolean));
          if (cancelled) return;
        }

        // Step 3: aggregate clutch stats by playerId
        const byId = {}; // id -> { id, name, teamAbbr, attempts, made, pts, games }
        const seenGames = {}; // "gameId|playerId" -> true

        for (const s of summaries) {
          if (!s?.plays) continue;
          for (const p of s.plays) {
            if (!isClutch(p) || !p.athleteId || !p.shootingPlay) continue;
            const key = p.athleteId;
            if (!byId[key]) {
              byId[key] = {
                id: p.athleteId,
                name: p.athleteName || 'Unknown',
                teamAbbr: p.teamId === s.homeId ? s.homeAbbr : p.teamId === s.awayId ? s.awayAbbr : null,
                attempts: 0,
                made: 0,
                pts: 0,
                games: 0,
              };
            }
            byId[key].attempts += 1;
            if (p.scoringPlay) {
              byId[key].made += 1;
              byId[key].pts += (p.scoreValue || 0);
            }
            // Track unique games per player
            const gk = `${s.awayAbbr}-${s.homeAbbr}|${p.athleteId}`;
            if (!seenGames[gk]) {
              seenGames[gk] = true;
              byId[key].games += 1;
            }
          }
        }

        // Sort: pts desc, then made desc, then fewer attempts (efficiency)
        const arr = Object.values(byId)
          .filter((x) => x.attempts > 0)
          .sort((a, b) => b.pts - a.pts || b.made - a.made || a.attempts - b.attempts);

        if (!cancelled) {
          setLeaders(arr.slice(0, 20));
          setCoveredGames(summaries.length);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 20 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [startIso, endIso]);

  return { leaders, loading, coveredGames };
}
