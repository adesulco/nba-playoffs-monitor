/**
 * GI/BOL logo block + taglines — R1-3 (v0.82.0).
 *
 * Pure CSS/type, no raster asset (design README §Logo): "GI" over "BOL"
 * in Bricolage Grotesque 800, paper on a scarlet rounded rect,
 * line-height 0.9–0.92, letter-spacing −0.5px.
 *
 * Sizes from the canvas: 12px inline header · 15px desktop header ·
 * 26–28px landing/brand. The radius and padding scale with the font
 * size so one component covers all three without magic numbers per use.
 */

export const TAGLINE = 'Main. Skor. Kabar.';
export const TAGLINE_SUPPORT = 'Semua demi gengsi.';

export default function Logo4a({ size = 12, as: Tag = 'div', style, ...rest }) {
  // Radius ~6px at 12px type, ~12px at 28px — matches the canvas.
  const radius = Math.round(size * 0.45);
  const padX = Math.round(size * 0.5);
  const padTop = Math.round(size * 0.28);
  const padBottom = Math.round(size * 0.2);

  return (
    <Tag
      style={{
        display: 'inline-block',
        background: 'var(--g4-scarlet)',
        borderRadius: radius,
        padding: `${padTop}px ${padX}px ${padBottom}px`,
        lineHeight: 0.9,
        fontFamily: 'var(--g4-font-display)',
        fontWeight: 800,
        fontSize: size,
        letterSpacing: '-0.5px',
        color: 'var(--g4-paper)',
        ...style,
      }}
      {...rest}
    >
      {/* One accessible name for the pair, so a screen reader says
          "Gibol" rather than spelling out two stacked fragments. */}
      <span role="img" aria-label="Gibol">
        <span style={{ display: 'block' }} aria-hidden="true">GI</span>
        <span style={{ display: 'block' }} aria-hidden="true">BOL</span>
      </span>
    </Tag>
  );
}

/** Logo + "Main. Skor. Kabar." + "Semua demi gengsi." — landing lockup. */
export function LogoLockup({ size = 28, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...style }}>
      <Logo4a size={size} />
      <div>
        <div
          style={{
            fontFamily: 'var(--g4-font-display)',
            fontWeight: 800,
            fontSize: Math.round(size * 0.72),
            letterSpacing: 'var(--g4-track-display)',
            color: 'var(--g4-text)',
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            fontFamily: 'var(--g4-font-ui)',
            fontWeight: 500,
            fontSize: Math.max(11, Math.round(size * 0.43)),
            color: 'var(--g4-text-muted)',
          }}
        >
          {TAGLINE_SUPPORT}
        </div>
      </div>
    </div>
  );
}
