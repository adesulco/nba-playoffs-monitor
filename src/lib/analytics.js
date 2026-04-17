// Tiny GA4 loader. No-ops gracefully when VITE_GA_ID is not set, so local
// dev and preview builds don't pollute production analytics.
//
// Vercel: set VITE_GA_ID = G-XXXXXXXXXX under Project → Settings →
//   Environment Variables → Production, then redeploy.

const GA_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_ID) || null;

let initialized = false;

export function isAnalyticsEnabled() {
  return !!GA_ID;
}

/**
 * Inject the gtag.js script and run the initial config call.
 * Idempotent — safe to call multiple times.
 */
export function initAnalytics() {
  if (!GA_ID || initialized) return;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  // Create dataLayer + gtag stub
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  // send_page_view=false because we'll fire pageviews manually on each route change
  gtag('config', GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  // Load the gtag library
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  initialized = true;
}

/**
 * Fire a GA4 page_view. Called on every react-router route change.
 */
export function trackPageview(path, title) {
  if (!GA_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Fire a custom event. Convenient for tracking feature adoption later
 * (e.g. team-picker-select, watchlist-add, focus-open).
 */
export function trackEvent(eventName, params = {}) {
  if (!GA_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}
