// v0.59.0 — Match strip aggregator.
//
// Takes the per-sport hook outputs (NBA, EPL, Liga 1, F1, Tennis) and
// reduces them into a single unified `items` array suitable for the
// home page Match Strip ("Hari ini" + "Skor terakhir").
//
// Two flavors via mode:
//   • 'upcoming' — kickoff in [now, now + 36h] AND status !== 'final'
//   • 'results'  — final games whose kickoff was in [now − 36h, now]
//
// Unified item shape:
//   {
//     sport: 'nba' | 'epl' | 'liga-1-id' | 'f1' | 'tennis',
//     id: string (sport-prefixed for uniqueness),
//     kickoffUtc: ISO string,
//     statusState: 'pre' | 'in' | 'post',
//     a: { label, score },      // away or first competitor
//     b: { label, score },      // home or second competitor
//     statusLabel: string,      // "FINAL" / "WIB 21:00" / "Q3 5:42"
//     subtitle?: string,        // "GP Miami" for F1, tournament name for tennis
//     href: string,             // detail URL
//   }
//
// Scope decisions:
//   • F1 — only one race per week. If the race is in the window, surface
//     it; results show winner + podium summary; upcoming shows kickoff
//     time. If no race in window, returns nothing for F1.
//   • Tennis — too many matches across multiple tournaments per day.
//     Surface only "headliner" matches (top-10 ranked players visible).
//     If we can't determine ranking from the scoreboard payload, skip
//     tennis for v1 to keep the strip clean.
//   • NBA — usePlayoffData covers today + a 7-day window. We pick from
//     `gamesByDay` if available; otherwise from `games`. Yesterday's
//     completed games come from useYesterday hook via an explicit param.
//   • EPL + Liga 1 — both already split into `upcoming` and `recent`.

const HOURS = 3600 * 1000;
const WINDOW_MS = 36 * HOURS;

function fmtWib(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Asia/Jakarta is UTC+7. Format as HH:mm.
  const opts = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false };
  return new Intl.DateTimeFormat('id-ID', opts).format(d);
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function daySuffix(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return '';
  const tomorrow = new Date(now.getTime() + 24 * HOURS);
  if (d.toDateString() === tomorrow.toDateString()) return ' BESOK';
  return ' ' + new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
}

// ─── NBA ─────────────────────────────────────────────────────────
export function nbaItems({ games = [], yesterday = [], mode }) {
  const now = Date.now();
  const out = [];

  if (mode === 'results') {
    // useYesterday already filtered to status='post' for the previous calendar day
    for (const g of yesterday) {
      out.push(toNbaItem(g, 'post'));
    }
    // Plus any completed games from today's scoreboard
    for (const g of games) {
      if (g.statusState !== 'post') continue;
      // Avoid double-adding if yesterday list already has this id
      if (yesterday.some((y) => y.id === g.id)) continue;
      out.push(toNbaItem(g, 'post'));
    }
  } else {
    // upcoming — anything not yet final, in next 36h, or live now
    for (const g of games) {
      if (g.statusState === 'post') continue;
      // We don't have a precise kickoff in the playoff payload —
      // status string carries it. Trust the live/scheduled split:
      // include all 'in' (live) plus 'pre' from today + tomorrow.
      out.push(toNbaItem(g, g.statusState));
    }
  }
  return out;
}

function toNbaItem(g, statusState) {
  const homeAbbr = g.home?.abbr || '?';
  const awayAbbr = g.away?.abbr || '?';
  const homeScore = g.home?.score != null ? Number(g.home.score) : null;
  const awayScore = g.away?.score != null ? Number(g.away.score) : null;
  let statusLabel;
  if (statusState === 'post') statusLabel = 'FINAL';
  else if (statusState === 'in') statusLabel = (g.status || 'LIVE').toString().toUpperCase();
  else statusLabel = (g.status || '').toString().toUpperCase() || 'TBD';
  return {
    sport: 'nba',
    id: `nba-${g.id}`,
    kickoffUtc: g.date || null,
    statusState,
    a: { label: awayAbbr, score: awayScore },
    b: { label: homeAbbr, score: homeScore },
    statusLabel,
    href: `/nba-playoff-2026/game/${g.id}`,
  };
}

// ─── EPL / Liga 1 (same shape) ───────────────────────────────────
export function soccerItems({ upcoming = [], recent = [], league, mode }) {
  const now = Date.now();
  const out = [];
  if (mode === 'results') {
    for (const m of recent) {
      const ko = new Date(m.kickoffUtc).getTime();
      if (now - ko > WINDOW_MS) continue;
      out.push(toSoccerItem(m, league, 'post'));
    }
  } else {
    for (const m of upcoming) {
      const ko = new Date(m.kickoffUtc).getTime();
      // Live games (in) always included; scheduled games only if within 36h
      if (m.statusState === 'in') out.push(toSoccerItem(m, league, 'in'));
      else if (ko - now < WINDOW_MS && ko - now > -3 * HOURS) {
        out.push(toSoccerItem(m, league, 'pre'));
      }
    }
  }
  return out;
}

