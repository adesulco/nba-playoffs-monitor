import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGameDetails } from '../hooks/useGameDetails.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import PlayerHead from './PlayerHead.jsx';
import WatchStar from './WatchStar.jsx';

/**
 * Derive the most recent scoring run from the play list.
 * Walks from the most recent scoring play backward, accumulating a team's scoring
 * streak vs the opposing team. Returns e.g. "12-2 run for DET" when a run >=8 differential exists.
 */
function detectScoringRun(plays, homeId, homeAbbr, awayId, awayAbbr) {
  if (!plays || plays.length === 0) return null;

  // Walk plays backward (they're chronological with scoring updates)
  const scoringPlays = plays.filter((p) => p.scoringPlay && (p.awayScore !== undefined && p.homeScore !== undefined));
  if (scoringPlays.length < 3) return null;

  // Compare most recent to the point where one team went on a continuous streak
  const latest = scoringPlays[scoringPlays.length - 1];

  // Walk back and find the last moment the margin was equal-or-opposite
  let homeStreakPts = 0;
  let awayStreakPts = 0;
  let lastRunStart = null;
  for (let i = scoringPlays.length - 1; i >= 0; i--) {
    const curr = scoringPlays[i];
    const prev = i > 0 ? scoringPlays[i - 1] : { homeScore: 0, awayScore: 0 };
    const deltaHome = (curr.homeScore || 0) - (prev.homeScore || 0);
    const deltaAway = (curr.awayScore || 0) - (prev.awayScore || 0);
    if (deltaHome > 0 && deltaAway === 0) homeStreakPts += deltaHome;
    else if (deltaAway > 0 && deltaHome === 0) awayStreakPts += deltaAway;
    else { lastRunStart = i; break; }
  }

  if (homeStreakPts >= 8 && awayStreakPts === 0) {
    return { team: homeAbbr, run: `${homeStreakPts}-0` };
  }
  if (awayStreakPts >= 8 && homeStreakPts === 0) {
    return { team: awayAbbr, run: `${awayStreakPts}-0` };
  }

  // Also detect partial (e.g. 12-2) from last 10 scoring plays
  const window = scoringPlays.slice(-12);
  if (window.length >= 2) {
    const first = window[0];
    const last = window[window.length - 1];
    const homeScored = (last.homeScore || 0) - (first.homeScore || 0);
    const awayScored = (last.awayScore || 0) - (first.awayScore || 0);
    if (homeScored - awayScored >= 10 && homeScored >= 10) {
      return { team: homeAbbr, run: `${homeScored}-${awayScored}` };
    }
    if (awayScored - homeScored >= 10 && awayScored >= 10) {
      return { team: awayAbbr, run: `${awayScored}-${homeScored}` };
    }
  }

  return null;
}

