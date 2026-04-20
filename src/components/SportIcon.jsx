import React from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { resolveSportColor } from '../lib/sportColor.js';

/**
 * SportIcon — Phase 1 design-system icon family.
 *
 * Replaces the emoji glyphs (🏀 🏎️ ⚽ 🏆 🇮🇩) that previously marked sport
 * surfaces. Line-style SVGs at stroke-width 1.6, placed inside a sport-tinted
 * rounded tile. See gibol-design-system.html §08.
 *
 * Variants (1:1 with the design-system icon family):
 *   nba → basketball (sport-nba tint)
 *   f1  → motorsport  (sport-f1  tint)
 *   pl  → football    (sport-pl  tint) — used for Premier League
 *   wc  → tournament  (sport-wc  tint) — used for FIFA World Cup
 *   id  → local sport (sport-id  tint) — used for Liga 1 and IBL
 *
 * Props:
 *   id     — one of 'nba' | 'f1' | 'pl' | 'wc' | 'id' (required)
 *   size   — tile width/height in px (default 40). SVG scales to 55% of tile.
 *            Passing size with `inline` renders bare SVG at that size instead.
 *   inline — if true, render only the stroked SVG (no tile, no background).
 *            Use this for icons that sit inside buttons or inline text runs,
 *            where a full tile would be over-weight.
 *   label  — optional accessible name. When provided, the icon is exposed
 *            to assistive tech; otherwise it is aria-hidden (assumes the
 *            surrounding card/button supplies the visible label).
 *   style  — extra inline style merged into the tile (or the svg when inline).
 *
 * Deliberately NOT cross-cutting: this is a pure presentational component
 * with zero data dependencies. Step 5 card refactor will compose it; Step 8
 * platform consistency pass will swap remaining call sites.
 */

// SVG path data — copied from gibol-design-system.html §08.
// viewBox is 24 24 for every variant; stroke is `currentColor`.
const PATHS = {
  nba: (
    // basketball — circle + seam lines
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18M5 7c3 3 11 3 14 0M5 17c3-3 11-3 14 0" />
    </>
  ),
  f1: (
    // stylised F1 car profile with two wheels
    <>
      <path d="M3 17l6-3 3-7 5 2-2 6 6 2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  pl: (
    // football — circle with panel seams
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3l3 4-3 3-3-3zM12 14l3 3M12 14l-3 3M4 11l3 2M20 11l-3 2" />
    </>
  ),
  wc: (
    // trophy / star — tournament marker
    <path d="M12 3l2 4h4l-3 3 1 5-4-2-4 2 1-5-3-3h4z" />
  ),
  id: (
    // boundary stripes — local / national sport marker
    <>
      <path d="M4 6h16M4 18h16" />
      <path d="M7 12h10" />
    </>
  ),
};

// Tile background (sport color at low alpha) — theme-independent because
// rgba() sits on whatever surface is behind it.
const BG_BY_ID = {
  nba: 'rgba(201,8,42,.18)',
  f1:  'rgba(225,6,0,.18)',
  pl:  'rgba(61,25,91,.35)',
  wc:  'rgba(50,98,149,.28)',
  id:  'rgba(193,39,45,.22)',
};

// Stroke color lives in src/lib/sportColor.js so Chip, Button, and SportIcon
// share one lookup. Lighter hex in dark (passes AA on --ink-1); full brand
// hex in light (passes AA on cream).

export default function SportIcon({ id, size = 40, inline = false, label, style }) {
  const { theme } = useApp();
  const path = PATHS[id];
  if (!path) {
    // Unknown sport id — render nothing, fail safe. (Also catches dev typos.)
    return null;
  }

  const stroke = resolveSportColor({ theme, sportId: id });
  // SVG sits at ~55% of tile size; clamped to a minimum of 12 so small
  // in-button uses still render crisply on retina.
  const svgSize = inline ? size : Math.max(12, Math.round(size * 0.55));

  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true };

  const svg = (
    <svg
      viewBox="0 0 24 24"
      width={svgSize}
      height={svgSize}
      fill="none"
      stroke={stroke}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={inline ? { display: 'inline-block', verticalAlign: '-2px', ...style } : undefined}
      {...(inline ? a11y : { 'aria-hidden': true })}
    >
      {path}
    </svg>
  );

  if (inline) return svg;

  return (
    <span
      {...a11y}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: 'none',
        background: BG_BY_ID[id],
        borderRadius: 'var(--r-soft)',
        ...style,
      }}
    >
      {svg}
    </span>
  );
}
