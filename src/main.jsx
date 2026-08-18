import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// v0.65.0 — Pick'em P0 scaffold token sheet (scoped under .pickem-root,
// inert until <PickemRoot /> mounts behind flags.pickem).
import './pickem/pickem.css';
// R1-2 — Sistem 4a tokens. MUST load after index.css and pickem.css: it
// re-points the legacy token names at 4a values (aliased migration), so
// an unported surface stays coherent instead of half-old/half-new.
import './styles/tokens-4a.css';
// Desktop/tablet layout for the 4a surfaces (mobile stays the inline default).
import './styles/desktop-4a.css';
import { registerSW, installInstallPromptCapture } from './lib/pwa.js';
import { initObservability } from './lib/observability.js';
import { startThemeEngine } from './lib/theme4a.js';

// Initialise Sentry + PostHog before React mounts so error boundaries and
// autocapture can hook into the very first render cycle. No-op when the
// VITE_SENTRY_DSN / VITE_POSTHOG_KEY env vars are absent (local dev + PR
// previews without secrets).
initObservability();

// Capture the install-prompt event before React mounts so we don't miss it.
installInstallPromptCapture();

// R1-7 — stamp data-theme4a on <html> before first paint so Edisi Malam
// never flashes light first, then keep it in step with the WIB window.
startThemeEngine();

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
