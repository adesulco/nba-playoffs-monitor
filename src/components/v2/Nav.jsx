import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SPORT_META, SPORT_KEYS, resolveSportKey } from './sport.js';

// ============================================================================
// v0.64.0 — Responsive Nav (paper-grey P3 chrome).
//
// Three responsive stages + an explicit mobile MiniNav. Anatomy from
// design_handoff_gibol_v1/js/primitives.jsx#TopNav + nav-responsive.jsx.
//
//   stage  | width        | shape
//   -------|--------------|----------------------------------------------
//   full   | >= 1100px    | logo + six labelled sport links + search bar
//   short  | 900-1099     | logo + six short-labelled sport links + search
//   icon   | 700-899      | logo + six icon-only sport links + search icon
//   mobile | < 700        | logo + search icon + menu/hamburger
//   mini   | mobile pages | 48px MiniNav (back / title / star / share)
//
// Rules from the handoff:
//   - Container query on the NAV itself, not on viewport — embedded
//     layouts read the same. We use ResizeObserver on a wrapping ref.
//   - The active sport link carries aria-current="page" and stays in its
//     widest form one stage longer than its peers; visual style derives
//     from the attribute (no separate "active" class).
//   - Search input collapses to icon before the nav items do — find
//     affordance is always present.
//   - At < 700px, nav becomes hamburger + search icon. The hub label
//     moves into the page hero, not the chrome.
// ============================================================================

// ─── Sport glyph (inline SVG, currentColor) ─────────────────────────────────

function SportGlyph({ sport, size = 16 }) {
  const sw = 1.6;
  const paths = {
    nba: (
      <g>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} />
        <path
          d="M3 12h18M12 3v18M5 5.5c2 2 5.5 4 7 6.5s5 6 7 6.5M19 5.5c-2 2-5.5 4-7 6.5s-5 6-7 6.5"
          fill="none" stroke="currentColor" strokeWidth={sw}
        />
      </g>
    ),
    epl: (
      <g>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} />
        <path
          d="M12 6.5l3.5 2.5-1.3 4.1h-4.4L8.5 9l3.5-2.5zM12 6.5V3M15.5 9l3-1.7M14.2 13.1l2.6 2.5M9.8 13.1l-2.6 2.5M8.5 9L5.5 7.3"
          fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round"
        />
      </g>
    ),
    liga1: (
      <g>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} />
        <path
          d="M12 6.5l3.5 2.5-1.3 4.1h-4.4L8.5 9l3.5-2.5z"
          fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round"
        />
      </g>
    ),
    f1: (
      <g>
        <path
          d="M3 14.5c2-3 6-4 11-4h7M3 14.5h6.5l4.5 3h6.5M9.5 10.5L13 7h6"
          fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    ),
    tennis: (
      <g>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} />
        <path
          d="M3.5 9c4 0 7 1.5 8.5 3s4.5 3 8.5 3M3.5 15c4 0 7-1.5 8.5-3s4.5-3 8.5-3"
          fill="none" stroke="currentColor" strokeWidth={sw}
        />
      </g>
    ),
    worldcup: (
      <g>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth={sw} />
        <path
          d="M12 6l2.4 1.7-.9 2.8h-3l-.9-2.8L12 6zM12 14.5l2.4 1.7-.9 2.8M12 14.5l-2.4 1.7.9 2.8M5 11l2.7-.5M16.3 10.5L19 11"
          fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round"
        />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[sport] || paths.liga1}
    </svg>
  );
}

// ─── Inline icons (currentColor, 1.8 stroke) ────────────────────────────────

