import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGameDetails } from '../hooks/useGameDetails.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';

function BoxScoreTable({ team, color }) {
  if (!team?.players?.length) {
    return (
      <div style={{ padding: 14, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
        Stats populate at tip-off.
      </div>
    );
  }
  // Sort by PTS desc, filter DNP players, take top 6
  const leaders = [...team.players]
    .filter((p) => !p.dnp)
    .sort((a, b) => (b.pts || 0) - (a.pts || 0))
    .slice(0, 6);

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px 40px',
        gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
        background: C.panelSoft, fontSize: 8.5, letterSpacing: 0.8, color: C.dim,
      }}>
        <div><span style={{ padding: '1px 5px', background: color, color: '#fff', borderRadius: 2, fontWeight: 700 }}>{team.abbr}</span></div>
        <div style={{ textAlign: 'right' }}>PTS</div>
        <div style={{ textAlign: 'right' }}>REB</div>
        <div style={{ textAlign: 'right' }}>AST</div>
        <div style={{ textAlign: 'right' }}>FG</div>
      </div>
      {leaders.map((p) => (
        <a
          key={p.id}
          href={p.id ? `https://www.espn.com/nba/player/_/id/${p.id}` : '#'}
          target={p.id ? '_blank' : undefined}
          rel={p.id ? 'noopener noreferrer' : undefined}
          className="link-row"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px 40px',
            gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
            fontSize: 10.5, textDecoration: 'none', color: 'inherit', alignItems: 'center',
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.starter && <span style={{ color, marginRight: 4, fontSize: 9 }}>●</span>}
            {p.short || p.name}
            {p.position && <span style={{ color: C.muted, marginLeft: 4, fontSize: 9 }}>· {p.position}</span>}
          </div>
          <div style={{ textAlign: 'right', color: C.amberBright, fontWeight: 600 }}>{p.pts}</div>
          <div style={{ textAlign: 'right', color: C.text }}>{p.reb}</div>
          <div style={{ textAlign: 'right', color: C.text }}>{p.ast}</div>
          <div style={{ textAlign: 'right', color: C.muted, fontSize: 9.5 }}>{p.fg}</div>
        </a>
      ))}
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', background: C.panelSoft, border: `1px solid ${C.lineSoft}` }}>
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

export default function LiveGameFocus({ eventId, favTeam, accent, injuries, onClose }) {
  const { summary, winProb, lastUpdate } = useGameDetails(eventId);
  const tickerRef = useRef(null);
  const [rightTab, setRightTab] = useState('plays'); // 'plays' | 'stats'

  // Resolve team meta from abbr
  const findByAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === abbr);
  const awayFull = summary ? findByAbbr(summary.awayAbbr) : null;
  const homeFull = summary ? findByAbbr(summary.homeAbbr) : null;
  const awayMeta = awayFull ? TEAM_META[awayFull] : { color: '#555' };
  const homeMeta = homeFull ? TEAM_META[homeFull] : { color: '#777' };

  // Most recent plays first in the ticker (but limited for perf)
  const plays = useMemo(() => (summary?.plays || []).slice(-40).reverse(), [summary]);

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

  const isLive = summary?.statusState === 'in';
  const isFinal = summary?.statusState === 'post';
  const favInGame = favTeam && (awayFull === favTeam || homeFull === favTeam);

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
              {['plays', 'stats'].map((tab) => (
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
                  {tab === 'plays' ? 'Play-by-play' : 'Box Score'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 9.5, color: C.muted }}>
              {rightTab === 'plays' ? `${plays.length} plays` : 'ESPN box'} · {lastUpdate ? `${Math.round((Date.now() - lastUpdate) / 1000)}s ago` : '—'}
            </span>
          </div>

          {rightTab === 'stats' && summary?.boxscore?.length > 0 && (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {summary.boxscore.map((t) => (
                <BoxScoreTable key={t.abbr} team={t} color={t.abbr === summary.awayAbbr ? awayMeta.color : homeMeta.color} />
              ))}
            </div>
          )}
          {rightTab === 'stats' && (!summary?.boxscore?.length) && (
            <div style={{ padding: 20, fontSize: 10.5, color: C.dim, textAlign: 'center' }}>
              Box score opens at tip-off.
            </div>
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
    </div>
  );
}