function LineScoreTable({ awayAbbr, homeAbbr, awayLine, homeLine, awayColor, homeColor, awayScore, homeScore }) {
  if (!awayLine || !homeLine || awayLine.length === 0) return null;
  const periods = Math.max(awayLine.length, homeLine.length);
  const headers = [];
  for (let i = 0; i < periods; i++) {
    if (i < 4) headers.push(`Q${i + 1}`);
    else headers.push(i === 4 ? 'OT' : `OT${i - 3}`);
  }

  const cell = (v) => v === undefined || v === null || v === '' ? '—' : v;

  return (
    <div style={{ padding: '0 14px 10px' }}>
      <div style={{ fontSize: 9.5, letterSpacing: 1, color: C.dim, margin: '8px 0 5px' }}>QUARTER SCORING</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `38px repeat(${periods}, 1fr) 48px`,
        gap: 0,
        fontSize: 10.5, border: `1px solid ${C.lineSoft}`, background: C.panelSoft,
      }}>
        <div />
        {headers.map((h, i) => (
          <div key={i} style={{ padding: '4px 6px', textAlign: 'center', color: C.dim, fontSize: 9, letterSpacing: 0.8, borderLeft: `1px solid ${C.lineSoft}` }}>{h}</div>
        ))}
        <div style={{ padding: '4px 6px', textAlign: 'center', color: C.amber, fontSize: 9, letterSpacing: 0.8, borderLeft: `1px solid ${C.lineSoft}`, fontWeight: 600 }}>FINAL</div>

        {[{ abbr: awayAbbr, line: awayLine, color: awayColor, total: awayScore },
          { abbr: homeAbbr, line: homeLine, color: homeColor, total: homeScore }].map((row, ri) => (
          <React.Fragment key={ri}>
            <div style={{ padding: '5px 6px', borderTop: `1px solid ${C.lineSoft}` }}>
              <span style={{ padding: '1px 5px', background: row.color, color: '#fff', fontSize: 8.5, fontWeight: 700, borderRadius: 2 }}>{row.abbr}</span>
            </div>
            {Array.from({ length: periods }).map((_, i) => (
              <div key={i} style={{
                padding: '5px 6px', textAlign: 'center',
                borderTop: `1px solid ${C.lineSoft}`,
                borderLeft: `1px solid ${C.lineSoft}`,
                color: C.text,
              }}>
                {cell(row.line[i])}
              </div>
            ))}
            <div style={{
              padding: '5px 6px', textAlign: 'center',
              borderTop: `1px solid ${C.lineSoft}`,
              borderLeft: `1px solid ${C.lineSoft}`,
              color: C.amberBright,
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
            }}>
              {row.total ?? '—'}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ShotChart({ plays, awayId, homeId, awayAbbr, homeAbbr, awayColor, homeColor }) {
  // ESPN shot coordinates: x in 0..50 (court width), y in 0..50 (half-court depth)
  // Basket is at (25, 5.25). Half court = 47 feet from baseline.
  const W = 520;
  const H = 320;
  const courtW = 50; // feet
  const courtH = 47; // feet
  const xFt = (x) => (x / courtW) * W;
  const yFt = (y) => ((courtH - y) / courtH) * H; // flip so basket is at bottom of viewport

  // Extract shooting plays with coordinates
  const shots = plays.filter((p) => p.coordinate && p.shootingPlay !== undefined)
    .map((p) => ({
      x: p.coordinate.x,
      y: p.coordinate.y,
      made: !!p.scoringPlay,
      teamId: p.teamId,
      scoreValue: p.scoreValue,
      player: p.athleteName,
      text: p.text,
      period: p.period,
      clock: p.clock,
    }));

  if (shots.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
        Shot chart opens once field goals are attempted.
      </div>
    );
  }

  // Basket + key half-court lines
  const basket = { x: xFt(25), y: yFt(5.25) };
  const threePtR = xFt(23.75) - xFt(0); // 3pt arc radius in px
  const ftCircle = { cx: xFt(25), cy: yFt(19), r: xFt(6) - xFt(0) };

  return (
    <div style={{ padding: '10px 14px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, color: C.dim, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: awayColor }} />
            <span style={{ color: C.text, fontWeight: 600 }}>{awayAbbr}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: homeColor }} />
            <span style={{ color: C.text, fontWeight: 600 }}>{homeAbbr}</span>
          </span>
        </div>
        <span style={{ color: C.muted }}>● made · ○ miss · {shots.length} shots</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Shot chart: ${shots.length} shots plotted on half-court. ${shots.filter((s) => s.made).length} made, ${shots.filter((s) => !s.made).length} missed.`}
        style={{ display: 'block', background: C.panelSoft, border: `1px solid ${C.lineSoft}` }}
      >
        {/* Court outline */}
        <rect x="0" y="0" width={W} height={H} fill="none" stroke={C.lineSoft} strokeWidth="1" />
        {/* Lane (paint) — 16ft wide × 19ft deep */}
        <rect x={xFt(17)} y={yFt(19)} width={xFt(33) - xFt(17)} height={H - yFt(19)} fill="none" stroke={C.lineSoft} strokeWidth="1" />
        {/* Free throw line circle */}
        <circle cx={ftCircle.cx} cy={ftCircle.cy} r={ftCircle.r} fill="none" stroke={C.lineSoft} strokeWidth="1" />
        {/* Restricted area arc (4ft radius at basket) */}
        <path d={`M ${basket.x - xFt(4) + xFt(0)} ${basket.y} A ${xFt(4) - xFt(0)} ${xFt(4) - xFt(0)} 0 0 0 ${basket.x + xFt(4) - xFt(0)} ${basket.y}`} fill="none" stroke={C.lineSoft} strokeWidth="1" />
        {/* 3pt arc: approximate (23.75 at top, 22 at corners) */}
        <path
          d={`M ${xFt(3)} ${H} L ${xFt(3)} ${yFt(14)} A ${threePtR} ${threePtR} 0 0 0 ${xFt(47)} ${yFt(14)} L ${xFt(47)} ${H}`}
          fill="none"
          stroke={C.lineSoft}
          strokeWidth="1.2"
        />
        {/* Basket */}
        <circle cx={basket.x} cy={basket.y} r="4" fill="none" stroke={C.amber} strokeWidth="1.5" />
        <line x1={basket.x - 8} x2={basket.x + 8} y1={basket.y + 4} y2={basket.y + 4} stroke={C.amber} strokeWidth="1.5" />
        {/* Center circle at top (half-court line) */}
        <line x1="0" x2={W} y1={yFt(47)} y2={yFt(47)} stroke={C.lineSoft} strokeWidth="1" strokeDasharray="3,4" />

        {/* Shots */}
        {shots.map((s, i) => {
          const color = s.teamId === String(homeId) ? homeColor : awayColor;
          const cx = xFt(s.x);
          const cy = yFt(s.y);
          if (s.made) {
            return <circle key={i} cx={cx} cy={cy} r="4.5" fill={color} fillOpacity="0.8" stroke="#fff" strokeWidth="1" />;
          }
          return (
            <g key={i} stroke={color} strokeWidth="1.2" fill="none" opacity="0.65">
              <line x1={cx - 3.5} x2={cx + 3.5} y1={cy - 3.5} y2={cy + 3.5} />
              <line x1={cx - 3.5} x2={cx + 3.5} y1={cy + 3.5} y2={cy - 3.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function H2HStrip({ h2h, focusTeamAbbr, color }) {
  if (!h2h || h2h.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: C.muted, letterSpacing: 0.3 }}>
      <span style={{ color: C.dim, fontWeight: 600 }}>H2H:</span>
      {h2h.map((g) => {
        const isHome = g.home.abbr === focusTeamAbbr;
        const myScore = isHome ? g.home.score : g.away.score;
        const theirScore = isHome ? g.away.score : g.home.score;
        const won = isHome ? g.home.winner : g.away.winner;
        return (
          <span
            key={g.id}
            style={{
              display: 'inline-flex', gap: 2, fontSize: 9,
              color: won ? color : C.muted, fontWeight: 600,
            }}
          >
            <span style={{ color: won ? C.green : C.red }}>{won ? 'W' : 'L'}</span>
            <span style={{ color: C.dim }}>{myScore}-{theirScore}</span>
          </span>
        );
      })}
    </div>
  );
}

function BoxScoreTable({ team, color, watchlist }) {
  if (!team?.players?.length) {
    return (
      <div style={{ padding: 14, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
        Stats populate at tip-off.
      </div>
    );
  }
  // Show every player who actually saw court time — starters first (sorted by PTS),
  // then bench (also by PTS). DNP players are excluded. Previously capped at 6.
  const active = [...team.players].filter((p) => !p.dnp);
  const leaders = [
    ...active.filter((p) => p.starter).sort((a, b) => (b.pts || 0) - (a.pts || 0)),
    ...active.filter((p) => !p.starter).sort((a, b) => (b.pts || 0) - (a.pts || 0)),
  ];

  const gridCols = '14px 26px 1fr 24px 24px 24px 36px';

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
        background: C.panelSoft, fontSize: 8.5, letterSpacing: 0.8, color: C.dim,
      }}>
        <div />
        <div />
        <div><span style={{ padding: '1px 5px', background: color, color: '#fff', borderRadius: 2, fontWeight: 700 }}>{team.abbr}</span></div>
        <div style={{ textAlign: 'right' }}>PTS</div>
        <div style={{ textAlign: 'right' }}>REB</div>
        <div style={{ textAlign: 'right' }}>AST</div>
        <div style={{ textAlign: 'right' }}>FG</div>
      </div>
      {leaders.map((p) => {
        const player = { id: p.id, name: p.name || p.short, position: p.position, teamAbbr: team.abbr };
        return (
          <div
            key={p.id}
            style={{
              display: 'grid', gridTemplateColumns: gridCols,
              gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
              fontSize: 10.5, alignItems: 'center',
            }}
          >
            {watchlist && <WatchStar player={player} watchlist={watchlist} size={11} />}
            {!watchlist && <div />}
            <PlayerHead id={p.id} name={p.name} color={color} size={22} />
            <a
              href={p.id ? `https://www.espn.com/nba/player/_/id/${p.id}` : '#'}
              target={p.id ? '_blank' : undefined}
              rel={p.id ? 'noopener noreferrer' : undefined}
              style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: 'none', color: C.text,
              }}
            >
              {p.starter && <span style={{ color, marginRight: 4, fontSize: 9 }}>●</span>}
              {p.short || p.name}
              {p.position && <span style={{ color: C.muted, marginLeft: 4, fontSize: 9 }}>· {p.position}</span>}
            </a>
            <div style={{ textAlign: 'right', color: C.amberBright, fontWeight: 600 }}>{p.pts}</div>
            <div style={{ textAlign: 'right', color: C.text }}>{p.reb}</div>
            <div style={{ textAlign: 'right', color: C.text }}>{p.ast}</div>
            <div style={{ textAlign: 'right', color: C.muted, fontSize: 9.5 }}>{p.fg}</div>
          </div>
        );
      })}
    </div>
  );
}

