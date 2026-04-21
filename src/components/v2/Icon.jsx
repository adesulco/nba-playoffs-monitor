import React from 'react';

// v2 A1 · Sport + UI icon pack.
// Monoline, 16×16 grid, 1.5px stroke, inherits `currentColor` so the icon
// matches the surrounding text color on both dark + light themes.
// Paths mirror the Part 2 design handoff (`gaps_icons.jsx`).

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ── Sports (6) ──
const IconNBA = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2 8h12M8 2v12M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </svg>
);
const IconFootball = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4l3 2.2-1.1 3.5h-3.8L5 6.2 8 4z" />
  </svg>
);
const IconF1 = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M3 3v10" />
    <path d="M3 3h9l-1.5 2.5L12 8H3" />
  </svg>
);
const IconTennis = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2.5 5.5C4.5 7 4.5 9 2.5 10.5M13.5 5.5C11.5 7 11.5 9 13.5 10.5" />
  </svg>
);
const IconWorldCup = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M4 3h8v3a4 4 0 01-8 0V3z" />
    <path d="M4 4.5H2.5a2 2 0 002 2M12 4.5h1.5a2 2 0 01-2 2" />
    <path d="M6 11v2h4v-2M5 13h6" />
  </svg>
);
const IconIBL = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M2 8h12M8 3v10" />
  </svg>
);

// ── UI glyphs (16) ──
const IconSearch = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);
const IconBell = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M4 11V7a4 4 0 018 0v4l1 1.5H3L4 11zM6.5 13a1.5 1.5 0 003 0" />
  </svg>
);
const IconBookmark = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M4 2h8v12l-4-3-4 3V2z" />
  </svg>
);
const IconFilter = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M2 3h12l-4.5 6v4l-3 1.5V9L2 3z" />
  </svg>
);
const IconMenu = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M2 4h12M2 8h12M2 12h12" />
  </svg>
);
const IconClose = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M3 3l10 10M13 3L3 13" />
  </svg>
);
const IconArrowRight = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const IconArrowLeft = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </svg>
);
const IconChevronRight = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M10 3L5 8l5 5" />
  </svg>
);
const IconPlay = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M4 3l9 5-9 5V3z" />
  </svg>
);
const IconPause = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M5 3v10M11 3v10" />
  </svg>
);
const IconShare = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="4" cy="8" r="1.5" />
    <circle cx="12" cy="4" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <path d="M5.3 7.3L10.7 4.7M5.3 8.7L10.7 11.3" />
  </svg>
);
const IconCheck = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M3 8.5L6.5 12 13 4.5" />
  </svg>
);
const IconStar = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <path d="M8 2l1.8 3.8L14 6.4l-3 2.9.7 4.1L8 11.5 4.3 13.4 5 9.3 2 6.4l4.2-.6L8 2z" />
  </svg>
);
const IconSettings = (p) => (
  <svg viewBox="0 0 16 16" {...baseProps} {...p}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" />
  </svg>
);

// Sport name aliases — Premier League, Liga 1, and generic Football all use
// the Football icon. WorldCup / WC both work. Kept camelCase.
export const SPORT_ICONS = {
  NBA: IconNBA,
  Football: IconFootball,
  PL: IconFootball,
  EPL: IconFootball,
  Liga1: IconFootball,
  F1: IconF1,
  Tennis: IconTennis,
  WorldCup: IconWorldCup,
  WC: IconWorldCup,
  IBL: IconIBL,
};

export const UI_ICONS = {
  Search: IconSearch,
  Bell: IconBell,
  Bookmark: IconBookmark,
  Filter: IconFilter,
  Menu: IconMenu,
  Close: IconClose,
  ArrowRight: IconArrowRight,
  ArrowLeft: IconArrowLeft,
  ChevronRight: IconChevronRight,
  ChevronLeft: IconChevronLeft,
  Play: IconPlay,
  Pause: IconPause,
  Share: IconShare,
  Check: IconCheck,
  Star: IconStar,
  Settings: IconSettings,
};

/**
 * <Icon name="NBA" size={14} color="var(--amber)" />
 *
 * Renders a monoline 16×16 icon. Pass any name from SPORT_ICONS or UI_ICONS.
 * `color` defaults to `currentColor` so icons inherit text color; pass a CSS
 * var or hex to override. `title` becomes an accessible label — omit for
 * decorative icons (the SVG is then hidden from AT via aria-hidden).
 */
export default function Icon({ name, size = 14, color, title, style, ...rest }) {
  const Svg = SPORT_ICONS[name] || UI_ICONS[name];
  if (!Svg) return null;
  const ariaProps = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true };
  return (
    <Svg
      width={size}
      height={size}
      style={{ color, display: 'inline-block', verticalAlign: '-0.125em', ...style }}
      {...ariaProps}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </Svg>
  );
}
