import React from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * Star toggle button for adding/removing a player from the watchlist.
 */
export default function WatchStar({ player, watchlist, size = 14 }) {
  if (!player?.id) return null;
  const active = watchlist.has(player.id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        watchlist.toggle(player);
      }}
      title={active ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label="Toggle watchlist"
      style={{
        background: 'transparent',
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        color: active ? C.amber : C.muted,
        fontSize: size,
        lineHeight: 1,
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = C.amber; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? C.amber : C.muted; }}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
