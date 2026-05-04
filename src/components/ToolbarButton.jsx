import React from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { resolveSportColor } from '../lib/sportColor.js';

/**
 * ToolbarButton — compact action button for masthead/controls (step 4/9).
 *
 * 28×28 visual footprint aligned to the 4pt grid (was 26×26, which looked
 * thumb-hostile on mobile). The actual tap target is 44×44 — achieved with
 * an absolutely-positioned invisible overlay inside the button that extends
 * `inset: -8px` past the visible border. This meets WCAG 2.5.5 AAA without
 * making the toolbar look bulky.
 *
 * Two forms:
 *   icon-only          → 28×28 square (pill-radius), pass `icon` glyph
 *   text-label (EN/ID) → auto-width × 28h, pass `label` instead of `icon`
 *
 * Both render a single <button>; the 44×44 hit region is applied via inline
 * position: relative + a pseudo-element replacement (an absolutely-positioned
 * <span> so we can do it without global CSS).
 *
 * Color resolution mirrors Button: `sportId` picks the theme-correct accent;
 * `accent` is an explicit fallback; else falls back to --accent (gibol amber).
 */

const BASE_STYLE = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 28,
  minWidth: 28,
  padding: 0,
  background: 'transparent',
  // v0.11.5 a11y — WCAG 1.4.11. Was var(--border-subtle) at ~2.1:1.
  // --border-interactive ≥ 3:1 in both themes (see src/index.css).
  border: '1px solid var(--border-interactive)',
  borderRadius: 'var(--r-pill)',
  color: 'var(--fg-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 1,
  lineHeight: 1,
  transition: 'border-color var(--dur-short) var(--ease-standard), color var(--dur-short) var(--ease-standard), background var(--dur-short) var(--ease-standard)',
};

export default function ToolbarButton({
  onClick,
  icon,
  label,
  ariaLabel,
  title,
  sportId,
  accent,
  active = false,
  style,
  className,
}) {
  const { theme } = useApp();
  const color = resolveSportColor({ theme, sportId, accent }) || 'var(--accent)';

  // Text label chips pad horizontally; icon-only stays 28×28.
  const hasLabel = !!label;
  const footprint = hasLabel
    ? { padding: '0 10px' }
    : { width: 28 };

  const activeStyle = active
    ? { borderColor: color, color }
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      className={className}
      style={{ ...BASE_STYLE, ...footprint, ...activeStyle, ...style }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.color = color;
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = 'var(--border-interactive)';
        e.currentTarget.style.color = 'var(--fg-secondary)';
      }}
    >
      {/* Invisible 44×44 hit-region overlay. Extends past the visible border
          by 8px on each side (28 + 8 + 8 = 44). pointer-events:auto on the
          overlay is inherited; we keep it transparent and let the button's
          own click handling absorb taps anywhere in the expanded region. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 'inherit',
        }}
      />
      <span style={{ position: 'relative' }}>
        {hasLabel ? label : icon}
      </span>
    </button>
  );
}
