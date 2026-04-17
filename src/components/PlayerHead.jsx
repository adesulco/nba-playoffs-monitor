import React, { useState } from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * Circular player headshot from ESPN CDN.
 * Falls back to a colored initials circle if no ID or image fails to load.
 */
export default function PlayerHead({ id, name, color = '#2a3a52', size = 28, ring = true }) {
  const [errored, setErrored] = useState(false);
  const src = id ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=${size * 2}&h=${size * 2}` : null;

  // Build initials from name
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const common = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: color,
    color: '#fff',
    fontSize: Math.round(size * 0.38),
    fontWeight: 700,
    overflow: 'hidden',
    boxShadow: ring ? `0 0 0 1.5px ${color}` : 'none',
    border: ring ? `1.5px solid ${C.bg}` : 'none',
    verticalAlign: 'middle',
  };

  if (!src || errored) {
    return (
      <span style={common} aria-label={name}>
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setErrored(true)}
      style={{ ...common, objectFit: 'cover', objectPosition: 'center top' }}
    />
  );
}
