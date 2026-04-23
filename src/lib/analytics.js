// Unified analytics shim — GA4 + PostHog.
//
// GA4 loader + initial `gtag('config', ...)` call live inline in index.html
// so crawlers / GSC / bots see the tag in raw HTML (SPA hydration can't
// guarantee that). This module just wraps the client-side API.
//
// PostHog is initialised in src/lib/observability.js at boot. We bridge
// trackEvent + trackPageview to BOTH tools so every existing call site
// (theme_toggle, lang_toggle, accent_set, f1_constructor_select, etc.)
// lands in both funnels without rewrites.

import { posthogCapture, posthogPageview } from './observability.js';

export function isAnalyticsEnabled() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Fire a pageview on both GA4 and PostHog. Called on every route change
 * by AnalyticsTracker.
 */
export function trackPageview(path, title) {
  if (isAnalyticsEnabled()) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
    });
  }
  // PostHog: always attempt — posthogPageview is a safe no-op when the key
  // is absent. Keep GA4 + PostHog updates in the same call so event
  // ordering stays consistent across tools.
  posthogPageview(path, title);
}

/**
 * Fire a custom event on both tools.
 *
 * Established events in the codebase (as of v0.7.0):
 *   theme_toggle, theme_set, lang_toggle, accent_set,
 *   f1_constructor_select, epl_club_select, tennis_player_select
 * Any new event names should be snake_case and Bahasa-agnostic.
 */
export function trackEvent(eventName, params = {}) {
  if (isAnalyticsEnabled()) {
    window.gtag('event', eventName, params);
  }
  posthogCapture(eventName, params);
}

/**
 * Preserved for backwards compat — AnalyticsTracker mounts this once, but
 * actual GA4 init happens in index.html and PostHog init in observability.js.
 */
export function initAnalytics() { /* no-op — wired elsewhere */ }
