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
 * SVG-based for pixel-perfect positioning of the pulse. The text uses
 * `fill="currentColor"` so the wordmark inherits theme color, and the
 * pulse always renders in live amber. Cover-rect over the stock i-dot
 * matches the surface color via the `coverColor` prop (default
 * "currentColor" inverse via CSS — see notes below).
 *
 * Sizing: pass `height` in px (= cap height target). The wordmark
 * preserves a ~4:1 aspect ratio (gibol ≈ 4.0 × cap height in Inter
 * Tight 900 at -50 tracking).
 *
 * Modes:
 *   - mode="auto" (default): currentColor letters + transparent cover
 *     (uses an `<rect>` matched to surfaceColor prop or
 *     `var(--gibol-cover, transparent)` so the stock i-dot is hidden
 *     by repainting it as background)
 *   - mode="cream": letters in ink, cover in cream — for cream surfaces
 *   - mode="ink":   letters in cream, cover in ink — for ink surfaces
 */
export function Wordmark({
  height = 24,
  mode = 'auto',
  surfaceColor,        // override the cover-rect fill (matches the bg)
  animated = true,
  className,
  style,
  title = 'gibol',
}) {
  // Source SVG geometry (from public/brand/gibol-wordmark-*.svg):
  //   viewBox 0 0 880 220
  //   text baseline y=180, font-size 180, fill = letter color
  //   pulse center (224, 86), inner radius 14, ring radius 22
  //   cover rect at (200, 62, 48×42) hides stock i-dot
  // We just re-render those numbers but with theme-aware colors.
  const VB_W = 880;
  const VB_H = 220;
  const width = (VB_W / VB_H) * height;

  const letterColor =
    mode === 'cream' ? '#0F0E0C' :
    mode === 'ink'   ? '#F5F1EA' :
    'currentColor';
  // Cover rect: must match the surface BEHIND the wordmark so the stock
  // i-dot is hidden. In auto mode, fall back to a CSS var the parent
  // can set; default `transparent` won't hide the stock i-dot but the
  // pulse-dot is sized big enough to paint over it.
  const coverFill =
    surfaceColor ??
    (mode === 'cream' ? '#F5F1EA' :
     mode === 'ink'   ? '#0F0E0C' :
     'var(--gibol-cover, transparent)');

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      height={height}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <text
        x="60"
        y="180"
        fontFamily='"Inter Tight", system-ui, sans-serif'
        fontWeight="900"
        fontSize="180"
        letterSpacing="-10"
        fill={letterColor}
      >
        gibol
      </text>
      {/* Cover the stock i-dot — repainted to match the surface */}
      <rect x="200" y="62" width="48" height="42" fill={coverFill} />
      {/* Live amber pulse — replaces the dot of the i */}
      <circle
        cx="224"
        cy="86"
        r="22"
        fill="none"
        stroke={AMBER}
        strokeOpacity="0.4"
        strokeWidth="1.5"
      >
        {animated && (
          <>
            <animate
              attributeName="r"
              values="22;30;22"
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
      <circle cx="224" cy="86" r="14" fill={AMBER}>
        {animated && (
          <>
            <animate
              attributeName="r"
              values="14;16;14"
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
  surfaceColor,           // pass-through for the wordmark cover-rect
  mode,                   // 'cream' | 'ink' | 'auto'
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

  // The wordmark needs a cover-rect color that matches the SURFACE
  // behind it (to hide the stock i-dot before the amber pulse paints
  // over). On the dark default chrome that's --bg = #0A1628.
  // Callers can override via surfaceColor for cards / cream sections.
  return (
    <Wordmark
      height={Math.max(16, Math.round(fontSize * 1.4))}
      mode={mode || 'auto'}
      surfaceColor={surfaceColor}
      animated
      className={className}
      style={{ color: color || 'inherit', ...style }}
    />
  );
}
