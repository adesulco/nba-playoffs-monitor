import React from 'react';

/**
 * <LiveStatusPill> — single canonical status pill for hub + leaf
 * surfaces. Replaces the 5 different live/coming-soon/final/partial
 * chips scattered across the codebase.
 *
 * Phase 2 Sprint C (v0.18.0). Shape and motion match what the
 * existing `Chip variant="live|soon"` rendered (so this is a
 * drop-in replacement on call sites that previously used Chip for
 * status). Three new variants land here that Chip didn't carry:
 * `final`, `partial`, `offline`.
 *
 *   live        — match in flight. --live red, white text, pulsing dot.
 *   coming-soon — pre-event waitlist / hidden-future. amber outline, no dot.
 *   final       — match over, score is settled. --line-soft outline, dim ink.
 *   partial     — feed degraded / partial data. amber outline + warning glyph.
 *   offline     — feed unreachable / completely cold. --line outline, --ink-4.
 *
 * Color resolution:
 *   `live` ignores sport accent — universal red signal (post v0.11.20
 *   GIB-bonus fix). Caller can override via `accent` for branded
 *   contexts; defaults to --live token.
 *   Other variants use --line-* / --warn / --ink-* tokens directly,
 *   so they stay theme-aware automatically.
 *
 * Motion:
 *   Only `live` animates (livepulse keyframe in src/index.css). The
 *   global @media (prefers-reduced-motion) block already kills it.
 *
 * v1 ergonomics:
 *   `<LiveStatusPill variant="live" label="LIVE" />`
 *   `<LiveStatusPill variant="coming-soon" />`   ← defaults to "COMING SOON"
 *   `<LiveStatusPill variant="final" label="FT" />`
 *   `<LiveStatusPill variant="partial" label="DATA PARTIAL" />`
 *   `<LiveStatusPill variant="offline" label="OFFLINE" />`
 */

const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 'var(--r-pill, 999px)',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const DEFAULT_LABELS = {
  'live':        'LIVE',
  'coming-soon': 'COMING SOON',
  'final':       'FINAL',
  'partial':     'PARTIAL',
  'offline':     'OFFLINE',
};

export default function LiveStatusPill({
  variant = 'live',
  label,
  accent,
  style,
  // role-aware aria. Live regions get aria-live polite on the
  // wrapper if the variant is `live` or `partial` so AT users get
  // notified when status flips.
  ariaLive,
}) {
  const text = label ?? DEFAULT_LABELS[variant] ?? variant.toUpperCase();
  const liveAnnounce = ariaLive ?? (variant === 'live' || variant === 'partial' ? 'polite' : undefined);

  if (variant === 'live') {
    const bg = accent || 'var(--live)';
    return (
      <span
        role="status"
        aria-live={liveAnnounce}
        style={{ ...BASE, background: bg, color: '#fff', ...style }}
      >
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
        {text}
      </span>
    );
  }

  if (variant === 'coming-soon') {
    const c = accent || 'var(--warn)';
    return (
      <span
        role="status"
        style={{
          ...BASE,
          background: 'transparent',
          border: `1px solid ${c}`,
          color: c,
          padding: '2px 7px',
          ...style,
        }}
      >
        {text}
      </span>
    );
  }

  if (variant === 'final') {
    return (
      <span
        role="status"
        style={{
          ...BASE,
          background: 'transparent',
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
          padding: '2px 7px',
          ...style,
        }}
      >
        {text}
      </span>
    );
  }

  if (variant === 'partial') {
    return (
      <span
        role="status"
        aria-live={liveAnnounce}
        style={{
          ...BASE,
          background: 'transparent',
          border: '1px solid var(--warn)',
          color: 'var(--warn)',
          padding: '2px 7px',
          ...style,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 9 }}>⚠</span>
        {text}
      </span>
    );
  }

  // offline (and any unknown variant)
  return (
    <span
      role="status"
      style={{
        ...BASE,
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--ink-4)',
        padding: '2px 7px',
        ...style,
      }}
    >
      {text}
    </span>
  );
}
