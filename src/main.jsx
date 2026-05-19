import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW, installInstallPromptCapture } from './lib/pwa.js';
import { initObservability } from './lib/observability.js';

// Initialise Sentry + PostHog before React mounts so error boundaries and
// autocapture can hook into the very first render cycle. No-op when the
// VITE_SENTRY_DSN / VITE_POSTHOG_KEY env vars are absent (local dev + PR
// previews without secrets).
initObservability();

// Capture the install-prompt event before React mounts so we don't miss it.
installInstallPromptCapture();

// v0.61.3 — proactive OneSignal init removed (audit F-015 Option B).
// Previously: `idle(() => { initPush(); })` here loaded the ~30 KB
// OneSignal CDN bundle on every page, created localStorage keys
// (`os_pageViews`, `onesignal-notification-prompt`), and POSTed a
// device-sync to api.onesignal.com — all BEFORE the user gave any
// consent or clicked the opt-in button. UU PDP 27/2022 Art. 21 and the
// audit's CMP requirement (F-001) both fail this pattern.
// Now: SDK only loads when the user explicitly clicks PushOptInButton.
// That component already calls initPush() lazily via promptPush() on
// click — so push capability is preserved end-to-end with zero cold-load
// data-controller footprint. The Sentry + GA4 + PostHog + Vercel
// Analytics SDKs that initObservability() and index.html load remain
// pre-consent and will be gated by the v0.62.0 CMP ship.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker after first paint so it doesn't compete with
// hydration bandwidth. Only runs in production (pwa.js guards dev mode).
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW, { once: true });
}
