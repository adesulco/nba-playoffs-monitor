import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../lib/AppContext.jsx';
import { Icon, Crest } from './index.js';

/**
 * Search ⌘K palette — C3 spec (Part 4.1).
 *
 * Overlay: 640px centered modal (top offset 80px on desktop).
 * Mobile (<=560px): full-screen sheet — same component, width 100vw,
 * height 100vh, no border-radius, no top offset.
 *
 * Keyboard:
 *   ↑ ↓   navigate across ALL result rows (flat index, groups are visual)
 *   ⏎     open selected row (push to its path)
 *   ⌘↩    open in new tab (window.open)
 *   ⎋     close palette
 *
 * Default state (empty query): shows a flat "Trending now" list.
 * Typing: groups results by kind (Teams · Matches · Players · Leagues).
 * No results: empty state with browse CTAs.
 *
 * Results source for Phase 3: a local hand-curated catalogue covering the
 * core navigable entities (20 EPL clubs, top F1 drivers + constructors,
 * top tennis tournaments, NBA teams with pages). This keeps search fully
 * client-side, latency-free, and zero-API-cost. A real full-text index
 * across live matches ships in a later phase.
 */

const TRENDING = [
  { kind: 'LEAGUE', title: 'NBA Playoffs 2026',       sub: 'Bracket · Round 1',        meta: 'LIVE',        path: '/nba-playoff-2026',                iconSport: 'NBA' },
  { kind: 'LEAGUE', title: 'Premier League 2025-26',  sub: '20 clubs · Matchweek 34',  meta: 'LIVE',        path: '/premier-league-2025-26',          iconSport: 'Football' },
  { kind: 'LEAGUE', title: 'Formula 1 2026',          sub: '23 GP calendar',           meta: 'LIVE',        path: '/formula-1-2026',                  iconSport: 'F1' },
  { kind: 'LEAGUE', title: 'Tennis 2026',             sub: 'ATP · WTA',                meta: 'LIVE',        path: '/tennis',                          iconSport: 'Tennis' },
  { kind: 'LEAGUE', title: 'FIFA World Cup 2026',     sub: 'Jun 11 – Jul 19',          meta: 'SOON',        path: '/fifa-world-cup-2026',             iconSport: 'WorldCup' },
  { kind: 'PAGE',   title: 'Catatan Playoff',         sub: 'Daily recap',              meta: 'FEATURE',     path: '/recap' },
  { kind: 'PAGE',   title: 'Glossary',                sub: 'Istilah basket + bola',    meta: 'FEATURE',     path: '/glossary' },
];

function buildCatalogue() {
  // Imported lazily so the palette chunk stays independent and doesn't
  // inflate the top-level bundle.
  const list = [];

  // NBA teams — every abbr maps to a per-team SEO page
  const NBA_TEAMS = [
    ['Boston Celtics',     'boston-celtics',     'BOS', '#007A33'],
    ['Denver Nuggets',     'denver-nuggets',     'DEN', '#0E2240'],
    ['Oklahoma City Thunder','oklahoma-city-thunder','OKC', '#007AC1'],
    ['Los Angeles Lakers', 'los-angeles-lakers', 'LAL', '#552583'],
    ['Milwaukee Bucks',    'milwaukee-bucks',    'MIL', '#00471B'],
    ['New York Knicks',    'new-york-knicks',    'NYK', '#006BB6'],
    ['Philadelphia 76ers', 'philadelphia-76ers', 'PHI', '#006BB6'],
    ['Cleveland Cavaliers','cleveland-cavaliers','CLE', '#860038'],
    ['Miami Heat',         'miami-heat',         'MIA', '#98002E'],
    ['Orlando Magic',      'orlando-magic',      'ORL', '#0077C0'],
    ['Indiana Pacers',     'indiana-pacers',     'IND', '#FDBB30'],
    ['Minnesota Timberwolves','minnesota-timberwolves','MIN','#0C2340'],
    ['Phoenix Suns',       'phoenix-suns',       'PHX', '#1D1160'],
    ['New Orleans Pelicans','new-orleans-pelicans','NOP', '#0C2340'],
    ['Sacramento Kings',   'sacramento-kings',   'SAC', '#5A2D81'],
    ['Los Angeles Clippers','los-angeles-clippers','LAC','#C8102E'],
  ];
  for (const [name, slug, short, color] of NBA_TEAMS) {
    list.push({
      kind: 'TEAM',
      title: name, sub: 'NBA',
      short, color,
      path: `/nba-playoff-2026/${slug}`,
    });
  }
  return list;
}

function classifyRow(row) {
  // Visual icon based on kind/sport
  if (row.short && row.color) {
    return <Crest short={row.short} color={row.color} size={18} />;
  }
  if (row.iconSport) {
    return <Icon name={row.iconSport} size={14} color="var(--ink-2)" />;
  }
  return <Icon name="Bookmark" size={14} color="var(--ink-3)" />;
}

function filterRows(rows, q) {
  if (!q) return [];
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return [];
  return rows.filter((r) => {
    return (r.title || '').toLowerCase().includes(needle) ||
           (r.sub || '').toLowerCase().includes(needle);
  });
}

