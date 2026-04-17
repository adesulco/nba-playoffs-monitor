import { useEffect, useRef, useState } from 'react';

/**
 * Watch for stat-milestone crossings on the active game's boxscore for any player in the watchlist.
 * Emits a transient toast for:
 *   - 20/25/30/40/50 point thresholds
 *   - Double-double, triple-double
 * Remembers which milestones have fired per (gameId, playerId, milestone) so we don't double-toast.
 */
export function useWatchlistAlerts(watchlist, summary, activeGameId) {
  const [toasts, setToasts] = useState([]); // { id, text, teamAbbr }
  const firedRef = useRef(new Set()); // key = gameId|playerId|milestone

  useEffect(() => {
    if (!activeGameId || !summary?.boxscore || watchlist.length === 0) return;
    const watchIds = new Set(watchlist.map((p) => String(p.id)));

    const newToasts = [];
    for (const team of summary.boxscore) {
      for (const p of team.players || []) {
        if (p.dnp) continue;
        if (!watchIds.has(String(p.id))) continue;

        const milestones = [];
        if (p.pts >= 50) milestones.push({ key: '50pts', label: '50-POINT GAME 🔥' });
        else if (p.pts >= 40) milestones.push({ key: '40pts', label: '40-POINT GAME' });
        else if (p.pts >= 30) milestones.push({ key: '30pts', label: '30-POINT GAME' });
        else if (p.pts >= 25) milestones.push({ key: '25pts', label: '25 POINTS' });
        else if (p.pts >= 20) milestones.push({ key: '20pts', label: '20 POINTS' });

        const doubles = [p.pts >= 10, p.reb >= 10, p.ast >= 10].filter(Boolean).length;
        if (doubles >= 3) milestones.push({ key: 'triple', label: 'TRIPLE-DOUBLE ⚡' });
        else if (doubles >= 2) milestones.push({ key: 'double', label: 'DOUBLE-DOUBLE' });

        // Only fire the highest milestone per player per session
        const top = milestones[milestones.length - 1];
        if (!top) continue;

        const fireKey = `${activeGameId}|${p.id}|${top.key}`;
        if (firedRef.current.has(fireKey)) continue;
        firedRef.current.add(fireKey);

        newToasts.push({
          id: fireKey,
          text: `${p.short || p.name}: ${top.label}`,
          teamAbbr: team.abbr,
          stats: `${p.pts}/${p.reb}/${p.ast}`,
        });
      }
    }

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts]);
      // Also fire browser notifications if permission is granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        newToasts.forEach((t) => {
          try {
            new Notification('gibol.co', { body: `${t.text} · ${t.stats}`, tag: t.id });
          } catch {}
        });
      }
    }
  }, [summary, watchlist, activeGameId]);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, dismissToast };
}
