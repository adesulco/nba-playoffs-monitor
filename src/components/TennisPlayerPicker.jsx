import React, { useEffect, useRef, useState } from 'react';
import { COLORS as C } from '../lib/constants.js';
import {
  TENNIS_STARS,
  TENNIS_STARS_BY_SLUG,
  INDONESIAN_PLAYERS,
  INDONESIAN_PLAYERS_BY_SLUG,
} from '../lib/sports/tennis/constants.js';

/**
 * Tennis PlayerPicker — parallels NBA TeamPicker / EPL ClubPicker /
 * F1 ConstructorPicker.
 *
 * Source: TENNIS_STARS (curated top 20 ATP + WTA current) +
 * INDONESIAN_PLAYERS (3). Grouped ATP → WTA → Indonesia with headers.
 *
 * `selectedSlug` = string slug or null. `onSelect(slug | null)` fires
 * on pick + clear.
 *
 * Accent: each player has an `accent` hex (red for ATP stars, pink
 * for WTA, kept for Indonesian players). Used by the TopBar to tint
 * the dashboard when a player is picked.
 */

function resolvePlayer(slug) {
  return TENNIS_STARS_BY_SLUG[slug] || INDONESIAN_PLAYERS_BY_SLUG[slug] || null;
}

export default function TennisPlayerPicker({ selectedSlug, onSelect, lang }) {
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

  const player = selectedSlug ? resolvePlayer(selectedSlug) : null;

  // Group: ATP stars, WTA stars, Indonesia
  const atpStars = TENNIS_STARS.filter((p) => p.tour === 'atp');
  const wtaStars = TENNIS_STARS.filter((p) => p.tour === 'wta');
  const idnStars = INDONESIAN_PLAYERS.map((p) => ({
    slug: p.slug,
    name: p.displayName,
    short: p.shortName,
    tour: p.tour,
    ccode: p.countryCode,
    accent: '#F59E0B', // amber — distinguishes Indonesian players
    isIndonesian: true,
  }));

  const placeholder = lang === 'id' ? 'Pilih pemain favorit' : 'Pick your player';
  const clearLabel = lang === 'id' ? '× Hapus pilihan' : '× Clear selection';
  const accent = player?.accent || '#D4A13A';

  const shortInButton = player?.short || player?.name;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={player ? `Pemain: ${player.name || player.displayName}` : placeholder}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: player ? accent : C.panel2,
          border: `1px solid ${player ? accent : C.line}`,
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
        {player ? (
          <>
            <span
              style={{
                fontWeight: 700,
                fontSize: 9,
                background: 'rgba(0,0,0,0.25)',
                padding: '2px 5px',
                borderRadius: 2,
              }}
            >
              {player.ccode || player.countryCode}
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>{shortInButton}</span>
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

      {open && (
        <div
          role="listbox"
          aria-label={lang === 'id' ? 'Pemain tenis' : 'Tennis players'}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 300,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 440,
            overflowY: 'auto',
          }}
        >
          {selectedSlug && (
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
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {clearLabel}
            </div>
          )}

          <Group title={lang === 'id' ? 'ATP · PUTRA' : 'ATP · MEN'} players={atpStars} selectedSlug={selectedSlug} onSelect={(s) => { onSelect(s); setOpen(false); }} />
          <Group title={lang === 'id' ? 'WTA · PUTRI' : 'WTA · WOMEN'} players={wtaStars} selectedSlug={selectedSlug} onSelect={(s) => { onSelect(s); setOpen(false); }} />
          <Group title={lang === 'id' ? 'PEMAIN INDONESIA' : 'INDONESIAN PLAYERS'} players={idnStars} selectedSlug={selectedSlug} onSelect={(s) => { onSelect(s); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function Group({ title, players, selectedSlug, onSelect }) {
  return (
    <>
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
        {title}
      </div>
      {players.map((p) => {
        const isSel = p.slug === selectedSlug;
        return (
          <div
            key={p.slug}
            onClick={() => onSelect(p.slug)}
            style={{
              padding: '7px 12px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${C.lineSoft}`,
              background: isSel ? p.accent : 'transparent',
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
                background: p.accent,
                color: '#fff',
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textShadow: '0 1px 0 rgba(0,0,0,.35)',
              }}
            >
              {p.ccode}
            </div>
            <span style={{ flex: 1 }}>{p.name}</span>
            <span
              style={{
                fontSize: 9,
                color: isSel ? 'rgba(255,255,255,0.7)' : C.muted,
                letterSpacing: 0.5,
              }}
            >
              {p.tour.toUpperCase()}
            </span>
          </div>
        );
      })}
    </>
  );
}