function IconSearch({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IconBell({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 6 1.5 6h-15S6 13 6 9z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function IconBack({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}
function IconStar({ size = 20, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.3 6.6 20.1l1-6L3.3 9.9l6-.9z" />
    </svg>
  );
}
function IconShare({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13M7 8l5-5 5 5" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

// ─── OS-aware ⌘K / Ctrl+K hint ──────────────────────────────────────────────

/**
 * <KbdHint /> — small keyboard-shortcut chip. Detects macOS at mount and
 * renders ⌘K there, Ctrl K everywhere else. aria-label is the spoken
 * form so screen readers don't say "command key".
 */
export function KbdHint({ keyName = 'K' }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    const plat = navigator.platform || '';
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(plat + ua));
  }, []);
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 6px',
        borderRadius: 4,
        background: 'var(--bg-deep)',
        color: 'var(--ink-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        border: '1px solid var(--line-2)',
        lineHeight: 1,
      }}
      aria-label={isMac ? `Command ${keyName}` : `Control ${keyName}`}
    >
      <span aria-hidden="true">{isMac ? '⌘' : 'Ctrl'}</span>
      <span aria-hidden="true">{keyName}</span>
    </kbd>
  );
}

// ─── MiniNav (mobile page chrome) ───────────────────────────────────────────

/**
 * <MiniNav /> — 48px-tall mobile page chrome. Back / title (truncates to
 * one line) / favorite / optional share. The sport accent is inherited
 * by setting `data-sport` on the bar itself.
 *
 * Props:
 *   sport     paper-mode sport key (nba/epl/liga1/f1/tennis/worldcup)
 *   title     page title — Bahasa, sentence-case
 *   share     show the share icon (default false)
 *   favorited current favorited state of the entity (drives star fill +
 *             aria-label "Bintangi klub" / "Hapus dari favorit")
 *   onBack, onFavorite, onShare  handlers
 */
export function MiniNav({ sport, title, share = false, favorited = false, onBack, onFavorite, onShare }) {
  return (
    <div
      data-sport={resolveSportKey(sport) || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 48,
        padding: '0 8px 0 4px',
        borderBottom: '1px solid var(--line-1)',
        background: 'var(--bg-base)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <button
        type="button"
        aria-label="Kembali"
        onClick={onBack}
        style={{
          width: 44,
          height: 44,
          minHeight: 44,
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-1)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--r-2)',
        }}
      >
        <IconBack />
      </button>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 600,
          fontSize: 15,
          color: 'var(--ink-1)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>
      <button
        type="button"
        aria-label={favorited ? 'Hapus dari favorit' : 'Bintangi klub'}
        aria-pressed={favorited || undefined}
        onClick={onFavorite}
        style={{
          width: 44,
          height: 44,
          minHeight: 44,
          border: 'none',
          background: 'transparent',
          color: favorited ? 'var(--sport, var(--pulse))' : 'var(--ink-2)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--r-2)',
        }}
      >
        <IconStar filled={favorited} />
      </button>
      {share && (
        <button
          type="button"
          aria-label="Bagikan"
          onClick={onShare}
          style={{
            width: 44,
            height: 44,
            minHeight: 44,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--r-2)',
          }}
        >
          <IconShare />
        </button>
      )}
    </div>
  );
}

// ─── TopNav (desktop / tablet) ──────────────────────────────────────────────

const STAGE_BREAKPOINTS = {
  full: 1100, // >= 1100
  short: 900, // 900 - 1099
  icon: 700,  // 700 - 899
  // < 700 → mobile
};

function pickStage(w) {
  if (w >= STAGE_BREAKPOINTS.full) return 'full';
  if (w >= STAGE_BREAKPOINTS.short) return 'short';
  if (w >= STAGE_BREAKPOINTS.icon) return 'icon';
  return 'mobile';
}

/**
 * <TopNav /> — desktop/tablet chrome. Self-measuring via ResizeObserver
 * on its own root so it adapts to its container, not the viewport
 * (per the handoff's "container query on the nav itself" rule).
 *
 * Props:
 *   sport         active paper-mode sport key (drives aria-current + accent)
 *   onSportClick  (key) => void — called when a sport link is tapped
 *   onSearchClick () => void   — opens <SearchOverlay />
 *   onLoginClick  () => void
 *   user          truthy ⇒ Login button hidden / replaced with avatar
 *                 (callers wire the avatar render)
 *   avatar        ReactNode rendered in place of Login when user is set
 *   sticky        adds position:sticky; top:0
 */
