import React, { useState } from 'react';
import { trackEvent } from '../lib/analytics.js';

/**
 * CopyLinkButton — v0.11.23 GIB-024.
 *
 * One-tap "Copy link" affordance for sport hubs and recap pages.
 * Sits next to the share button so a power user can grab a URL without
 * opening the share popover and burying the action two clicks deep.
 *
 * Behavior:
 *   - Copies the current URL (preserving query params like ?club=arsenal)
 *     when no `url` prop is passed.
 *   - Shows a 1.6s inline "Tersalin!" / "Copied!" confirmation.
 *   - Falls back to a window.prompt when navigator.clipboard is unavailable
 *     (Safari without HTTPS, ancient browsers).
 *   - Tracks `copy_link_click` with channel + path so we can read share
 *     intent in PostHog by sport.
 *
 * Props:
 *   - url? (string) — absolute or path-relative URL. Defaults to
 *                     window.location.href so query params are preserved.
 *   - lang? (string) — 'id' (default) or 'en'.
 *   - accent? (string) — border + text color. Defaults to a neutral
 *                        chip-like style.
 *   - size? ('sm' | 'md') — defaults to 'md'.
 *   - source? (string) — analytics tag, e.g. 'epl-hub', 'f1-hub',
 *                        'tennis-hub', 'recap'. Surfaces in PostHog.
 */
export default function CopyLinkButton({
  url,
  lang = 'id',
  accent,
  size = 'md',
  source = 'page',
  label,
}) {
  const [copied, setCopied] = useState(false);

  function resolveUrl() {
    if (!url) return typeof window !== 'undefined' ? window.location.href : '';
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window !== 'undefined') return `${window.location.origin}${url}`;
    return url;
  }

  async function handleClick() {
    const target = resolveUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(target);
      } else {
        // Fallback — old Safari + non-HTTPS contexts.
        const ta = document.createElement('textarea');
        ta.value = target;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) { /* ignore */ }
        document.body.removeChild(ta);
      }
      setCopied(true);
      trackEvent('copy_link_click', { source, url: target, channel: 'inline' });
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      // Last-resort fallback so the user can copy manually.
      try { window.prompt(lang === 'id' ? 'Salin link:' : 'Copy link:', target); } catch (_) { /* ignore */ }
    }
  }

  const padding = size === 'sm' ? '6px 10px' : '8px 12px';
  const fontSize = size === 'sm' ? 10 : 11;
  const idleLabel = label || (lang === 'id' ? 'Salin link' : 'Copy link');
  const doneLabel = lang === 'id' ? 'Tersalin!' : 'Copied!';

  // v0.11.26 NEW-2 — explicit aria-label so screen readers announce the
  // action ("Salin link halaman ini") rather than the icon glyph
  // ("north east arrow Copy link button"). The visual icon is now
  // aria-hidden. We also wrap the live-status announcement in a separate
  // aria-live=polite region so "Tersalin!" is read out by AT when copy
  // completes — without it, the success state changed silently.
  const ariaLabel = lang === 'id' ? 'Salin link halaman ini' : 'Copy this page link';
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding,
          background: 'transparent',
          color: copied ? '#4ade80' : (accent || 'var(--ink)'),
          border: `1px solid ${copied ? '#4ade80' : (accent || 'var(--line)')}`,
          borderRadius: 4,
          fontSize,
          fontWeight: 700,
          letterSpacing: 0.3,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: fontSize + 1 }}>
          {copied ? '✓' : '↗'}
        </span>
        <span aria-hidden="true">{copied ? doneLabel : idleLabel}</span>
      </button>
      {/* Visually-hidden live region — fires only after copy completes
          so AT announces "Tersalin!" / "Copied!" without the user
          tabbing back to the button. */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        {copied ? doneLabel : ''}
      </span>
    </>
  );
}
