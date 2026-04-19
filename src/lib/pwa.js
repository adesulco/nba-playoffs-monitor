/**
 * PWA helpers — service worker registration + install prompt handling.
 *
 * Designed to drop into a Vite + React app. Zero dependencies.
 * Calls into the SW at /sw.js which was written to match this registration.
 */

let deferredPrompt = null;
const INSTALL_LISTENERS = new Set();

/** Register the service worker. Safe to call multiple times. */
export function registerSW() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Avoid cache surprises in dev
  if (import.meta.env.DEV && import.meta.env.VITE_SW_ENABLE !== '1') return;

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      // Periodically check for updates while the tab is open
      setInterval(() => reg.update().catch(() => {}), 15 * 60 * 1000);
    })
    .catch((err) => {
      console.warn('[pwa] SW registration failed', err);
    });
}

/** Listen for the beforeinstallprompt event so we can trigger the prompt later. */
export function installInstallPromptCapture() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    INSTALL_LISTENERS.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    INSTALL_LISTENERS.forEach((fn) => fn(false));
  });
}

/** React-friendly subscription for install availability. */
export function onInstallAvailable(fn) {
  INSTALL_LISTENERS.add(fn);
  return () => INSTALL_LISTENERS.delete(fn);
}

/** Trigger the native install prompt (Android/desktop Chrome only). */
export async function promptInstall() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  INSTALL_LISTENERS.forEach((fn) => fn(false));
  return choice;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
}
