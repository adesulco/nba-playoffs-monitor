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
  // v0.9.0 — optional dynamic IG Story PNG. When provided, the popover
  // shows an extra "Save to IG Story" item that downloads the 1080×1920
  // image directly. Expected shape:
  //   igStory = { pngUrl: '/api/recap/12345?v=story&...', filename?: string }
  // filename defaults to `gibol-{gameId}.png` derived from the URL when
  // omitted. Mobile native-share is preferred automatically on iOS/Android
  // because Stories upload works best from the camera roll.
  igStory,
  // v0.9.1 — 'down' (default) opens the popover below the trigger; 'up'
  // opens it above. Use 'up' when the trigger sits near the bottom of a
  // scrollable container so the menu doesn't clip off the viewport.
  // Recap.jsx game cards use 'up' for this reason.
  dropDirection = 'down',
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
  // Threads intent — documented at https://developers.facebook.com/docs/threads/.
  // The `url=` param gets auto-embedded as a link card, so we pass the URL
  // separately from the text to avoid doubling it in the preview.
  const threadsHref = `https://www.threads.net/intent/post?text=${encodeURIComponent(text || title || '')}&url=${encodeURIComponent(shareUrl)}`;

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

  // Download the IG Story PNG. On mobile (with Web Share Level 2), we try
  // to share the file directly so the user can pick IG and tap through.
  // Desktop falls back to a regular download — user saves, AirDrops to
  // phone, posts from there. Either way the event tracks.
  async function saveIGStory() {
    if (!igStory?.pngUrl) return;
    const absolutePng = /^https?:\/\//i.test(igStory.pngUrl)
      ? igStory.pngUrl
      : `${window.location.origin}${igStory.pngUrl}`;
    const filename = igStory.filename || (() => {
      // Derive from /api/recap/{gameId}?... shape.
      try {
        const u = new URL(absolutePng, window.location.href);
        const gameId = u.pathname.split('/').pop() || 'recap';
        return `gibol-${gameId.replace(/\.png$/i, '')}.png`;
      } catch {
        return 'gibol-recap.png';
      }
    })();

    setOpen(false);
    trackEvent(analyticsEvent, { channel: 'ig_story', url: shareUrl });

    try {
      // Try Web Share Level 2 with file — the only path that gets the
      // PNG straight into IG's sharesheet on iOS/Android.
      const r = await fetch(absolutePng);
      if (r.ok && typeof navigator !== 'undefined' && navigator.canShare) {
        const blob = await r.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: title || 'gibol.co' });
            return;
          } catch (e) {
            if (e?.name === 'AbortError') return;
            // fall through to download
          }
        }
        // Fallback: blob → anchor click, forces "Save As" / Camera Roll
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
        return;
      }
    } catch (e) {
      // Network fail — just open in a new tab so they can right-click save.
    }
    window.open(absolutePng, '_blank', 'noopener,noreferrer');
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
        <span aria-hidden="true" style={{ fontSize: fontSize + 1 }}>⤴</span>
        <span>{label || 'SHARE'}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            ...(dropDirection === 'up'
              ? { bottom: 'calc(100% + 4px)' }
              : { top: 'calc(100% + 4px)' }),
            right: 0,
            width: 240,
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
          <a
            href={threadsHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => { trackEvent(analyticsEvent, { channel: 'threads', url: shareUrl }); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', fontSize: 11.5, color: C.text,
              textDecoration: 'none',
              borderBottom: `1px solid ${C.lineSoft}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Threads "@" glyph — matches Meta's own icon shorthand. The
                wordmark-style mark keeps the popover compact without a
                dedicated SVG. */}
            <span style={{
              width: 22, height: 22, background: '#000', borderRadius: 3,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#fff', fontWeight: 700,
              fontFamily: 'Georgia, serif',
            }}>@</span>
            <span>Threads</span>
          </a>

          {/* IG Story — shown only when the caller passed igStory.pngUrl.
              Pulls the 1080×1920 PNG from /api/recap/[gameId]?v=story and
              either hands it to the OS share sheet (mobile) or triggers a
              download (desktop). */}
          {igStory?.pngUrl && (
            <button
              type="button"
              role="menuitem"
              onClick={saveIGStory}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', fontSize: 11.5, color: C.text,
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
                borderBottom: `1px solid ${C.lineSoft}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Instagram-style gradient badge — brand-recognisable without
                  pulling the actual IG logo (safer on trademark). */}
              <span style={{
                width: 22, height: 22, borderRadius: 5,
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff', fontWeight: 800,
              }}>IG</span>
              <span style={{ flex: 1 }}>Save to IG Story</span>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>PNG</span>
            </button>
          )}
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
