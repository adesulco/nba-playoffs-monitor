/**
 * claimGuestAndJoin — the one claim-on-login routine (doc 17 §2.3): replay
 * the device's guest picks against the account, then join the grup that
 * invited this device. Used by AuthCallback and by ClaimOnSignIn, which
 * catches sign-ins that land anywhere else (a magic link whose `next` is not
 * on the Supabase redirect allowlist falls back to the site root and never
 * passes through /auth/callback). Idempotent: claimed picks leave the queue,
 * the invite is cleared once joined, and concurrent callers share one run.
 */
import { claimGuestPredictions, getGuestInvite, clearGuestInvite } from './guestStore.js';
import { upsertPrediction, joinGrup, leagueDetail } from './api.js';
import { trackEvent } from '../lib/analytics.js';

let running = null;

export function claimGuestAndJoin(source = 'callback') {
  if (running) return running;
  running = (async () => {
    let claim = null;
    let joined = null;
    const invite = getGuestInvite();
    try {
      claim = await claimGuestPredictions(upsertPrediction);
      if (invite) {
        const d = await leagueDetail({ code: invite });
        if (d?.ok && d.league?.id) {
          const j = await joinGrup({ leagueId: d.league.id, inviteCode: invite });
          joined = !!j?.ok;
          if (j?.ok || /already|member/i.test(String(j?.error || ''))) clearGuestInvite();
        } else if (d && !d.ok && /not found/i.test(String(d.error || ''))) {
          clearGuestInvite();
        }
      }
      trackEvent('pickem_claim_on_login', { source, claimed: claim?.claimed ?? 0, skipped: claim?.skipped ?? 0, invite: !!invite, joined });
    } catch { /* best-effort: never block a sign-in */ }
    return { claim, joined, invite };
  })().finally(() => { running = null; });
  return running;
}
