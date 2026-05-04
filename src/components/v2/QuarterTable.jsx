import React from 'react';

/**
 * Sport-agnostic by-period score table — 2 rows (away/home) × N
 * periods + final. Used by NBA Game Center; works for any sport
 * with discrete periods/halves/sets.
 *
 * Phase 2 ship Phase D (per docs/redesign-v4-handover.md §4 Phase D).
 *
 * Props:
 *   periods       — array of { label, away, home }. e.g.
 *                     [{label:'Q1', away:25, home:30}, ...,
 *                      {label:'F',  away:96, home:128}]
 *                   The final period is conventionally last; component
 *                   doesn't enforce that — caller orders.
 *   awayLabel     — short label like "PHI" or team name fragment.
 *   homeLabel     — short label like "BOS".
 *   awayColor     — accent for the away row's left rule.
 *   homeColor     — accent for the home row's left rule.
 *   className     — passthrough.
 *
 * Mobile-first: horizontal-scrolls on tiny viewports if there are
 * >5 periods (overflow-x: auto). Tabular-nums + JetBrains Mono so
 * digits align cleanly.
 */
export default function QuarterTable({
  periods = [],
  awayLabel = 'AWAY',
  homeLabel = 'HOME',
  awayColor = 'var(--ink-3)',
  homeColor = 'var(--ink-3)',
  className = '',
}) {
  if (!periods.length) return null;

  return (
    <div
      className={`v2 quarter-table ${className}`.trim()}
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        margin: '12px 0',
        border: '1px solid var(--line)',
        borderRadius: 8,
        background: 'var(--bg-2)',
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: `${100 + periods.length * 50}px`,
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--ink-3)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                width: 90,
              }}
            />
            {periods.map((p, i) => (
              <th
                key={i}
                scope="col"
                style={{
                  textAlign: 'right',
                  padding: '8px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { team: 'away', label: awayLabel, color: awayColor },
            { team: 'home', label: homeLabel, color: homeColor },
          ].map((row, ri) => (
            <tr
              key={row.team}
              style={{
                borderTop: ri === 0 ? 'none' : '1px solid var(--line-soft)',
              }}
            >
              <th
                scope="row"
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderLeft: `3px solid ${row.color}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {row.label}
              </th>
              {periods.map((p, i) => {
                const v = row.team === 'away' ? p.away : p.home;
                const isFinal = i === periods.length - 1;
                return (
                  <td
                    key={i}
                    style={{
                      textAlign: 'right',
                      padding: '10px 10px',
                      fontSize: isFinal ? 16 : 14,
                      fontWeight: isFinal ? 700 : 500,
                      color: isFinal ? 'var(--ink)' : 'var(--ink-2)',
                    }}
                  >
                    {v != null ? v : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
