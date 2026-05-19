import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import {
  getConsent,
  hasMadeChoice,
  acceptAll,
  rejectAll,
  setConsent,
  subscribe,
} from '../lib/consent.js';

/**
 * ConsentBanner — minimal in-house CMP for gibol.co.
 *
 * v0.62.0 ship — audit F-001 (no consent gate published) + F-007
 * (Sentry init pre-consent).
 *
 * Two states:
 *   1. Banner (default first-paint visible if hasMadeChoice() === false):
 *      compact bar fixed to bottom of viewport. Bahasa copy + 3 buttons:
 *      "Setujui semua" / "Tolak" / "Pengaturan".
 *   2. Settings modal (opens on "Pengaturan" or via the "Pengaturan
 *      cookie" footer link): full granular controls — strictly necessary
 *      (always on, disabled), analytics, marketing.
 *
 * Default per audit: everything off until explicit Setujui. Tolak still
 * records a choice (so the banner stops showing) but keeps everything off.
 *
 * Wired via a global event the SportFooter dispatches when a user clicks
 * "Pengaturan cookie" — see `OPEN_EVT` below. Avoids passing refs through
 * the SportFooter → ConsentBanner tree, which sit in different App.jsx
 * sub-trees.
 *
 * Bahasa-only by design — the brand is Bahasa-first, the CMP should
 * match. English speakers can use browser translate (the same as the
 * privacy + terms pages).
 */

const OPEN_EVT = 'gibol:open-consent';

/**
 * Module-level helper used by SportFooter (and anywhere else) to pop the
 * settings modal open without coupling to ConsentBanner's internal state.
 */
export function openConsentSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVT));
}

export default function ConsentBanner() {
  const { lang } = useApp();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !hasMadeChoice();
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Local mirror of consent flags for the toggles in the modal.
  const [draft, setDraft] = useState(() => getConsent());

  // Listen for cross-tab consent changes + the "open settings" event.
  useEffect(() => {
    const unsub = subscribe(() => {
      setDraft(getConsent());
      setVisible(!hasMadeChoice());
    });
    function onOpen() {
      setDraft(getConsent());
      setSettingsOpen(true);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(OPEN_EVT, onOpen);
    }
    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener(OPEN_EVT, onOpen);
      }
    };
  }, []);

  function onAcceptAll() {
    acceptAll();
    setVisible(false);
    setSettingsOpen(false);
  }
  function onRejectAll() {
    rejectAll();
    setVisible(false);
    setSettingsOpen(false);
  }
  function onSaveSettings() {
    setConsent({ analytics: draft.analytics, marketing: draft.marketing });
    setVisible(false);
    setSettingsOpen(false);
  }

  // Nothing to render if the user has chosen AND the settings modal
  // is not open (the footer link re-opens via custom event).
  if (!visible && !settingsOpen) return null;

  return (
    <>
      {settingsOpen ? (
        <SettingsModal
          draft={draft}
          setDraft={setDraft}
          onSave={onSaveSettings}
          onAcceptAll={onAcceptAll}
          onRejectAll={onRejectAll}
          onClose={() => {
            setSettingsOpen(false);
            // If the banner was previously visible (user clicked Pengaturan
            // from the banner), keep it visible after closing the modal.
            // If the user opened settings from the footer link AFTER making
            // a choice, hide cleanly.
            if (hasMadeChoice()) setVisible(false);
          }}
          lang={lang}
        />
      ) : (
        <Banner
          onAcceptAll={onAcceptAll}
          onRejectAll={onRejectAll}
          onOpenSettings={() => setSettingsOpen(true)}
          lang={lang}
        />
      )}
    </>
  );
}

// ─── Banner (compact bottom strip) ─────────────────────────────────────────

