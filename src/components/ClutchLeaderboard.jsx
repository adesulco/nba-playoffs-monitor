import React from 'react';
import { useClutchLeaderboard } from '../hooks/useClutchLeaderboard.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import PlayerHead from './PlayerHead.jsx';
import WatchStar from './WatchStar.jsx';

/**
 * Compact panel showing the clutch-time leaders across all completed playoff games so far.
 * Empty state kicks in automatically when no games have happened yet.
 */
export default function ClutchLeaderboard({ watchlist, accent, lang }) {
  const { leaders, loading, coveredGames } = useClutchLeaderboard();

  const isIdle = !loading && leaders.length === 0;

  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.panelSoft,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.text, fontWeight: 600 }}>
            ⚡ {lang === 'id' ? 'PEMAIN KLUTCH' : 'CLUTCH LEADERS'}
          </span>
          <span style={{ fontSize: 9, letterSpacing: 0.5, color: C.muted, fontWeight: 500 }}>
            {lang === 'id' ? 'Q4 ≤ 5 min, selisih ≤5' : 'Q4 ≤ 5 min, margin ≤5'}
          </span>
        </div>
        <span style={{ fontSize: 9.5, color: C.dim }}>
          {loading ? (lang === 'id' ? 'memuat…' : 'loading…') : `${coveredGames} ${lang === 'id' ? 'laga' : 'games'}`}
        </span>
      </div>

      {isIdle && (
        <div style={{ padding: 14, fontSize: 10.5, color: C.dim, textAlign: 'center', lineHeight: 1.5 }}>
          {lang === 'id'
            ? 'Leaderboard aktif setelah laga pertama usai. Siap menangkap momen klutch pertama.'
            : 'Opens once playoff games go final. Ready to capture the first clutch moment.'}
        </div>
      )}

      {leaders.length > 0 && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '14px 18px 28px 1fr 26px 30px 34px',
            gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
            background: C.panelSoft, fontSize: 8.5, letterSpacing: 0.8, color: C.dim,
          }}>
            <div />
            <div />
            <div />
            <div />
            <div style={{ textAlign: 'right' }}>PTS</div>
            <div style={{ textAlign: 'right' }}>FG</div>
            <div style={{ textAlign: 'right' }}>GMS</div>
          </div>

          {leaders.slice(0, 8).map((p, i) => {
            const meta = p.teamAbbr ? TEAM_META[Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === p.teamAbbr)] : null;
            const color = meta?.color || '#555';
            const fg = `${p.made}/${p.attempts}`;
            const pct = p.attempts > 0 ? Math.round((p.made / p.attempts) * 100) : 0;
            const isElite = p.attempts >= 5 && pct >= 55;
            const player = { id: p.id, name: p.name, teamAbbr: p.teamAbbr };
            return (
              <a
                key={p.id}
                href={p.id ? `https://www.espn.com/nba/player/_/id/${p.id}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="link-row"
                style={{
                  display: 'grid', gridTemplateColumns: '14px 18px 28px 1fr 26px 30px 34px',
                  gap: 6, padding: '5px 10px', borderBottom: `1px solid ${C.lineSoft}`,
                  fontSize: 10.5, alignItems: 'center',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                {watchlist ? <WatchStar player={player} watchlist={watchlist} size={11} /> : <div />}
                <span style={{ color: C.muted, fontSize: 9, textAlign: 'right' }}>{i + 1}</span>
                <PlayerHead id={p.id} name={p.name} color={color} size={22} />
                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.teamAbbr && (
                    <span style={{ padding: '1px 4px', background: color, color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 2, marginRight: 5 }}>
                      {p.teamAbbr}
                    </span>
                  )}
                  {p.name}
                  {isElite && <span style={{ color: accent, marginLeft: 5, fontSize: 9 }}>🔥</span>}
                </div>
                <span style={{ textAlign: 'right', color: C.amberBright, fontWeight: 600 }}>{p.pts}</span>
                <span style={{ textAlign: 'right', color: C.text, fontSize: 9.5 }}>{fg}</span>
                <span style={{ textAlign: 'right', color: C.dim, fontSize: 9.5 }}>{p.games}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
