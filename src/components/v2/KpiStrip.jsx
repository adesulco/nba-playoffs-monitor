import React from 'react';

/**
 * <KpiStrip> — 4-cell stat strip for hub pages.
 *
 * Phase 2 Sprint D (v0.19.0). Receives an array of cells; renders
 * 2-col grid on mobile (≤540), 4-col on tablet+ (the existing
 * `.stat-strip` CSS rule already handles the responsive collapse).
 *
 * Cell shape:
 *   {
 *     eyebrow      — JetBrains-Mono uppercase label, ~9-10px
 *     value        — string OR ReactNode for rich value rendering
 *                    (when an array of [{accent, label, suffix}] is
 *                    needed, pass a custom node)
 *     sub          — small dim caption beneath the value
 *     accent       — optional hex; renders the 3px left stripe + tints
 *                    eyebrow color (used by EPL Title-Favorite, F1
 *                    Champion-Favorite — eventual migration)
 *     valueAccent  — optional override hex for value text color
 *                    (NBA uses accentBright for example)
 *     trend        — optional '+' | '-' | null
 *   }
 *
 * Why an array + spread helper instead of children:
 *   The directive specifies "Receives [{eyebrow, value, trend?, sub?}] × 4".
 *   Array-driven keeps the API symmetrical, lets data layers build
 *   the strip as plain JS, and makes the "can I migrate this in 5
 *   lines?" answer obvious.
 *
 * Accessibility:
 *   role=group with aria-label so screen readers know this is a
 *   metadata strip, not a navigation. Per cell announces its
 *   eyebrow + value + sub naturally via DOM order.
 */

export default function KpiStrip({
  cells = [],
  ariaLabel = 'Key stats',
  className,
  style,
}) {
  const safeCells = (cells || []).slice(0, 4);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`stat-strip${className ? ' ' + className : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        ...style,
      }}
    >
      {safeCells.map((c, i) => (
        <KpiCell
          key={c.key ?? i}
          cell={c}
          isLast={i === safeCells.length - 1}
        />
      ))}
    </div>
  );
}

function KpiCell({ cell, isLast }) {
  const {
    eyebrow,
    value,
    sub,
    accent,
    valueAccent,
    trend,
  } = cell;

  // 3px accent stripe on the left edge — only when accent supplied.
  // EPL's Title-Favorite + F1's Champion-Favorite cells use this
  // pattern today. Keeps cells visually grouped with their sport
  // accent without a full-bleed bg.
  const accentStripe = accent
    ? { borderLeft: `3px solid ${accent}` }
    : null;

  const trendColor = trend === '+' ? 'var(--up)'
                  : trend === '-' ? 'var(--down)'
                  : 'var(--ink-3)';

  return (
    <div
      style={{
        padding: '8px 14px',
        // Right-divider on every cell except the last keeps the
        // visual rhythm without a wrapping border.
        borderRight: isLast ? 'none' : '1px solid var(--line-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
        ...(accentStripe || {}),
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accent || 'var(--ink-3)',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {eyebrow}
        {trend && (
          <span style={{ marginLeft: 6, color: trendColor, fontWeight: 700 }}>
            {trend}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '-0.015em',
          color: valueAccent || 'var(--ink)',
          lineHeight: 1.15,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
