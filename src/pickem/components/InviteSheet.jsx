import React, { useCallback, useState } from 'react';
import { WhatsAppIcon } from '../icons.jsx';
import { PickemBtn } from './social.jsx';

// ============================================================================
// v0.68.0 — <InviteSheet /> (Pick'em P3).
//
// Bottom-sheet modal for grup sharing. Drives the §8.3 viral loop:
//   - WhatsApp deep-link (wa.me/?text=…) as the primary CTA (the
//     dominant channel in Indonesia)
//   - Web Share API fallback for native iOS/Android share sheets
//   - Copy-link with brief confirmation
//   - The 6-character invite code visible + tap-to-copy
//
// Props:
//   open        boolean
//   onClose     () => void
//   grup        { id, name, invite_code, color? }
//   shareUrl    canonical join URL (e.g. https://www.gibol.co/pickem/grup/:id/join?code=ABCD)
//
// Falls back gracefully when the browser doesn't support Web Share API
// or Clipboard API (older Android browsers): the WhatsApp deep-link
// always works, and the invite code is visible so users can hand-type it.
// ============================================================================

export default function InviteSheet({ open, onClose, grup, shareUrl }) {
  const [copied, setCopied] = useState(null); // 'link' | 'code' | null

  const inviteCode = grup?.invite_code || '';
  const grupName = grup?.name || 'Pick\'em grup';

  const message = useCallback(
    (longForm) =>
      longForm
        ? `Ikutan prediksi Piala Dunia 2026 di grup "${grupName}" — gratis, Bahasa-first di gibol.co.\n\nKode undangan: ${inviteCode}\n${shareUrl}`
        : `Gabung grup "${grupName}" di Gibol Pick’em: ${shareUrl}`,
    [grupName, inviteCode, shareUrl],
  );

  const onWhatsApp = () => {
    const txt = encodeURIComponent(message(true));
    window.open(`https://wa.me/?text=${txt}`, '_blank', 'noopener,noreferrer');
  };

  const onNativeShare = async () => {
    if (!navigator?.share) {
      onCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: `Gabung grup "${grupName}"`,
        text: message(true),
        url: shareUrl,
      });
    } catch (err) {
      if (err?.name !== 'AbortError') onCopyLink();
    }
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied('link-failed');
      setTimeout(() => setCopied(null), 2200);
    }
  };

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied('code');
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied('code-failed');
      setTimeout(() => setCopied(null), 2200);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bagikan grup"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 16, 29, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-4)',
          padding: 20,
          fontFamily: 'var(--font-ui-pickem)',
          color: 'var(--ink-1)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="p-eyebrow" style={{ marginBottom: 6, color: 'var(--pickem-orange)' }}>
          AJAK TEMAN
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Bagikan &ldquo;{grupName}&rdquo;
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
          Kirim link ke grup WhatsApp atau salin kode — teman tinggal masuk dan langsung gabung.
        </p>

        <button
          type="button"
          onClick={onCopyCode}
          aria-label="Salin kode undangan"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 14px',
            marginBottom: 16,
            background: 'var(--bg-deep)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-2)',
            cursor: 'pointer',
            color: 'var(--ink-1)',
          }}
        >
          <div>
            <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>
              KODE UNDANGAN
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '0.20em',
              }}
            >
              {inviteCode}
            </div>
          </div>
          <span style={{ fontSize: 12, color: copied === 'code' ? 'var(--p-up)' : 'var(--ink-3)' }}>
            {copied === 'code' ? '✓ Tersalin' : copied === 'code-failed' ? 'Gagal' : 'Tap untuk salin'}
          </span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PickemBtn
            variant="primary"
            full
            onClick={onWhatsApp}
            icon={<WhatsAppIcon size={16} />}
          >
            Bagikan via WhatsApp
          </PickemBtn>
          {typeof navigator !== 'undefined' && navigator.share && (
            <PickemBtn variant="secondary" full onClick={onNativeShare}>
              Bagikan lainnya
            </PickemBtn>
          )}
          <PickemBtn variant="ghost" full onClick={onCopyLink}>
            {copied === 'link' ? '✓ Link tersalin'
              : copied === 'link-failed' ? 'Gagal menyalin'
              : 'Salin link undangan'}
          </PickemBtn>
        </div>
      </div>
    </div>
  );
}
