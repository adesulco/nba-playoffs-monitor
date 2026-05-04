import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../lib/AppContext.jsx';
import { useTopbarSubrow } from '../../lib/topbarSubrow.js';
import { Logo, Icon } from './index.js';
import SearchPalette from './SearchPalette.jsx';
import ThemePopover from './ThemePopover.jsx';
import LeagueChip from '../LeagueChip.jsx';

/**
 * v2 TopBar — single masthead used across every page (Home + sport dashboards
 * + pick'em + about/glossary). Keeps the chrome identical no matter which
 * page a user lands on so flicking between sports feels native.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ [Logo]  Home · NBA · Football · F1 · Tennis · World Cup          │
 *   │                                    [Search ⌘K]  [EN] [☾] [•]    │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │  {children} — optional sub-row: pickers, back-link, status chips │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Mobile (≤720px):
 *   • Nav row scrolls horizontally (no wrap); search pill collapses to
 *     icon-only (⌘K chip hidden); padding tightens.
 *
 * Props:
 *   children — optional content rendered as a second row (e.g. page-level
 *     picker, team toolbar, back-link). Border + bg match the topbar so
 *     it reads as one masthead.
 */

// v0.11.21 GIB-007 — nav labels were hardcoded English. NBA + F1 stay
// as proper nouns (brand acronyms); the rest resolve against the i18n
// dict so a Bahasa user sees "Beranda / Liga 1 / Liga Inggris / ...".
// `labelKey` is the translation key; `label` is the EN fallback for
// locales we haven't added yet.
//
// v0.15.1 — Indonesian Super League ("Liga 1") + the Persija-Persib
// derby page were previously unreachable from the header. Split the
// single "Football" entry into two: Liga 1 (priority — Gibol's
// Indonesia-first mission) and Liga Inggris (EPL). Liga 1 sits first
// among the football items so it gets visual weight.
const NAV_ITEMS = [
  { id: 'home',   labelKey: 'navHome',     label: 'Home',           path: '/' },
  { id: 'nba',    labelKey: null,          label: 'NBA',            path: '/nba-playoff-2026' },
  { id: 'liga1',  labelKey: 'navLiga1',    label: 'Liga 1',         path: '/super-league-2025-26' },
  { id: 'epl',    labelKey: 'navEPL',      label: 'Premier League', path: '/premier-league-2025-26' },
  { id: 'f1',     labelKey: null,          label: 'F1',             path: '/formula-1-2026' },
  { id: 'tennis', labelKey: 'navTennis',   label: 'Tennis',         path: '/tennis' },
  { id: 'wc',     labelKey: 'navWorldCup', label: 'World Cup',      path: '/fifa-world-cup-2026', soon: true },
];

// v0.11.6 Sprint 2 — prefetch per-route chunks on hover/focus. The
// lazy() wrappers in App.jsx do `() => import('./pages/X.jsx')`; we
// mirror those same import paths here so hovering the nav triggers the
// same webpack/vite chunk load as clicking. Vite dedupes the module
// across both call sites so the click lands the cached chunk. Once
// prefetched, the destination route paints on next frame instead of
// waiting 100–300ms for the chunk to stream.
const ROUTE_PREFETCH = {
  '/nba-playoff-2026':       () => import('../../pages/NBADashboard.jsx'),
  '/super-league-2025-26':   () => import('../../pages/SuperLeague.jsx'),
  '/premier-league-2025-26': () => import('../../pages/EPL.jsx'),
  '/formula-1-2026':         () => import('../../pages/F1.jsx'),
  '/tennis':                 () => import('../../pages/Tennis.jsx'),
  '/fifa-world-cup-2026':    () => import('../../pages/FIFA.jsx'),
};

// Prefetch once per session per route. Avoids re-triggering the import
// on every re-hover — the module is already parsed.
const prefetched = new Set();
function prefetchRoute(path) {
  if (prefetched.has(path)) return;
  const fn = ROUTE_PREFETCH[path];
  if (!fn) return;
  prefetched.add(path);
  fn().catch(() => {
    // Chunk load failed (offline, deploy mid-session). Clear the marker
    // so a retry on next hover fires fresh — cheap, idempotent.
    prefetched.delete(path);
  });
}

function matchActive(pathname, itemPath) {
  if (itemPath === '/') return pathname === '/';
  // v0.15.1 — derby pages (currently /derby/persija-persib) are
  // Liga 1 surfaces in the IA, not standalone sports. Highlight the
  // Liga 1 nav item when on any derby page so users see they're
  // still inside the Liga 1 section.
  if (itemPath === '/super-league-2025-26' && pathname.startsWith('/derby/')) {
    return true;
  }
  return pathname.startsWith(itemPath);
}

