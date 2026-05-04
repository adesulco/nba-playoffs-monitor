import React from 'react';

/**
 * Full-bleed hero band for the editorial article shell.
 *
 * Phase 2 ship Phase B (per docs/redesign-v4-handover.md §4 Phase B).
 * Used by Phase B's article shell + Phase D's Game Center hero.
 *
 * Mobile-first: height collapses to clamp(220px, 38vw, 380px). Caption
 * strip is positioned bottom-left, slightly elevated above the rule.
 *
 * Props:
 *   sport      — 'nba' | 'epl' | 'liga-1-id' | 'f1' | 'tennis' | 'fifa'
 *                Drives the gradient tint when no image is provided.
 *   image      — URL string for a real photo. When set, renders the
 *                photo with a gradient overlay for caption legibility.
 *                When null/undefined, renders the per-sport gradient
 *                placeholder (v1 — SVG illustrations land in v2).
 *   caption    — optional small mono caption (e.g. "DENVER · BOSTON",
 *                "GW 36 — ANFIELD"). Bottom-left over the image.
 *   credit     — photographer/source credit line. Right of caption.
 *   height     — override the responsive clamp. Accepts CSS string.
 *                Default: clamp(220px, 38vw, 380px) (mobile-first per
 *                redesign doc §4 Phase B mobile overrides).
 *   ratio      — aspect ratio when not using `height`. Default '16/9'.
 *                (Used inline in card grids, not as full-bleed hero.)
 *   children   — optional overlay content (e.g. play-on icon for video).
 *   className  — passthrough.
 *
 * Future: when ade's editorial pipeline starts producing real photos,
 * pass them via `image=`. The v1 contract is "SVG-illustration
 * fallback when no photo" — won't block ship on photo readiness.
 */

// Per-sport accent tints for the gradient placeholder. Mirrors the
// v4 SPORT_COLORS palette + complies with the brand spec.
const SPORT_TINT = {
  nba: '#F97316',
  epl: '#22C55E',
  'liga-1-id': '#EF4444',
  f1: '#E10600',
  tennis: '#D4A13A',
  fifa: '#326295',
};

export default function HeroBand({
  sport = 'nba',
  image,
  caption,
  credit,
  height,
  ratio = '16/9',
  children,
  className = '',
}) {
  const tint = SPORT_TINT[sport] || SPORT_TINT.nba;
  const useHeight = height || 'clamp(220px, 38vw, 380px)';

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: useHeight,
    overflow: 'hidden',
    background: 'var(--bg-3)',
    borderBottom: '1px solid var(--line)',
  };

  // No-image fallback — radial gradient + subtle hatching, sport-tinted.
  // SVG inline so no extra HTTP request; ~600 bytes.
  const placeholder = (
    <svg
      viewBox="0 0 400 225"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`hb-${sport}`} cx="0.7" cy="0.35" r="0.6">
          <stop offset="0%" stopColor={tint} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hb-${sport}-l`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity="0.18" />
          <stop offset="80%" stopColor="#0A1628" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="#0F1E36" />
      <rect width="400" height="225" fill={`url(#hb-${sport}-l)`} />
      <rect width="400" height="225" fill={`url(#hb-${sport})`} />
      {/* faint diagonal hatching */}
      <g stroke="#FFFFFF" strokeOpacity="0.025" strokeWidth="1">
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} x1={i * 18} y1="0" x2={i * 18 + 60} y2="225" />
        ))}
      </g>
    </svg>
  );

  return (
    <div className={`v2 ${className}`.trim()} style={containerStyle}>
      {image ? (
        <img
          src={image}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        placeholder
      )}

      {/* Bottom-up gradient overlay so captions stay legible against
          any image. Stronger when an image is present (the photo can
          be busy); lighter on placeholder. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(
            180deg,
            rgba(10,22,40,0) 40%,
            rgba(10,22,40,${image ? 0.7 : 0.4}) 100%
          )`,
          pointerEvents: 'none',
        }}
      />

      {(caption || credit) && (
        <div
          style={{
            position: 'absolute',
            left: 'clamp(12px, 3vw, 24px)',
            right: 'clamp(12px, 3vw, 24px)',
            bottom: 'clamp(10px, 2vw, 18px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            zIndex: 2,
            color: 'var(--ink)',
          }}
        >
          {caption && (
            <span
              className="card-title"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(230,238,249,0.92)',
                background: 'rgba(10,22,40,0.55)',
                padding: '3px 8px',
                borderRadius: 3,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            >
              {caption}
            </span>
          )}
          {credit && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'rgba(159,180,204,0.85)',
                letterSpacing: '0.05em',
              }}
            >
              {credit}
            </span>
          )}
        </div>
      )}

      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
