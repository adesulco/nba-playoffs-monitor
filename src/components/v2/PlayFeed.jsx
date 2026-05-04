import React from 'react';

/**
 * Sport-agnostic ordered feed of play-by-play rows. Used by NBA Game
 * Center; works for any sport's PBP shape (basketball, football,
 * tennis points, F1 incidents).
 *
 * Phase 2 ship Phase D (per docs/redesign-v4-handover.md §4 Phase D).
 *
 * Props:
 *   plays        — array of { t, team, text, big, color, scoreSnap }
 *                    t       — timestamp/clock label (e.g. "Q3 2:14"),
 *                              "67'", or "S2 5-4". Free-form short string.
 *                    team    — team code/abbr or null for neutral plays.
 *                    text    — the play description.
 *                    big     — boolean. true = highlight (amber + bold).
 *                    color   — optional team color for the left stripe.
 *                    scoreSnap — optional "78-82" snapshot at this moment.
 *   maxHeight    — px max-height before scroll. Default 320.
 *   reverse      — when true, renders newest-first (live). Default true.
 *   emptyText    — copy when plays is empty.
 *   className    — passthrough.
 */

export default function PlayFeed({
  plays = [],
  maxHeight = 320,
  reverse = true,
  emptyText = 'Belum ada play feed.',
  className = '',
}) {
  const ordered = reverse ? [...plays].reverse() : plays;

  if (!ordered.length) {
    return (
      <div
        className={`v2 play-feed-empty ${className}`.trim()}
        style={{
          padding: '14px 12px',
          color: 'var(--ink-3)',
          fontSize: 12,
          fontStyle: 'italic',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 6,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={`v2 play-feed ${className}`.trim()}
      style={{
        maxHeight,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderRadius: 6,
      }}
    >
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {ordered.map((p, i) => {
          const stripeColor = p.color || 'var(--ink-3)';
          const big = !!p.big;
          return (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto',
                gap: 10,
                alignItems: 'baseline',
                padding: '8px 12px',
                borderBottom: i === ordered.length - 1 ? 'none' : '1px solid var(--line-soft)',
                borderLeft: `3px solid ${stripeColor}`,
                background: big ? 'var(--amber-soft)' : 'transparent',
                transition: 'background 120ms',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.06em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.t || ''}
              </span>
              <span
                style={{
                  fontSize: big ? 13 : 12,
                  fontWeight: big ? 600 : 400,
                  lineHeight: 1.5,
                  color: big ? 'var(--ink)' : 'var(--ink-2)',
                }}
              >
                {p.team && (
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: stripeColor,
                      marginRight: 6,
                    }}
                  >
                    {p.team}
                  </strong>
                )}
                {p.text}
              </span>
              {p.scoreSnap && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: big ? 'var(--amber)' : 'var(--ink-3)',
                    fontVariantNumeric: 'tabular-nums',
                    flex: '0 0 auto',
                  }}
                >
                  {p.scoreSnap}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
