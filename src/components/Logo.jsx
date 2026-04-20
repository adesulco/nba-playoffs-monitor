import React from 'react';

/**
 * Gibol brand lockup — target-mark glyph + "gibol." wordmark.
 *
 * Per Brand Handoff v1:
 *  • Glyph is pure SVG using currentColor → inherits from the parent.
 *  • Wordmark is TYPE, not an image: Inter Tight 900, -0.055em tracking,
 *    final "." colored --amber.
 *  • `glyphOnly` returns just the mark (use for favicons, PWA, ≤32px surfaces).
 *  • Clearspace on every side equals glyph height; size props respect
 *    minimums (20px full lockup, 16px glyph).
 */
export function Glyph({ size = 24, title = 'gibol' }) {
  const side = Math.max(16, size);
  return (
    <svg
      viewBox="0 0 24 24"
      width={side}
      height={side}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path
        d="M12 0.5V4 M12 20V23.5 M0.5 12H4 M20 12H23.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  size = 'md',          // 'sm' | 'md' | 'lg'  — full lockup heights
  glyphOnly = false,
  color,                // optional override; inherits otherwise
  className,
  style,
}) {
  // Size matrix — glyph px + wordmark font-size in px.
  // Full-lockup min per spec is 20px (wordmark height); glyph-only min is 16px.
  const sizing =
    size === 'sm' ? { glyph: 18, font: 16 } :
    size === 'lg' ? { glyph: 32, font: 28 } :
    /* md */       { glyph: 24, font: 20 };

  if (glyphOnly) {
    return (
      <span
        className={className}
        style={{ color: color || 'inherit', display: 'inline-flex', ...style }}
      >
        <Glyph size={Math.max(16, sizing.glyph)} />
      </span>
    );
  }

  // Clearspace = glyph height, baked into the gap between glyph and wordmark.
  const gap = Math.round(sizing.glyph * 0.4);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        color: color || 'inherit',
        lineHeight: 1,
        ...style,
      }}
    >
      <Glyph size={sizing.glyph} />
      <span
        className="brand-wordmark"
        style={{ fontSize: sizing.font, color: 'inherit' }}
      >
        gibol<span className="brand-wordmark-dot">.</span>
      </span>
    </span>
  );
}
