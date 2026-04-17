import React from 'react';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import PlayerHead from './PlayerHead.jsx';
import WatchStar from './WatchStar.jsx';

/**
 * Right-rail watchlist panel showing watched players with current live stats
 * pulled from the active-game summary (if any).
 *
 * When a game is live AND a watched player is in it, show pts/reb/ast live.
 * Otherwise just show the player row.
 */
export default function WatchlistPanel({ watchlist, summary, onRequestNotifications, t }) {
  const statsByPlayerId = React.useMemo(() => {
    const map = {};
    if (!summary?.boxscore) return map;
    for (const team of summary.boxscore) {
      for (const p of team.players || []) {
        if (p.id) map[String(p.id)] = { ...p, teamAbbr: team.abbr };
      }
    }
    return map;
  }, [summary]);

  const players = watchlist.list;

  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft,
      }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
          ★ WATCHLIST
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.dim, fontSize: 9.5 }}>{players.length}/99</span>
          {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
            <button
              onClick={onRequestNotifications}
              style={{
                background: 'transparent', border: `1px solid ${C.lineSoft}`,
                color: C.amber, fontFamily: 'inherit', fontSize: 9, letterSpacing: 0.5,
                padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontWeight: 600,
              }}
            >
              ENABLE ALERTS
            </button>
          )}
        </div>
      </div>

      {players.length === 0 && (
        <div style={{ padding: 14, fontSize: 10.5, color: C.dim, textAlign: 'center', lineHeight: 1.5 }}>
          Star any player in the Box Score or Player Stats panels to watch their live line.
        </div>
      )}

      {players.map((p) => {
        const meta = p.teamAbbr ? TEAM_META[Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === p.teamAbbr)] : null;
        const liveStats = statsByPlayerId[String(p.id)];
        const color = meta?.color || '#555';
        return (
          <a
            key={p.id}
            href={p.id ? `https://www.espn.com/nba/player/_/id/${p.id}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="link-row"
            style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto auto',
              gap: 8, padding: '6px 12px', borderBottom: `1px solid ${C.lineSoft}`,
              alignItems: 'center', textDecoration: 'none', color: 'inherit', fontSize: 10.5,
            }}
          >
            <PlayerHead id={p.id} name={p.name} color={color} size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.3 }}>
                {p.teamAbbr && <span style={{ color: color, fontWeight: 600 }}>{p.teamAbbr}</span>}
                {p.position ? ` · ${p.position}` : ''}
                {liveStats && (
                  <span style={{ color: C.amberBright, marginLeft: 6, fontWeight: 600 }}>
                    {liveStats.pts}/{liveStats.reb}/{liveStats.ast}
                    {liveStats.min && <span style={{ color: C.muted, fontWeight: 400 }}> · {liveStats.min} min</span>}
                  </span>
                )}
              </div>
            </div>
            <WatchStar player={p} watchlist={watchlist} size={13} />
          </a>
        );
      })}
    </div>
  );
}
