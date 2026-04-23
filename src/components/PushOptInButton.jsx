import React, { useEffect, useState } from 'react';
import { COLORS as C } from '../lib/constants.js';
import { promptPush, getPushState, setPushTag } from '../lib/push.js';
import { trackEvent } from '../lib/analytics.js';

/**
 * PushOptInButton — single-purpose CTA for enabling close-game alerts.
 *
 * Lifecycle states:
 *   idle        — haven't checked SDK yet. Renders neutral "nyalakan alert".
 *   unsupported — browser lacks Service Worker or Notifications API
 *                 (Safari<16.4 on iOS, etc.). Render nothing to avoid
 *                 a CTA that can't fulfil.
 *   prompt      — not subscribed yet. CTA enabled.
 *   subscribed  — already subscribed. CTA shows "Alert aktif" disabled.
 *   denied      — user blocked push permission at the browser level.
 *                 CTA shows helper text pointing them to site settings.
 *
 * Props:
 *   - tag (string)   — the tag to set on subscribe, e.g. "nba_close".
 *     Defaults to "nba_close" — our Week-2 launch alert stream.
 *   - label / sublabel — override the CTA copy. Defaults to Bahasa-casual.
 *   - accent (hex) — button bg when CTA is live. Defaults to gibol red.
 *   - compact (bool) — shrinks padding + font for in-card placements
 *     (e.g. game cards on recap page). Off by default.
 *   - lang / onChange — standard AppContext wiring.
 *
 * Analytics: fires `push_opt_in_click` before the prompt, `push_opt_in_result`
 * after the prompt resolves (granted / denied / dismissed). PostHog funnel:
 *   push_opt_in_click → push_opt_in_result{granted} → push_received.
 */
export default function PushOptInButton({
  tag = 'nba_close',
  label,
  sublabel,
  accent = '#E10600',
  compact = false,
  lang = 'id',
}) {
  const [state, setState] = useState('idle'); // idle | unsupported | prompt | subscribed | denied | busy

  // Query the SDK once on mount. The SDK might not be loaded yet (initPush
  // uses requestIdleCallback), so retry shortly if it returns unsupported
  // on first tick.
  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    async function check() {
      const s = await getPushState();
      if (cancelled) return;
      if (!s.supported) {
        // Before giving up, retry up to 3 times across 2s in case the SDK
        // is mid-load. Keeps us from hiding the CTA on first paint.
        if (retries++ < 3) {
          setTimeout(check, 700);
          return;
        }
        setState('unsupported');
        return;
      }
      setState(s.subscribed ? 'subscribed' : 'prompt');
    }
    check();
    return () => { cancelled = true; };
  }, []);

  async function handleClick() {
    if (state !== 'prompt') return;
    setState('busy');
    trackEvent('push_opt_in_click', { tag });
    const perm = await promptPush();
    if (perm === 'granted' || perm === true) {
      await setPushTag(tag, 'on');
      trackEvent('push_opt_in_result', { tag, result: 'granted' });
      setState('subscribed');
    } else if (perm === 'denied' || perm === false) {
      trackEvent('push_opt_in_result', { tag, result: 'denied' });
      setState('denied');
    } else {
      trackEvent('push_opt_in_result', { tag, result: 'dismissed' });
      setState('prompt');
    }
  }

  if (state === 'unsupported') return null;

  const defaultLabels = {
    prompt: lang === 'id' ? 'Nyalakan alert close-game NBA' : 'Enable NBA close-game alerts',
    busy: lang === 'id' ? 'Menunggu izin…' : 'Waiting for permission…',
    subscribed: lang === 'id' ? '● Alert NBA aktif' : '● NBA alerts on',
    denied: lang === 'id' ? 'Izin push di-block browser' : 'Push permission blocked',
  };
  const defaultSubs = {
    prompt: lang === 'id' ? 'Kuarter 4 · margin ≤5 · <2 menit' : 'Q4 · margin ≤5 · <2 min',
    busy: lang === 'id' ? 'Cek pop-up browser' : 'Check the browser pop-up',
    subscribed: lang === 'id' ? 'Nanti kami kasih tahu' : 'We\u2019ll keep you posted',
    denied: lang === 'id' ? 'Buka settings situs, allow notifications' : 'Open site settings, allow notifications',
  };

  const effectiveLabel = label || defaultLabels[state] || defaultLabels.prompt;
  const effectiveSub = sublabel ?? defaultSubs[state] ?? '';

  const bg = state === 'subscribed' ? C.green : state === 'denied' ? C.panel2 : accent;
  const fg = state === 'denied' ? C.dim : '#fff';
  const cursor = state === 'prompt' ? 'pointer' : 'default';
  const disabled = state !== 'prompt';

  const padding = compact ? '6px 10px' : '10px 14px';
  const fontSize = compact ? 10.5 : 12;
  const subFontSize = compact ? 9 : 10.5;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={effectiveLabel}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        padding,
        background: bg,
        color: fg,
        border: 'none',
        borderRadius: 4,
        fontFamily: 'inherit',
        fontSize,
        fontWeight: 700,
        letterSpacing: 0.3,
        cursor,
        opacity: state === 'busy' ? 0.7 : 1,
        transition: 'opacity 0.15s, background 0.15s',
      }}
    >
      <span>{effectiveLabel}</span>
      {effectiveSub && (
        <span style={{
          fontSize: subFontSize,
          fontWeight: 500,
          opacity: 0.85,
          letterSpacing: 0.2,
        }}>
          {effectiveSub}
        </span>
      )}
    </button>
  );
}
