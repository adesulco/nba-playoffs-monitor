// Cookie / tracker consent state — minimal in-house CMP.
//
// v0.62.0 ship — closes audit F-001 (no consent gate) + F-007 (Sentry
// init pre-consent). The audit explicitly requires:
//   • Default state for non-essential categories: DENIED
//   • Explicit opt-in via banner (per UU PDP 27/2022 Art. 21:
//     "informed, specific, unambiguous consent")
//   • Persistent choice with the ability to re-open settings
//   • Three-way categorization: strictly necessary / analytics / marketing
//
// State shape stored at localStorage[KEY]:
//   { analytics: boolean, marketing: boolean, _v: 1, _t: ISO8601 timestamp }
//
// `_v` bumps when the policy text materially changes — the banner re-shows
// (read() returns null on schema mismatch). Use sparingly so we don't ask
// users twice.
//
// Strictly-necessary is implicit (always on): the language toggle,
// theme toggle, watchlist, brand variant, derby voter hash, and the
// consent record itself. These are first-party preferences that the
// site doesn't function without; the audit + UU PDP both treat
// strictly-necessary as not requiring opt-in.
//
// Pattern intentionally lightweight — no external CMP dep, no TCF
// integration (Indonesia isn't in the IAB TCF jurisdiction set). The
// subscriber pattern lets observability.js + analytics.js + the
// SpeedInsights/Analytics gates in App.jsx react when the user changes
// preferences without page reload.

const KEY = 'gibol:consent';
const CURRENT_V = 1;

// Default = everything OFF except strictly necessary. Audit-required.
const DEFAULTS = Object.freeze({ analytics: false, marketing: false });

const listeners = new Set();

function read() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Schema-version mismatch → treat as no choice (re-shows banner).
    if (!parsed || parsed._v !== CURRENT_V) return null;
    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      _v: CURRENT_V,
      _t: parsed._t || null,
    };
  } catch {
    return null;
  }
}

/**
 * Current consent state. Always returns a populated object — falls back
 * to DEFAULTS (everything off) when the user has not yet made a choice.
 * Callers that need to distinguish "user said no" from "user hasn't been
 * asked" should also call hasMadeChoice().
 */
export function getConsent() {
  return read() || { ...DEFAULTS, _v: CURRENT_V, _t: null };
}

/**
 * True if the user has actively made a consent choice (any choice).
 * Drives the banner's first-paint visibility.
 */
export function hasMadeChoice() {
  return read() !== null;
}

/**
 * Persist a consent choice. Partial updates allowed — { analytics: true }
 * leaves marketing unchanged. Always stamps current schema version + ISO
 * timestamp. Fires every subscriber synchronously.
 */
export function setConsent(partial) {
  const current = getConsent();
  const next = {
    analytics: partial?.analytics ?? current.analytics,
    marketing: partial?.marketing ?? current.marketing,
    _v: CURRENT_V,
    _t: new Date().toISOString(),
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(next));
    }
  } catch {}
  // Bridge analytics consent into GA4's consent mode v2. index.html sets
  // defaults to 'denied'; on opt-in we flip analytics_storage to 'granted'
  // so GA4 stops queuing hits and starts sending them. ad_* stays denied
  // (we don't run ads). On opt-out we go back to 'denied' so any future
  // SPA pageviews don't leak.
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('consent', 'update', {
        analytics_storage: next.analytics ? 'granted' : 'denied',
      });
    } catch { /* never block setConsent on a gtag failure */ }
  }
  listeners.forEach((fn) => { try { fn(next); } catch {} });
  return next;
}

/**
 * Convenience: opt-in to everything. Used by the banner's "Setujui semua".
 */
export function acceptAll() {
  return setConsent({ analytics: true, marketing: true });
}

/**
 * Convenience: opt-out of everything (still records a choice so the
 * banner stops showing). Used by the banner's "Tolak".
 */
export function rejectAll() {
  return setConsent({ analytics: false, marketing: false });
}

/**
 * Wipe the recorded choice (banner returns on next load). Used by
 * "Pengaturan cookie" footer link → "Reset" or in dev tooling.
 */
export function clearConsent() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEY);
    }
  } catch {}
  listeners.forEach((fn) => { try { fn(getConsent()); } catch {} });
}

/**
 * Subscribe to consent changes. Returns an unsubscribe function.
 * Fires immediately on setConsent / acceptAll / rejectAll / clearConsent
 * and also when another tab changes the value (via the storage event).
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Cross-tab sync — when another tab persists a change, propagate to
// listeners in this tab. The storage event only fires for OTHER tabs,
// not the one that called localStorage.setItem.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    const state = getConsent();
    listeners.forEach((fn) => { try { fn(state); } catch {} });
  });
}
