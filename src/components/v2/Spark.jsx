import React from 'react';

/**
 * <Spark data={[40,42,38,45,50,52,48]} w={100} h={28} />
 *
 * Inline SVG sparkline. Data-driven, no chart library. Used for win-
 * probability history, rank deltas, performance trends. `fill` = true draws
 * a translucent area under the line.
 *
 * Edge cases: `data` with <2 points renders a centered flat line. All-equal
 * data renders at vertical center (span collapses cleanly).
 */
export default function Spark({
  data = [],
  w = 100,
  h = 28,
  color = 'var(--blue)',
  fill = true,
  strokeWidth = 1.5,
  ariaLabel,
  ...rest
}) {
  if (!data || data.length === 0) return null;
  const safeData = data.length === 1 ? [data[0], data[0]] : data;
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const span = max - min || 1;
  const step = w / (safeData.length - 1);
  const pts = safeData.map((v, i) => [i * step, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const ariaProps = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': true };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} {...ariaProps} {...rest}>
      {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