export function TopNav({
  sport = null,
  onSportClick,
  onSearchClick,
  onLoginClick,
  onMenuClick,
  user = null,
  avatar = null,
  sticky = false,
}) {
  const ref = useRef(null);
  const [stage, setStage] = useState('full');

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    // Initial measure
    setStage(pickStage(el.getBoundingClientRect().width));
    // Adapt on resize
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStage(pickStage(entry.contentRect.width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeKey = resolveSportKey(sport);

  return (
    <div
      ref={ref}
      data-sport={activeKey || undefined}
      style={{
        width: '100%',
        height: 56,
        background: 'var(--bg-raised)',
        borderBottom: '1px solid var(--line-1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        boxSizing: 'border-box',
        gap: 12,
        fontFamily: 'var(--font-ui)',
        position: sticky ? 'sticky' : undefined,
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 50 : undefined,
      }}
    >
      <BrandLockup hideWordmark={stage === 'mobile'} />

      {stage === 'mobile' ? (
        <>
          <div style={{ flex: 1 }} />
          <NavIconButton ariaLabel="Cari" onClick={onSearchClick}>
            <IconSearch />
          </NavIconButton>
          <NavIconButton ariaLabel="Menu" onClick={onMenuClick}>
            <IconMenu />
          </NavIconButton>
        </>
      ) : (
        <>
          <nav
            aria-label="Cabang olahraga"
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              marginLeft: 8,
              minWidth: 0,
            }}
          >
            {SPORT_KEYS.map((k) => {
              const meta = SPORT_META[k];
              const isActive = activeKey === k;
              // Active sport stays one stage wider than peers (per handoff rule).
              const myStage = isActive && stage === 'icon' ? 'short' : stage;
              return (
                <a
                  key={k}
                  href={meta.hubPath}
                  data-sport={k}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    if (onSportClick) {
                      e.preventDefault();
                      onSportClick(k);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: myStage === 'icon' ? '8px 10px' : '8px 12px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? 'var(--sport-deep)' : 'var(--ink-2)',
                    background: isActive ? 'var(--sport-wash)' : 'transparent',
                    textDecoration: 'none',
                    borderBottom: isActive ? '2px solid var(--sport)' : '2px solid transparent',
                    height: 36,
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <SportGlyph sport={k} />
                  {myStage === 'full' && <span>{meta.label}</span>}
                  {myStage === 'short' && <span>{meta.short}</span>}
                </a>
              );
            })}
          </nav>
          <div style={{ flex: 1 }} />
          <SearchTrigger stage={stage} onClick={onSearchClick} />
          <NavIconButton ariaLabel="Pemberitahuan">
            <IconBell />
          </NavIconButton>
          {user && avatar ? avatar : (
            <button
              type="button"
              className="g-btn g-btn--primary g-btn--sm"
              onClick={onLoginClick}
            >
              Masuk
            </button>
          )}
        </>
      )}
    </div>
  );
}

function BrandLockup({ hideWordmark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--ink-1)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.04em',
        }}
        aria-hidden="true"
      >
        g
      </div>
      {!hideWordmark && (
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', color: 'var(--ink-1)' }}>
          gibol.co
        </span>
      )}
    </div>
  );
}

function NavIconButton({ children, ariaLabel, onClick }) {
  return (
    <button
      type="button"
      className="g-btn g-btn--ghost g-btn--icon"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--ink-2)' }}
    >
      {children}
    </button>
  );
}

function SearchTrigger({ stage, onClick }) {
  // At "icon" stage, collapse to a 36×36 search button.
  if (stage === 'icon') {
    return (
      <NavIconButton ariaLabel="Cari (⌘K)" onClick={onClick}>
        <IconSearch />
      </NavIconButton>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cari (⌘K)"
      style={{
        height: 36,
        minHeight: 36,
        padding: '0 12px',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r-pill)',
        background: 'transparent',
        color: 'var(--ink-1)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        maxWidth: stage === 'full' ? 320 : 220,
      }}
    >
      <IconSearch size={16} />
      <span style={{ color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {stage === 'full' ? 'Cari pemain, klub, pertandingan' : 'Cari'}
      </span>
      <KbdHint />
    </button>
  );
}

// ─── Hook export for callers that want to read the stage ───────────────────

/**
 * useNavStage(ref) — returns the active stage based on a container's
 * width. Useful when a surface wants to mirror nav's responsive logic
 * (e.g. a sticky sub-row).
 */
export function useNavStage(ref) {
  const [stage, setStage] = useState('full');
  useLayoutEffect(() => {
    if (!ref?.current) return undefined;
    const el = ref.current;
    setStage(pickStage(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setStage(pickStage(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return stage;
}

export default TopNav;
