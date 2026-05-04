import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/AppContext.jsx';

/**
 * SearchOnboardingTooltip — v0.11.14 Sprint 6.
 *
 * First-visit hint that points at the ⌘K search pill (desktop) or the
 * bottom-nav search icon (mobile). Dismisses on:
 *   - user clicks the ✕ close button
 *   - user opens the search palette (`gibol:open-search` event)
 *   - 8 seconds elapse
 *   - page scrolls ≥120 px (implies intent; user already past discovery)
 * LocalStorage flag keeps it from returning once seen/dismissed.
 *
 * Addresses audit Persona B Diandra moment 02 ("⌘K is the crown-jewel
 * moment — it should be advertised above the fold") and Persona A
 * Rangga's mobile-only gap — a thumb-reachable pointer to the search
 * that never self-announces.
 *
 * Delay before showing: 1500 ms after mount so first paint + hero
 * hydration land first. Doesn't fight for attention with scoreboards.
 *
 * Mobile vs desktop positioning is CSS-driven (two variants + a
 * breakpoint). The component renders one DOM; only one variant is
 * visible at any given viewport.
 */

const STORAGE_KEY = 'gibol:search-tooltip-seen';

function readSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

export default function SearchOnboardingTooltip() {
  const { lang } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readSeen()) return;

    const showTimer = setTimeout(() => setVisible(true), 1500);
    const autoHideTimer = setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 1500 + 8000);

    function onOpenSearch() {
      markSeen();
      setVisible(false);
    }
    function onScroll() {
      if (window.scrollY >= 120) {
        markSeen();
        setVisible(false);
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('gibol:open-search', onOpenSearch);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(autoHideTimer);
      window.removeEventListener('gibol:open-search', onOpenSearch);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!visible) return null;

  function dismiss() {
    markSeen();
    setVisible(false);
  }

  const desktopCopy = lang === 'id'
    ? 'Tekan ⌘K untuk cari tim, laga, pemain'
    : 'Press ⌘K to search teams, matches, players';
  const mobileCopy = lang === 'id'
    ? 'Ketuk 🔍 untuk cari tim & laga'
    : 'Tap 🔍 to search teams & matches';

  return (
    <>
      {/* Desktop variant — anchored top-right, points up at search pill */}
      <div
        role="status"
        aria-live="polite"
        className="search-tooltip search-tooltip--desktop"
        style={{
          position: 'fixed',
          top: 56,
          right: 140,
          zIndex: 48,
          padding: '10px 14px',
          paddingRight: 36,
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 8,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: -0.1,
          boxShadow: '0 10px 32px rgba(0,0,0,.25)',
          maxWidth: 320,
          lineHeight: 1.4,
          animation: 'tooltip-pop 240ms var(--ease-standard, cubic-bezier(.2,.8,.2,1))',
        }}
      >
        {/* Arrow pointing up to the search pill */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -6,
            right: 20,
            width: 12,
            height: 12,
            background: 'var(--ink)',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }}
        />
        {desktopCopy}
        <button
          type="button"
          onClick={dismiss}
          aria-label={lang === 'id' ? 'Tutup' : 'Dismiss'}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            color: 'var(--bg)',
            opacity: 0.7,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Mobile variant — anchored bottom-center, points down at bottom-nav search */}
      <div
        role="status"
        aria-live="polite"
        className="search-tooltip search-tooltip--mobile"
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom, 0))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 48,
          padding: '10px 14px',
          paddingRight: 36,
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 8,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 -10px 32px rgba(0,0,0,.25)',
          maxWidth: 300,
          lineHeight: 1.4,
          animation: 'tooltip-pop 240ms var(--ease-standard, cubic-bezier(.2,.8,.2,1))',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -6,
            // Arrow points at the middle "Cari" button — the bottom
            // nav has 3 equal buttons so middle is dead-center.
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 12,
            height: 12,
            background: 'var(--ink)',
            borderRadius: 2,
          }}
        />
        {mobileCopy}
        <button
          type="button"
          onClick={dismiss}
          aria-label={lang === 'id' ? 'Tutup' : 'Dismiss'}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            color: 'var(--bg)',
            opacity: 0.7,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </>
  );
}
