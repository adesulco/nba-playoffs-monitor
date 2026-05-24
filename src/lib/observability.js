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
import { getConsent, subscribe as subscribeConsent } from './consent.js';

let sentryReady = false;
let posthogReady = false;
let consentSubscribed = false;

// v0.62.0 — Sentry beforeSend scrub. Audit F-007: strip URL query strings
// from breadcrumbs + transactions before they leave the browser. Even
// with sendDefaultPii: false, request URLs in breadcrumbs can carry
// user-set query params (?team=, ?q=, etc.). Stripping defends against
// accidental PII leak via search strings.
function scrubEvent(event) {
  try {
    if (event?.request?.url) {
      const u = new URL(event.request.url, 'https://www.gibol.co');
      event.request.url = `${u.origin}${u.pathname}`;
      if (event.request.query_string) delete event.request.query_string;
    }
    if (Array.isArray(event?.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (!b?.data) return b;
        const next = { ...b, data: { ...b.data } };
        if (typeof next.data.url === 'string') {
          try {
            const u = new URL(next.data.url, 'https://www.gibol.co');
            next.data.url = `${u.origin}${u.pathname}`;
          } catch { /* leave as-is */ }
        }
        return next;
      });
    }
  } catch { /* never block sending on scrub failure */ }
  return event;
}

/**
 * Initialise Sentry + PostHog at app boot. Call ONCE from src/main.jsx before
 * ReactDOM.render — Sentry needs to wrap the React tree to capture component
 * errors, and PostHog's autocapture wants to hook DOM listeners on first paint.
 *
 * v0.62.0 — gated on consent.analytics. The function still runs at boot,
 * but the actual SDK init only fires when the user has consented (or
 * later when they grant consent via the banner — we subscribe to consent
 * changes and re-call ourselves on transition to granted). Pre-consent
 * this function is a no-op except for setting up the subscription.
 *
 * Audit refs: F-001 (consent before tracker load), F-007 (Sentry init
 * pre-consent posted envelopes to ingest.us.sentry.io before any UI
 * rendered).
 */
export function initObservability() {
  // Wire the consent subscription exactly once — even if the SDKs aren't
  // yet inited, we need to know when the user later grants consent so we
  // can fire init at that moment without a page reload.
  if (!consentSubscribed) {
    consentSubscribed = true;
    subscribeConsent(() => {
      // Re-enter; the gates inside this function will pick up the new
      // consent state and init if appropriate.
      initObservability();
    });
  }

  const consent = getConsent();
  if (!consent.analytics) {
    // Revoke path: if PostHog was inited earlier (user said yes, then
    // changed to no), tell it to stop capturing. Sentry can't be cleanly
    // uninited mid-session — the trade-off is documented in the privacy
    // policy: a page reload guarantees a fully clean state.
    if (posthogReady) {
      try { posthog.opt_out_capturing(); } catch { /* ignore */ }
    }
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com';

  if (dsn && !sentryReady) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_BUILD_DATE || 'dev',
      // v0.62.0 — audit F-007: explicit PII opt-out. Sentry's default
      // since v8 is already false, but pinning it makes the intent
      // unambiguous + survives SDK major upgrades.
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb(crumb) { return scrubEvent({ breadcrumbs: [crumb] }).breadcrumbs[0]; },
      // Keep tracesSampleRate low — we just want error context, not full
      // span tracing bandwidth. Can bump once perf profiling matters.
      tracesSampleRate: 0.1,
      // Session replay on errors only (replays are expensive; sample errors 100%).
      replaysSessionSampleRate: 0.02,
      replaysOnErrorSampleRate: 1.0,
      // Filter out noise: ESPN/Jolpica proxy 5xx errors are already surfaced
      // in UI fallbacks — don't alarm the dev on every edge blip.
      // v0.79.0 — futures-odds provider regex removed (Komdigi de-risk).
      ignoreErrors: [
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
      // v0.62.0 — explicit opt-out posture: PostHog won't capture until
      // we call posthog.opt_in_capturing() below. Belt-and-suspenders
      // with the outer consent gate.
      opt_out_capturing_by_default: true,
      // Respect user opt-out signals — DNT browsers + Bahasa-first means some
      // users are on locked-down profiles; don't over-instrument them.
      respect_dnt: true,
      // Session replay — off by default; flip via a later env toggle when we
      // actually have time to review replays.
      disable_session_recording: true,
    });
    // Flip the gate on now that we know the user consented.
    try { posthog.opt_in_capturing(); } catch { /* ignore */ }
    posthogReady = true;
  }

  // If both SDKs were already initialised in a previous call, ensure the
  // PostHog capture gate reflects the current consent (in case the user
  // toggled off then back on — re-init isn't needed, just un-opt-out).
  if (posthogReady) {
    try { posthog.opt_in_capturing(); } catch { /* ignore */ }
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
