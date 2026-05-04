import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';

/**
 * MobileBottomNav — v0.13.4 Sprint 2 Theme C, Ship B (sport-aware).
 *
 * Pre-v0.13.4 this was a static 3-item bar (Home · Search · Bracket)
 * that didn't react to the current sport. On NBA / EPL / F1 / Tennis
 * pages a mobile user couldn't reach a sport's secondary surfaces
 * (recap, klasemen, kalender, peringkat) without going up to the
 * V2TopBar dropdown — defeating the purpose of a thumb-bar.
 *
 * Now: the nav resolves the active sport from `location.pathname`
 * and swaps in a sport-specific 5-item menu (4 sport actions + Search).
 * On non-sport routes (home, bracket, settings, login, …) it falls
 * back to the original 3-item bar so navigation patterns stay
 * predictable for users who haven't entered a sport context.
 *
 * Per-sport item tables live in `SPORT_NAVS` below. Adding a new
 * sport = adding one entry; no other change to this file.
 *
 * Hash-based deep links (e.g. /premier-league-2025-26#standings):
 * App.jsx mounts a ScrollToHash effect (Ship B) that scrolls a
 * matching `id` into view on hash change. If the id doesn't exist
 * the page just scrolls to top, which matches browser default.
 *
 * Visible only ≤720 px via the @media rule in src/index.css.
 */

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case 'bracket':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6 4h3v7h6V4h3" />
          <path d="M9 11v4a3 3 0 0 0 3 3v2" />
          <path d="M15 11v4a3 3 0 0 1-3 3" />
        </svg>
      );
    case 'live':
      // Concentric circles + center dot — reads as "live broadcast".
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M7.05 7.05a7 7 0 0 0 0 9.9" />
          <path d="M16.95 7.05a7 7 0 0 1 0 9.9" />
          <path d="M4.22 4.22a11 11 0 0 0 0 15.56" />
          <path d="M19.78 4.22a11 11 0 0 1 0 15.56" />
        </svg>
      );
    case 'standings':
      // Three ascending bars — reads as "rankings / klasemen".
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4"  y="13" width="4" height="7" />
          <rect x="10" y="9"  width="4" height="11" />
          <rect x="16" y="5"  width="4" height="15" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common} aria-hidden="true">
          <polygon points="12,3 14.5,9 21,9.5 16,14 17.5,20.5 12,17 6.5,20.5 8,14 3,9.5 9.5,9" />
        </svg>
      );
    case 'recap':
      // Document with three lines — reads as "article / recap".
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 3h11l3 3v15H5z" />
          <path d="M16 3v3h3" />
          <path d="M8 11h8" />
          <path d="M8 15h8" />
          <path d="M8 19h5" />
        </svg>
      );
    case 'tennis':
      // Tennis ball — circle + curved seam.
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 8.5c4 1.5 12.8 1.5 16.8 0" />
          <path d="M3.6 15.5c4-1.5 12.8-1.5 16.8 0" />
        </svg>
      );
    case 'driver':
      // Helmet-ish silhouette for F1 driver.
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 13a7 7 0 0 1 14 0v3H5z" />
          <path d="M5 16h14" />
          <path d="M9 11h6" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Sport resolution ─────────────────────────────────────────────────────────
function detectSport(pathname) {
  if (pathname.startsWith('/nba-playoff-2026') || pathname.startsWith('/recap')) return 'nba';
  if (pathname.startsWith('/premier-league-2025-26')) return 'epl';
  if (pathname.startsWith('/formula-1-2026')) return 'f1';
  if (pathname.startsWith('/tennis')) return 'tennis';
  if (pathname.startsWith('/super-league-2025-26')) return 'superleague';
  if (pathname.startsWith('/fifa-world-cup-2026')) return 'fifa';
  return null;
}

