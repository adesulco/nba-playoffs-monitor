import React from 'react';
import { useApp } from '../lib/AppContext.jsx';

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

const SPORT_COLOR_DARK = {
  nba: '#ff8795',
  f1:  '#ff8a8a',
  pl:  '#d7b5f5',
  wc:  '#a0c2ea',
  id:  '#ff9ea0',
};
const SPORT_COLOR_LIGHT = {
  nba: '#c9082a',
  f1:  '#e10600',
  pl:  '#3d195b',
  wc:  '#326295',
  id:  '#c1272d',
};

function resolveColor({ theme, sportId, accent }) {
  if (sportId && SPORT_COLOR_DARK[sportId]) {
    return theme === 'light' ? SPORT_COLOR_LIGHT[sportId] : SPORT_COLOR_DARK[sportId];
  }
  return accent;
}

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
  const color = resolveColor({ theme, sportId, accent });

  if (variant === 'live') {
    const bg = color || 'var(--live)';
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