function toSoccerItem(m, league, statusState) {
  const aLabel = m.away?.shortName || m.away?.name || '';
  const bLabel = m.home?.shortName || m.home?.name || '';
  let statusLabel;
  if (statusState === 'post') statusLabel = 'FT';
  else if (statusState === 'in') statusLabel = (m.statusDetail || 'LIVE').toUpperCase();
  else statusLabel = `WIB ${fmtWib(m.kickoffUtc)}${daySuffix(m.kickoffUtc)}`;
  const slug = `${league}-${m.away?.slug || aLabel.toLowerCase().replace(/\s+/g, '-')}-vs-${m.home?.slug || bLabel.toLowerCase().replace(/\s+/g, '-')}-${(m.kickoffUtc || '').slice(0, 10)}`;
  return {
    sport: league,
    id: `${league}-${m.id}`,
    kickoffUtc: m.kickoffUtc,
    statusState,
    a: { label: aLabel, score: statusState !== 'pre' ? m.awayScore ?? m.away?.score : null },
    b: { label: bLabel, score: statusState !== 'pre' ? m.homeScore ?? m.home?.score : null },
    statusLabel,
    href: statusState === 'post' ? `/recap/${slug}` : `/preview/${slug}`,
  };
}

// ─── F1 ──────────────────────────────────────────────────────────
export function f1Items({ races = [], resultsByRound = {}, mode }) {
  const now = Date.now();
  const out = [];
  for (const r of races) {
    const raceTime = new Date(`${r.date}T${r.time || '00:00:00Z'}`).getTime();
    if (Number.isNaN(raceTime)) continue;
    const ahead = raceTime - now;
    if (mode === 'results') {
      // Race finished within last 36h
      if (ahead > 0 || -ahead > WINDOW_MS) continue;
      const result = resultsByRound[r.round];
      if (!result || !result.length) continue;
      const winner = result[0];
      out.push({
        sport: 'f1',
        id: `f1-r${r.round}`,
        kickoffUtc: new Date(raceTime).toISOString(),
        statusState: 'post',
        a: { label: winner.driver?.code || winner.Driver?.code || winner.driverCode || 'WIN', score: 'P1' },
        b: { label: result[1]?.driver?.code || result[1]?.Driver?.code || 'P2', score: 'P2' },
        statusLabel: 'FINAL',
        subtitle: r.raceName || r.name || `Round ${r.round}`,
        href: `/formula-1-2026/race/${r.slug || r.round}`,
      });
    } else {
      // Race in next 36h or live (within race-day window)
      if (ahead < -3 * HOURS || ahead > WINDOW_MS) continue;
      out.push({
        sport: 'f1',
        id: `f1-r${r.round}`,
        kickoffUtc: new Date(raceTime).toISOString(),
        statusState: ahead < 0 ? 'in' : 'pre',
        a: { label: r.country || r.location || '', score: null },
        b: { label: '', score: null },
        statusLabel: ahead < 0 ? 'LIVE' : `WIB ${fmtWib(new Date(raceTime).toISOString())}${daySuffix(new Date(raceTime).toISOString())}`,
        subtitle: r.raceName || r.name || `Round ${r.round}`,
        href: `/formula-1-2026/race/${r.slug || r.round}`,
      });
    }
  }
  return out;
}

// ─── Aggregate + sort ────────────────────────────────────────────
export function aggregateMatches({ nba, epl, ligaId, f1, mode = 'upcoming' }) {
  const all = [
    ...nbaItems({ games: nba?.games || [], yesterday: nba?.yesterday || [], mode }),
    ...soccerItems({ upcoming: epl?.upcoming || [], recent: epl?.recent || [], league: 'epl', mode }),
    ...soccerItems({ upcoming: ligaId?.upcoming || [], recent: ligaId?.recent || [], league: 'liga-1-id', mode }),
    ...f1Items({ races: f1?.races || [], resultsByRound: f1?.resultsByRound || {}, mode }),
  ];

  // Sort:
  //   upcoming → soonest first (live first, then by kickoff asc)
  //   results  → most recent first
  if (mode === 'upcoming') {
    all.sort((x, y) => {
      const xLive = x.statusState === 'in' ? 0 : 1;
      const yLive = y.statusState === 'in' ? 0 : 1;
      if (xLive !== yLive) return xLive - yLive;
      return new Date(x.kickoffUtc || 0) - new Date(y.kickoffUtc || 0);
    });
  } else {
    all.sort((x, y) => new Date(y.kickoffUtc || 0) - new Date(x.kickoffUtc || 0));
  }

  return all;
}
