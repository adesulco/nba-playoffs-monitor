import React, { useEffect } from 'react';
import { TEAM_META, COLORS as C } from '../lib/constants.js';

export default function AlertToasts({ toasts, dismissToast }) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), 8000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 72, right: 20, zIndex: 999,
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      {toasts.map((t) => {
        const meta = TEAM_META[Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === t.teamAbbr)];
        const color = meta?.color || C.amber;
        return (
          <div
            key={t.id}
            style={{
              minWidth: 280, maxWidth: 360,
              background: C.panel,
              border: `1px solid ${color}`,
              borderLeft: `4px solid ${color}`,
              borderRadius: 4,
              padding: '10px 12px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
              animation: 'pulse 2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: color, letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>
                  ★ WATCHLIST ALERT
                </div>
                <div style={{ fontSize: 11, color: C.text, fontWeight: 600, marginBottom: 3 }}>{t.text}</div>
                <div style={{ fontSize: 10, color: C.dim }}>
                  {t.teamAbbr && <span style={{ color: color, fontWeight: 600 }}>{t.teamAbbr}</span>}
                  {t.stats && <span style={{ marginLeft: 6 }}>PTS/REB/AST: <span style={{ color: C.amberBright }}>{t.stats}</span></span>}
                </div>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                style={{
                  background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, lineHeight: 1, padding: 0,
                }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
