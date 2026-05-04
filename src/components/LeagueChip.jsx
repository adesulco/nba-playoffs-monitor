import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserBracketSummary } from '../hooks/useUserBracketSummary.js';
import { useApp } from '../lib/AppContext.jsx';

/**
 * LeagueChip — v0.12.2 Theme B.
 *
 * Compact persistent chip in the V2 TopBar showing the logged-in user's
 * primary league + their rank ("RT Family · #47/183"). Click → expands
 * a popover with full standing details + a "View leaderboard" CTA.
 *
 * Visibility:
 *   - Hidden on `summary.status === 'anon' | 'loading'` — anon users
 *     get the AnonCTA in PickemHomeHero on Home, no chrome here.
 *   - Hidden when `summary.status === 'no-league'` — the user has a
 *     bracket but isn't in a league; no chip context to show.
 *   - Hidden on viewports < 768 px — mobile would crowd the TopBar
 *     actions row. The PickemHomeHero already covers logged-in mobile
 *     users on Home; the chip is a desktop-only persistent affordance.
 *
 * Cost guard: shares the cached useUserBracketSummary result (single
 * useEffect inside the hook) — mounting LeagueChip + PickemHomeHero
 * on the same page does NOT double-fire Supabase queries because both
 * components subscribe to the same hook. (React's useEffect runs per
 * component instance; the hook itself is per-mount, but for a single
 * route the chip lives in TopBar and the hero lives in HomeV1, so
 * each renders once. Across SPA navigation the chip re-mounts only
 * when the user signs in/out — TopBar otherwise persists.)
 */
export default function LeagueChip() {
  const { lang } = useApp();
  const summary = useUserBracketSummary();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Skip render entirely for the anon / loading / no-league / no-bracket
  // states. The PickemHomeHero handles those affordances on Home.
  if (summary.status !== 'ready') return null;

  const { primaryLeague, rank, totalMembers, bracket } = summary;
  const rankLabel = rank ? `#${rank}` : '—';
  const memberLabel = totalMembers ? `/${totalMembers}` : '';
  const leagueShort = (primaryLeague?.name || '').slice(0, 16);
  const truncated = (primaryLeague?.name || '').length > 16;

  return (
    <div
      ref={popoverRef}
      className="league-chip"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={lang === 'id'
          ? `Liga ${primaryLeague?.name || ''}, peringkat ${rankLabel} dari ${totalMembers || '—'}. Klik untuk detail.`
          : `League ${primaryLeague?.name || ''}, rank ${rankLabel} of ${totalMembers || '—'}. Tap for details.`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          background: 'transparent',
          color: 'var(--ink-2)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.2,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s, background 0.15s',
          maxWidth: 200,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            background: 'var(--green)',
            borderRadius: '50%',
          }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {leagueShort}{truncated ? '…' : ''}
        </span>
        <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>·</span>
        <span style={{ color: 'var(--green)' }}>
          {rankLabel}<span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{memberLabel}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 240,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.18em',
              fontWeight: 700,
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            {lang === 'id' ? 'Liga aktif' : 'Active league'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.015em',
            }}
          >
            {primaryLeague?.name || (lang === 'id' ? 'Liga' : 'League')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <PopoverStat
              label={lang === 'id' ? 'Peringkat' : 'Rank'}
              value={rankLabel}
              sub={totalMembers ? `${lang === 'id' ? 'dari' : 'of'} ${totalMembers}` : ''}
              accent="var(--green)"
            />
            <PopoverStat
              label={lang === 'id' ? 'Skor' : 'Score'}
              value={String(bracket?.score ?? 0)}
              sub={bracket?.name || ''}
              accent="var(--blue)"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Link
              to={`/leaderboard/league/${primaryLeague?.invite_code || primaryLeague?.id}`}
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: '7px 10px',
                background: 'var(--blue)',
                color: '#fff',
                borderRadius: 4,
                textDecoration: 'none',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              {lang === 'id' ? 'Lihat klasemen' : 'Open leaderboard'}
            </Link>
            <Link
              to="/bracket"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: '7px 10px',
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                textDecoration: 'none',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {lang === 'id' ? 'Bracket kamu' : 'Your bracket'}
            </Link>
          </div>
        </div>
      )}

      {/* Hide on mobile per amendments §10.x — sub-row would crowd
          on viewports already tight on TopBar real estate. The
          PickemHomeHero on Home covers the logged-in mobile case. */}
      <style>{`
        @media (max-width: 768px) {
          .league-chip {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function PopoverStat({ label, value, sub, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.2,
          fontWeight: 700,
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: accent,
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.015em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 9.5,
            color: 'var(--ink-3)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            marginTop: 1,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
