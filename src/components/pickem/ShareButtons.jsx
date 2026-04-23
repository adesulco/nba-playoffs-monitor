import React, { useState } from 'react';
import { COLORS as C } from '../../lib/constants.js';

/**
 * ShareButtons — multi-channel sharing for recap / bracket surfaces.
 *
 *  - WhatsApp: native deep link (wa.me) — dominant channel in ID.
 *  - IG Story / Feed: downloads the 9:16 / 1:1 PNG; user uploads manually.
 *  - X/Twitter: web intent.
 *  - Copy link: navigator.clipboard with prompt() fallback.
 *  - Native Web Share API shown additionally when available.
 *
 * Props:
 *   url       — canonical url to share
 *   title     — short share headline (also used as the WA text lead-in)
 *   storyUrl  — optional 9:16 PNG href (IG Story)
 *   squareUrl — optional 1:1 PNG href (IG Feed)
 */
export default function ShareButtons({ url, title, storyUrl, squareUrl }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers / non-secure contexts
      window.prompt('Salin link ini:', url);
    }
  }

  async function handleNative() {
    if (!navigator.share) return;
    try {
      await navigator.share({ url, title, text: title });
    } catch {
      // User cancelled — no-op
    }
  }

  async function handleDownload(imageUrl, filename) {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, '_blank');
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const tileStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: 14,
    borderRadius: 3,
    border: `1px solid ${C.line}`,
    background: 'var(--bg-3)',
    color: C.text,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'border-color 160ms var(--ease-standard, ease)',
  };

  return (
    <section style={{
      borderRadius: 3,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid var(--amber)`,
      background: 'var(--bg-2)',
      padding: 18,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <h3 style={{
        margin: 0,
        font: "700 14px 'Inter Tight'",
        letterSpacing: '0.02em',
        color: C.text,
      }}>Bagikan recap</h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 10,
      }}>
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          style={tileStyle}
          data-analytics="recap-share-whatsapp"
        >
          <span aria-hidden style={{ fontSize: 24 }}>💬</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>WhatsApp</span>
        </a>
        {storyUrl ? (
          <button
            type="button"
            onClick={() => handleDownload(storyUrl, 'gibol-recap-story.png')}
            style={tileStyle}
            data-analytics="recap-share-ig-story"
          >
            <span aria-hidden style={{ fontSize: 24 }}>📸</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>IG Story</span>
          </button>
        ) : null}
        {squareUrl ? (
          <button
            type="button"
            onClick={() => handleDownload(squareUrl, 'gibol-recap-square.png')}
            style={tileStyle}
            data-analytics="recap-share-ig-feed"
          >
            <span aria-hidden style={{ fontSize: 24 }}>🖼️</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>IG Feed</span>
          </button>
        ) : null}
        <a
          href={tweetHref}
          target="_blank"
          rel="noreferrer"
          style={tileStyle}
          data-analytics="recap-share-twitter"
        >
          <span aria-hidden style={{ fontSize: 24 }}>🐦</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>X / Twitter</span>
        </a>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1, minWidth: 140,
            padding: '10px 16px',
            borderRadius: 3,
            background: 'var(--bg-3)',
            color: C.text,
            border: `1px solid ${C.line}`,
            font: "600 13px 'Inter Tight'",
            cursor: 'pointer',
          }}
        >
          {copied ? 'Link tersalin ✓' : 'Salin link'}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNative}
            style={{
              flex: 1, minWidth: 140,
              padding: '10px 16px',
              borderRadius: 3,
              background: 'var(--amber)',
              color: '#0A1628',
              border: `1px solid var(--amber)`,
              font: "700 13px 'Inter Tight'",
              cursor: 'pointer',
            }}
          >
            Share…
          </button>
        )}
      </div>
    </section>
  );
}
