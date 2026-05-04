import React from 'react';
import { useIsMobile, useIsDesktop } from '../hooks/useMediaQuery.js';

/**
 * <MobileOnly> / <DesktopOnly> — v0.13.3 Sprint 2 Theme C, Ship A.
 *
 * Render-gating wrappers that mount their children only when the
 * viewport matches. Use these instead of inline `{isMobile && ...}`
 * patterns so the breakpoint logic stays out of business components
 * and so the eventual A/B-test of breakpoints is a one-line change.
 *
 * Difference vs CSS `@media display:none`: these unmount the
 * children entirely. Hooks inside them (e.g. data fetches) don't
 * fire on the wrong viewport. Use this when:
 *   - The mobile + desktop variants render different component
 *     trees (BottomSheet vs Dropdown picker).
 *   - You want to skip a fetch on mobile that a desktop sidebar
 *     would otherwise trigger.
 *
 * If you only need to hide visually, prefer a CSS `@media` rule —
 * cheaper and avoids hydration flicker.
 *
 * SSR caveat: on the very first render after hydration the
 * initialMatches() is read synchronously from window.matchMedia. In
 * the rare edge case where the hook runs before window is defined
 * (some test runners), it returns false → DesktopOnly will mount,
 * MobileOnly won't. Acceptable.
 *
 * Props:
 *   children    — the JSX to gate
 *   breakpoint  — pixel value (default 720); changing this lets a
 *                 single component opt into a tighter "phone-only"
 *                 cut-off (e.g. 540).
 */
export function MobileOnly({ children, breakpoint = 720 }) {
  const isMobile = useIsMobile(breakpoint);
  if (!isMobile) return null;
  return <>{children}</>;
}

export function DesktopOnly({ children, breakpoint = 721 }) {
  const isDesktop = useIsDesktop(breakpoint);
  if (!isDesktop) return null;
  return <>{children}</>;
}
