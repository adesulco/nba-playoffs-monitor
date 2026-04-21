import React from 'react';

/**
 * <Crest short="BOS" color="#007A33" size={22} />
 *
 * v2 crest placeholder — colored circle with 2–3 letter abbreviation. Per
 * design handoff §9, real crest assets arrive in v2.1; this component keeps
 * the same API so the swap is a one-line change per call site.
 *
 * Contrast: foreground flips between black and white based on the background
 * luminance so the abbreviation reads on any team color (Liverpool red,
 * Boston green, Lakers purple, Villa maroon, etc.).
 */
export default function Crest({ short, color, size = 22, style, title, ...rest }) {
  const lum = luminance(color);
  const fg = lum > 0.55 ? '#0A0A0A' : '#FFFFFF';
  const ariaProps = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true };
  return (
    <span
      {...ariaProps}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter Tight', sans-serif",
        fontWeight: 800,
        fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.18)',
        ...style,
      }}
      {...rest}
    >
      {short}
    </span>
  );
}

function luminance(hex) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
