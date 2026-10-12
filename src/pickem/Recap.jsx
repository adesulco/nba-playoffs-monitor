import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { RecapCard, RECAP_VARIANTS } from './components/recapCards.jsx';
import { PickemBtn, SegmentedPicker } from './components/social.jsx';
import { WhatsAppIcon } from './icons.jsx';

// ============================================================================
// v0.71.0 — Recap card surface (Pick'em P6).
//
// /pickem/recap[?variant=big-win|upset|grup-up]
//
// The "WhatsApp screenshot moment" — user lands here from a "Bagikan
// hasil" CTA (PredictingHub, GrupDetail, Profile), sees their card
// framed at 4:5 aspect ratio, swaps variants via the segmented picker,
// and either:
//   - Taps "Bagikan ke WhatsApp" → wa.me/?text=… deep-link
//   - Taps "Bagikan lainnya" → native Web Share API (iOS/Android)
//   - Taps "Salin link" → copy current URL
//   - Screenshots the card directly
//
// V1 ships the cards as HTML — users screenshot. A P6.5 follow-on adds
// server-side PNG generation via the existing static-PNG/OG pipeline
// (per handover decision #6: no runtime @vercel/og).
// ============================================================================

export default function Recap() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('variant') || 'big-win';
  const [variant, setVariantState] = useState(initial);
  const [copied, setCopied] = useState(null); // 'link' | 'link-failed' | null

  const setVariant = useCallback(
    (next) => {
      setVariantState(next);
      const np = new URLSearchParams(params);
      np.set('variant', next);
      setParams(np, { replace: true });
    },
    [params, setParams],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://www.gibol.co/pickem/recap';
    const u = new URL(window.location.href);
    u.searchParams.set('variant', variant);
    return u.toString();
  }, [variant]);

  // v0.74.0 P6.5 — direct PNG URL via /api/og-recap. WhatsApp + IG +
  // every social platform fetches this PNG as the link-preview image,
  // so pasting `shareImageUrl` into a chat renders the Kartu Bola card
  // inline. Same data driving the in-app card drives the PNG.
  const shareImageUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    return `${base}/api/og-recap?type=pickem-${variant === 'big-win' ? 'bigwin' : variant === 'grup-up' ? 'grupup' : 'upset'}`;
  }, [variant]);

  const shareMessage = useMemo(() => {
    const meta = RECAP_VARIANTS.find((v) => v.k === variant);
    const label = meta?.l || 'Recap';
    // Use the PNG URL directly — WhatsApp + most social previews it as
    // the image, which IS the share card.
    return `${label} Pick'em WC 2026 — lihat catatan pekanku di Gibol.\n${shareImageUrl}`;
  }, [variant, shareImageUrl]);

  const onWhatsApp = () => {
    const txt = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${txt}`, '_blank', 'noopener,noreferrer');
  };

  const onNativeShare = async () => {
    if (!navigator?.share) {
      onCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: 'Gibol Pick’em recap',
        text: shareMessage,
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

  return (
    <PickemRoot active="predict">
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          padding: '20px 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        <Header />

        {/* 4:5 frame around the card */}
        <div
          style={{
            margin: '0 auto',
            width: '100%',
            maxWidth: 320,
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '4 / 5',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
              }}
            >
              <RecapCard variant={variant} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SegmentedPicker
            items={RECAP_VARIANTS.map((v) => ({ k: v.k, l: v.l }))}
            active={variant}
            onChange={setVariant}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PickemBtn
            variant="primary"
            size="lg"
            full
            onClick={onWhatsApp}
            icon={<WhatsAppIcon size={18} />}
          >
            Bagikan ke WhatsApp
          </PickemBtn>
          {typeof navigator !== 'undefined' && navigator.share && (
            <PickemBtn variant="secondary" full onClick={onNativeShare}>
              Bagikan lainnya
            </PickemBtn>
          )}
          <PickemBtn variant="ghost" full onClick={onCopyLink}>
            {copied === 'link'
              ? '✓ Link tersalin'
              : copied === 'link-failed'
              ? 'Gagal menyalin'
              : 'Salin link recap'}
          </PickemBtn>
        </div>

        <p
          style={{
            color: 'var(--ink-3)',
            fontSize: 11,
            textAlign: 'center',
            lineHeight: 1.5,
            marginTop: 4,
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          Screenshot kartu di atas untuk dibagikan sebagai gambar di WhatsApp Story atau Instagram.
        </p>
      </div>
    </PickemRoot>
  );
}

function Header() {
  return (
    <header style={{ marginBottom: 4, textAlign: 'center' }}>
      <div
        className="p-eyebrow"
        style={{ marginBottom: 6, color: 'var(--pickem-orange)' }}
      >
        KARTU BOLA · RECAP
      </div>
      <h1
        className="p-display-sm"
        style={{ margin: 0, color: 'var(--ink-1)' }}
      >
        Bagikan recap kamu
      </h1>
      <p
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--font-ui-pickem)',
          fontSize: 13,
          lineHeight: 1.5,
          marginTop: 6,
        }}
      >
        Pilih kartu yang paling kamu suka — kirim ke grup WhatsApp.
      </p>
    </header>
  );
}
