import React from 'react';

/**
 * <Momentum value={0.38} home="#0E2240" away="#007A33" />
 *
 * Two-tone momentum bar. `value` is the home team's share (0 → away, 1 →
 * home). CSS width transitions 400ms ease-out when `value` changes. Respects
 * prefers-reduced-motion via the global rule in index.css — transition falls
 * to 0.01ms so the bar snaps without any animation on low-motion systems.
 */
export default function Momentum({
  value = 0.5,
  home = 'var(--blue)',
  away = 'var(--amber)',
  height = 5,
  ariaLabel,
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role={ariaLabel ? 'meter' : undefined}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
      aria-valuenow={ariaLabel ? Math.round(pct) : undefined}
      aria-label={ariaLabel}
      style={{
        width: '100%',
        height,
        background: away,
        borderRadius: height,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: home,
          transition: 'width 400ms var(--ease-standard, ease-out)',
        }}
      />
    </div>
  );
}
