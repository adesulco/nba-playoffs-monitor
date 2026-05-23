import React from 'react';
import { Link } from 'react-router-dom';

/**
 * <ScoreTile> — the canonical score component per Brand Guideline §09.
 *
 * Single component used by every surface that shows a match score:
 *   • MatchStrip (HARI INI & BESOK, SKOR TERAKHIR rails on home)
 *   • LiveConsole (featured live game on home + hub pages)
 *   • NewsroomSlice (when a card has an inline score, future)
 *   • Game Center hero (NBA + future football/F1)
 *
 * Four states (derived from `statusState`):
 *   pre    — scheduled, no score yet, kickoff time / WIB label
 *   in     — live, scores ticking, live amber chip + minute/quarter
 *   post   — final, scores frozen, winner bold + loser dim
 *   na     — anything else (postponed, abandoned, TBD)
 *
 * Item shape (matches matchAggregate.js output):
 *   {
 *     sport: 'nba' | 'epl' | 'liga-1-id' | 'f1' | 'tennis',
 *     id: string,
 *     statusState: 'pre' | 'in' | 'post' | 'na',
 *     statusLabel: string,            // "WIB 21:00" / "LIVE 67'" / "FINAL"
 *     a: { label, score },            // away / first competitor
 *     b: { label, score },            // home / second competitor
 *     subtitle?: string,              // e.g. "GP Miami" (F1)
 *     refreshedAt?: string | Date,    // optional; for the WIB refresh line
 *     href?: string,                  // optional click-through
 *   }
 *
 * Props:
 *   item       — match item (required)
 *   width      — pixel width; default 220 (matches MatchStrip card)
 *   minHeight  — pixel min-height; default 110
 *   showRefresh — render the "REFRESHED 19:38 WIB" footer per §05.1
 *                 brand mandate. Default true for live + post; false
 *                 for pre.
 *
 * The tile is link-clickable when item.href is present, plain block otherwise.
 */

// Sport-tint dots — brand-keyed per Brand Guideline §07 dataviz roles.
// Used for the small leading dot in the kicker row. Sport-keyed only,
// never decorative.
const SPORT_DOT = {
  nba:        '#F97316',  // playoff orange
  epl:        '#22C55E',  // EPL green
  'liga-1-id': '#EF4444',  // Liga 1 red
  f1:         '#E10600',  // F1 racing red
  tennis:     '#D4A13A',  // tennis amber-gold
};

const SPORT_LABEL = {
  nba:         'NBA',
  epl:         'EPL',
  'liga-1-id': 'LIGA 1',
  f1:          'F1',
  tennis:      'TENNIS',
};

function ScoreCell({ label, score, faded, accent }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        opacity: faded ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: accent || 'var(--ink)',
          textTransform: 'uppercase',
          maxWidth: 110,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        className="gibol-tnum"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 800,
          color: accent || 'var(--ink)',
        }}
      >
        {score == null ? '—' : score}
      </span>
    </div>
  );
}

/**
 * Live indicator pill — brand §05.1 spec:
 *   - Ink background (works on both dark + cream surfaces)
 *   - Live amber dot + caption text (AAA 9.2:1 on ink)
 *   - JetBrains Mono 700 / 10px / 0.18em tracking
 *   - 5px pulsing dot, 1.4s ease-in-out
 */
function LiveChip({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 3,
        background: 'var(--gibol-ink, #0F0E0C)',
        border: '1px solid rgba(245, 158, 11, 0.32)',
        color: 'var(--gibol-amber, #F59E0B)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.18em',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 4,
          height: 4,
          borderRadius: 50,
          background: 'var(--gibol-amber, #F59E0B)',
          animation: 'live-band-pulse 1.4s ease-in-out infinite',
        }}
      />
      {label}
    </span>
  );
}

function fmtRefreshWib(when) {
  if (!when) return null;
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const t = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false,
    }).format(d);
    return `REFRESHED ${t} WIB`;
  } catch {
    return null;
  }
}

export default function ScoreTile({
  item,
  width = 220,
  minHeight = 110,
  showRefresh,
  className = '',
}) {
  const dot = SPORT_DOT[item.sport] || 'var(--ink-3)';
  const sportLabel = SPORT_LABEL[item.sport] || (item.sport || '').toUpperCase();
  const isPost = item.statusState === 'post';
  const isLive = item.statusState === 'in';
  const isPre  = item.statusState === 'pre';

  // Winner highlighting (post only)
  const aIsWinner =
    isPost && item.a?.score != null && item.b?.score != null && item.a.score > item.b.score;
  const bIsWinner =
    isPost && item.a?.score != null && item.b?.score != null && item.b.score > item.a.score;

  // Refresh line — default behavior: show on live + post, hide on pre
  const wantsRefresh = showRefresh ?? (isLive || isPost);
  const refreshLine = wantsRefresh ? fmtRefreshWib(item.refreshedAt) : null;

  // Status badge: live → ink-backed amber pill; post → muted grey; pre → brand orange
  const statusNode = isLive ? (
    <LiveChip label={item.statusLabel || 'LIVE'} />
  ) : (
    <span
      style={{
        color: isPost ? 'var(--ink-3)' : 'var(--amber)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      {item.statusLabel || (isPost ? 'FINAL' : isPre ? 'SCHEDULED' : '')}
    </span>
  );

  const baseStyle = {
    flex: '0 0 auto',
    width,
    minHeight,
    textDecoration: 'none',
    color: 'inherit',
    background: 'var(--bg-2)',
    border: '1px solid var(--line-soft)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    scrollSnapAlign: 'start',
  };

  const inner = (
    <>
      {/* Top kicker row: sport dot + label · status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--ink-3)',
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: 50, background: dot }}
          />
          {sportLabel}
        </span>
        {statusNode}
      </div>

      {/* Optional subtitle (F1 race name etc.) */}
      {item.subtitle && (
        <div
          style={{
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.2,
            marginTop: -2,
          }}
        >
          {item.subtitle}
        </div>
      )}

      {/* Score rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
        <ScoreCell
          label={item.a?.label}
          score={item.a?.score}
          faded={bIsWinner}
          accent={aIsWinner ? 'var(--ink)' : null}
        />
        <ScoreCell
          label={item.b?.label}
          score={item.b?.score}
          faded={aIsWinner}
          accent={bIsWinner ? 'var(--ink)' : null}
        />
      </div>

      {/* Optional refresh footer per §05.1 — only when data is live/post */}
      {refreshLine && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {refreshLine}
        </div>
      )}
    </>
  );

  if (item.href) {
    return (
      <Link to={item.href} className={className} style={baseStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={baseStyle}>
      {inner}
    </div>
  );
}

// Named export so callers can build their own layout around it,
// or use ScoreCell standalone (e.g. inline scoreboard rows).
export { ScoreCell, LiveChip, SPORT_DOT, SPORT_LABEL };