function WinProbChart({ points, awayAbbr, homeAbbr, awayColor, homeColor }) {
  // 0..1 home win prob becomes the y axis; above 0.5 = home favored, below = away favored
  const W = 520;
  const H = 110;
  const PAD_X = 8;
  const PAD_Y = 10;

  if (!points || points.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 10.5, letterSpacing: 0.5, background: C.panelSoft, border: `1px solid ${C.lineSoft}` }}>
        Win probability stream opens at tip-off
      </div>
    );
  }

  const n = points.length;
  const xOf = (i) => PAD_X + (i / (n - 1)) * (W - 2 * PAD_X);
  const yOf = (homePct) => PAD_Y + (1 - homePct) * (H - 2 * PAD_Y);

  const homeLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.homePct).toFixed(1)}`).join(' ');
  const mid = yOf(0.5);

  // Fills: above midline = home color, below = away color
  const homeFillPath =
    `M${PAD_X},${mid} ` +
    points.map((p, i) => `L${xOf(i).toFixed(1)},${yOf(Math.max(p.homePct, 0.5)).toFixed(1)}`).join(' ') +
    ` L${xOf(n - 1).toFixed(1)},${mid} Z`;

  const awayFillPath =
    `M${PAD_X},${mid} ` +
    points.map((p, i) => `L${xOf(i).toFixed(1)},${yOf(Math.min(p.homePct, 0.5)).toFixed(1)}`).join(' ') +
    ` L${xOf(n - 1).toFixed(1)},${mid} Z`;

  const latest = points[points.length - 1];
  const latestHome = Math.round(latest.homePct * 100);
  const latestAway = 100 - latestHome;

  // F10 — accessible summary for screen readers (SVG is visual-only otherwise)
  const leader = latest.homePct >= 0.5 ? homeAbbr : awayAbbr;
  const leaderPct = Math.max(latestHome, latestAway);
  const ariaSummary = `Win probability chart: ${leader} favored ${leaderPct} percent. Away team ${awayAbbr} ${latestAway} percent, home team ${homeAbbr} ${latestHome} percent.`;

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaSummary}
        style={{ display: 'block', background: C.panelSoft, border: `1px solid ${C.lineSoft}` }}
      >
        {/* horizontal midline */}
        <line x1={PAD_X} x2={W - PAD_X} y1={mid} y2={mid} stroke={C.lineSoft} strokeDasharray="2,3" />
        {/* fills */}
        <path d={homeFillPath} fill={homeColor} opacity="0.25" />
        <path d={awayFillPath} fill={awayColor} opacity="0.25" />
        {/* border line */}
        <path d={homeLine} fill="none" stroke={C.text} strokeWidth="1.5" />
        {/* endpoint dot */}
        <circle cx={xOf(n - 1)} cy={yOf(latest.homePct)} r="3" fill={latest.homePct >= 0.5 ? homeColor : awayColor} stroke="#fff" strokeWidth="1" />
        {/* labels */}
        <text x={PAD_X + 4} y={PAD_Y + 10} fontSize="9" fill={awayColor} fontFamily="JetBrains Mono, monospace" fontWeight="600">{awayAbbr} {latestAway}%</text>
        <text x={W - PAD_X - 4} y={H - PAD_Y - 2} textAnchor="end" fontSize="9" fill={homeColor} fontFamily="JetBrains Mono, monospace" fontWeight="600">{homeAbbr} {latestHome}%</text>
      </svg>
      <span className="sr-only">{ariaSummary}</span>
    </>
  );
}

function InjuryList({ abbr, list, color }) {
  if (!list || list.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: 0.8, color: C.dim }}>
        <span style={{ padding: '1px 5px', background: color, color: '#fff', fontWeight: 700, borderRadius: 2, fontSize: 8.5 }}>{abbr}</span>
        INJURY REPORT · {list.length}
      </div>
      {list.slice(0, 6).map((inj) => (
        <a
          key={inj.athleteId || inj.athlete}
          href={inj.athleteId ? `https://www.espn.com/nba/player/_/id/${inj.athleteId}` : `https://www.espn.com/nba/team/injuries/_/name/${abbr.toLowerCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, color: C.text, textDecoration: 'none', padding: '2px 0', borderBottom: `1px solid ${C.lineSoft}` }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inj.athlete}{inj.position ? ` · ${inj.position}` : ''}
          </span>
          <span style={{ color: inj.shortStatus?.startsWith('OUT') ? C.red : C.amber, fontWeight: 600, fontSize: 9, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {inj.shortStatus || '—'}
          </span>
        </a>
      ))}
    </div>
  );
}

