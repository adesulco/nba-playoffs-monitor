import React from 'react';

/**
 * <Pill variant="live"><LiveDot />Q3 4:12</Pill>
 *
 * v2 pill chip — variants: live | amber | blue | up | down | muted | default.
 * Sized for data labels, LIVE indicators, and category tags. The pill itself
 * is semantics-free; pass children to control content. For LIVE use, wrap
 * <LiveDot /> as the first child — it pulses (and auto-stops under
 * prefers-reduced-motion via the existing CSS rule in index.css).
 */
const VARIANTS = {
  live: { bg: 'rgba(239,68,68,.12)', fg: 'var(--live)' },
  amber: { bg: 'rgba(245,158,11,.14)', fg: 'var(--amber)' },
  blue: { bg: 'rgba(59,130,246,.14)', fg: 'var(--blue-2)' },
  up: { bg: 'rgba(16,185,129,.14)', fg: 'var(--up)' },
  down: { bg: 'rgba(239,68,68,.14)', fg: 'var(--down)' },
  muted: { bg: 'var(--bg-3)', fg: 'var(--ink-3)' },
  default: { bg: 'var(--bg-3)', fg: 'var(--ink-2)' },
};

export default function Pill({
  variant = 'default',
  size = 'md', // 'sm' | 'md'
  children,
  style,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const pad = size === 'sm' ? '2px 6px' : '3px 7px';
  const fs = size === 'sm' ? 9 : 10;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        font: `700 ${fs}px "JetBrains Mono", ui-monospace, monospace`,
        padding: pad,
        borderRadius: 999,
        letterSpacing: '0.04em',
        background: v.bg,
        color: v.fg,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Pulsing red dot — use inside <Pill variant="live"> for LIVE tags. */
export function LiveDot({ size = 6 }) {
  // Reuses the `.live-dot` class defined in src/index.css — already wired
  // to the existing @keyframes livepulse and honored by prefers-reduced-motion.
  return (
    <span
      className="live-dot"
      aria-hidden="true"
      style={{ width: size, height: size, marginRight: 0 }}
    />
  );
}