// ─── Per-sport item tables ────────────────────────────────────────────────────
// Each entry returns the items array for that sport. Functions (not
// arrays) so we can localise labels via the lang param without
// duplicating the table per language.
function navItemsFor(sport, lang) {
  const t = (id, en) => (lang === 'id' ? id : en);
  const home    = { icon: 'home',   label: t('Home', 'Home'),   to: '/' };
  const search  = { icon: 'search', label: t('Cari', 'Search'), action: 'search' };
  const bracket = { icon: 'bracket', label: t('Bracket', 'Bracket'), to: '/bracket' };

  switch (sport) {
    case 'nba':
      return [
        home,
        { icon: 'live',    label: t('Skor',    'Scores'), to: '/nba-playoff-2026' },
        { icon: 'bracket', label: t('Bracket', 'Bracket'), to: '/bracket' },
        { icon: 'recap',   label: t('Recap',   'Recap'),  to: '/recap' },
        search,
      ];
    case 'epl':
      return [
        home,
        { icon: 'live',      label: t('Liga',     'EPL'),         to: '/premier-league-2025-26' },
        { icon: 'standings', label: t('Klasemen', 'Standings'),   to: '/premier-league-2025-26#standings' },
        { icon: 'star',      label: t('Top Skor', 'Top Scorer'),  to: '/premier-league-2025-26#top-scorer' },
        search,
      ];
    case 'f1':
      return [
        home,
        { icon: 'live',      label: t('F1',       'F1'),         to: '/formula-1-2026' },
        { icon: 'calendar',  label: t('Kalender', 'Calendar'),   to: '/formula-1-2026#calendar' },
        { icon: 'standings', label: t('Klasemen', 'Standings'),  to: '/formula-1-2026#standings' },
        search,
      ];
    case 'tennis':
      return [
        home,
        { icon: 'tennis',    label: t('Tenis', 'Tennis'),  to: '/tennis' },
        { icon: 'standings', label: 'ATP',                to: '/tennis/rankings/atp' },
        { icon: 'standings', label: 'WTA',                to: '/tennis/rankings/wta' },
        search,
      ];
    case 'superleague':
      // v0.14.0 — Top Skor restored now that API-Football Pro is wired
      // (ESPN doesn't expose idn.1 scorers; API-Football covers it).
      return [
        home,
        { icon: 'live',      label: t('Liga 1',   'Liga 1'),    to: '/super-league-2025-26' },
        { icon: 'standings', label: t('Klasemen', 'Standings'), to: '/super-league-2025-26#standings' },
        { icon: 'star',      label: t('Top Skor', 'Top Scorer'),to: '/super-league-2025-26#top-scorer' },
        search,
      ];
    case 'fifa':
      // World Cup is still 'soon' — only Home + the hub link + Search.
      return [
        home,
        { icon: 'live', label: t('Piala Dunia', 'World Cup'), to: '/fifa-world-cup-2026' },
        search,
      ];
    default:
      // Default 3-item bar for home, /bracket, /settings, /login, /about, etc.
      return [home, search, bracket];
  }
}

// Determine if a nav item is the "active" one for the current path.
// Items are active when:
//   - their `to` matches pathname exactly (home, recap)
//   - their `to` route-prefix matches pathname (NBA hub on a per-team
//     page is highlighted)
//   - hash items match when the pathname matches AND the hash matches
function isActive(item, location) {
  if (!item.to) return false;
  const [path, hash] = item.to.split('#');
  if (hash) {
    return location.pathname === path && location.hash === `#${hash}`;
  }
  if (item.to === '/') return location.pathname === '/';
  return location.pathname === path || location.pathname.startsWith(`${path}/`);
}

// ─── NavButton ────────────────────────────────────────────────────────────────
function NavButton({ icon, label, active, onClick, to }) {
  const common = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: '1 1 0',
    minHeight: 52,
    padding: '6px 2px',
    background: 'transparent',
    border: 'none',
    color: active ? 'var(--ink)' : 'var(--ink-3)',
    fontFamily: 'var(--font-mono)',
    // 9 px label so 5 tabs at 75 px each fit even longest labels
    // ("Klasemen" is 8 chars × ~5.5 px = 44 px) without wrap.
    fontSize: 9,
    letterSpacing: 0.6,
    fontWeight: 600,
    textDecoration: 'none',
    textTransform: 'uppercase',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };
  const body = (
    <>
      <Icon name={icon} size={20} />
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 2,
            borderRadius: 2,
            background: 'var(--amber)',
          }}
        />
      )}
    </>
  );
  const style = { ...common, position: 'relative' };
  if (to) {
    return (
      <Link to={to} aria-current={active ? 'page' : undefined} style={style}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={style}>
      {body}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MobileBottomNav() {
  const location = useLocation();
  const { lang } = useApp();
  const sport = detectSport(location.pathname);
  const items = navItemsFor(sport, lang);

  function openSearch() {
    window.dispatchEvent(new CustomEvent('gibol:open-search'));
  }

  return (
    <nav
      aria-label={lang === 'id' ? 'Navigasi utama mobile' : 'Mobile primary navigation'}
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        boxShadow: '0 -4px 12px rgba(0,0,0,.14)',
      }}
    >
      {items.map((item, i) => (
        <NavButton
          key={`${item.icon}-${i}`}
          icon={item.icon}
          label={item.label}
          active={isActive(item, location)}
          to={item.to}
          onClick={item.action === 'search' ? openSearch : undefined}
        />
      ))}
    </nav>
  );
}
