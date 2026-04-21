import React from 'react';

/**
 * <V2Button variant="amber">Open match ↗</V2Button>
 *
 * v2 button primitive. Variants per design handoff §3:
 *   - default — `bg-3` on `line`, hovers to `line`
 *   - primary — `blue` ink-0
 *   - amber   — `amber` on ink-0 text (high-contrast CTA)
 *   - ghost   — transparent, ink-3 text
 *
 * Kept v2-namespaced — existing `src/components/Button.jsx` stays unchanged.
 * Size defaults to `md` (6×10 padding, 11px). `sm` is 3×8 / 10px for inline
 * card actions. Pass `as="span"` when nested inside an <a> that owns click.
 */
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 6,
  font: "600 11px 'Inter Tight', sans-serif",
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background 160ms var(--ease-standard, ease), color 160ms var(--ease-standard, ease)',
};

const VARIANTS = {
  default: {
    background: 'var(--bg-3)',
    color: 'var(--ink-2)',
    border: '1px solid var(--line)',
    hoverBg: 'var(--line)',
  },
  primary: {
    background: 'var(--blue)',
    color: '#ffffff',
    border: '1px solid var(--blue)',
    hoverBg: 'var(--blue-2)',
  },
  amber: {
    background: 'var(--amber)',
    color: '#0A1628',
    border: '1px solid var(--amber)',
    hoverBg: 'var(--amber-2)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-3)',
    border: '1px solid transparent',
    hoverBg: 'var(--bg-3)',
  },
};

const SIZES = {
  sm: { padding: '3px 8px', fontSize: 10 },
  md: { padding: '6px 10px', fontSize: 11 },
};

export default function V2Button({
  variant = 'default',
  size = 'md',
  as: As = 'button',
  style,
  children,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const s = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const bg = hover ? v.hoverBg : v.background;
  return (
    <As
      type={As === 'button' ? 'button' : undefined}
      style={{
        ...BASE,
        padding: s.padding,
        fontSize: s.fontSize,
        background: bg,
        color: v.color,
        border: v.border,
        ...style,
      }}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </As>
  );
}
