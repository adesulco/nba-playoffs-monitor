import React from 'react';
import { COLORS as C } from '../../lib/constants.js';
import { SURFACE_LABEL } from '../../lib/sports/tennis/glossary.js';
import { useApp } from '../../lib/AppContext.jsx';

/**
 * SurfaceChip — the little pill that says "Tanah liat" / "Clay" / "Grass".
 *
 * Colors mirror docs/tennis/03-ui-spec.md — a soft bg tinted from the surface
 * hex (8% alpha) plus a 1px border at 40% alpha so the chip reads as an
 * accent, not a saturated shape. Text sits at the solid surface color so it
 * passes WCAG contrast on the dashboard's panel background in both themes.
 */
const SURFACE_HEX = {
  clay:   C.tennisClay,
  grass:  C.tennisGrass,
  hard:   C.tennisHard,
  indoor: C.tennisIndoor,
};

function withAlpha(hex, alphaHex) {
  // hex in `#RRGGBB` form; returns `#RRGGBBaa`.
  return `${hex}${alphaHex}`;
}

export default function SurfaceChip({ surface, size = 'md' }) {
  const { lang } = useApp();
  if (!surface) return null;
  const hex = SURFACE_HEX[surface] || C.dim;
  const label = (SURFACE_LABEL[surface] || { id: surface, en: surface })[
    lang === 'en' ? 'en' : 'id'
  ];

  const pad = size === 'sm' ? '2px 6px' : '3px 8px';
  const fontSize = size === 'sm' ? 9.5 : 10.5;

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        padding: pad,
        color: hex,
        background: withAlpha(hex, '14'),   // ~8% alpha
        border: `1px solid ${withAlpha(hex, '66')}`, // ~40%
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
