import React from 'react';

/**
 * <Card padding="12px" hoverable>...</Card>
 *
 * v2 card primitive — bg, 1px border, 10px radius. Flat on dark (border only),
 * soft shadow on light (applied automatically via the paper theme in
 * index.css). `hoverable` ticks the border to the blue accent on hover,
 * matching the v2 interaction spec (no transform, no lift).
 */
export default function Card({
  padding = 0,
  hoverable = false,
  as: As = 'div',
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <As
      className={`v2-card ${hoverable ? 'v2-card-hoverable' : ''} ${className}`.trim()}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        padding,
        boxShadow: 'var(--e-0)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </As>
  );
}

/**
 * <CardHead title="Live now" right={<Pill>6 feeds</Pill>} />
 *
 * Header row with the v2 `.card-title` eyebrow (700/10px/0.14em uppercase
 * var(--ink-3)) on the left and optional content on the right, separated
 * by a 1px soft divider at the bottom.
 */
export function CardHead({ title, right, style, ...rest }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 13px',
        borderBottom: '1px solid var(--line-soft)',
        gap: 8,
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          font: "700 10px 'Inter Tight'",
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        {title}
      </span>
      {right}
    </div>
  );
}
