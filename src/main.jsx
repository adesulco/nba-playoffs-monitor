import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW, installInstallPromptCapture } from './lib/pwa.js';
import { initObservability } from './lib/observability.js';
import { initPush } from './lib/push.js';

// Initialise Sentry + PostHog before React mounts so error boundaries and
// autocapture can hook into the very first render cycle. No-op when the
// VITE_SENTRY_DSN / VITE_POSTHOG_KEY env vars are absent (local dev + PR
// previews without secrets).
initObservability();

// Capture the install-prompt event before React mounts so we don't miss it.
installInstallPromptCapture();

// OneSignal Web Push — defer until idle so the ~30KB SDK doesn't compete
// with hydration or LCP. Same rationale as registerSW below.
if (typeof window !== 'undefined') {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
  idle(() => { initPush(); });
}

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