export default function LiveGameFocus({ eventId, favTeam, accent, injuries, onClose, summary, winProb, lastUpdate, watchlist, h2h }) {
  const tickerRef = useRef(null);
  const [rightTab, setRightTab] = useState('plays'); // 'plays' | 'stats' | 'shots'

  // Resolve team meta from abbr
  const findByAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === abbr);
  const awayFull = summary ? findByAbbr(summary.awayAbbr) : null;
  const homeFull = summary ? findByAbbr(summary.homeAbbr) : null;
  const awayMeta = awayFull ? TEAM_META[awayFull] : { color: '#555' };
  const homeMeta = homeFull ? TEAM_META[homeFull] : { color: '#777' };

  // Most recent plays first in the ticker (but limited for perf)
  const plays = useMemo(() => (summary?.plays || []).slice(-40).reverse(), [summary]);

  const isLive = summary?.statusState === 'in';
  const isFinal = summary?.statusState === 'post';

  // IMPORTANT: all hooks must be called in the same order on every render.
  // Compute scoringRun BEFORE the early-return guard below.
  const scoringRun = useMemo(() => {
    if (!isLive || !summary?.plays) return null;
    return detectScoringRun(summary.plays, summary.homeId, summary.homeAbbr, summary.awayId, summary.awayAbbr);
  }, [summary, isLive]);

  // Auto-scroll ticker to top when new plays arrive
  useEffect(() => {
    if (tickerRef.current) tickerRef.current.scrollTop = 0;
  }, [summary?.plays?.length]);

  if (!eventId) {
    return (
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, background: C.bg, color: C.dim, fontSize: 10.5, letterSpacing: 0.5, textAlign: 'center' }}>
        <span style={{ color: accent }}>●</span> Tap any game above to follow live — win probability, play-by-play, and live score.
      </div>
    );
  }

  const favInGame = favTeam && (awayFull === favTeam || homeFull === favTeam);
  const runColor = scoringRun?.team === summary?.homeAbbr ? homeMeta.color : scoringRun?.team === summary?.awayAbbr ? awayMeta.color : accent;

  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, letterSpacing: 1.2, fontWeight: 600, color: C.text }}>
          <span style={{ color: isLive ? C.green : isFinal ? C.dim : accent }}>
            {isLive && <span className="live-dot" style={{ background: C.red }} />}
            {isLive ? 'LIVE FOCUS' : isFinal ? 'FINAL' : 'TIP-OFF PENDING'}
          </span>
          {summary && (
            <span style={{ color: C.dim, letterSpacing: 0.5, fontSize: 10.5 }}>
              {summary.awayAbbr} {summary.awayScore} — {summary.homeScore} {summary.homeAbbr}{summary.clock && isLive ? ` · Q${summary.period} ${summary.clock}` : ''}
              {favInGame && <span style={{ color: accent, marginLeft: 8 }}>★ YOUR TEAM</span>}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: `1px solid ${C.lineSoft}`, color: C.dim, fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5 }}
        >
          × CLOSE FOCUS
        </button>
      </div>

      {/* Scoring run banner */}
      {scoringRun && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
          padding: '5px 16px',
          background: `linear-gradient(90deg, transparent 0%, ${runColor}30 50%, transparent 100%)`,
          borderBottom: `1px solid ${C.lineSoft}`,
          fontSize: 10.5, letterSpacing: 0.8,
        }}>
          <span style={{ color: runColor, fontWeight: 700, letterSpacing: 1 }}>⚡ {scoringRun.team}</span>
          <span style={{ color: C.text, fontWeight: 600 }}>on a</span>
          <span style={{ color: runColor, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif', fontSize: 13 }}>{scoringRun.run}</span>
          <span style={{ color: C.text, fontWeight: 600 }}>run</span>
        </div>
      )}

      {/* Head-to-head strip */}
      {h2h && h2h.length > 0 && summary?.awayAbbr && (
        <div style={{ padding: '5px 16px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft }}>
          <H2HStrip h2h={h2h} focusTeamAbbr={summary.awayAbbr} color={awayMeta.color} />
        </div>
      )}

      {/* Injury strip */}
      {(injuries && (injuries[summary?.awayAbbr]?.length || injuries[summary?.homeAbbr]?.length)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '10px 14px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft }}>
          <InjuryList abbr={summary?.awayAbbr} list={injuries?.[summary?.awayAbbr]} color={awayMeta.color} />
          <InjuryList abbr={summary?.homeAbbr} list={injuries?.[summary?.homeAbbr]} color={homeMeta.color} />
        </div>
      )}

      {/* Body: probability chart + play-by-play ticker */}
      <div className="focus-body" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 0 }}>
        {/* Win probability */}
        <div style={{ padding: '10px 14px', borderRight: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, letterSpacing: 1, color: C.dim, marginBottom: 6 }}>
            <span>WIN PROBABILITY</span>
            <span style={{ color: C.muted }}>ESPN · updates every play</span>
          </div>
          <WinProbChart points={winProb} awayAbbr={summary?.awayAbbr || 'AWAY'} homeAbbr={summary?.homeAbbr || 'HOME'} awayColor={awayMeta.color} homeColor={homeMeta.color} />
        </div>

        {/* Right column: tabs — PLAYS / STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px 0' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {['plays', 'stats', 'shots'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: rightTab === tab ? `2px solid ${accent}` : '2px solid transparent',
                    color: rightTab === tab ? C.text : C.dim,
                    fontFamily: 'inherit',
                    fontSize: 9.5, letterSpacing: 1, fontWeight: 600,
                    padding: '6px 10px 8px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {tab === 'plays' ? 'Play-by-play' : tab === 'stats' ? 'Box Score' : 'Shot Chart'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 9.5, color: C.muted }}>
              {rightTab === 'plays' ? `${plays.length} plays` : rightTab === 'stats' ? 'ESPN box' : 'ESPN plays'} · {lastUpdate ? `${Math.round((Date.now() - lastUpdate) / 1000)}s ago` : '—'}
            </span>
          </div>

          {rightTab === 'stats' && summary?.boxscore?.length > 0 && (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {summary.boxscore.map((t) => (
                <BoxScoreTable key={t.abbr} team={t} color={t.abbr === summary.awayAbbr ? awayMeta.color : homeMeta.color} watchlist={watchlist} />
              ))}
            </div>
          )}
          {rightTab === 'stats' && (!summary?.boxscore?.length) && (
            <div style={{ padding: 20, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
              Box score opens at tip-off.
            </div>
          )}

          {rightTab === 'shots' && summary && (
            <ShotChart
              plays={summary.plays || []}
              awayId={summary.awayId}
              homeId={summary.homeId}
              awayAbbr={summary.awayAbbr}
              homeAbbr={summary.homeAbbr}
              awayColor={awayMeta.color}
              homeColor={homeMeta.color}
            />
          )}

          {rightTab === 'plays' && (
          <div ref={tickerRef} style={{ maxHeight: 260, overflowY: 'auto', padding: '0 14px 10px' }}>
            {plays.length === 0 && (
              <div style={{ fontSize: 10.5, color: C.dim, padding: 20, textAlign: 'center' }}>
                {eventId ? 'No plays yet — check back at tip-off.' : 'Pick a match above.'}
              </div>
            )}
            {plays.map((p) => {
              const isScoring = p.scoringPlay;
              const isMajor = p.scoreValue === 3 || p.scoreValue === 2;
              // Determine scoring team by matching ESPN team id to home/away
              const scoringTeamAbbr = p.teamId === summary?.homeId ? summary?.homeAbbr : p.teamId === summary?.awayId ? summary?.awayAbbr : null;
              const scoringColor = p.teamId === summary?.homeId ? homeMeta.color : p.teamId === summary?.awayId ? awayMeta.color : '#888';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    gap: 8,
                    padding: '5px 0',
                    borderBottom: `1px solid ${C.lineSoft}`,
                    fontSize: 10.5,
                    borderLeft: isScoring ? `2px solid ${scoringColor}` : '2px solid transparent',
                    paddingLeft: 8,
                    background: isScoring && isMajor ? `${scoringColor}12` : 'transparent',
                  }}
                >
                  <div style={{ color: C.muted, fontSize: 9.5, letterSpacing: 0.3 }}>
                    {p.period ? `Q${p.period}` : '—'}<br />
                    <span style={{ color: C.dim }}>{p.clock || ''}</span>
                  </div>
                  <div style={{ color: isScoring ? C.text : C.dim, lineHeight: 1.3 }}>
                    {scoringTeamAbbr && <span style={{ color: scoringColor, fontWeight: 600, marginRight: 4 }}>{scoringTeamAbbr}</span>}
                    {p.text}
                  </div>
                  <div style={{ fontSize: 9.5, color: C.muted, fontFamily: '"Space Grotesk", sans-serif', minWidth: 48, textAlign: 'right' }}>
                    {p.awayScore !== undefined && p.homeScore !== undefined ? `${p.awayScore}-${p.homeScore}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Quarter-by-quarter line score, always visible when available */}
      {summary?.awayLine?.length > 0 && (
        <LineScoreTable
          awayAbbr={summary.awayAbbr}
          homeAbbr={summary.homeAbbr}
          awayLine={summary.awayLine}
          homeLine={summary.homeLine}
          awayColor={awayMeta.color}
          homeColor={homeMeta.color}
          awayScore={summary.awayScore}
          homeScore={summary.homeScore}
        />
      )}
    </div>
  );
}
