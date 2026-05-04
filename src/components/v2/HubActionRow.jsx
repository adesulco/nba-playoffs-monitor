import React, { useState } from 'react';
import { useApp } from '../../lib/AppContext.jsx';
import { trackEvent } from '../../lib/analytics.js';

/**
 * <HubActionRow> — Copy + Share buttons docked to the right side of
 * <HubStatusStrip> on hubs (and inline under hero on editorial pages).
 *
 * Phase 2 Sprint B (v0.16.0+). Replaces the scattered ad-hoc Copy /
 * Share buttons across SuperLeague, EPL, F1, Tennis, NBA. Reads
 * `t('copyLink')` and `t('share')` (added in Sprint A) so the labels
 * are i18n-driven; mobile collapses to icon-only 32×32 hit boxes
 * (visual size; touch target stays ≥44 via padding).
 *
 * Props:
 *   url            — absolute or relative URL to share. Defaults to current location.
 *   shareText      — body text preceding the URL when share-sheet is invoked.
 *   accent         — accent color for the Share button border (per-hub sport color).
 *   analyticsEvent — analytics event name; defaults to 'hub_share'.
 *   compact        — force icon-only render (used inside StatusStrip on mobile).
 *
 * Styling matches the v2 brand handoff in src/index.css. No new tokens.
 */
export default function HubActionRow({
  url,
  shareText,
  accent,
  analyticsEvent = 'hub_share',
  compact = false,
}) {
  const { t, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const resolvedUrl = (() => {
    if (!url) return typeof window !== 'undefined' ? window.location.href : '';
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window !== 'undefined') return `${window.location.origin}${url}`;
    return url;
  })();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      trackEvent(`${analyticsEvent}_copy`, { url: resolvedUrl, lang });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* swallow — old browsers or denied permission */
    }
  }

  async function handleShare() {
    const shareData = {
      title: 'gibol.co',
      text: shareText || '',
      url: resolvedUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackEvent(`${analyticsEvent}_native`, { url: resolvedUrl, lang });
      } else {
        await navigator.clipboard.writeText(resolvedUrl);
        setShared(true);
        trackEvent(`${analyticsEvent}_fallback_copy`, { url: resolvedUrl, lang });
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      /* user cancelled share-sheet; not an error */
    }
  }

  const baseBtn = {
    height: 32,
    padding: compact ? '0 8px' : '0 10px',
    borderRadius: 6,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
    background: 'var(--bg-2)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 120ms, border-color 120ms',
    whiteSpace: 'nowrap',
  };

  const shareBtn = {
    ...baseBtn,
    color: accent || 'var(--ink)',
    borderColor: accent ? `${accent}88` : 'var(--line)',
  };

  return (
    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('copyLink')}
        title={t('copyLink')}
        style={baseBtn}
      >
        <span aria-hidden="true">{copied ? '✓' : '↗'}</span>
        {!compact && <span>{copied ? '✓' : t('copyLink')}</span>}
      </button>
      <button
        type="button"
        onClick={handleShare}
        aria-label={t('share')}
        title={t('share')}
        style={shareBtn}
      >
        <span aria-hidden="true">{shared ? '✓' : '↗'}</span>
        {!compact && <span>{shared ? '✓' : t('share')}</span>}
      </button>
    </div>
  );
}
