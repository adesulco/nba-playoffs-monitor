import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useYesterday } from '../hooks/useYesterday.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';

export default function YesterdayRecap({ favTeam, t }) {
  const [collapsed, setCollapsed] = useState(false);
  const { games, loading } = useYesterday();
  const { lang } = useApp();

  if (loading || games.length === 0) return null;

  const favAbbr = favTeam ? TEAM_META[favTeam]?.abbr : null;
  const byAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === abbr);

  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateLabel = d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dateIso = d.toISOString().slice(0, 10);
  const recapHref = `/recap/${dateIso}`;
  const recapLabel = lang === 'id' ? 'Baca catatan →' : 'Read recap →';

  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, background: C.panelSoft }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 16px',
          background: 'transparent',
          border: 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
          color: C.text,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, letterSpacing: 1.2, fontWeight: 600 }}>
          <span style={{ color: C.dim }}>{t('yesterday')}</span>
          <span style={{ color: C.muted, fontSize: 9.5 }}>{dateLabel}</span>
          <span style={{ padding: '1px 8px', background: C.panel, borderRadius: 10, fontSize: 9.5, color: C.dim, letterSpacing: 0.3 }}>
            {games.length} {games.length === 1 ? 'game' : 'games'}
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Link
            to={recapHref}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 9.5, letterSpacing: 0.5, color: C.amber,
              textDecoration: 'none', fontWeight: 600,
            }}
          >
            {recapLabel}
          </Link>
          <span style={{ fontSize: 9.5, color: C.muted, letterSpacing: 0.5 }}>
            {collapsed ? t('show') : t('hide')} ↕
          </span>
        </span>
      </button>

      {!collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, borderTop: `1px solid ${C.lineSoft}` }}>
          {games.map((g) => {
            const awayAbbr = g.away?.abbr;
            const homeAbbr = g.home?.abbr;
            const awayMeta = TEAM_META[byAbbr(awayAbbr)] || { color: '#444' };
            const homeMeta = TEAM_META[byAbbr(homeAbbr)] || { color: '#444' };
            const awayWon = g.away?.winner;
            const homeWon = g.home?.winner;
            const favInGame = favAbbr && (awayAbbr === favAbbr || homeAbbr === favAbbr);
            const margin = Math.abs(parseInt(g.away?.score || 0) - parseInt(g.home?.score || 0));
            const isUpset = margin >= 15;

            return (
              <div
                key={g.id}
                style={{
                  padding: '8px 14px',
                  borderRight: `1px solid ${C.lineSoft}`,
                  borderLeft: favInGame ? `3px solid ${favInGame ? (awayAbbr === favAbbr ? awayMeta.color : homeMeta.color) : 'transparent'}` : '3px solid transparent',
                  background: favInGame ? `${favAbbr === awayAbbr ? awayMeta.color : homeMeta.color}12` : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '1px 4px', background: awayMeta.color, color: '#fff', fontSize: 8.5, fontWeight: 700, borderRadius: 2 }}>{awayAbbr}</span>
                    <span style={{ fontSize: 10.5, color: awayWon ? C.text : C.muted, fontWeight: awayWon ? 600 : 400 }}>{g.away?.score}</span>
                  </div>
                  <span style={{ fontSize: 9, color: C.dim }}>—</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: homeWon ? C.text : C.muted, fontWeight: homeWon ? 600 : 400 }}>{g.home?.score}</span>
                    <span style={{ padding: '1px 4px', background: homeMeta.color, color: '#fff', fontSize: 8.5, fontWeight: 700, borderRadius: 2 }}>{homeAbbr}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: C.muted }}>
                  <span>{awayWon ? awayAbbr : homeAbbr} {t('by')} {margin}</span>
                  {isUpset && <span style={{ color: C.amber, fontWeight: 600 }}>⚡ {t('blowout')}</span>}
                  {favInGame && <span style={{ color: favAbbr === (awayWon ? awayAbbr : homeAbbr) ? C.green : C.red, fontWeight: 600 }}>{favAbbr === (awayWon ? awayAbbr : homeAbbr) ? 'W' : 'L'}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
