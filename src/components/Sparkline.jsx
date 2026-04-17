import React from 'react';

export default function Sparkline({ data, width = 60, height = 18, color = '#ffb347' }) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ');

  const last = data[data.length - 1];
  const first = data[0];
  const trendColor = last >= first ? '#3ddb84' : '#ff5c5c';

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width - 1}
        cy={height - ((last - min) / range) * height}
        r="1.5"
        fill={trendColor}
      />
    </svg>
  );
}
