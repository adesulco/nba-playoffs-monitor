import React from 'react';

/**
 * Top-performer stat card — name + team crest + position + 4-stat
 * grid. `hot` flag highlights with amber border + bg tint.
 *
 * Phase 2 ship Phase D (per docs/redesign-v4-handover.md §4 Phase D).
 *
 * Props:
 *   name         — player name (display).
 *   teamAbbr     — short team code (rendered as a small chip; pass null to skip).
 *   teamColor    — color for the team chip border (defaults to ink-3).
 *   position     — 'G' | 'F' | 'C' | etc. Optional.
 *   stats        — array of { label, value, sub? }. Up to 4; extras truncated.
 *                  Example: [{label:'PTS', value:30}, {label:'REB', value:8},
 *                            {label:'AST', value:6}, {label:'FG', value:'11-22'}]
 *   hot          — boolean. true = amber accent (career-high, hat-trick, etc).
 *   className    — passthrough.
 */

export default function PlayerStatCard({
  name,
  teamAbbr,
  teamColor = 'var(--ink-3)',
  position,
  stats = [],
  hot = false,
  className = '',
}) {
  const trimmed = stats.slice(0, 4);
  const fillCount = 4 - trimmed.length;
  const display = [...trimmed, ...Array.from({ length: fillCount }, () => null)];

  return (
    <article
      className={`v2 player-stat-card ${className}`.trim()}
      style={{
        padding: 12,
        background: hot ? 'var(--amber-soft)' : 'var(--bg-2)',
        border: `1px solid ${hot ? 'rgba(245,158,11,0.4)' : 'var(--line)'}`,
        borderLeft: hot ? '3px solid var(--amber)' : `3px solid ${teamColor}`,
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </h3>
          {position && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
              }}
            >
              {position}
            </span>
          )}
        </div>
        {teamAbbr && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: teamColor,
              padding: '2px 6px',
              border: `1px solid ${teamColor}55`,
              borderRadius: 3,
              background: 'rgba(0,0,0,0.18)',
              flex: '0 0 auto',
            }}
          >
            {teamAbbr}
          </span>
        )}
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display.map((s, i) => (
          <div
            key={i}
            style={{
              minWidth: 0,
              textAlign: 'center',
              padding: '4px 2px',
              background: 'var(--bg-3)',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              {s ? s.label : '—'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 700,
                color: hot ? 'var(--amber)' : 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {s ? s.value : '—'}
            </div>
            {s?.sub && (
              <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
