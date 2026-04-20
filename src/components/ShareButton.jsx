import React, { useState, useEffect, useRef } from 'react';
import { COLORS as C } from '../lib/constants.js';
import { trackEvent } from '../lib/analytics.js';

/**
 * ShareButton — v0.2.5. Reusable share trigger for any gibol page.
 *
 * Behavior:
 *   - On mobile with navigator.share support → native share sheet.
 *   - Otherwise → popover with WhatsApp / X (Twitter) / Copy link.
 *
 * Props:
 *   - url (string) — absolute or relative; resolved to absolute at runtime
 *   - title (string) — used in share text
 *   - text (string) — body text preceding the URL (optional)
 *   - accent (string) — button color (defaults to amber)
 *   - analyticsEvent (string) — event name to track (defaults to 'share_click')
 */
export default function ShareButton({
  url,
  title,
  text,
  accent,
  analyticsEvent = 'share_click',
  size = 'md',
  label,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Resolve absolute URL at click time — avoids bugs with window during SSR.
  function absoluteUrl() {
    if (!url) return typeof window !== 'undefined' ? window.location.href : '';
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window !== 'undefined') return `${window.location.origin}${url}`;
    return url;
  }

  async function handleClick() {
    const shareUrl = absoluteUrl();
    // Native share if available — preferred on mobile.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || 'gibol.co',
          text: text || title || '',
          url: shareUrl,
        });
        trackEvent(analyticsEvent, { channel: 'native', url: shareUrl });
        return;
      } catch (e) {
        // User cancelled — fall through to popover.
        if (e?.name === 'AbortError') return;
      }
    }
    setOpen((v) => !v);
  }

  const accentColor = accent || '#E10600';
  const shareUrl = absoluteUrl();
  const shareText = [text || title, shareUrl].filter(Boolean).join(' — ');
  const encoded = encodeURIComponent(shareText);

  const waHref = `https://wa.me/?text=${encoded}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encoded}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackEvent(analyticsEvent, { channel: 'copy', url: shareUrl });
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // Fallback: prompt
      window.prompt('Salin link:', shareUrl);
    }
  }

  const padding = size === 'sm' ? '6px 10px' : '8px 14px';
  const fontSize = size === 'sm' ? 10 : 11;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding,
          background: accentColor,
          color: '#fff',
          border: 'none',
          borderRadius: 3,
          fontSize, fontWeight: 700, letterSpacing: 0.3,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: fontSize + 1 }}>⤴</span>
        <span>{label || 'SHARE'}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: 220,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => { trackEvent(analyticsEvent, { channel: 'whatsapp', url: shareUrl }); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', fontSize: 11.5, color: C.text,
              textDecoration: 'none',
              borderBottom: `1px solid ${C.lineSoft}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{
              width: 22, height: 22, background: '#25D366', borderRadius: 3,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff', fontWeight: 700,
            }}>W</span>
            <span>WhatsApp</span>
          </a>
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => { trackEvent(analyticsEvent, { channel: 'twitter', url: shareUrl }); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', fontSize: 11.5, color: C.text,
              textDecoration: 'none',
              borderBottom: `1px solid ${C.lineSoft}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{
              width: 22, height: 22, background: '#000', borderRadius: 3,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff', fontWeight: 700,
            }}>X</span>
            <span>X (Twitter)</span>
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', fontSize: 11.5, color: copied ? '#4ade80' : C.text,
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{
              width: 22, height: 22, background: C.panel2, borderRadius: 3,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: C.dim, fontWeight: 700,
              border: `1px solid ${C.lineSoft}`,
            }}>↗</span>
            <span>{copied ? 'Tersalin!' : 'Copy link'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
