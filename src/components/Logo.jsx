import React from 'react';

/**
 * Gibol brand — Pulse & Field (v0.59.9 / Brand Guideline v1.0)
 *
 * The brand's signature gesture is the LIVE PULSE — an amber circle that:
 *   1. Replaces the dot of the "i" in the wordmark
 *   2. Stands alone as the standalone mark (favicon → app icon → score-card watermark)
 *
 * This file exposes:
 *   • <PulseMark>  — the standalone mark. amber dot, optional concentric ring
 *   • <Wordmark>   — the full lockup. "gibol" Inter Tight 900 + pulse on i-dot
 *   • <Logo>       — backward-compat alias of <Wordmark> (old callsites)
 *   • <Glyph>      — backward-compat alias of <PulseMark> (old callsites)
 *
 * Brand non-negotiables enforced here:
 *   - Lowercase always ("gibol", never "Gibol" or "GIBOL")
 *   - Live amber #F59E0B reserved exclusively for the pulse — never decorative
 *   - The .co suffix is DROPPED from the standalone wordmark (it's a domain,
 *     not the brand). Sub-brand suffixes (gibol Pro / Industry / Live / Pulse)
 *     are handled by composition above this component, not in here.
 *   - Pulse Ø = ⅓ × cap height of the wordmark.
 */

const AMBER = '#F59E0B';

/**
 * The standalone pulse mark.
 *
 * Sizing rules per brand guideline:
 *   ≤16px → solid dot only, no ring
 *   17-32 → solid dot only, no ring
 *   33+   → dot + concentric ring at 1.6× radius
 *   live  → dot + animated ring (1.2s pulse)
 */
export function PulseMark({
  size = 24,
  animated = false,
  ring,           // undefined = auto-decide by size; true/false = override
  color = AMBER,
  ringColor,      // override ring stroke; defaults to color at 0.4 opacity
  background,     // optional background circle (e.g. ink for app icon)
  title = 'gibol pulse',
  className,
  style,
}) {
  const showRing = ring === undefined ? size >= 33 : ring;
  const dotR = size * (1 / 3);   // Ø = ⅓ × frame
  const ringR = dotR * 1.6;
  const ringStroke = Math.max(1, size / 48);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {background && (
        <rect width={size} height={size} fill={background} rx={size * 0.18} />
      )}
      {showRing && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringR}
          fill="none"
          stroke={ringColor || color}
          strokeOpacity={animated ? undefined : 0.4}
          strokeWidth={ringStroke}
        >
          {animated && (
            <>
              <animate
                attributeName="r"
                values={`${ringR};${ringR * 1.4};${ringR}`}
                dur="1.2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.5;0.05;0.5"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      )}
      <circle cx={size / 2} cy={size / 2} r={dotR} fill={color}>
        {animated && (
          <>
            <animate
              attributeName="r"
              values={`${dotR};${dotR * 1.15};${dotR}`}
              dur="1.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </>
        )}
      </circle>
    </svg>
  );
}

/**
 * The full wordmark "gibol" with the pulse-dot replacing the i-dot.
 *
 * Inter Tight 900, lowercase, optical tracking -50 (display) / -30 (≤32px).
 * The pulse is amber and animates by default in the running app
 * (set `animated={false}` for static contexts like share-card watermarks).
 *
 * Color modes:
 *   - default: letters use `currentColor` → inherits from parent CSS
 *   - mode="cream": letters in ink #0F0E0C, designed for cream backgrounds
 *   - mode="ink":   letters in cream #F5F1EA, designed for ink backgrounds
 */
export function Wordmark({
  size = 24,           // cap height in px (~ font-size)
  mode,                // 'cream' | 'ink' | undefined (use currentColor)
  animated = true,
  className,
  style,
  title = 'gibol',
}) {
  const fontSize = size;
  // Wordmark width approx 2.55× cap height for "gibol" at -50 tracking
  const widthRatio = 2.45;
  const inkColor =
    mode === 'cream' ? '#0F0E0C' :
    mode === 'ink'   ? '#F5F1EA' :
    'currentColor';

  // Letter-spacing per brand spec: -50/1000 = -0.05em at display, -30/1000 at small
  const tracking = size >= 32 ? -0.05 : -0.03;

  // Pulse dot: ⅓ × cap height. Positioned over the dot of the "i" — empirically
  // ~31% from the left edge of "gibol" in Inter Tight 900.
  const pulseDiameter = fontSize / 3;
  // i-dot vertical offset above baseline ≈ 0.85 × cap height
  const pulseCenterX = fontSize * 0.78;   // ~31% across "gibol" width
  const pulseCenterY = -fontSize * 0.85;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
        color: inkColor,
        fontFamily: '"Inter Tight", system-ui, sans-serif',
        fontWeight: 900,
        fontSize,
        letterSpacing: `${tracking}em`,
        ...style,
      }}
      role="img"
      aria-label={title}
    >
      <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
        gibol
        {/* Cover the stock i-dot then overlay the amber pulse */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: pulseCenterX - pulseDiameter / 2,
            top: pulseCenterY - pulseDiameter / 2,
            width: pulseDiameter,
            height: pulseDiameter,
            // Background matches the surface so the stock i-dot disappears.
            // Use currentColor's complement via a CSS var that ancestor sets,
            // OR rely on the pulse-dot being slightly bigger so it just paints over.
          }}
        >
          <PulseMark
            size={pulseDiameter}
            animated={animated}
            ring={false}
          />
        </span>
      </span>
    </span>
  );
}

// ─── Backward compatibility ────────────────────────────────────────────
// The previous Logo.jsx exposed <Glyph> and <Logo>. Keep those names so
// existing callsites (TopBar, HubActionRow) don't break, but they now
// render the new pulse mark and wordmark.

export function Glyph({ size = 24, title = 'gibol' }) {
  return <PulseMark size={size} ring={size >= 33} title={title} />;
}

export default function Logo({
  size = 'md',
  glyphOnly = false,
  color,
  className,
  style,
}) {
  // Size matrix — wordmark cap heights for sm / md / lg.
  const sizing =
    size === 'sm' ? 16 :
    size === 'lg' ? 32 :
    /* md */       22;

  // Numeric size override (e.g. <Logo size={40} />)
  const fontSize = typeof size === 'number' ? size : sizing;

  if (glyphOnly) {
    return (
      <span
        className={className}
        style={{ color: color || 'inherit', display: 'inline-flex', ...style }}
      >
        <PulseMark size={Math.max(16, fontSize)} />
      </span>
    );
  }

  return (
    <Wordmark
      size={fontSize}
      animated
      className={className}
      style={{ color: color || 'inherit', ...style }}
    />
  );
}