export default function V2TopBar({ children }) {
  const location = useLocation();
  const { lang, toggleLang, t } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeBtnRef = useRef(null);
  // Sub-row content pushed from the active page (pickers, status strips).
  // Falls back to the JSX children prop if a caller still passes one — keeps
  // the component backward-compatible with the page-rendered usage.
  const pushedSubrow = useTopbarSubrow();
  const subrow = pushedSubrow ?? children ?? null;

  // ⌘K / Ctrl+K → open search. ⎋ handled inside each overlay.
  // Also respond to a `gibol:open-search` CustomEvent so surfaces
  // without a keyboard (MobileBottomNav, future mobile FAB, deep
  // links like ?search=1) can invoke the palette without coupling
  // to V2TopBar's internal state.
  //
  // v0.11.22 GIB-005 — auditor reported pressing ⌘K on a clean Chrome
  // session "did nothing." Code-level the listener was attached to
  // `window`. Strengthening the listener to:
  //   - bind on `document` (capture phase) so the shortcut fires even
  //     if a nested element has stopPropagation on its own keydown.
  //   - check `e.repeat` so held-down ⌘K doesn't queue multiple opens.
  //   - skip if the key event originated inside a `contenteditable`
  //     or form field where the shortcut might be a paste/edit hotkey.
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key?.toLowerCase() !== 'k') return;
      if (e.repeat) return;
      // Don't hijack ⌘K when the user is editing a contentEditable
      // or about to paste in their own input — prevents collisions.
      const t = e.target;
      if (t && (t.isContentEditable || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      setSearchOpen(true);
    }
    function onOpenSearch() { setSearchOpen(true); }
    document.addEventListener('keydown', onKey, true);  // capture phase
    window.addEventListener('gibol:open-search', onOpenSearch);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('gibol:open-search', onOpenSearch);
    };
  }, []);

  const langLabel = t('langLabel') || (lang === 'id' ? 'BI' : 'EN');

  return (
    <>
      <header
        role="banner"
        className="v2-topbar"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          className="v2-topbar-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 18px',
          }}
        >
          <Link
            to="/"
            aria-label="gibol.co home"
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ink)', textDecoration: 'none', flexShrink: 0 }}
          >
            <Logo size={16} />
          </Link>

          <nav
            aria-label="primary"
            className="v2-topbar-nav"
            style={{
              display: 'flex',
              gap: 2,
              marginLeft: 8,
              minWidth: 0,
              flex: '1 1 auto',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {NAV_ITEMS.map((it) => {
              const active = matchActive(location.pathname, it.path);
              return (
                <Link
                  key={it.id}
                  to={it.path}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => prefetchRoute(it.path)}
                  onFocus={() => prefetchRoute(it.path)}
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
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {it.labelKey ? t(it.labelKey) : it.label}
                  {/* v0.11.21 GIB-008 — whitespace between label and
                      SOON badge so `textContent` reads "World Cup SOON"
                      not "World CupSOON". Visual gap was already there
                      via the gap:5 on the parent <Link>; this adds the
                      actual character so SR users hear two words. */}
                  {it.soon && ' '}
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

          <div
            className="v2-topbar-actions"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {/* Search pill — opens the palette. Collapses to an icon-only
                square on mobile so the nav row still fits comfortably. */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={lang === 'id' ? 'Buka pencarian' : 'Open search'}
              aria-keyshortcuts="Meta+K"
              className="v2-topbar-search"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-3)',
                // v0.11.5 a11y — WCAG 1.4.11. Interactive surface borders
                // need ≥3:1 contrast against page bg; --line was ~2:1.
                border: '1px solid var(--border-interactive)',
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
              <span className="v2-topbar-search-label" style={{ flex: 1 }}>
                {lang === 'id' ? 'Cari tim, laga, pemain…' : 'Search teams, matches, players…'}
              </span>
              <span
                className="mono v2-topbar-search-kbd"
                style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  border: '1px solid var(--border-interactive)',
                  borderRadius: 3,
                  color: 'var(--ink-3)',
                }}
              >
                ⌘K
              </span>
            </button>

            {/* v0.12.2 Theme B — League chip. Renders only when the user
                is logged in AND has a primary league with a computed
                rank (status='ready' inside useUserBracketSummary). Hidden
                on mobile via its own inline media query. Click expands
                a popover with rank + score + jump-to-leaderboard CTA. */}
            <LeagueChip />

            {/* Lang toggle — aria-pressed reflects whether BI is
                currently active (GIB-017). Screen readers announce
                "Bahasa Indonesia, toggle button, pressed/not pressed"
                so the user knows which language the button WILL switch
                away from when activated. */}
            <button
              type="button"
              onClick={toggleLang}
              aria-label={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              aria-pressed={lang === 'id'}
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
              className="v2-topbar-avatar"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blue), var(--amber))',
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {subrow && (
          <div
            className="v2-topbar-subrow"
            style={{
              borderTop: '1px solid var(--line)',
              padding: '8px 18px',
              background: 'var(--bg)',
            }}
          >
            {subrow}
          </div>
        )}
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
