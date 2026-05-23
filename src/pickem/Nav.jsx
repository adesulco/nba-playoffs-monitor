import React from 'react';
import { TargetIcon, TrophyIcon, UsersIcon, UserIcon } from './icons.jsx';

// ============================================================================
// v0.65.0 — Pick'em <BottomNav /> (mobile) + <SideNav /> (desktop).
//
// Anatomy ported from design-handoff-pickem/js/components.jsx#13–14.
// Both nav surfaces are identical in vocabulary — mobile reflows onto a
// 4-up bottom bar, desktop onto a side rail — per the handover's
// "Desktop reflows, never re-skins" rule.
//
// BottomNav: 4 items (Prediksi, Papan, Grup, Profil).
// SideNav:   6 items (adds Bracket, Survivor).
// ============================================================================

const BOTTOM_ITEMS = [
  { key: 'predict', label: 'Prediksi', Icon: TargetIcon, href: '/pickem' },
  { key: 'board',   label: 'Papan',    Icon: TrophyIcon, href: '/pickem/board' },
  { key: 'grup',    label: 'Grup',     Icon: UsersIcon,  href: '/pickem/grup' },
  { key: 'profile', label: 'Profil',   Icon: UserIcon,   href: '/pickem/profile' },
];

const SIDE_ITEMS = [
  { key: 'predict',  label: 'Prediksi',       href: '/pickem',         badge: 0 },
  { key: 'board',    label: 'Papan Peringkat', href: '/pickem/board' },
  { key: 'grup',     label: 'Grup Saya',       href: '/pickem/grup' },
  { key: 'bracket',  label: 'Bracket',         href: '/pickem/bracket' },
  { key: 'survivor', label: 'Survivor',        href: '/pickem/survivor' },
  { key: 'profile',  label: 'Profil',          href: '/pickem/profile' },
];

/**
 * <BottomNav active="predict" onChange={fn} /> — mobile bottom bar.
 *
 * 70px tall (incl. 18px home-indicator clearance). 4 slots, active slot
 * picks up `--pickem-orange`. Sets aria-current="page" on the active
 * item; visual derives from the attribute.
 */
export function BottomNav({ active = 'predict', onChange }) {
  return (
    <nav
      aria-label="Navigasi Pick'em"
      style={{
        height: 70,
        background: 'var(--bg-raised)',
        borderTop: '1px solid var(--line-1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        flexShrink: 0,
        paddingBottom: 18,
      }}
    >
      {BOTTOM_ITEMS.map(({ key, label, Icon, href }) => {
        const sel = active === key;
        return (
          <a
            key={key}
            href={href}
            aria-current={sel ? 'page' : undefined}
            onClick={(e) => {
              if (onChange) {
                e.preventDefault();
                onChange(key);
              }
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: sel ? 'var(--pickem-orange)' : 'var(--ink-3)',
              paddingTop: 8,
            }}
          >
            <Icon size={20} />
            {label}
          </a>
        );
      })}
    </nav>
  );
}

/**
 * <SideNav active="predict" onChange={fn} /> — desktop side rail.
 *
 * 220px wide, sticky. Pick'em wordmark at top, 6 items below. Active
 * item picks up `--pickem-orange`. Optional numeric badge per item.
 */
export function SideNav({ active = 'predict', onChange, badges = {} }) {
  return (
    <aside
      aria-label="Navigasi Pick'em"
      style={{
        background: 'var(--bg-raised)',
        borderRight: '1px solid var(--line-1)',
        padding: '24px 14px',
        overflow: 'auto',
        minWidth: 220,
        boxSizing: 'border-box',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 8px' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--pickem-orange)',
          }}
          aria-hidden="true"
        />
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink-1)',
          }}
        >
          Pick&apos;em
        </div>
      </div>

      {SIDE_ITEMS.map(({ key, label, href }) => {
        const sel = active === key;
        const badge = badges[key];
        return (
          <a
            key={key}
            href={href}
            aria-current={sel ? 'page' : undefined}
            onClick={(e) => {
              if (onChange) {
                e.preventDefault();
                onChange(key);
              }
            }}
            style={{
              display: 'flex',
              width: '100%',
              textAlign: 'left',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 2,
              background: sel ? 'var(--bg-elev)' : 'transparent',
              color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)',
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 14,
              fontWeight: sel ? 700 : 500,
            }}
          >
            <span>{label}</span>
            {badge ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'var(--pickem-orange)',
                  color: '#0A1628',
                }}
              >
                {badge}
              </span>
            ) : null}
          </a>
        );
      })}
    </aside>
  );
}
