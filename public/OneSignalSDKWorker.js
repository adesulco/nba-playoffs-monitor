// OneSignal Web Push SDK v16 — service worker bootstrap.
//
// This file MUST be served at https://www.gibol.co/OneSignalSDKWorker.js
// (root scope) so the service worker can intercept push events site-wide.
// Vite copies /public/* to /dist/ at build time; Vercel then serves it.
//
// The actual logic lives in OneSignal's CDN — we just proxy via
// importScripts so updates ship without a redeploy on our side.
//
// Gibol uses the same service worker file for both iOS (PWA manifest)
// and desktop/Android web push. There's no conflict with our own
// sw.js (at /sw.js) because the two run in separate scopes.
//
// Docs: https://documentation.onesignal.com/docs/web-push-setup
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
