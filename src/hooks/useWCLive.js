import { useEffect, useState } from 'react';
import { readCache, writeCache } from '../lib/swrCache.js';

// ============================================================================
// v0.79.26 — WC2026 live data for the /fifa-world-cup-2026 hub (go-live).
//
// Two API-Football calls through the existing edge proxy (paid key lives
// server-side; the proxy caches s-maxage so N viewers ≈ 1 upstream call):
//
//   /api/proxy/api-football/standings?league=1&season=2026
//     → response[0].league.standings = [[...group rows], ...] — 12 groups
//       ("Group A".."Group L") + a "Ranking of third-placed teams" block.
//   /api/proxy/api-football/fixtures?league=1&season=2026&from=Y-M-D&to=Y-M-D
//     → 3-day window (yesterday → tomorrow) so the strip shows finished,
//       live (with running score), and upcoming matches.
//
// SWR: serve cache instantly, refresh in the background. Standings TTL 5m,
// fixtures TTL 60s (live scores).
// ============================================================================

const BASE = '/api/proxy/api-football';

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

export function useWCStandings() {
  const [groups, setGroups] = useState(() => readCache('wc-standings', { ttlMs: 5 * 60 * 1000 }) || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/standings?league=1&season=2026`);
        if (!res.ok) throw new Error(`standings HTTP ${res.status}`);
        const data = await res.json();
        const raw = data?.response?.[0]?.league?.standings || [];
        const mapped = raw
          .filter((g) => /^Group\s+[A-L]$/i.test(g?.[0]?.group || ''))
          .map((g) => ({
            letter: (g[0].group.match(/Group\s+([A-L])/i) || [])[1],
            rows: g.map((r) => ({
              rank: r.rank,
              name: r.team?.name,
              logo: r.team?.logo,
              played: r.all?.played ?? 0,
              win: r.all?.win ?? 0,
              draw: r.all?.draw ?? 0,
              lose: r.all?.lose ?? 0,
              gd: r.goalsDiff ?? 0,
              points: r.points ?? 0,
            })),
          }));
        if (!cancelled && mapped.length) {
          setGroups(mapped);
          writeCache('wc-standings', mapped);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { groups, error };
}

export function useWCFixtures(pollMs = 60000) {
  const [fixtures, setFixtures] = useState(() => readCache('wc-fixtures-3d', { ttlMs: 60 * 1000 }) || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const now = new Date();
        const from = ymd(new Date(now.getTime() - 24 * 3600 * 1000));
        const to = ymd(new Date(now.getTime() + 2 * 24 * 3600 * 1000));
        const res = await fetch(`${BASE}/fixtures?league=1&season=2026&from=${from}&to=${to}`);
        if (!res.ok) throw new Error(`fixtures HTTP ${res.status}`);
        const data = await res.json();
        const mapped = (data?.response || [])
          .map((f) => ({
            id: f.fixture?.id,
            date: f.fixture?.date,
            statusShort: f.fixture?.status?.short, // NS / 1H / HT / 2H / FT …
            elapsed: f.fixture?.status?.elapsed,
            round: f.league?.round,
            home: { name: f.teams?.home?.name, logo: f.teams?.home?.logo, goals: f.goals?.home },
            away: { name: f.teams?.away?.name, logo: f.teams?.away?.logo, goals: f.goals?.away },
          }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (!cancelled) {
          setFixtures(mapped);
          writeCache('wc-fixtures-3d', mapped);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }
    load();
    const t = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(t); };
  }, [pollMs]);

  return { fixtures, error };
}

export const WC_LIVE_STATES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

export function wcKickoffWIB(iso) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso)).replace(':', '.') + ' WIB';
  } catch {
    return '';
  }
}

export function wcDayLabel(iso, lang = 'id') {
  try {
    return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
