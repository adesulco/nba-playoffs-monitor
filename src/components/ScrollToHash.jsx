import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToHash — v0.13.4 Sprint 2 Theme C, Ship B helper.
 *
 * React Router v6 doesn't auto-scroll to `#hash` fragments on
 * navigation, which broke the new sport-aware MobileBottomNav's
 * hash-deep-links (e.g. `/premier-league-2025-26#standings` →
 * scroll to the standings section). This component listens for
 * pathname/hash changes and scrolls a matching `id="..."` element
 * into view.
 *
 * Behavior:
 *   - No hash → no-op (lets React Router's default scroll-to-top
 *     behavior alone, or pages can manage their own scroll).
 *   - Hash present, matching id found → scrollIntoView with
 *     `behavior: 'smooth'` and a small top offset for the V2TopBar.
 *   - Hash present, no matching id → also no-op (browser would
 *     have just scrolled to top anyway).
 *
 * The `setTimeout(0)` defers the scroll so React has rendered
 * lazy-loaded sections (e.g. EPL standings table mounts after a
 * Suspense fallback resolves) before we measure their position.
 *
 * Mount once globally in App.jsx beneath BrowserRouter.
 */
export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, '');
    // Defer one tick so the destination component has time to mount
    // (especially for lazy/Suspense routes).
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      // V2TopBar is 48 px sticky, plus ~12 px breathing room.
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}
