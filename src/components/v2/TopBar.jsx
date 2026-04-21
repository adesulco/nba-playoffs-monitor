import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../lib/AppContext.jsx';
import { Logo, Icon } from './index.js';
import SearchPalette from './SearchPalette.jsx';
import ThemePopover from './ThemePopover.jsx';

/**
 * v2 TopBar — master nav bar for the v2 UI.
 *
 * Composition:
 *   [ Logo ]  [ Nav: Home · NBA · Football · F1 · Tennis · World Cup ]
 *   [ Search pill (⌘K) ] [ Lang chip ] [ Theme icon ] [ Avatar placeholder ]
 *
 * Search pill opens the full-screen SearchPalette (C3 spec).
 * Theme icon opens the ThemePopover anchored to the icon (C4 spec).
 * Both overlays are owned here so a single keyboard handler (⌘K, ⎋) routes
 * correctly without fighting page-level handlers.
 */

const NAV_ITEMS = [
  { id: 'home',   label: 'Home',        path: '/' },
  { id: 'nba',    label: 'NBA',         path: '/nba-playoff-2026' },
  { id: 'pl',     label: 'Football',    path: '/premier-league-2025-26' },
  { id: 'f1',     label: 'F1',          path: '/formula-1-2026' },
  { id: 'tennis', label: 'Tennis',      path: '/tennis' },
  { id: 'wc',     label: 'World Cup',   path: '/fifa-world-cup-2026', soon: true },
];

function matchActive(pathname, itemPath) {
  if (itemPath === '/') return pathname === '/';
  return pathname.startsWith(itemPath);
}

export default function V2TopBar() {
  const location = useLocation();
  const { lang, toggleLang, t } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeBtnRef = useRef(null);

  // ⌘K / Ctrl+K → open search. ⎋ handled inside each overlay.
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const langLabel = t('langLabel') || (lang === 'id' ? 'BI' : 'EN');

  return (
    <>
      <header
        role="banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 18px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <Link
          to="/"
          aria-label="gibol.co home"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ink)', textDecoration: 'none' }}
        >
          <Logo size={16} />
        </Link>

        <nav aria-label="primary" style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {NAV_ITEMS.map((it) => {
            const active = matchActive(location.pathname, it.path);
            return (
              <Link
                key={it.id}
                to={it.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: active ? 'var(--bg-3)' : 'transparent',
                  color: active ? 'var(--ink)' : it.soon ? 'var(--ink-4)' : 'var(--ink-3)',
                  font: '600 12px "Inter Tight", sans-serif',
                  padding: '6px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                {it.label}
                {it.soon && (
                  <span
                    style={{
                      fontSize: 8,
                      padding: '1px 4px',
                      borderRadius: 999,
                      background: 'rgba(245,158,11,.14)',
                      color: 'var(--amber)',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    SOON
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search pill — opens the palette */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={lang === 'id' ? 'Buka pencarian' : 'Open search'}
            aria-keyshortcuts="Meta+K"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-3)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '5px 10px',
              width: 200,
              color: 'var(--ink-3)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <Icon name="Search" size={12} />
            <span style={{ flex: 1 }}>
              {lang === 'id' ? 'Cari tim, laga, pemain…' : 'Search teams, matches, players…'}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 9,
                padding: '1px 5px',
                border: '1px solid var(--line)',
                borderRadius: 3,
                color: 'var(--ink-3)',
              }}
            >
              ⌘K
            </span>
          </button>

          {/* Lang toggle */}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              font: '800 10px "JetBrains Mono", monospace',
              letterSpacing: '0.1em',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
          >
            {langLabel}
          </button>

          {/* Theme icon — anchors popover */}
          <button
            ref={themeBtnRef}
            type="button"
            onClick={() => setThemeOpen((x) => !x)}
            aria-label={lang === 'id' ? 'Pilih tema' : 'Theme'}
            aria-haspopup="menu"
            aria-expanded={themeOpen}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              padding: 6,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'inline-flex',
            }}
          >
            <Icon name="Settings" size={14} />
          </button>

          {/* Account dot (decorative until D3 profile ships) */}
          <div
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue), var(--amber))',
            }}
          />
        </div>
      </header>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      {themeOpen && (
        <ThemePopover
          anchorRef={themeBtnRef}
          onClose={() => setThemeOpen(false)}
        />
      )}
    </>
  );
}
