import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApiFootballLeaderboard } from '../hooks/useApiFootballLeaderboard.js';

/**
 * <LeaderboardPanel> — v0.14.3.
 *
 * Shared Goals/Assists leaderboard panel. Used by:
 *   - EPL hub (`league=39`, `clubHrefBase='/premier-league-2025-26/club'`)
 *   - Super League hub (`league=274`, `clubHrefBase='/super-league-2025-26/club'`)
 *   - Future leagues — drop in a new (league, season, resolveClub).
 *
 * Tab toggle switches between Goals (top scorer) and Assists (top
 * assist). Both feed off the shared `useApiFootballLeaderboard` hook
 * which hits `/players/topscorers` or `/players/topassists` on demand.
 *
 * Graceful degradation: if `API_FOOTBALL_KEY` isn't configured the
 * proxy returns 401/403 and the panel renders a setup-pending hint
 * instead of breaking the page.
 *
 * Props:
 *   league          — API-Football league id (39 EPL, 274 Super League)
 *   season          — season year, default 2025
 *   resolveClub     — (apiFootballTeamName) => { slug, accent, name } | null
 *                     Sport-specific mapping so panel rows link to the
 *                     right per-club page + paint the right accent.
 *   clubHrefBase    — `/premier-league-2025-26/club` etc. The slug is
 *                     appended to make the row's club link.
 *   highlightSlug   — optional; tints rows where row.team.slug matches
 *                     (e.g. user's favorite club).
 *   lang            — 'id' | 'en'.
 *   defaultType     — 'goals' or 'assists'. Default 'goals'.
 *   sourceLabel     — small caption under the table (e.g. "Sumber: API-Football").
 */
export default function LeaderboardPanel({
  league,
  season = 2025,
  resolveClub,
  clubHrefBase,
  highlightSlug,
  lang,
  defaultType = 'goals',
  sourceLabel,
}) {
  const [type, setType] = useState(defaultType);
  const { rows, loading, error } = useApiFootballLeaderboard({
    league, season, type, limit: 10, resolveClub,
  });

  const isAssists = type === 'assists';

  if (error === 'unauthorized') {
    return (
      <div style={placeholderStyle}>
        {lang === 'id'
          ? 'Leaderboard lagi disiapkan — data API-Football akan masuk dalam beberapa jam setelah kunci aktif.'
          : 'Leaderboard coming online — API-Football data populates within hours of the key activating.'}
      </div>
    );
  }

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.line}`,
      borderRadius: 4, overflow: 'hidden',
    }}>
      {/* Tab toggle — Goals | Assists */}
      <div role="tablist" style={{
        display: 'flex', borderBottom: `1px solid ${C.lineSoft}`,
        background: C.panelSoft,
      }}>
        <TabBtn
          label={lang === 'id' ? 'Top Skor' : 'Top Scorer'}
          active={!isAssists}
          onClick={() => setType('goals')}
        />
        <TabBtn
          label={lang === 'id' ? 'Top Assist' : 'Top Assists'}
          active={isAssists}
          onClick={() => setType('assists')}
        />
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ padding: 16, fontSize: 11, color: C.dim }}>
          {lang === 'id' ? 'Memuat…' : 'Loading…'}
        </div>
      ) : error ? (
        <div style={{
          padding: 14, background: '#EF444411',
          border: `1px solid #EF444444`, color: '#EF4444',
          fontSize: 11, margin: 8, borderRadius: 4,
        }}>
          {lang === 'id' ? 'Gagal ambil data dari API-Football.' : 'Couldn\'t load from API-Football.'}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 14, color: C.muted, fontSize: 11.5 }}>
          {lang === 'id' ? 'Belum ada data.' : 'No data yet.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: 11.5,
            fontFamily: 'var(--font-mono)', minWidth: 480,
          }}>
            <thead>
              <tr style={{ background: C.bg, color: C.dim, fontSize: 10, letterSpacing: 0.6 }}>
                <th style={{ ...th, width: 30, textAlign: 'right' }}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>{lang === 'id' ? 'PEMAIN' : 'PLAYER'}</th>
                <th style={{ ...th, textAlign: 'left' }}>{lang === 'id' ? 'KLUB' : 'CLUB'}</th>
                <th style={{ ...th, width: 50 }}>{isAssists ? (lang === 'id' ? 'AS' : 'A') : (lang === 'id' ? 'GOL' : 'G')}</th>
                <th style={{ ...th, width: 50 }}>{isAssists ? (lang === 'id' ? 'GOL' : 'G') : (lang === 'id' ? 'AS' : 'A')}</th>
                <th style={{ ...th, width: 50 }}>{lang === 'id' ? 'MAIN' : 'APP'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isFav = highlightSlug && p.team.slug === highlightSlug;
                const primary = isAssists ? p.assists : p.goals;
                const secondary = isAssists ? p.goals : p.assists;
                return (
                  <tr key={`${p.rank}-${p.name}`} style={{
                    borderTop: `1px solid ${C.lineSoft}`,
                    background: isFav ? `${p.team.accent}14` : 'transparent',
                  }}>
                    <td style={{ ...td, textAlign: 'right', color: C.dim, fontWeight: 600 }}>{p.rank}</td>
                    <td style={{ ...td, textAlign: 'left', color: C.text, fontWeight: 600 }}>
                      {p.name}
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 10, height: 10, background: p.team.accent,
                          borderRadius: 2, display: 'inline-block',
                        }} />
                        {p.team.slug && clubHrefBase ? (
                          <Link
                            to={`${clubHrefBase}/${p.team.slug}`}
                            style={{ color: C.text, textDecoration: 'none' }}
                          >
                            {p.team.shortName}
                          </Link>
                        ) : p.team.shortName}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: p.team.accent }}>{primary}</td>
                    <td style={{ ...td, color: C.dim }}>{secondary}</td>
                    <td style={{ ...td, color: C.muted }}>{p.appearances}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        padding: '6px 12px', fontSize: 9, color: C.muted, letterSpacing: 0.4,
        borderTop: `1px solid ${C.lineSoft}`, background: C.panelSoft,
      }}>
        {sourceLabel ?? (lang === 'id'
          ? 'Sumber: API-Football · update 10 menit'
          : 'Source: API-Football · refreshes every 10 min')}
      </div>
    </div>
  );
}

const placeholderStyle = {
  padding: 14, background: C.panelSoft,
  border: `1px dashed ${C.lineSoft}`, borderRadius: 4,
  color: C.muted, fontSize: 11.5, lineHeight: 1.5,
};

const th = {
  padding: '8px 8px', textAlign: 'center', fontWeight: 600, letterSpacing: 0.6,
};

const td = {
  padding: '8px 8px', textAlign: 'center', color: C.text,
};

function TabBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        flex: '1 1 50%',
        padding: '10px 12px',
        border: 'none',
        background: 'transparent',
        borderBottom: active ? `2px solid var(--amber)` : '2px solid transparent',
        color: active ? C.text : C.dim,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
