/**
 * pickemEvents.js — the GA4 event schema for the Pick'em flagship
 * (A6 · 06-gamification-audit.md GAP-6). One function per event so call
 * sites can't typo names/params; everything routes through the
 * consent-gated trackEvent (GA4 + PostHog).
 *
 * Funnel targets (06 §2 GAP-6 table): invite→first pick ≥40% · deadline
 * conversion ≥70% · matchday completion ≥55% · D1/D7 45/30% · K-factor ≥4
 * · cap-hit→paid ≥5%. DB-side counterpart: the pickem_kpi_daily view
 * (migration 0019). Weekly metrics-review reads both.
 */
import { trackEvent } from './analytics.js';

/** Invite landing opened (/g/:code). */
export function evInviteOpen({ competition, hasAccount }) {
  trackEvent('pickem_invite_open', { competition, has_account: !!hasAccount });
}

/** First confirmed pick of this browser/user — the teach-funnel exit. */
export function evFirstPick({ tapsFromLanding, isGuest, competition }) {
  trackEvent('pickem_first_pick', {
    taps_from_landing: tapsFromLanding ?? null,
    is_guest: !!isGuest,
    competition,
  });
}

/** Any pick confirmed (deduping is the caller's concern, e.g. per fixture). */
export function evPick({ competition, format, hasJagoan }) {
  trackEvent('pickem_pick', { competition, format, has_jagoan: !!hasJagoan });
}

/** Lock CTA completed for a matchday. */
export function evLockComplete({ pickedN, totalN, competition }) {
  trackEvent('pickem_lock_complete', { picked_n: pickedN, total_n: totalN, competition });
}

/** Grup created (wizard step 3 reached + share). */
export function evGrupCreate({ template, competition }) {
  trackEvent('pickem_grup_create', { template: template || 'default', competition });
}

/** Grup joined (pending=true when the free cap held the joiner). */
export function evGrupJoin({ pending, competition }) {
  trackEvent('pickem_grup_join', { pending: !!pending, competition });
}

/** WA/share artifact sent (standings card, recap card, invite). */
export function evShareCard({ kind, competition }) {
  trackEvent('pickem_share_card', { kind, competition });
}

/** Upgrade funnel. trigger: 'cap' | 'multi' | 'premium' | 'host'. */
export function evUpgradeView(trigger) { trackEvent('pickem_upgrade_view', { trigger }); }
export function evUpgradeStart(trigger) { trackEvent('pickem_upgrade_start', { trigger }); }
export function evUpgradeSuccess({ trigger, product }) {
  trackEvent('pickem_upgrade_success', { trigger, product });
}

/** Next-competition rollover accepted (the WAP compounding moment). */
export function evRolloverAccept({ from, to }) {
  trackEvent('pickem_rollover_accept', { from_competition: from, to_competition: to });
}
