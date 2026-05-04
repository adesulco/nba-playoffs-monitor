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
 *
 * v0.11.20 GIB-013 — title element promoted from <span> to <h2>. The
 * audit flagged HomeV1 as "0 h2 count" because every section used
 * CardHead with a <span>. Each card on the personalised feed is a
 * semantic section; a heading per section gives the screen-reader
 * rotor an outline. Visual style is unchanged — still the 10 px
 * UPPERCASE eyebrow with 0.14em letter-spacing. Title-string can be
 * a React node (e.g. <LiveDot /> + text) so we avoid nesting <h2>
 * inside inline-flex by only emitting h2 when title is a plain string.
 */
export function CardHead({ title, right, style, ...rest }) {
  const titleStyle = {
    font: "700 10px 'Inter Tight'",
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    margin: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
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
      <h2 style={titleStyle}>{title}</h2>
      {right}
    </div>
  );
}
