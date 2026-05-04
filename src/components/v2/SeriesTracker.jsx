import React from 'react';

/**
 * Best-of-N series strip — one chip per game with state. Used by NBA
 * Playoffs Game Center to show series progression (G1 G2 G3 G4 G5
 * with per-game state). Sport-agnostic — works for any best-of
 * format (NBA / NHL / MLB / tennis Grand Slams etc).
 *
 * Phase 2 ship Phase D (per docs/redesign-v4-handover.md §4 Phase D).
 *
 * Props:
 *   games        — array of { state, label?, score?, isCurrent? }
 *                    state    — 'won-home' | 'won-away' | 'live' |
 *                               'scheduled' | 'if_needed'
 *                    label    — short caption (default "G1", "G2", ...)
 *                    score    — optional "128-96" string for completed
 *                    isCurrent — true = render with subtle pulse anim
 *   awayLabel    — short label for away team (e.g. "PHI").
 *   homeLabel    — short label for home team (e.g. "BOS").
 *   awayColor    — color for the away win indicator.
 *   homeColor    — color for the home win indicator.
 *   currentGame  — index of the current game (0-based). Optional helper
 *                  if caller doesn't pre-set isCurrent on the row.
 *   className    — passthrough.
 *
 * State styles:
 *   won-home  → home color filled, label visible
 *   won-away  → away color filled
 *   live      → amber border + amber text
 *   scheduled → ink-3 outline, dimmed
 *   if_needed → dashed outline, ink-4 (lightest) — "G7 (if needed)"
 *
 * Mobile-first: chips stay horizontally arranged with overflow-x:
 * auto so the strip scrolls if the series goes 7 games on a 360px
 * viewport.
 */

export default function SeriesTracker({
  games = [],
  awayLabel = 'AWY',
  homeLabel = 'HOME',
  awayColor = 'var(--blue)',
  homeColor = 'var(--amber)',
  currentGame,
  className = '',
}) {
  if (!games.length) return null;

  return (
    <div
      className={`v2 series-tracker ${className}`.trim()}
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        padding: '8px 2px',
      }}
    >
      {games.map((g, i) => {
        const state = g.state || 'scheduled';
        const isCurrent = g.isCurrent || (currentGame != null && i === currentGame);
        const label = g.label || `G${i + 1}`;

        let bg = 'transparent';
        let border = '1px solid var(--line)';
        let fg = 'var(--ink-3)';
        let dotFill = 'var(--ink-4)';
        let dotLabel = '';

        if (state === 'won-home') {
          bg = 'var(--bg-3)';
          border = `1px solid ${homeColor}66`;
          fg = 'var(--ink)';
          dotFill = homeColor;
          dotLabel = homeLabel;
        } else if (state === 'won-away') {
          bg = 'var(--bg-3)';
          border = `1px solid ${awayColor}66`;
          fg = 'var(--ink)';
          dotFill = awayColor;
          dotLabel = awayLabel;
        } else if (state === 'live') {
          bg = 'var(--amber-soft)';
          border = '1px solid rgba(245,158,11,0.5)';
          fg = 'var(--amber)';
          dotFill = 'var(--amber)';
          dotLabel = 'LIVE';
        } else if (state === 'if_needed') {
          bg = 'transparent';
          border = '1px dashed var(--ink-4)';
          fg = 'var(--ink-4)';
          dotFill = 'transparent';
        }

        return (
          <div
            key={i}
            title={g.score ? `${label}: ${g.score}` : `${label}: ${state}`}
            style={{
              flex: '0 0 auto',
              padding: '6px 10px',
              minWidth: 64,
              background: bg,
              border,
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: fg,
              animation: isCurrent && state === 'live' ? 'series-pulse 1.6s ease-in-out infinite' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                opacity: 0.85,
              }}
            >
              {label}
            </span>
            <span
              style={{
                width: 12,
                height: 12,
                background: dotFill,
                borderRadius: 50,
                border: state === 'if_needed' ? '1px dashed var(--ink-4)' : 'none',
                display: 'inline-block',
              }}
            />
            {dotLabel && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  marginTop: 1,
                }}
              >
                {dotLabel}
              </span>
            )}
            {g.score && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {g.score}
              </span>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes series-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(245,158,11,0); }
        }
        .series-tracker::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
