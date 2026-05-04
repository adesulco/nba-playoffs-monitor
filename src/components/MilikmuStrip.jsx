import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { TEAM_META } from '../lib/constants.js';
import { TEAMS_BY_ID } from '../lib/sports/f1/constants.js';
import { CLUBS_BY_SLUG } from '../lib/sports/epl/clubs.js';
import {
  TENNIS_STARS_BY_SLUG,
  INDONESIAN_PLAYERS_BY_SLUG,
} from '../lib/sports/tennis/constants.js';

/**
 * MilikmuStrip — v0.11.8 Sprint 3.
 *
 * Cross-sport "Yours" strip rendered at the top of Home. Pulls the
 * user's pinned favorite across all four sports (NBA, F1, EPL, Tennis)
 * and renders a chip per pick, each linked to its sport dashboard with
 * the picker pre-filtered (via ?club / ?team / ?player).
 *
 * Audit Persona B (Diandra) moment 04: "power users want persistence"
 * and Persona A (Rangga) moment 05: "no saved teams = every session is
 * a cold start." The per-sport pickers ship the local state already;
 * this strip is the surface that makes that state feel global.
 *
 * Renders nothing if the user has zero pins — first-time visitors see
 * the dashboard grid unchanged. Renders up to 4 chips otherwise.
 *
 * NBA fav lives in localStorage ('gibol:favTeam') rather than
 * AppContext because the TeamPicker was authored pre-context — so we
 * read + subscribe to localStorage changes here. Other sport pins come
 * from useApp().
 */

const NBA_FAV_KEY = 'gibol:favTeam';

function useNbaFav() {
  const [fav, setFav] = useState(() => {
    try { return localStorage.getItem(NBA_FAV_KEY); } catch { return null; }
  });
  useEffect(() => {
    function onStorage(e) {
      if (e.key === NBA_FAV_KEY) setFav(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    // Also poll on focus in case the same-tab TeamPicker wrote while
    // Home is rendered (storage event only fires cross-tab).
    function onFocus() {
      try {
        const current = localStorage.getItem(NBA_FAV_KEY);
        setFav((prev) => (prev === current ? prev : current));
      } catch {}
    }
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return fav;
}

function slugifyNbaTeam(name) {
  // Matches the pattern in constants.js teamSlug().
  return name.toLowerCase().replace(/\s+/g, '-');
}

function Chip({ to, accent, abbr, label, sportLabel }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px 6px 6px',
        background: `${accent}1a`,
        border: `1px solid ${accent}`,
        borderRadius: 6,
        textDecoration: 'none',
        color: 'var(--ink)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
        transition: 'background var(--dur-short, 120ms) var(--ease-standard, ease)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${accent}1a`; }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 3,
        background: accent, color: '#fff',
        fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
        flexShrink: 0,
      }}>
        {abbr}
      </span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>
        {sportLabel}
      </span>
    </Link>
  );
}

export default function MilikmuStrip() {
  const { lang, selectedConstructor, selectedEPLClub, selectedTennisPlayer } = useApp();
  const nbaFav = useNbaFav();

  // Resolve each pick into its display metadata. A pick referencing a
  // slug we no longer have (e.g. a driver dropped from the grid) gets
  // skipped quietly — the picker itself will reflect the same absence.
  const chips = [];

  if (nbaFav && TEAM_META[nbaFav]) {
    const m = TEAM_META[nbaFav];
    chips.push({
      key: 'nba',
      accent: m.color,
      abbr: m.abbr,
      label: nbaFav.split(' ').slice(-1)[0],
      sportLabel: 'NBA',
      to: `/nba-playoff-2026/${slugifyNbaTeam(nbaFav)}`,
    });
  }

  if (selectedEPLClub && CLUBS_BY_SLUG[selectedEPLClub]) {
    const c = CLUBS_BY_SLUG[selectedEPLClub];
    chips.push({
      key: 'epl',
      accent: c.accent,
      abbr: c.shortAbbr || c.abbr || c.slug.slice(0, 3).toUpperCase(),
      label: c.shortName || c.name,
      sportLabel: lang === 'id' ? 'LIGA INGGRIS' : 'PL',
      to: `/premier-league-2025-26?club=${selectedEPLClub}`,
    });
  }

  if (selectedConstructor && TEAMS_BY_ID[selectedConstructor]) {
    const t = TEAMS_BY_ID[selectedConstructor];
    chips.push({
      key: 'f1',
      accent: t.accent,
      abbr: (t.abbr || t.id.slice(0, 3)).toUpperCase(),
      label: t.shortName || t.name,
      sportLabel: 'F1',
      to: `/formula-1-2026?team=${selectedConstructor}`,
    });
  }

  if (selectedTennisPlayer) {
    const p = TENNIS_STARS_BY_SLUG[selectedTennisPlayer]
      || INDONESIAN_PLAYERS_BY_SLUG[selectedTennisPlayer];
    if (p) {
      chips.push({
        key: 'tennis',
        accent: p.accent,
        abbr: (p.short || p.name || '').split(' ').slice(-1)[0].slice(0, 3).toUpperCase(),
        label: p.short || p.name,
        sportLabel: lang === 'id' ? 'TENIS' : 'TENNIS',
        to: `/tennis?player=${selectedTennisPlayer}`,
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <section
      aria-label={lang === 'id' ? 'Tim favorit kamu' : 'Your pinned teams'}
      style={{
        padding: '14px 24px 2px',
        borderBottom: '1px dashed var(--line-soft)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 9.5, letterSpacing: 1.5, color: 'var(--ink-3)',
        fontWeight: 700, marginBottom: 8, textTransform: 'uppercase',
      }}>
        <span aria-hidden="true" style={{ color: 'var(--amber)' }}>★</span>
        {lang === 'id' ? 'MILIKMU' : 'YOURS'}
        <span style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} aria-hidden="true" />
        <span style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: 1 }}>
          {chips.length} {chips.length === 1
            ? (lang === 'id' ? 'TIM' : 'TEAM')
            : (lang === 'id' ? 'TIM' : 'TEAMS')}
        </span>
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        paddingBottom: 12,
      }}>
        {chips.map((c) => (
          <Chip key={c.key} {...c} />
        ))}
      </div>
    </section>
  );
}
