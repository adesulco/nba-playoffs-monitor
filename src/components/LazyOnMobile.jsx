import React from 'react';
import { useInView } from '../hooks/useInView.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

/**
 * <LazyOnMobile> — v0.13.11 Sprint 2 Theme C, Ship I.
 *
 * Defers rendering its children on MOBILE (≤720 px) until the wrapper
 * scrolls within `rootMargin` of the viewport. On desktop renders
 * children eagerly because side-by-side multi-col layouts have all
 * content above the fold.
 *
 * Why: NBADashboard's mobile reorder (Ship C) puts the live ticker
 * first; cols 1-3 sit below the fold on a 375 px phone. Rendering
 * 11 Sparkline SVGs + the featured-series panel + bracket + key-
 * accounts for content the user may never scroll to is wasted work.
 *
 * The shared playoff data hook (`usePlayoffData`) keeps polling
 * regardless — we can't gate it because the live ticker (above
 * fold) needs the same payload. What we DO gate is the React render
 * cost of below-fold panels.
 *
 * Reserves a `minHeight` placeholder while not yet in-view so the
 * page doesn't shift when content mounts. Pass an estimated height
 * matching the eventual content.
 *
 * Props:
 *   children      — the JSX to defer
 *   minHeight     — placeholder height in px (default 320)
 *   rootMargin    — IntersectionObserver pre-trigger (default '300px')
 *   ariaLabel     — optional label for the placeholder while loading
 */
export default function LazyOnMobile({
  children,
  minHeight = 320,
  rootMargin = '300px',
  ariaLabel,
}) {
  const isMobile = useIsMobile();
  const { ref, inView } = useInView({ rootMargin });

  // Desktop: always render. Mobile: gate on inView.
  if (!isMobile) return <>{children}</>;

  return (
    <div ref={ref} aria-label={ariaLabel} aria-busy={!inView ? 'true' : 'false'}>
      {inView ? children : (
        <div
          style={{
            minHeight,
            background: 'transparent',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
