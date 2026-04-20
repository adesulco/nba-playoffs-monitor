import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TEAMS_2026, TEAMS_BY_ID, DRIVERS_BY_TEAM } from '../lib/sports/f1/constants.js';
import { COLORS as C } from '../lib/constants.js';

/**
 * ConstructorPicker — v0.2.5. F1 parallel to NBA TeamPicker.
 *
 * A compact dropdown in the F1 TopBar chrome. Selecting a constructor
 * persists the choice in AppContext (localStorage) and colors the F1
 * dashboard chrome with that constructor's accent. Highlights the
 * constructor's two drivers in the standings table.
 *
 * Clicking a row in the open dropdown:
 *   - Selects the constructor (tints chrome + marks drivers)
 *   - Offers a "Lihat halaman tim" link that navigates to the per-team
 *     SEO page (/formula-1-2026/team/:slug).
 */
export default function ConstructorPicker({ selectedConstructor, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const meta = selectedConstructor ? TEAMS_BY_ID[selectedConstructor] : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={meta ? `Konstruktor terpilih: ${meta.name}. Klik untuk ganti.` : 'Pilih konstruktor F1 favoritmu'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: meta ? meta.accent : C.panel2,
          border: `1px solid ${meta ? meta.accent : C.line}`,
          borderRadius: 4,
          color: meta ? '#fff' : C.text,
          fontFamily: 'inherit',
          fontSize: 10.5,
          letterSpacing: 0.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
          minWidth: 150,
        }}
      >
        {meta ? (
          <>
            <span style={{
              fontWeight: 700, fontSize: 9.5,
              background: 'rgba(0,0,0,0.25)', padding: '2px 5px', borderRadius: 2,
              letterSpacing: 0.5,
            }}>
              {meta.short.toUpperCase().slice(0, 3)}
            </span>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{meta.short}</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11 }}>🏁</span>
            <span style={{ flex: 1, textAlign: 'left', color: C.dim }}>Pilih konstruktor</span>
            <span style={{ fontSize: 9, color: C.dim }}>▼</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Daftar konstruktor F1 2026"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: 280,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 460,
            overflowY: 'auto',
          }}
        >
          {selectedConstructor && (
            <div
              onClick={() => {
                onSelect(null);
                setOpen(false);
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
              × Clear pilihan
            </div>
          )}
          <div style={{
            padding: '6px 12px', fontSize: 9, letterSpacing: 1.2,
            color: C.dim, background: C.bg,
            borderBottom: `1px solid ${C.lineSoft}`, fontWeight: 600,
          }}>
            KONSTRUKTOR F1 2026
          </div>
          {TEAMS_2026.map((team) => {
            const isSel = team.id === selectedConstructor;
            const teamDrivers = DRIVERS_BY_TEAM[team.id] || [];
            return (
              <div
                key={team.id}
                onClick={() => {
                  onSelect(team.id);
                  setOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `1px solid ${C.lineSoft}`,
                  background: isSel ? team.accent : 'transparent',
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
                <div style={{
                  width: 4, height: 28,
                  background: team.accent,
                  flexShrink: 0, borderRadius: 1,
                }} />
                <div style={{ flex: 1, lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600 }}>{team.short}</div>
                  <div style={{
                    fontSize: 9, marginTop: 2,
                    color: isSel ? 'rgba(255,255,255,0.75)' : C.muted,
                    letterSpacing: 0.2,
                  }}>
                    {teamDrivers.map((d) => d.code).join(' · ')}
                  </div>
                </div>
                <Link
                  to={`/formula-1-2026/team/${team.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 9,
                    color: isSel ? 'rgba(255,255,255,0.9)' : C.dim,
                    textDecoration: 'none',
                    padding: '3px 7px',
                    border: `1px solid ${isSel ? 'rgba(255,255,255,0.4)' : C.lineSoft}`,
                    borderRadius: 2,
                    letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}
                  aria-label={`Lihat halaman tim ${team.name}`}
                >
                  PAGE →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
