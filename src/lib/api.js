// v0.79.0 — Komdigi de-risk 2026-05-23. All futures-odds fetchers
// (fetchChampionOdds, fetchFuturesOddsEvent, fetchMvpOdds,
// fetchPriceHistory) plus the POLY_BASE / POLY_CLOB_BASE proxy URLs
// were sourced from the futures-odds provider blocked by the regulator.
// The four exports + their proxy registry entries are gone. ESPN
// scoreboard / schedule / team / leaders / win-probability fetchers
// below are unaffected — those are a statistical model + game
// metadata.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

/**
 * ESPN scoreboard — today's games, with live scores.
 */
export async function fetchScoreboard() {
  const res = await fetch(`${ESPN_BASE}/scoreboard`);
  if (!res.ok) throw new Error(`ESPN scoreboard: HTTP ${res.status}`);
  const data = await res.json();
  return (data.events || []).map((e) => {
    const c = e.competitions?.[0];
    const teams = c?.competitors || [];
    const home = teams.find((t) => t.homeAway === 'home') || teams[0];
    const away = teams.find((t) => t.homeAway === 'away') || teams[1];
    return {
      id: e.id,
      name: e.shortName,
      date: e.date, // ISO UTC — used for local-timezone tipoff display
      status: c?.status?.type?.shortDetail || c?.status?.type?.description || '',
      statusState: c?.status?.type?.state,
      home: {
        abbr: home?.team?.abbreviation,
        score: home?.score,
        record: home?.records?.[0]?.summary,
      },
      away: {
        abbr: away?.team?.abbreviation,
        score: away?.score,
        record: away?.records?.[0]?.summary,
      },
    };
  });
}

/**
 * ESPN scoreboard for a specific date. Used for series-state history lookups.
 * yyyymmdd format: '20260418'
 */
