import React, { useEffect, useRef, useState } from 'react';
import { COLORS as C } from '../lib/constants.js';
import { CLUBS, CLUBS_BY_SLUG } from '../lib/sports/liga-1-id/clubs.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import PickerSheet from './PickerSheet.jsx';

/**
 * Super League ClubPicker — parallel to EPLClubPicker.
 *
 * `selectedSlug` is the clubs.js slug (e.g. 'persib'). Pass `null` for
 * unset state. `onSelect(slug|null)` fires on pick + on clear.
 */

function abbrFromName(name) {
  if (!name) return '';
  const caps = name.match(/\b[A-Z]/g);
  if (caps && caps.length >= 3) return caps.slice(0, 3).join('');
  if (caps && caps.length === 2) return caps.join('') + (name[1] || '').toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

export default function SuperLeagueClubPicker({ selectedSlug, onSelect, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const club = selectedSlug ? CLUBS_BY_SLUG[selectedSlug] : null;
  const sortedClubs = [...CLUBS].sort((a, b) => a.name.localeCompare(b.name));

  const placeholder = lang === 'id' ? 'Pilih klub favorit' : 'Pick your club';
  const clearLabel = lang === 'id' ? '× Hapus pilihan' : '× Clear selection';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={club ? `Klub: ${club.name}` : placeholder}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: club ? club.accent : C.panel2,
          border: `1px solid ${club ? club.accent : C.line}`,
          borderRadius: 4,
          color: C.text,
          fontFamily: 'inherit',
          fontSize: 10.5,
          letterSpacing: 0.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
          minWidth: 160,
        }}
      >
        {club ? (
          <>
            <span
              style={{
                fontWeight: 700,
                fontSize: 9.5,
                background: 'rgba(0,0,0,0.25)',
                padding: '2px 5px',
                borderRadius: 2,
              }}
            >
              {abbrFromName(club.name)}
            </span>{' '}
            <span style={{ flex: 1, textAlign: 'left' }}>
              {club.name.split(' ').slice(0, 2).join(' ')}
            </span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11 }}>★</span>
            <span style={{ flex: 1, textAlign: 'left', color: C.dim }}>{placeholder}</span>
            <span style={{ fontSize: 9, color: C.dim }}>▼</span>
          </>
        )}
      </button>

      {/* v0.13.8 — bottom-sheet on mobile via shared <PickerSheet>. */}
      <PickerSheet
        isMobile={isMobile}
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={lang === 'id' ? 'Daftar klub Super League Indonesia' : 'Indonesian Super League clubs'}
        desktopWidth={300}
      >
          {selectedSlug && (
            <div
              role="button"
              tabIndex={0}
              aria-label={clearLabel}
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(null);
                  setOpen(false);
                }
              }}
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${C.lineSoft}`,
                fontSize: 10.5,
                color: C.red,
                cursor: 'pointer',
                letterSpacing: 0.3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {clearLabel}
            </div>
          )}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 9,
              letterSpacing: 1.2,
              color: C.dim,
              background: C.bg,
              borderBottom: `1px solid ${C.lineSoft}`,
              fontWeight: 600,
            }}
          >
            {lang === 'id' ? '18 KLUB · 2025-26' : '18 CLUBS · 2025-26'}
          </div>
          {sortedClubs.map((c) => {
            const isSel = c.slug === selectedSlug;
            return (
              <div
                key={c.slug}
                role="option"
                aria-selected={isSel}
                tabIndex={0}
                onClick={() => {
                  onSelect(c.slug);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(c.slug);
                    setOpen(false);
                  }
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `1px solid ${C.lineSoft}`,
                  background: isSel ? c.accent : 'transparent',
                  color: isSel ? '#fff' : C.text,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSel) e.currentTarget.style.background = C.hover;
                }}
                onMouseLeave={(e) => {
                  if (!isSel) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    background: c.accent,
                    color: '#fff',
                    fontSize: 8.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    textShadow: '0 1px 0 rgba(0,0,0,.35)',
                  }}
                >
                  {abbrFromName(c.name)}
                </div>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: isSel ? 'rgba(255,255,255,0.7)' : C.muted,
                  }}
                >
                  {c.city}
                </span>
              </div>
            );
          })}
      </PickerSheet>
    </div>
  );
}
