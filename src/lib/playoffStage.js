// ============================================================================
// v0.79.26 — derive the CURRENT NBA playoff stage from live data.
//
// Postmortem context: the NBA hub shipped hardcoded April copy ("ROUND 1",
// "TIP-OFF RONDE 1 APR 18", four Round-1 storylines) that sat stale through
// the conference finals and into the Finals. Same class of rot as the home
// page's static homepage-sentence.json. Fix: derive stage + storylines from
// the ESPN scoreboard the dashboard already polls every 30s — zero new
// requests, self-healing as the playoffs progress.
//
// Primary signal: ESPN event note headline, e.g. "NBA Finals - Game 4",
// "East Final - Game 5", "West Semifinals - Game 2", "East 1st Round -
// Game 7". Fallback (off days with an empty scoreboard): the 2026 playoff
// calendar windows.
// ============================================================================

const STAGES = {
  r1:     { key: 'r1',     labelEn: 'ROUND 1',     labelId: 'RONDE 1',     longId: 'Ronde 1' },
  semis:  { key: 'semis',  labelEn: 'CONF SEMIS',  labelId: 'SEMIFINAL KONF', longId: 'Semifinal Konferensi' },
  conf:   { key: 'conf',   labelEn: 'CONF FINALS', labelId: 'FINAL KONF',  longId: 'Final Konferensi' },
  finals: { key: 'finals', labelEn: 'NBA FINALS',  labelId: 'FINAL NBA',   longId: 'Final NBA' },
  off:    { key: 'off',    labelEn: 'OFFSEASON',   labelId: 'OFFSEASON',   longId: 'Offseason' },
};

// 2026 calendar fallback windows (month is 0-based).
function stageByDate(d = new Date()) {
  const t = d.getTime();
  const mk = (m, day) => new Date(2026, m, day).getTime();
  if (t < mk(3, 18)) return STAGES.r1;        // pre-playoffs → show R1 framing
  if (t < mk(4, 4))  return STAGES.r1;        // Apr 18 – May 3
  if (t < mk(4, 19)) return STAGES.semis;     // May 4 – May 18
  if (t < mk(5, 2))  return STAGES.conf;      // May 19 – Jun 1
  if (t < mk(5, 24)) return STAGES.finals;    // Jun 2 – Jun 23
  return STAGES.off;
}

function stageFromNote(note) {
  if (!note) return null;
  const n = note.toLowerCase();
  if (n.includes('nba finals')) return STAGES.finals;
  if (n.includes('final')) return STAGES.conf;       // "East Final"/"West Final"
  if (n.includes('semifinal')) return STAGES.semis;  // "East Semifinals"
  if (n.includes('1st round') || n.includes('first round')) return STAGES.r1;
  return null;
}

/**
 * derivePlayoffStage(games) → { key, labelEn, labelId, longId, note, game }
 * `games` is the mapped ESPN scoreboard (fetchScoreboard shape). Prefers the
 * live note headline; falls back to the calendar.
 */
export function derivePlayoffStage(games = []) {
  for (const g of games) {
    const s = stageFromNote(g.note);
    if (s) return { ...s, note: g.note, game: g };
  }
  return { ...stageByDate(), note: null, game: games[0] || null };
}

/**
 * stageStorylines(games, stage, lang) → [[label, text], …] for the
 * "Featured Series" panel. Live-derived: matchup + series state + game
 * number. Replaces the four hardcoded April storylines.
 */
export function stageStorylines(games = [], stage = null, lang = 'id') {
  const st = stage || derivePlayoffStage(games);
  const rows = [];
  for (const g of games.slice(0, 4)) {
    const matchup = `${g.away?.abbr || '?'} @ ${g.home?.abbr || '?'}`;
    const gameNo = (g.note?.match(/Game\s+(\d+)/i) || [])[1];
    const bits = [];
    if (g.seriesSummary) bits.push(g.seriesSummary);
    if (gameNo) bits.push(lang === 'id' ? `Game ${gameNo}` : `Game ${gameNo}`);
    if (g.statusState === 'in') bits.push(lang === 'id' ? 'LIVE sekarang' : 'LIVE now');
    rows.push([st.labelId, `${matchup} — ${bits.join(' · ') || g.status}`]);
  }
  if (rows.length === 0) {
    rows.push([
      st.labelId,
      lang === 'id'
        ? 'Nggak ada laga hari ini — cek jadwal di tab Skor & Jadwal.'
        : 'No games today — check the schedule tab.',
    ]);
  }
  return rows;
}
