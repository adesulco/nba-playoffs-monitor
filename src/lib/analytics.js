// Google Analytics 4 helpers. The gtag loader + initial config live in
// index.html directly (hardcoded ID) so that crawlers, GSC ownership
// verification, and AI bots see the tag in the raw HTML. This module
// just provides thin wrappers around window.gtag for SPA pageviews
// and custom events.

export function isAnalyticsEnabled() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Fire a GA4 page_view. Called on every react-router route change.
 */
export function trackPageview(path, title) {
  if (!isAnalyticsEnabled()) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Fire a custom event. Convenient for tracking feature adoption
 * (team-picker-select, watchlist-add, focus-open, etc).
 */
export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsEnabled()) return;
  window.gtag('event', eventName, params);
}

/**
 * Preserved for backwards compat with existing AnalyticsTracker mount.
 * Now a no-op because gtag is initialized in index.html directly.
 */
export function initAnalytics() { /* no-op — initialized in index.html */ }
