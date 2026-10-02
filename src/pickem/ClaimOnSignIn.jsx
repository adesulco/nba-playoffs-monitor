/**
 * Mounted once at the app root. Does nothing (and loads nothing) unless this
 * device holds guest picks or a guest invite; then it waits for a session and
 * runs the shared claim routine. Covers sign-ins that never reach
 * /auth/callback.
 */
import { useEffect } from 'react';

const QUEUE_KEY = 'gibol:pickem:guest-predictions';
const INVITE_KEY = 'gibol:pickem:guest-invite';

function hasGuestWork() {
  try {
    const q = localStorage.getItem(QUEUE_KEY);
    return !!localStorage.getItem(INVITE_KEY) || (!!q && q !== '{}');
  } catch {
    return false;
  }
}

export default function ClaimOnSignIn() {
  useEffect(() => {
    if (typeof window === 'undefined' || !hasGuestWork()) return undefined;
    let cancelled = false;
    let unsubscribe = null;
    (async () => {
      const [{ onSession }, { claimGuestAndJoin }] = await Promise.all([import('./api.js'), import('./claim.js')]);
      if (cancelled) return;
      unsubscribe = onSession(() => {
        if (hasGuestWork()) claimGuestAndJoin('root');
      });
    })();
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);
  return null;
}
