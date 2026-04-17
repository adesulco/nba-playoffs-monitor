import React from 'react';
import { COLORS as C } from '../lib/constants.js';
import { trackEvent } from '../lib/analytics.js';

/**
 * Star toggle button for adding/removing a player from the watchlist.
 */
export default function WatchStar({ player, watchlist, size = 14, lang = 'id' }) {
  if (!player?.id) return null;
  const active = watchlist.has(player.id);
  const playerName = player.displayName || player.name || 'pemain';
  const label = lang === 'id'
    ? (active ? `Hapus ${playerName} dari watchlist` : `Tambahkan ${playerName} ke watchlist`)
    : (active ? `Remove ${playerName} from watchlist` : `Add ${playerName} to watchlist`);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        watchlist.toggle(player);
        trackEvent(active ? 'watchlist_remove' : 'watchlist_add', { player_name: playerName });
      }}
      title={label}
      aria-label={label}
      aria-pressed={active}
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
