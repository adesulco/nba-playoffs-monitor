import React from 'react';

// ============================================================================
// v0.64.0 — <Delta /> (paper-grey P2 systems).
//
// Glyph + value + unit + screen-reader text. Always all four, never a bare
// "+3" (the v0.62.5 interim "+3 poin" is superseded by this component —
// audit FUNC-006 properly closed).
//
// Convention:
//   ▲ pulse-deep   up    naik N {unit}
//   ▼ error        down  turun N {unit}
//   ─ ink-3        flat  tetap
//
// Anatomy from design_handoff_gibol_v1/js/primitives.jsx#Delta. Numbers
// render in JetBrains Mono + tabular-nums so deltas stack on a grid.
//
// Usage:
//   <Delta value={3} unit="posisi" />     → ▲ 3 posisi  · SR: "naik 3 posisi"
//   <Delta value={-2} unit="poin" />      → ▼ 2 poin    · SR: "turun 2 poin"
//   <Delta value={5} unit="peringkat" />  → ▲ 5 peringkat
//   <Delta value={0} unit="posisi" />     → ─ posisi    · SR: "tetap"
//
// `size="lg"` bumps the font from 12 → 14px for hero/match-header use.
// ============================================================================

const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function Delta({
  value,
  // `unit` is the noun shown after the value AND read by screen readers
  // ("3 posisi", "2 poin"). Bahasa-first. Defaults to "posisi" (standings).
  unit = 'posisi',
  // `size`: 'sm' (default 12px) or 'lg' (14px for hero / match-header).
  size = 'sm',
  // Optional `flatLabel` overrides the no-change copy. Default "tetap".
  flatLabel = 'tetap',
}) {
  const fontSize = size === 'lg' ? 14 : 12;
  // value == null OR value === 0 → flat
  if (value == null || value === 0) {
    return (
      <span
        className="g-mono g-tnum"
        style={{
          color: 'var(--ink-3)',
          fontSize,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <span aria-hidden="true">─</span>
        <span aria-hidden="true">{unit}</span>
        <span style={VISUALLY_HIDDEN}>{flatLabel}</span>
      </span>
    );
  }
  const up = value > 0;
  const color = up ? 'var(--pulse-deep)' : 'var(--error)';
  const arrow = up ? '▲' : '▼';
  const abs = Math.abs(value);
  const srText = up ? `naik ${abs} ${unit}` : `turun ${abs} ${unit}`;
  return (
    <span
      className="g-mono g-tnum"
      style={{
        color,
        fontSize,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <span aria-hidden="true">{arrow}</span>
      <span aria-hidden="true">{abs} {unit}</span>
      <span style={VISUALLY_HIDDEN}>{srText}</span>
    </span>
  );
}