function groupByKind(rows) {
  const order = ['TEAM', 'MATCH', 'PLAYER', 'LEAGUE', 'PAGE'];
  const labels = {
    TEAM: 'Teams',
    MATCH: 'Matches',
    PLAYER: 'Players',
    LEAGUE: 'Leagues',
    PAGE: 'Pages',
  };
  const buckets = {};
  for (const r of rows) {
    (buckets[r.kind] = buckets[r.kind] || []).push(r);
  }
  return order
    .filter((k) => buckets[k]?.length)
    .map((k) => ({ kind: k, label: labels[k], rows: buckets[k] }));
}

export default function SearchPalette({ onClose }) {
  const { lang } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const catalogue = useMemo(() => [...TRENDING, ...buildCatalogue()], []);
  const results = useMemo(() => {
    const base = q ? filterRows(catalogue, q) : TRENDING;
    return base.slice(0, 30);
  }, [catalogue, q]);
  const groups = useMemo(() => (q ? groupByKind(results) : [{ kind: 'TRENDING', label: lang === 'id' ? 'Sedang populer' : 'Trending now', rows: results }]), [q, results, lang]);

  // Flatten for keyboard index
  const flatRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset index when query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  // Keyboard handling
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatRows.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        const row = flatRows[activeIdx];
        if (!row) return;
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          window.open(row.path, '_blank', 'noopener,noreferrer');
        } else {
          navigate(row.path);
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, flatRows, navigate, onClose]);

  // Close on backdrop click
  function onBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'id' ? 'Pencarian' : 'Search'}
      onClick={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,22,40,0.72)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div
        style={{
          width: 640,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'min(520px, calc(100vh - 160px))',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          boxShadow: '0 24px 64px rgba(0,0,0,.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <Icon name="Search" size={16} color="var(--ink-3)" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'id' ? 'Cari tim, laga, pemain, liga…' : 'Search teams, matches, players, leagues…'}
            aria-label={lang === 'id' ? 'Pencarian' : 'Search'}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              font: '500 15px "Inter Tight", sans-serif',
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={lang === 'id' ? 'Hapus pencarian' : 'Clear'}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 3,
                color: 'var(--ink-3)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              ×
            </button>
          )}
          <span
            className="mono"
            style={{
              fontSize: 9,
              padding: '3px 6px',
              border: '1px solid var(--line)',
              borderRadius: 3,
              color: 'var(--ink-3)',
            }}
          >
            esc
          </span>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {flatRows.length === 0 && q && (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  padding: 14,
                  borderRadius: '50%',
                  background: 'var(--bg-3)',
                  color: 'var(--ink-3)',
                }}
              >
                <Icon name="Search" size={20} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {lang === 'id' ? `Tidak ada hasil untuk "${q}"` : `No matches for "${q}"`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', maxWidth: 360, lineHeight: 1.5 }}>
                {lang === 'id'
                  ? 'Coba nama tim (misalnya Arsenal), pemain, atau liga.'
                  : 'Try a team name (e.g. Arsenal), a player, or a league.'}
              </div>
            </div>
          )}

          {flatRows.length > 0 &&
            groups.map((g) => {
              let idxBase = 0;
              for (const gg of groups) {
                if (gg === g) break;
                idxBase += gg.rows.length;
              }
              return (
                <div key={g.kind}>
                  <div
                    style={{
                      padding: '10px 16px 4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--ink-3)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {g.label}
                    </span>
                    {q && (
                      <span
                        className="mono"
                        style={{ fontSize: 9, color: 'var(--ink-4)' }}
                      >
                        {g.rows.length}
                      </span>
                    )}
                  </div>
                  {g.rows.map((r, i) => {
                    const globalIdx = idxBase + i;
                    const active = globalIdx === activeIdx;
                    return (
                      <button
                        key={`${g.kind}-${r.path}-${i}`}
                        type="button"
                        onClick={() => {
                          navigate(r.path);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '9px 16px',
                          background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
                          borderLeft: `2px solid ${active ? 'var(--amber)' : 'transparent'}`,
                          width: '100%',
                          border: 0,
                          borderRight: 0,
                          borderTop: 0,
                          borderBottom: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: r.short && r.color ? 'transparent' : 'var(--bg-3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ink-2)',
                          }}
                        >
                          {classifyRow(r)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                            {r.title}
                            {r.sub && (
                              <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · {r.sub}</span>
                            )}
                          </div>
                          {r.meta && (
                            <div
                              className="mono"
                              style={{
                                fontSize: 9,
                                color: 'var(--ink-3)',
                                marginTop: 2,
                                letterSpacing: '0.06em',
                              }}
                            >
                              {r.meta}
                            </div>
                          )}
                        </div>
                        <span
                          className="mono"
                          style={{
                            fontSize: 9,
                            color: 'var(--ink-4)',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {r.kind}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {/* Footer — keyboard hints */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--line-soft)',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            fontSize: 10,
            color: 'var(--ink-3)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> {lang === 'id' ? 'navigasi' : 'navigate'}
          </span>
          <span>
            <Kbd>↩</Kbd> {lang === 'id' ? 'buka' : 'open'}
          </span>
          <span>
            <Kbd>⌘↩</Kbd> {lang === 'id' ? 'tab baru' : 'new tab'}
          </span>
          <span>
            <Kbd>esc</Kbd> {lang === 'id' ? 'tutup' : 'close'}
          </span>
          <span style={{ marginLeft: 'auto' }} className="mono">
            gibol · search
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        padding: '2px 5px',
        border: '1px solid var(--line)',
        borderRadius: 3,
        color: 'var(--ink-2)',
        background: 'var(--bg-3)',
      }}
    >
      {children}
    </span>
  );
}
