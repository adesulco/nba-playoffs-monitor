import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Live band — single-row marquee strip shown at the top of HomeV2
 * (and any v2 dashboard that wants the cross-sport live pulse).
 *
 * Phase 2 ship Phase E (per docs/redesign-v4-handover.md §4 Phase E).
 * Source: design_handoff_gibol_v4/v3/shell.jsx#V3LiveBand.
 *
 * Renders a horizontally-scrolling row of live game tickers:
 *   LIVE · NBA DEN 78 BOS 82 Q3 4:12 · PL ARS 2 MCI 1 67' · ...
 *
 * Items are sport-tagged + clickable (deep-link to per-game route
 * where one exists; otherwise to sport hub).
 *
 * Props:
 *   items       — array of:
 *     { sport, a, as, b, bs, tag, href? }
 *     where:
 *       sport   — short tag like "NBA", "PL", "F1", "TENNIS"
 *       a       — away short label ("DEN", "ARS")
 *       as      — away score ("78", "2")
 *       b       — home short label ("BOS", "MCI")
 *       bs      — home score ("82", "1")
 *       tag     — short status ("Q3 4:12", "67'", "S2 5-4")
 *       href    — optional deep-link
 *   updatedAgo  — short relative-time copy ("2s ago", "1m ago"). Right-aligned.
 *   dense       — boolean. When true, tightens padding for inline use
 *                 inside a hub TopBar subrow. Default false (page top).
 *   className   — passthrough.
 *
 * Mobile-first: horizontally scrolls on overflow-x: auto. The LIVE
 * label + relative-time pin to the edges; tickers scroll between.
 */

export default function LiveBand({
  items = [],
  updatedAgo,
  dense = false,
  className = '',
}) {
  if (!items.length) {
    return (
      <div
        className={`v2 live-band-empty ${className}`.trim()}
        style={{
          padding: dense ? '4px 12px' : '6px 14px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
        }}
      >
        Tidak ada game live saat ini.
      </div>
    );
  }

  return (
    <div
      className={`v2 live-band ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: dense ? '4px 12px' : '6px 14px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginRight: 14,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: 50,
            background: 'var(--live)',
            animation: 'live-band-pulse 1.4s ease-in-out infinite',
          }}
        />
        <span style={{ color: 'var(--live)', fontWeight: 800, letterSpacing: '0.12em' }}>
          LIVE
        </span>
      </span>

      <div
        style={{
          display: 'flex',
          gap: 0,
          flex: 1,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
        className="live-band-scroll"
      >
        {items.map((it, i) => {
          const inner = (
            <span
              style={{
                display: 'inline-flex',
                gap: 6,
                marginRight: 18,
                color: 'var(--ink-2)',
                flexShrink: 0,
                alignItems: 'baseline',
              }}
            >
              <span style={{ color: 'var(--ink-3)' }}>{it.sport}</span>
              <span style={{ fontWeight: 700 }}>{it.a}</span>
              <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{it.as}</span>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span style={{ fontWeight: 700 }}>{it.b}</span>
              <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{it.bs}</span>
              <span style={{ color: 'var(--ink-4)' }}>{it.tag}</span>
            </span>
          );
          return it.href ? (
            <Link
              key={i}
              to={it.href}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                flexShrink: 0,
              }}
            >
              {inner}
            </Link>
          ) : (
            <React.Fragment key={i}>{inner}</React.Fragment>
          );
        })}
      </div>

      {updatedAgo && (
        <span
          style={{
            marginLeft: 'auto',
            paddingLeft: 12,
            color: 'var(--ink-3)',
            flexShrink: 0,
            letterSpacing: '0.08em',
          }}
        >
          UPDATED {updatedAgo}
        </span>
      )}

      <style>{`
        @keyframes live-band-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .live-band-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
