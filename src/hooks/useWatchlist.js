import { useState, useEffect, useCallback } from 'react';

const KEY = 'gibol:watchlist';

/**
 * Player watchlist in localStorage. Each entry: { id, name, teamAbbr, position }.
 * Broadcasts changes across tabs via the storage event.
 */
export function useWatchlist() {
  const [list, setList] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Persist on any change
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  }, [list]);

  // Listen to cross-tab updates
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== KEY) return;
      try { setList(e.newValue ? JSON.parse(e.newValue) : []); } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((player) => {
    setList((prev) => prev.some((p) => p.id === player.id) ? prev : [...prev, player]);
  }, []);

  const remove = useCallback((id) => {
    setList((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggle = useCallback((player) => {
    setList((prev) => {
      const exists = prev.some((p) => p.id === player.id);
      if (exists) return prev.filter((p) => p.id !== player.id);
      return [...prev, player];
    });
  }, []);

  const has = useCallback((id) => list.some((p) => p.id === id), [list]);

  return { list, add, remove, toggle, has };
}
