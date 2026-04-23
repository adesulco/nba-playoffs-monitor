// Observability plumbing — Sentry + PostHog.
//
// Both are guarded by their env vars: if the keys aren't set (e.g. local
// dev, previews without secrets), `initObservability()` is a no-op. This
// keeps bundle cost minimal pre-launch and avoids noisy dev-mode errors
// before the real project is wired.
//
// Integration with existing analytics.js:
// - GA4 is loaded inline in index.html (the trusted src there must not move).
// - `trackEvent()` in analytics.js already fires gtag events. This module
//   exposes a parallel PostHog `posthogCapture()` that analytics.js bridges
//   to — so every event lands in BOTH tools, without every caller needing
//   to import both modules.
//
// Why PostHog over Mixpanel/Amplitude for Gibol:
// - EU data centre option keeps latency to Jakarta acceptable.
// - Free tier covers 1M events/month which is ample until IBL ships.
// - Built-in funnels + retention + session replay — the three dashboards
//   we need to measure whether pick'em / push / newsletter actually
//   retain users.

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

let sentryReady = false;
let posthogReady = false;

/**
 * Initialise Sentry + PostHog at app boot. Call ONCE from src/main.jsx before
 * ReactDOM.render — Sentry needs to wrap the React tree to capture component
 * errors, and PostHog's autocapture wants to hook DOM listeners on first paint.
 */
export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com';

  if (dsn && !sentryReady) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_BUILD_DATE || 'dev',
      // Keep tracesSampleRate low — we just want error context, not full
      // span tracing bandwidth. Can bump once perf profiling matters.
      tracesSampleRate: 0.1,
      // Session replay on errors only (replays are expensive; sample errors 100%).
      replaysSessionSampleRate: 0.02,
      replaysOnErrorSampleRate: 1.0,
      // Filter out noise: Polymarket/ESPN proxy 5xx errors are already surfaced
      // in UI fallbacks — don't alarm the dev on every edge blip.
      ignoreErrors: [
        /Polymarket [a-z-]+: HTTP (5\d\d|429)/i,
        /ESPN .* HTTP (5\d\d|429)/i,
        /Jolpica .* HTTP (5\d\d|429)/i,
        // React-router's expected scroll-restoration chatter.
        /ResizeObserver loop limit exceeded/,
      ],
    });
    sentryReady = true;
  }

  if (posthogKey && !posthogReady) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false, // AnalyticsTracker already handles SPA pageviews.
      autocapture: true,
      persistence: 'localStorage',
      // Respect user opt-out signals — DNT browsers + Bahasa-first means some
      // users are on locked-down profiles; don't over-instrument them.
      respect_dnt: true,
      // Session replay — off by default; flip via a later env toggle when we
      // actually have time to review replays.
      disable_session_recording: true,
    });
    posthogReady = true;
  }
}

/**
 * Emit a PostHog event. Called transparently from `analytics.trackEvent()` —
 * components keep calling one function, events land in GA4 + PostHog.
 * No-op when PostHog isn't initialised.
 */
export function posthogCapture(eventName, params = {}) {
  if (!posthogReady) return;
  try {
    posthog.capture(eventName, params);
  } catch {
    /* PostHog ingest failures must never break the UI */
  }
}

/**
 * Emit a PostHog pageview. Called from AnalyticsTracker on every route change.
 */
export function posthogPageview(path, title) {
  if (!posthogReady) return;
  try {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: path,
      $screen_name: title || document.title,
    });
  } catch {
    /* see above */
  }
}

/**
 * Identify a signed-in user so PostHog can stitch cross-device sessions.
 * Hook this up once the pick'em auth flow lands. Call with a stable UUID
 * (never the raw email — PII minimisation).
 */
export function identifyUser(distinctId, properties = {}) {
  if (posthogReady && distinctId) {
    try { posthog.identify(distinctId, properties); } catch {}
  }
  if (sentryReady && distinctId) {
    try { Sentry.setUser({ id: distinctId }); } catch {}
  }
}

/**
 * Clear identity on logout so PostHog treats the next session as anonymous.
 */
export function resetIdentity() {
  if (posthogReady) { try { posthog.reset(); } catch {} }
  if (sentryReady) { try { Sentry.setUser(null); } catch {} }
}

/**
 * React error-boundary wrapper — drop-in replacement for any top-level
 * boundary. Sends the error to Sentry with component stack + breadcrumbs.
 *
 * Usage: wrap <App /> in main.jsx, or wrap individual routes if you want
 * sport-scoped error reporting (we already have SportErrorBoundary for UX
 * fallback; Sentry.ErrorBoundary is for reporting).
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
