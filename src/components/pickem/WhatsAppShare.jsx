import React, { useState } from 'react';

/**
 * WhatsAppShare — one-tap "Share WhatsApp" button. Copies the share text to
 * clipboard and opens wa.me so the user lands directly in a chat picker.
 *
 *   <WhatsAppShare text={`Cek bracket gue di Gibol: ${url}`} />
 */
export default function WhatsAppShare({ text }) {
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure — the wa.me link will still work.
    }
    const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(href, '_blank', 'noopener');
  }

  return (
    <button
      type="button"
      onClick={copyAndOpen}
      data-analytics="bracket-share-wa"
      style={{
        padding: '8px 14px',
        borderRadius: 3,
        background: '#22c55e',
        color: '#ffffff',
        border: '1px solid #22c55e',
        font: "700 12px 'Inter Tight'",
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'Tersalin ✓ · WhatsApp' : 'Share WhatsApp'}
    </button>
  );
}
