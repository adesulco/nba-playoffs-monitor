import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Editorial section divider — the "────  NBA NEWSROOM  ────  /nba/news →"
 * pattern from the v4 design bundle (extras.jsx#V4Kicker style).
 *
 * Phase 2 ship Phase C. Used by Phase C's NewsroomSlice + Phase D's
 * Game Center section breaks. Sport-agnostic.
 *
 * Two variants:
 *   "amber" (default) — editorial sections (Newsroom, Live updates,
 *      Pull-quote breaks). Mono uppercase amber kicker between two
 *      thin amber rules.
 *   "muted" — utility sections (related, more in this hub).
 *      Same shape, ink-3 + line-soft palette.
 *
 * Props:
 *   children    — the kicker label (e.g. "NBA NEWSROOM").
 *   action      — optional { to, label } rendered as a small link
 *                 right of the kicker, with a "→" arrow.
 *   variant     — "amber" (default) | "muted".
 *   className   — passthrough.
 */
export default function SectionRule({
  children,
  action,
  variant = 'amber',
  className = '',
}) {
  const ruleColor = variant === 'amber' ? 'var(--amber)' : 'var(--line-soft)';
  const labelColor = variant === 'amber' ? 'var(--amber)' : 'var(--ink-3)';
  const labelOpacity = variant === 'amber' ? 1 : 0.85;

  return (
    <div
      className={`v2 section-rule ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '32px 0 18px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          width: 36,
          height: 1,
          background: ruleColor,
          opacity: 0.4,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: labelColor,
          opacity: labelOpacity,
          flex: '0 0 auto',
        }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background: ruleColor,
          opacity: 0.4,
          minWidth: 12,
        }}
      />
      {action && (
        <Link
          to={action.to}
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: labelColor,
            opacity: labelOpacity,
            textDecoration: 'none',
            flex: '0 0 auto',
          }}
        >
          {action.label} <span style={{ opacity: 0.7 }}>→</span>
        </Link>
      )}
    </div>
  );
}