export async function fetchScoreboardForDate(yyyymmdd) {
  const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${yyyymmdd}`);
  if (!res.ok) throw new Error(`ESPN scoreboard (${yyyymmdd}): HTTP ${res.status}`);
  const data = await res.json();
  return (data.events || []).map((e) => {
    const c = e.competitions?.[0];
    const teams = c?.competitors || [];
    const home = teams.find((t) => t.homeAway === 'home') || teams[0];
    const away = teams.find((t) => t.homeAway === 'away') || teams[1];
    return {
      id: e.id,
      date: e.date,
      statusState: c?.status?.type?.state,
      home: { abbr: home?.team?.abbreviation, score: home?.score, winner: home?.winner },
      away: { abbr: away?.team?.abbreviation, score: away?.score, winner: away?.winner },
    };
  });
}

// yyyymmdd helper — browser-local date (matches what user sees in day tabs).
function toYYYYMMDD(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${da}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * ESPN scoreboard over a window of days. Returns { 'YYYYMMDD': games[] } keyed
 * by **user-local date** (browser TZ), not ESPN's ET date.
 *
 * ESPN `?dates=YYYYMMDD` buckets by ET. For a Jakarta user (UTC+7), a game that
 * tips at Mon 02:30 WIB is Sun 13:30 ET — so asking ESPN for `dates=MON` misses
 * it. We fetch a slightly wider window (±1 day beyond the requested range) and
 * re-bucket every event by `game.date` (ISO UTC) in user-local time, deduped
 * by event id.
 */
export async function fetchScoreboardRange(dates) {
  // User-local keys the caller asked for (the only keys we return)
  const userKeys = dates.map(toYYYYMMDD);
  const userKeySet = new Set(userKeys);

  // Expand ±1 day on each end to catch ET/local spillover. Dedupe by key.
  const fetchDateSet = new Map(); // key -> Date
  for (const d of dates) {
    for (const offset of [-1, 0, 1]) {
      const nd = addDays(d, offset);
      fetchDateSet.set(toYYYYMMDD(nd), nd);
    }
  }
  const fetchKeys = Array.from(fetchDateSet.keys());

  const results = await Promise.allSettled(
    fetchKeys.map((k) =>
      fetch(`${ESPN_BASE}/scoreboard?dates=${k}`).then((r) => (r.ok ? r.json() : null))
    )
  );

  // Initialize output with empty arrays for every requested user-local key.
  const out = {};
  for (const k of userKeys) out[k] = [];

  const seen = new Set(); // event ids we've already bucketed (dedupe across ET/local overlap)

  results.forEach((r) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    for (const e of r.value.events || []) {
      if (!e?.id || seen.has(e.id)) continue;
      const c = e.competitions?.[0];
      const teams = c?.competitors || [];
      const home = teams.find((t) => t.homeAway === 'home') || teams[0];
      const away = teams.find((t) => t.homeAway === 'away') || teams[1];

      const localKey = e.date ? toYYYYMMDD(new Date(e.date)) : null;
      if (!localKey || !userKeySet.has(localKey)) continue;
      seen.add(e.id);

      out[localKey].push({
        id: e.id,
        name: e.shortName,
        date: e.date,
        status: c?.status?.type?.shortDetail || c?.status?.type?.description || '',
        statusState: c?.status?.type?.state,
        home: {
          abbr: home?.team?.abbreviation,
          score: home?.score,
          record: home?.records?.[0]?.summary,
        },
        away: {
          abbr: away?.team?.abbreviation,
          score: away?.score,
          record: away?.records?.[0]?.summary,
        },
      });
    }
  });

  // Sort each day's games by tipoff so the user sees them in chronological order.
  for (const k of userKeys) {
    out[k].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return out;
}

/**
 * Scoreboard for a single **user-local** date (YYYY-MM-DD). Uses the same
 * ±1-day expansion + local re-bucket logic as fetchScoreboardRange, so the
 * recap view's bucketing matches the homepage's day-tabs. Otherwise a Jakarta
 * user on Sunday would miss Sunday-morning games that ESPN tagged ET-Saturday.
 */
export async function fetchScoreboardForLocalDate(dateIso) {
  const midday = new Date(`${dateIso}T12:00:00`); // noon-local to avoid TZ edges
  const map = await fetchScoreboardRange([midday]);
  const key = toYYYYMMDD(midday);
  return map[key] || [];
}

/**
 * ESPN team schedule — returns past + upcoming events for a given team abbr.
 * Used for: recent-form streak + head-to-head lookups.
 */
export async function fetchTeamSchedule(teamAbbr) {
  if (!teamAbbr) return [];
  const res = await fetch(`${ESPN_BASE}/teams/${teamAbbr.toLowerCase()}/schedule`);
  if (!res.ok) throw new Error(`ESPN team schedule: HTTP ${res.status}`);
  const data = await res.json();
  return (data.events || []).map((e) => {
    const c = e.competitions?.[0];
    const comps = c?.competitors || [];
    const home = comps.find((cm) => cm.homeAway === 'home') || comps[0];
    const away = comps.find((cm) => cm.homeAway === 'away') || comps[1];
    return {
      id: e.id,
      date: e.date,
      statusState: c?.status?.type?.state,
      isCompleted: c?.status?.type?.completed,
      home: { abbr: home?.team?.abbreviation, score: home?.score?.value ?? home?.score, winner: home?.winner },
      away: { abbr: away?.team?.abbreviation, score: away?.score?.value ?? away?.score, winner: away?.winner },
    };
  });
}

/**
 * ESPN team leaders endpoint — returns top players by stat for a given team abbr.
 * Returns: [{ category, displayName, athletes: [{ id, name, position, value, displayValue }] }]
 * Categories: "avgPoints", "avgRebounds", "avgAssists", "avgSteals", "avgBlocks" etc.
 */
export async function fetchTeamLeaders(teamAbbr) {
  if (!teamAbbr) return [];
  const res = await fetch(`${ESPN_BASE}/teams/${teamAbbr.toLowerCase()}/statistics/0`);
  // Fallback: the teams/<abbr> endpoint has .team.record + leaders
  if (!res.ok) {
    // Try the alternate path
    const alt = await fetch(`${ESPN_BASE}/teams/${teamAbbr.toLowerCase()}`);
    if (!alt.ok) throw new Error(`ESPN team leaders: HTTP ${alt.status}`);
    const altData = await alt.json();
    const cats = altData?.team?.leaders || [];
    return cats.map((c) => ({
      category: c.shortDisplayName || c.displayName,
      displayName: c.displayName,
      athletes: (c.leaders || []).map((l) => ({
        id: l.athlete?.id,
        name: l.athlete?.displayName,
        position: l.athlete?.position?.abbreviation,
        jersey: l.athlete?.jersey,
        value: l.value,
        displayValue: l.displayValue,
      })),
    }));
  }
  const data = await res.json();
  return data.categories || [];
}

/**
 * ESPN injury report — returns map of team abbr -> injuries[].
 * Each injury: { athlete, status (Out, Day-To-Day, Questionable, etc.), description }.
 */
export async function fetchInjuries() {
  const res = await fetch(`${ESPN_BASE}/injuries`);
  if (!res.ok) throw new Error(`ESPN injuries: HTTP ${res.status}`);
  const data = await res.json();
  const byTeam = {};
  for (const t of data.injuries || []) {
    const abbr = t?.team?.abbreviation;
    if (!abbr) continue;
    byTeam[abbr] = (t.injuries || []).map((i) => ({
      athleteId: i.athlete?.id,
      athlete: i.athlete?.displayName,
      position: i.athlete?.position?.abbreviation,
      status: i.status,                       // "Out", "Day-To-Day", "Questionable", etc
      shortStatus: (i.status || '').split('-')[0].trim().toUpperCase().slice(0, 4),
      returnDate: i.details?.returnDate,
      description: i.shortComment || i.longComment,
    }));
  }
  return byTeam;
}

/**
 * ESPN summary endpoint — play-by-play + header for one event.
 */
export async function fetchGameSummary(eventId) {
  const res = await fetch(`${ESPN_BASE}/summary?event=${eventId}`);
  if (!res.ok) throw new Error(`ESPN summary: HTTP ${res.status}`);
  const data = await res.json();

  const plays = (data.plays || []).map((p) => ({
    id: p.id,
    text: p.text,
    period: p.period?.number,
    clock: p.clock?.displayValue,
    // Many plays have `clock.value` as seconds remaining in the period
    clockSeconds: p.clock?.value,
    teamId: p.team?.id,
    awayScore: p.awayScore,
    homeScore: p.homeScore,
    scoringPlay: p.scoringPlay,
    scoreValue: p.scoreValue,
    // Shot-chart coordinates (when available): ESPN gives { x, y } in a half-court system
    coordinate: p.coordinate ? { x: p.coordinate.x, y: p.coordinate.y } : null,
    // Primary player attribution — ESPN puts the main athlete first
    athleteId: p.athletesInvolved?.[0]?.id ?? p.participants?.[0]?.athlete?.id,
    athleteName: p.athletesInvolved?.[0]?.displayName ?? p.participants?.[0]?.athlete?.displayName,
    shootingPlay: p.shootingPlay,
    // Play type (e.g. '3PT Jumper', 'Layup', 'Free Throw')
    typeText: p.type?.text,
    typeId: p.type?.id,
    wallclock: p.wallclock,
  }));

  const header = data.header?.competitions?.[0];
  const competitors = header?.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];

  // Per-quarter scoring (linescores array — one entry per period)
  const parseLineScores = (cmp) => (cmp?.linescores || []).map((ls) => ls.displayValue ?? ls.value ?? '—');
  const awayLine = parseLineScores(away);
  const homeLine = parseLineScores(home);

  // Parse boxscore — ESPN returns per-team player stat lines
  const boxscore = (data.boxscore?.players || []).map((t) => {
    const abbr = t.team?.abbreviation;
    const s = t.statistics?.[0];
    const names = s?.names || [];
    const players = (s?.athletes || []).map((a) => {
      const line = {};
      (a.stats || []).forEach((v, i) => { if (names[i]) line[names[i]] = v; });
      return {
        id: a.athlete?.id,
        name: a.athlete?.displayName,
        short: a.athlete?.shortName,
        position: a.athlete?.position?.abbreviation,
        starter: !!a.starter,
        dnp: !!a.didNotPlay,
        min: line.MIN || '—',
        pts: parseInt(line.PTS || 0),
        reb: parseInt(line.REB || 0),
        ast: parseInt(line.AST || 0),
        fg: line.FG || '—',
        tp: line['3PT'] || '—',
        plusMinus: line['+/-'] || '—',
      };
    });
    return { abbr, players };
  });

  // Parse team totals — used by Team Comparison tab. ESPN returns each team's
  // aggregated stats under boxscore.teams[].statistics[]. We pick the common
  // ones (shooting splits, rebs, assists, turnovers, fouls).
  const teamTotals = (data.boxscore?.teams || []).map((t) => {
    const abbr = t.team?.abbreviation;
    const byLabel = {};
    (t.statistics || []).forEach((stat) => {
      const label = stat.label || stat.name;
      if (label) byLabel[label] = stat.displayValue ?? stat.value;
    });
    return { abbr, stats: byLabel };
  });

  return {
    plays,
    boxscore,
    teamTotals,
    homeAbbr: home?.team?.abbreviation,
    awayAbbr: away?.team?.abbreviation,
    homeId: home?.team?.id,
    awayId: away?.team?.id,
    homeScore: home?.score,
    awayScore: away?.score,
    homeLine,
    awayLine,
    status: header?.status?.type?.shortDetail,
    statusState: header?.status?.type?.state,
    clock: header?.status?.displayClock,
    period: header?.status?.period,
  };
}

/**
 * Live win-probability points. Each item: homePct 0..1, awayPct 0..1, ordered by play sequence.
 */
export async function fetchWinProbabilities(eventId) {
  const url = `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${eventId}/competitions/${eventId}/probabilities?limit=500`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN probabilities: HTTP ${res.status}`);
  const data = await res.json();
  return (data.items || [])
    .map((p, i) => ({
      i,
      homePct: typeof p.homeWinPercentage === 'number' ? p.homeWinPercentage : null,
      awayPct: typeof p.awayWinPercentage === 'number' ? p.awayWinPercentage : null,
      seq: p.sequenceNumber,
    }))
    .filter((p) => p.homePct !== null);
}