function Banner({ onAcceptAll, onRejectAll, onOpenSettings, lang }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="gibol-consent-title"
      style={bannerStyle}
    >
      <div style={bannerInner}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <p id="gibol-consent-title" style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
            🍪 Cookie & analytics
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Kami pakai Google Analytics, PostHog, Sentry, dan Vercel Analytics buat
            ngerti gimana kamu pakai gibol — semuanya <strong>mati sampai kamu setuju</strong>.
            Push notification opsional dan terpisah. Detail di{' '}
            <Link to="/privacy" style={inlineLink}>Kebijakan Privasi</Link>.
          </p>
        </div>
        <div style={btnRow}>
          <button type="button" style={btnGhost} onClick={onOpenSettings}>
            Pengaturan
          </button>
          <button type="button" style={btnGhost} onClick={onRejectAll}>
            Tolak
          </button>
          <button type="button" style={btnPrimary} onClick={onAcceptAll}>
            Setujui semua
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Modal (granular toggles) ─────────────────────────────────────

function SettingsModal({ draft, setDraft, onSave, onAcceptAll, onRejectAll, onClose, lang }) {
  // Close on Escape, return focus to body.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="presentation" onClick={onClose} style={overlayStyle}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gibol-consent-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
      >
        <div style={modalHeader}>
          <h2 id="gibol-consent-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            Pengaturan cookie & analytics
          </h2>
          <button type="button" onClick={onClose} aria-label="Tutup" style={closeBtn}>×</button>
        </div>

        <div style={{ padding: '14px 20px 8px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Pilih kategori mana yang boleh aktif. Detail lengkap di{' '}
          <Link to="/privacy" style={inlineLink}>Kebijakan Privasi</Link>.
        </div>

        <ul style={catListStyle}>
          <CategoryRow
            title="Strictly necessary"
            sub="Wajib supaya situs berfungsi: preferensi bahasa/tema, watchlist, status persetujuan ini. Tidak dikirim ke pihak ketiga."
            checked
            disabled
          />
          <CategoryRow
            title="Analytics"
            sub="Google Analytics 4, PostHog, Sentry, Vercel Analytics + Speed Insights. Statistik pemakaian agregat + error tracking. Server di US."
            checked={!!draft.analytics}
            onChange={(v) => setDraft({ ...draft, analytics: v })}
          />
          <CategoryRow
            title="Marketing / Push"
            sub="OneSignal — push notification kalau kamu opt-in dari tombol di hub NBA. SDK tidak di-load sampai kamu pilih opt-in eksplisit."
            checked={!!draft.marketing}
            onChange={(v) => setDraft({ ...draft, marketing: v })}
          />
        </ul>

        <div style={modalActions}>
          <button type="button" style={btnGhost} onClick={onRejectAll}>Tolak semua</button>
          <button type="button" style={btnGhost} onClick={onAcceptAll}>Setujui semua</button>
          <button type="button" style={btnPrimary} onClick={onSave}>Simpan pilihan</button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ title, sub, checked, disabled, onChange }) {
  return (
    <li style={catRowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.7 : 1 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={!!disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--amber)' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1, color: checked ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 700 }}>
          {checked ? 'ON' : 'OFF'}
        </span>
      </label>
    </li>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const bannerStyle = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  background: 'var(--bg)',
  borderTop: '2px solid var(--ink)',
  boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.18)',
  padding: '14px 20px',
  fontFamily: 'var(--font-sans)',
};
const bannerInner = {
  maxWidth: 1280,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  flexWrap: 'wrap',
};
const btnRow = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
};
const btnGhost = {
  padding: '8px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  background: 'transparent',
  color: 'var(--ink)',
  border: '1.5px solid var(--ink)',
  borderRadius: 3,
  cursor: 'pointer',
};
const btnPrimary = {
  padding: '8px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  background: 'var(--ink)',
  color: 'var(--bg)',
  border: '1.5px solid var(--ink)',
  borderRadius: 3,
  cursor: 'pointer',
};
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'rgba(15, 14, 12, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: 'var(--font-sans)',
};
const modalStyle = {
  width: '100%',
  maxWidth: 540,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: 'var(--bg)',
  border: '2px solid var(--ink)',
  borderRadius: 4,
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.32)',
};
const modalHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px 12px',
  borderBottom: '1px solid var(--line-soft)',
};
const closeBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--ink-2)',
  fontSize: 24,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 4,
};
const catListStyle = {
  listStyle: 'none',
  margin: 0,
  padding: '4px 20px 16px',
};
const catRowStyle = {
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  padding: '14px 0',
  borderBottom: '1px solid var(--line-soft)',
};
const modalActions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '14px 20px 18px',
  borderTop: '1px solid var(--line-soft)',
  flexWrap: 'wrap',
};
const inlineLink = {
  color: 'var(--amber)',
  textDecoration: 'underline',
};
