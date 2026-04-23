// OneSignal Web Push v16 — client init + tag subscriptions.
//
// We load the SDK via CDN (OneSignal's standard recommendation for v16)
// and avoid a bundled npm dep. That keeps our main chunk lean and lets
// OneSignal ship SDK updates without us redeploying.
//
// Init strategy:
//   - deferred until first real user intent (scroll / click / route change)
//     so the OneSignal bundle doesn't compete with initial paint. Our
//     Lighthouse perf budget (handbook §10.1, ≥85 mobile) depends on this.
//   - no-op when VITE_ONESIGNAL_APP_ID is absent (local dev, preview
//     without secrets, etc.). Same pattern as observability.js.
//
// Service worker:
//   /public/OneSignalSDKWorker.js is a 1-line importScripts from OneSignal's
//   CDN. No custom sw handlers yet — if we need offline-aware push later
//   we'll wire it through there.
//
// Bahasa tags we use (consumer opt-in by tag):
//   nba_close     — Q4 <2:00, ≤5pt margin NBA games
//   nba_final     — end-of-game highlights after a completed game
//   epl_match     — kickoff alerts for the user's picked club
//   f1_qual       — qualifying + race result alerts
//   tennis_slam   — draw matches for the user's picked player

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const CDN_SCRIPT_ID = 'onesignal-sdk-v16';
const CDN_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

let initPromise = null;

/**
 * Inject the OneSignal SDK script + call OneSignal.init(). Idempotent — the
 * returned promise resolves with the OneSignal global once init completes,
 * so callers like promptPush() can await the same promise without racing.
 *
 * Call once from src/main.jsx AFTER first paint (we use requestIdleCallback
 * there) so we don't block hydration.
 */
export function initPush() {
  if (!APP_ID) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    // Reuse the SDK if another import already loaded it (hot reload etc.).
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        resolve(OneSignal);
      });
      return;
    }
    if (typeof window === 'undefined') { resolve(null); return; }

    // Queue the real init. OneSignal's script picks up OneSignalDeferred
    // and flushes the queue once the global is ready.
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true, // no-op in prod; handy for dev
          notifyButton: { enable: false },   // we ship our own opt-in UI
          // Slide prompt kept off — we prompt on explicit opt-in button click.
          promptOptions: { slidedown: { prompts: [] } },
        });
      } catch {
        /* swallow — init can throw on unsupported browsers (Safari<16.4 etc.) */
      }
      resolve(OneSignal);
    });

    // Inject the CDN script if we haven't already.
    if (!document.getElementById(CDN_SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = CDN_SCRIPT_ID;
      s.src = CDN_URL;
      s.defer = true;
      document.head.appendChild(s);
    }
  });

  return initPromise;
}

/**
 * Prompt the user to allow push notifications. Call from an explicit UI
 * button click (browsers reject programmatic prompts fired during page
 * load). Returns the resulting permission state ('granted' | 'denied' | null).
 */
export async function promptPush() {
  const OneSignal = await initPush();
  if (!OneSignal) return null;
  try {
    // Slide-down prompt: friendlier on first touch than the raw browser
    // dialog. If the user dismisses the slide-down we don't fire the
    // native prompt, preserving our "asked" quota.
    await OneSignal.Slidedown.promptPush({ force: true });
    // Permission state after the prompt resolves.
    return OneSignal.Notifications.permission || null;
  } catch {
    return null;
  }
}

/**
 * Report current push permission state without prompting. Used by the
 * opt-in button to show the right label ("Nyalakan alert" vs "Alert aktif").
 */
export async function getPushState() {
  const OneSignal = await initPush();
  if (!OneSignal) return { supported: false, subscribed: false };
  try {
    // v16 API: `OneSignal.Notifications.permission` returns a boolean
    // indicating whether the user granted permission.
    const granted = OneSignal.Notifications?.permission === true;
    const optedIn = OneSignal.User?.PushSubscription?.optedIn === true;
    return { supported: true, subscribed: granted && optedIn };
  } catch {
    return { supported: false, subscribed: false };
  }
}

/**
 * Tag the current subscriber. Tags drive server-side audience filters on
 * the cron side — e.g. `nba_close = on` for users who opted into
 * close-game alerts.
 */
export async function setPushTag(key, value = 'on') {
  const OneSignal = await initPush();
  if (!OneSignal) return;
  try {
    await OneSignal.User.addTag(key, String(value));
  } catch {}
}

/**
 * Remove a tag. Used when the user toggles off a specific alert stream
 * without unsubscribing from push entirely.
 */
export async function removePushTag(key) {
  const OneSignal = await initPush();
  if (!OneSignal) return;
  try {
    await OneSignal.User.removeTag(key);
  } catch {}
}

/**
 * Link this device's push subscription to a signed-in Gibol user so the
 * cron can target specific users (team-picked push, bracket-opponent
 * push, etc.). Call after Supabase auth resolves.
 */
export async function identifyPushUser(externalId) {
  const OneSignal = await initPush();
  if (!OneSignal || !externalId) return;
  try {
    await OneSignal.login(String(externalId));
  } catch {}
}
