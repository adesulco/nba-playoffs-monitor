import React from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { resolveSportColor } from '../lib/sportColor.js';

/**
 * Chip — shared status/metadata pill for Home + ComingSoon (step 3/9).
 *
 * Three variants:
 *   - live     → filled accent bg, white text, pulsing dot (livepulse keyframe)
 *   - soon     → hollow outline, accent border + text on transparent bg
 *   - neutral  → transparent, --fg-tertiary text (metadata labels, league caps)
 *
 * Color resolution (theme-aware):
 *   sportId prop wins — reads the lightened stroke on dark, full brand on light,
 *   keeping Step 3's PL contrast fix (#37003C fails AA on --ink-1; --sport-pl
 *   #d7b5f5 passes). Falls back to explicit `accent` prop, then to --live for
 *   the live variant and --fg-secondary for soon.
 *
 * Motion:
 *   Only the `live` variant animates. @keyframes livepulse lives in index.css
 *   and is already honored by the global prefers-reduced-motion block.
 */

// Sport-accent lookup lives in src/lib/sportColor.js — see Button + SportIcon.

const BASE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 'var(--r-pill)',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

export default function Chip({ variant = 'neutral', sportId, accent, label, style }) {
  const { theme } = useApp();
  const color = resolveSportColor({ theme, sportId, accent });

  if (variant === 'live') {
    // v0.11.20 GIB-bonus: LIVE is a universal signal — always use the
    // --live token, ignore sportId. Previously `<Chip variant="live"
    // sportId="tennis">` rendered white text on light-gold (#e6c47a),
    // which axe-core measured at 1.67:1 (worst violation on site).
    // Sport-branded accents live on the "soon"/"neutral" variants,
    // not "live." Any consumer that wants a sport-tinted live chip can
    // supply `accent` explicitly.
    const bg = accent || 'var(--live)';
    return (
      <span style={{ ...BASE_STYLE, background: bg, color: '#fff', ...style }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#fff',
            animation: 'livepulse 1.6s ease-in-out infinite',
          }}
        />
        {label}
      </span>
    );
  }

  if (variant === 'soon') {
    const c = color || 'var(--fg-secondary)';
    return (
      <span style={{
        ...BASE_STYLE,
        background: 'transparent',
        border: `1px solid ${c}`,
        color: c,
        // compensate for the 1px border so soon and live chips align vertically
        padding: '2px 7px',
        ...style,
      }}>
        {label}
      </span>
    );
  }

  // neutral
  return (
    <span style={{
      ...BASE_STYLE,
      background: 'transparent',
      color: 'var(--fg-tertiary)',
      ...style,
    }}>
      {label}
    </span>
  );
}
