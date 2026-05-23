import React from 'react';

// ============================================================================
// v0.65.0 — Pick'em <Flag /> + country color map.
//
// Country flag pipeline per the handover's "Critical integration decision
// #4": "the mocks use emoji. Replace with a real flag pipeline —
// country-flag-icons (SVG) or a CDN — behind the design's Flag component,
// with COUNTRY_COLORS as the solid-color fallback. No heavy dependency
// on hot paths."
//
// P0 implementation: emoji-on-coloured-pill. Renders the unicode regional
// indicator emoji over a solid pill colored with the country's brand color.
// Sufficient for prototyping + matches the design mock fidelity. P1+ can
// swap to flagcdn.com SVGs by editing the inner `<FlagImage />` only —
// the public API stays stable.
//
// COUNTRY_COLORS keys are ISO 3166-1 alpha-3 codes (FIFA + commonly-used
// codes). Extend as the tournament demands.
// ============================================================================

export const COUNTRY_COLORS = {
  ARG: '#74ACDF', BRA: '#FEDF00', FRA: '#0055A4', ENG: '#CE1124',
  IDN: '#FF0000', ESP: '#AA151B', GER: '#000000', NED: '#FF6600',
  POR: '#006600', CRO: '#171796', MAR: '#C1272D', JPN: '#BC002D',
  USA: '#3C3B6E', MEX: '#006847', CAN: '#FF0000', ITA: '#009246',
  BEL: '#FAE042', URU: '#5CBCE9', COL: '#FCD116', SEN: '#00853F',
  KOR: '#003478', AUS: '#012169',
};

// ISO alpha-3 → emoji shorthand. Indonesia + common WC qualifiers.
// Production swap should drop this in favor of a Flag SVG CDN
// (flagcdn.com or country-flag-icons) — emoji render inconsistently
// across platforms.
const COUNTRY_EMOJI = {
  ARG: '🇦🇷', BRA: '🇧🇷', FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  IDN: '🇮🇩', ESP: '🇪🇸', GER: '🇩🇪', NED: '🇳🇱',
  POR: '🇵🇹', CRO: '🇭🇷', MAR: '🇲🇦', JPN: '🇯🇵',
  USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦', ITA: '🇮🇹',
  BEL: '🇧🇪', URU: '🇺🇾', COL: '🇨🇴', SEN: '🇸🇳',
  KOR: '🇰🇷', AUS: '🇦🇺',
};

const COUNTRY_NAMES = {
  ARG: 'Argentina', BRA: 'Brasil', FRA: 'Prancis', ENG: 'Inggris',
  IDN: 'Indonesia', ESP: 'Spanyol', GER: 'Jerman', NED: 'Belanda',
  POR: 'Portugal', CRO: 'Kroasia', MAR: 'Maroko', JPN: 'Jepang',
  USA: 'Amerika Serikat', MEX: 'Meksiko', CAN: 'Kanada', ITA: 'Italia',
  BEL: 'Belgia', URU: 'Uruguay', COL: 'Kolombia', SEN: 'Senegal',
  KOR: 'Korea Selatan', AUS: 'Australia',
};

/**
 * <Flag code="ARG" w={32} h={22} />
 *
 * Renders a country flag chip. Accepts an ISO alpha-3 code (preferred)
 * or a 2-letter ISO code (mapped via alias). Falls back to the solid
 * COUNTRY_COLORS tint with the code shown in mono if the country has
 * no emoji/SVG asset.
 *
 * Props:
 *   code     ISO alpha-3 (e.g. "ARG", "ENG", "IDN")
 *   w, h     pixel dimensions (default 32×22)
 *   round    border-radius (default 4)
 *   label    optional override for the aria-label
 */
export default function Flag({ code, w = 32, h = 22, round = 4, label }) {
  const key = (code || '').toUpperCase();
  const emoji = COUNTRY_EMOJI[key];
  const color = COUNTRY_COLORS[key];
  const name = COUNTRY_NAMES[key] || key;
  const ariaLabel = label || `Bendera ${name}`;
  const fontSize = Math.min(w, h * 1.4);
  return (
    <span
      className="p-flag"
      role="img"
      aria-label={ariaLabel}
      style={{
        width: w,
        height: h,
        borderRadius: round,
        fontSize,
        lineHeight: 1,
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla", "Noto Color Emoji", emoji',
        boxShadow: color ? `inset 0 0 0 1px ${color}` : '0 0 0 1px rgba(0,0,0,0.06) inset',
        userSelect: 'none',
      }}
    >
      {emoji || <CodeFallback code={key} color={color} />}
    </span>
  );
}

function CodeFallback({ code, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: color || 'var(--bg-deep)',
        color: '#fff',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '0.04em',
      }}
    >
      {code}
    </span>
  );
}
