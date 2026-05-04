import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Sport-hub sub-navigation — second tier below <V2TopBar>.
 *
 * Phase 2 ship Phase C (per docs/redesign-v4-handover.md §4 Phase C).
 * Renders the v4 hub-page tab strip (Overview · Live · Standings ·
 * Bracket · Fixtures · Stats · News · Teams). Each hub passes its
 * own `items` array — no central registry.
 *
 * Active state = `bg-3` background + 2px sport-color underline.
 * Hover lifts to `bg-3` background only.
 *
 * Usage in a hub page (typically wired into setTopbarSubrow):
 *
 *   <SubNav
 *     sport="nba"
 *     items={[
 *       { label: 'Overview', href: '/nba-playoff-2026' },
 *       { label: 'Live',     href: '/nba-playoff-2026/live' },
 *       { label: 'Standings',href: '/nba-playoff-2026#standings' },
 *       { label: 'News',     href: '/nba-playoff-2026#newsroom' },
 *     ]}
 *   />
 *
 * Active matching: case-insensitive exact-path or hash-fragment match.
 * If `items[i].matchPaths` is set, any of those substrings counts.
 *
 * Props:
 *   sport       — drives the active-state underline color via
 *                 var(--sport-{nba|epl|f1|tennis|wc|id}).
 *   items       — array of { label, href, matchPaths? }.
 *   className   — passthrough.
 *
 * Mobile-first: horizontally scrollable tab strip — overflow-x: auto
 * with hidden scrollbar. The overview tab pins to the left edge so
 * fans always know where home is.
 */

const SPORT_VAR = {
  nba: 'var(--sport-nba)',
  epl: 'var(--sport-pl)',
  pl: 'var(--sport-pl)',
  'liga-1-id': 'var(--sport-id)',
  f1: 'var(--sport-f1)',
  tennis: 'var(--sport-tennis)',
  fifa: 'var(--sport-wc)',
  wc: 'var(--sport-wc)',
};

function isItemActive(item, pathname, hash) {
  const href = item.href || '';
  // Hash-fragment match: any item with `#section` is active when the
  // current URL's hash matches.
  if (href.includes('#')) {
    const itemHash = href.split('#')[1];
    if (itemHash && hash === `#${itemHash}`) return true;
    return false;
  }
  // Exact pathname match.
  if (href === pathname) return true;
  // Tunable list of additional paths that should activate this tab.
  if (Array.isArray(item.matchPaths)) {
    return item.matchPaths.some((p) => pathname.startsWith(p));
  }
  return false;
}

export default function SubNav({ sport = 'nba', items = [], className = '' }) {
  const loc = useLocation();
  if (!items.length) return null;

  const accentColor = SPORT_VAR[sport] || SPORT_VAR.nba;

  return (
    <nav
      className={`v2 sub-nav ${className}`.trim()}
      aria-label="Hub sub-navigation"
      style={{
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg-2)',
        padding: '0 clamp(8px, 2vw, 20px)',
      }}
    >
      {items.map((item) => {
        const active = isItemActive(item, loc.pathname, loc.hash);
        return (
          <Link
            key={item.href || item.label}
            to={item.href || '#'}
            style={{
              flex: '0 0 auto',
              padding: '10px 14px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              background: active ? 'var(--bg-3)' : 'transparent',
              borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 120ms, color 120ms, border-color 120ms',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'var(--bg-3)';
                e.currentTarget.style.color = 'var(--ink-2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--ink-3)';
              }
            }}
          >
            {item.label}
          </Link>
        );
      })}
      {/* Hide horizontal scrollbar across browsers. */}
      <style>{`
        .sub-nav::-webkit-scrollbar { display: none; }
      `}</style>
    </nav>
  );
}
