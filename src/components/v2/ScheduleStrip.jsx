import React from 'react';

/**
 * <ScheduleStrip> — shared chrome for every horizontally-scrollable
 * schedule row (day pills, race calendar, tournament tiles, bracket
 * round chips).
 *
 * Phase 2 Sprint D (v0.19.0). The directive specifies five variants:
 *
 *   weekday    — day pills (NBA / EPL / Super League day-strips)
 *   calendar   — multi-day cards with badges (F1 23-GP calendar)
 *   tournament — full-width tournament tiles (Tennis active ribbon)
 *   bracket    — bracket-round chips (NBA/IBL bracket strip)
 *   empty      — placeholder when no events for the period
 *
 * The strip provides:
 *   1. Consistent header row (title left, meta right, both styled
 *      to the v2 type system — H3 sub-section + Mono eyebrow).
 *   2. Right-edge fade-mask (already shipped as `.day-strip-scroll`
 *      in src/index.css; this component just opts in via className).
 *   3. Snap-x scroll affordance — children are rendered directly so
 *      every variant can keep its own pill / card / tile shape.
 *   4. Optional accent stripe on the left edge for sport-keyed
 *      contexts (e.g. team color on a leaf page's calendar).
 *
 * Why a thin wrapper instead of full re-rendering:
 *   Each existing strip (NBADayScoreboard, EPLDayScoreboard,
 *   SuperLeagueDayScoreboard, F1 calendar, Tennis ribbon) has
 *   per-domain item rendering with click handlers, fixture counts,
 *   weather chips, etc. Replacing them outright would either lose
 *   richness or regress per-page logic. The directive's call —
 *   "Extract shared chrome; per-page strips re-mount as variants"
 *   — is satisfied by giving the chrome a single home and letting
 *   each page's existing item renderer slot in as `children`.
 *
 * Usage:
 *   <ScheduleStrip variant="weekday" title="Skor & Jadwal" meta="Pekan ini · WIB">
 *     <DayPill ... />
 *     <DayPill ... />
 *   </ScheduleStrip>
 */

const VARIANTS = new Set(['weekday', 'calendar', 'tournament', 'bracket', 'empty']);

export default function ScheduleStrip({
  variant = 'weekday',
  title,
  meta,
  accent,
  children,
  className,
  style,
}) {
  const v = VARIANTS.has(variant) ? variant : 'weekday';

  return (
    <section
      role="region"
      aria-label={title || 'Schedule'}
      className={`schedule-strip schedule-strip--${v}${className ? ' ' + className : ''}`}
      style={{
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: accent ? `3px solid ${accent}` : 'none',
        ...style,
      }}
    >
      {(title || meta) && (
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '8px 14px',
            gap: 12,
          }}
        >
          {title && (
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
              }}
            >
              {title}
            </div>
          )}
          {meta && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--ink-3)',
                whiteSpace: 'nowrap',
              }}
            >
              {meta}
            </div>
          )}
        </header>
      )}

      {/* The .day-strip-scroll class supplies overflow-x:auto +
          right-edge fade-mask + scroll-snap-type:x. Reusing it here
          across all five variants gives one canonical scroll
          behavior, regardless of whether the children are pills,
          calendar cards, or tournament tiles. */}
      <div
        className="day-strip-scroll schedule-strip__rail"
        style={{
          display: 'flex',
          gap: 8,
          padding: '4px 14px 12px',
          minWidth: 0,
        }}
      >
        {v === 'empty' ? (
          <div
            style={{
              padding: '14px 4px',
              color: 'var(--ink-3)',
              fontSize: 13,
            }}
          >
            {children /* Caller supplies the empty-state copy. */}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
