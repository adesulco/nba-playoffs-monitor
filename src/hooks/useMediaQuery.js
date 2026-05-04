import { useEffect, useState } from 'react';

/**
 * useMediaQuery — v0.13.3 (Sprint 2 Theme C, Ship A).
 *
 * SSR-safe wrapper around window.matchMedia. Returns true when the
 * provided query matches the current viewport. Subscribes to changes
 * via the modern `change` event (replaces the deprecated
 * MediaQueryList.addListener).
 *
 * Why a hook (not just CSS):
 *   - Some components need to swap their RENDER, not just their style
 *     (e.g. MobileBottomNav contains different items per sport on
 *     mobile vs no presence on desktop, and the desktop variant
 *     can't just be CSS-hidden — its hooks would still fire).
 *   - Bundle savings: lazy-load below-fold cols only when on mobile +
 *     in-view (Ship C).
 *   - BottomSheet vs dropdown pickers (Ship E) — totally different
 *     component trees, can't be conditional CSS.
 *
 * Server-render note: Vite SPA does NOT render React on the server
 * (the prerender script bakes static meta only). All React renders
 * happen client-side, so window is always defined when the initial
 * useState lazy initializer runs in practice. The typeof guard is
 * a safety net for tests / edge runtimes.
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 720px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    // Re-sync once after mount in case the viewport changed between
    // the initial useState init and the effect (e.g. orientation
    // change during hydration).
    setMatches(mql.matches);
    const onChange = (e) => setMatches(e.matches);
    // addEventListener is the modern API; older Safari falls back to
    // addListener but we don't ship to those browsers anymore.
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * useIsMobile — convenience wrapper for the project's canonical
 * mobile breakpoint (≤720px). All UI gates that switch on "is the
 * user on a phone" should use this instead of hand-rolling a query
 * so the breakpoint stays in one place.
 *
 * Pass a different threshold (e.g. 540 for "tight phone") if needed.
 */
export function useIsMobile(maxWidth = 720) {
  return useMediaQuery(`(max-width: ${maxWidth}px)`);
}

/**
 * useIsDesktop — convenience for the inverse. Equivalent to
 * !useIsMobile(maxWidth) but reads cleaner at call sites and uses
 * a min-width query so resize transitions hit at the same boundary.
 */
export function useIsDesktop(minWidth = 721) {
  return useMediaQuery(`(min-width: ${minWidth}px)`);
}
