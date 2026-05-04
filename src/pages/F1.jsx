import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
// v0.53.1 — Phase C redesign: 3-up Newsroom Slice. Gated UI.v2.
import NewsroomSlice from '../components/v2/NewsroomSlice.jsx';
import { UI } from '../lib/flags.js';
// v0.17.0 Phase 2 Sprint B — shared chrome row replacing the inline
// 200px F1 hero. eyebrow / h1 / LIVE chip / CopyLinkButton all
// collapsed into <HubStatusStrip> mounted via setTopbarSubrow.
// v0.18.0 Phase 2 Sprint C — ConstructorPicker, Chip, and
// CopyLinkButton imports removed: ConstructorPicker is now reached
// via <HubPicker kind="f1-team" />, the LIVE chip moved to
// <LiveStatusPill> globally, and CopyLinkButton was orphaned after
// Sprint B's hero strip.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import HubPicker from '../components/v2/HubPicker.jsx';
import { useQueryParamSync } from '../hooks/useQueryParamSync.js';
import F1News from '../components/F1News.jsx';
import ShareButton from '../components/ShareButton.jsx';
import SEOContent from '../components/SEOContent.jsx';
import { readableOnDark } from '../lib/contrast.js';
import { buildF1RaceShareText, buildF1RaceShareUrl } from '../lib/share.js';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Schedule } from '../hooks/useF1Schedule.js';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { useF1Results } from '../hooks/useF1Results.js';
import { useF1ChampionOdds } from '../hooks/useF1ChampionOdds.js';
import { TEAMS_BY_ID, nextGP, formatGPDate, SEASON } from '../lib/sports/f1/constants.js';

const F1_RED = '#E10600';
// v0.11.26 NEW-4 — F1 brand red is borderline 3.5:1 on dark navy.
// readableOnDark mixes toward white until 4.5:1. Use this everywhere
// the brand color is rendered as foreground text.
const F1_RED_TEXT = readableOnDark(F1_RED);

const CHAMPIONSHIP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: '2026 FIA Formula One World Championship',
  description: 'The 2026 Formula 1 World Championship — 23+ Grand Prix across four continents, new chassis + power unit regulations, Audi and Cadillac entering as constructors.',
  startDate: '2026-03-06',
  endDate: '2026-12-06',
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Formula 1',
  location: { '@type': 'Place', name: 'Worldwide' },
  organizer: { '@type': 'SportsOrganization', name: "Fédération Internationale de l'Automobile (FIA)", url: 'https://www.fia.com' },
  url: 'https://www.gibol.co/formula-1-2026',
};

// ─── Round strip (horizontal scroll, NBA day-scroller pattern) ──────────────
function RoundStrip({ races, activeRound, onSelect, resultsByRound, lang }) {
  const tabRefs = useRef({});
  const trackRef = useRef(null);

  // Center the active round whenever it changes (including on mount).
  useEffect(() => {
    const el = tabRefs.current[activeRound];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeRound]);

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    // v0.13.4 — id="calendar" for the MobileBottomNav F1 deep link.
    <div
      id="calendar"
      ref={trackRef}
      className="day-strip-scroll"
      style={{
        display: 'flex',
        overflowX: 'auto',
        background: C.panelSoft,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${F1_RED}`,
        borderRadius: 3,
        WebkitOverflowScrolling: 'touch',
        // v0.11.28 — RoundStrip contains 23 GP tabs, intrinsic width
        // ~2400+ px. min-width: 0 lets it shrink to its grid track.
        minWidth: 0,
        scrollMarginTop: 60,
      }}
    >
      {races.map((gp) => {
        const isActive = gp.round === activeRound;
        const hasResult = !!(resultsByRound && resultsByRound[gp.round]?.podium?.length);
        const isPast = hasResult || gp.dateISO < todayISO;
        const winner = hasResult ? resultsByRound[gp.round].podium[0] : null;
        return (
          <button
            key={gp.round}
            ref={(el) => { tabRefs.current[gp.round] = el; }}
            type="button"
            onClick={() => onSelect(gp.round)}
            style={{
              flex: '0 0 auto',
              minWidth: 112,
              padding: '10px 14px',
              background: isActive ? C.heroBg : 'transparent',
              border: 'none',
              borderRight: `1px solid ${C.lineSoft}`,
              borderBottom: isActive ? `3px solid ${F1_RED}` : '3px solid transparent',
              color: isActive ? C.text : C.dim,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <div style={{
              fontSize: 9.5, letterSpacing: 1, fontWeight: 700,
              color: isActive ? F1_RED : C.muted,
            }}>
              R{String(gp.round).padStart(2, '0')}
              {gp.sprint && <span style={{ marginLeft: 6, fontSize: 8, opacity: 0.8 }}>· S</span>}
            </div>
            <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
              {gp.name.replace(' GP', '')}
            </div>
            <div style={{ fontSize: 9.5, marginTop: 2, color: C.muted, letterSpacing: 0.3 }}>
              {formatGPDate(gp.dateISO, lang).replace(`, ${SEASON}`, '').replace(` ${SEASON}`, '')}
            </div>
            <div style={{ fontSize: 8.5, marginTop: 4, letterSpacing: 0.4 }}>
              {isPast && winner ? (
                <span style={{ color: F1_RED_TEXT, fontWeight: 700 }}>● {winner.code || winner.name.split(' ').pop()}</span>
              ) : isPast ? (
                <span style={{ color: C.muted }}>● {lang === 'id' ? 'selesai' : 'done'}</span>
              ) : (
                <span style={{ color: C.green }}>● {gp.wibTime} WIB</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Detail panel for the selected round ────────────────────────────────────
function RoundDetail({ gp, result, lang }) {
  if (!gp) return null;

  const countryLabel = lang === 'id' ? (gp.countryId || gp.country) : gp.country;
  const todayISO = new Date().toISOString().slice(0, 10);
  const hasPodium = !!(result?.podium?.length);
  const isPast = hasPodium || gp.dateISO < todayISO;

  // Days until race (positive = future, 0 = today, negative = past).
  const raceDate = new Date(gp.dateISO + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));

  let countdown;
  if (daysUntil === 0) countdown = lang === 'id' ? 'Hari ini' : 'Today';
  else if (daysUntil === 1) countdown = lang === 'id' ? 'Besok' : 'Tomorrow';
  else if (daysUntil > 1 && daysUntil <= 7) countdown = lang === 'id' ? `${daysUntil} hari lagi` : `in ${daysUntil} days`;
  else if (daysUntil < 0) countdown = lang === 'id' ? 'Selesai' : 'Completed';
  else countdown = lang === 'id' ? `${daysUntil} hari lagi` : `in ${daysUntil} days`;

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '16px 18px 14px',
    }}>
      {/* v0.12.3 M-3 — Header collapses to single column on mobile.
          Pre-fix: `auto 1fr auto` left only ~260 px for the round name
          on a 390 viewport, forcing "Circuit / de / Monaco / Jun / 7 /
          2026" to wrap one-word-per-line. Mobile now stacks: R-badge
          row above, name + circuit below. */}
      <div className="f1-round-header" style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'center',
        paddingBottom: 12,
        borderBottom: `1px solid ${C.lineSoft}`,
        marginBottom: 12,
      }}>
        <div className="f1-round-badge" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 48, color: F1_RED_TEXT, letterSpacing: -0.5,
          padding: '0 12px 0 0',
          borderRight: `1px solid ${C.lineSoft}`,
          lineHeight: 1,
        }}>
          R{String(gp.round).padStart(2, '0')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: F1_RED_TEXT, fontWeight: 700, marginBottom: 4 }}>
            {isPast
              ? (lang === 'id' ? 'HASIL BALAPAN' : 'RACE RESULT')
              : daysUntil <= 0
                ? (lang === 'id' ? 'BALAPAN HARI INI' : 'RACING TODAY')
                : (lang === 'id' ? 'BALAPAN BERIKUTNYA' : 'UPCOMING RACE')}
            {gp.sprint && <span style={{ marginLeft: 8, padding: '1px 5px', background: F1_RED, color: '#fff', borderRadius: 2, fontSize: 8 }}>SPRINT</span>}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: -0.2,
            lineHeight: 1.1, marginBottom: 6,
          }}>
            {gp.name} 2026
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
            {gp.circuit} · {countryLabel}
          </div>
          <div style={{ fontSize: 11, color: C.text, marginTop: 4, fontWeight: 500 }}>
            {formatGPDate(gp.dateISO, lang)} · {gp.wibTime} WIB
            {!isPast && <> · <span style={{ color: F1_RED_TEXT }}>{countdown}</span></>}
          </div>
        </div>
        {gp.slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Per-race share — becomes a FINAL recap post once result.podium
                lands, otherwise shares the upcoming-race countdown. WhatsApp /
                X / Threads / Copy channels; IG Story PNG deferred pending a
                multi-sport generalisation of /api/recap. */}
            <ShareButton
              url={buildF1RaceShareUrl(gp)}
              title={`${gp.name} 2026`}
              text={buildF1RaceShareText(gp, result, lang)}
              accent={F1_RED}
              size="sm"
              label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
              ariaLabel={lang === 'id'
                ? `Bagikan ${gp.name} 2026`
                : `Share ${gp.name} 2026`}
              analyticsEvent="f1_race_share"
            />
            <Link to={`/formula-1-2026/race/${gp.slug}`} style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11, fontWeight: 700,
              padding: '8px 14px',
              background: F1_RED, color: '#fff',
              borderRadius: 3,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: 0.3,
            }}>
              {lang === 'id' ? 'Detail →' : 'Details →'}
            </Link>
          </div>
        )}
      </div>

      {/* Body: podium if past with results, otherwise race info */}
      {hasPodium ? (
        <Podium podium={result.podium} lang={lang} />
      ) : isPast ? (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id'
            ? 'Hasil balapan belum masuk dari Jolpica-F1. Coba refresh beberapa menit lagi.'
            : 'Race results not yet available from Jolpica-F1. Try refreshing in a few minutes.'}
        </div>
      ) : (
        <UpcomingInfo gp={gp} lang={lang} />
      )}
    </section>
  );
}

// ─── Podium (top-3 finishers for past races) ────────────────────────────────
function Podium({ podium, lang }) {
  const labels = ['🥇', '🥈', '🥉'];
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'id' ? 'PODIUM' : 'PODIUM'}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {podium.map((p, i) => {
          const teamKey = Object.keys(TEAMS_BY_ID).find((k) => {
            const t = TEAMS_BY_ID[k];
            return t.name === p.teamName || t.short === p.teamName || p.teamName?.toLowerCase().includes(t.short.toLowerCase());
          });
          const accent = teamKey ? TEAMS_BY_ID[teamKey].accent : C.muted;
          return (
            <div key={p.code || i} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: 12,
              alignItems: 'center',
              padding: '8px 10px',
              background: i === 0 ? `${F1_RED}10` : C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 3,
            }}>
              <span style={{ fontSize: 18 }}>{labels[i]}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, lineHeight: 1.1 }}>
                  {p.name}
                  {p.code && <span style={{ marginLeft: 6, color: C.muted, fontSize: 10, letterSpacing: 0.5 }}>{p.code}</span>}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                  {p.teamName}
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: '"JetBrains Mono", monospace', textAlign: 'right' }}>
                {p.time || '—'}
              </div>
              <div style={{
                fontSize: 11, color: C.text, fontWeight: 700, textAlign: 'right',
                minWidth: 36,
              }}>
                {p.points} pt
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upcoming race info (schedule + circuit) ────────────────────────────────
function UpcomingInfo({ gp, lang }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'id' ? 'JADWAL BALAPAN · WIB' : 'RACE SCHEDULE · WIB'}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
      }}>
        <InfoBlock label={lang === 'id' ? 'LOMBA' : 'RACE'} value={`${gp.wibTime} WIB`} accent />
        <InfoBlock label={lang === 'id' ? 'TANGGAL' : 'DATE'} value={formatGPDate(gp.dateISO, lang)} />
        <InfoBlock label={lang === 'id' ? 'SIRKUIT' : 'CIRCUIT'} value={gp.circuit} />
        <InfoBlock
          label={lang === 'id' ? 'FORMAT' : 'FORMAT'}
          value={gp.sprint ? (lang === 'id' ? 'Sprint Weekend' : 'Sprint Weekend') : (lang === 'id' ? 'Standard' : 'Standard')}
        />
      </div>

      <div style={{ fontSize: 10, color: C.muted, marginTop: 10, letterSpacing: 0.3, lineHeight: 1.5 }}>
        {lang === 'id'
          ? 'Jadwal sesi FP, Kualifikasi, dan Sprint lengkap dalam WIB muncul di halaman detail race.'
          : 'Full FP, qualifying, and sprint session WIB times on the race detail page.'}
      </div>
    </div>
  );
}

function InfoBlock({ label, value, accent }) {
  return (
    <div style={{
      padding: '8px 10px',
      background: C.panelRow,
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 3,
    }}>
      <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.muted, fontWeight: 700 }}>{label}</div>
      <div style={{
        fontSize: 12, marginTop: 4,
        color: accent ? F1_RED_TEXT : C.text, fontWeight: accent ? 700 : 500,
        lineHeight: 1.25,
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Driver standings table ─────────────────────────────────────────────────
// v0.13.4 — `id="standings"` lives on the wrapping <section> below
// so the MobileBottomNav "Klasemen" deep link scrolls into view.
function DriverStandings({ drivers, loading, error, lang, selectedConstructor }) {
  return (
    <section id="standings" style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
      scrollMarginTop: 60,
    }}>
      <h2 className="panel-title-mono" style={{
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {/* v0.11.12 — explicit space between title and season so textContent
            flattens to "Drivers Standings 2026", not "Drivers Standings2026",
            for screen readers + analytics heading extractors. Visual gap
            comes from the span's marginLeft. */}
        {lang === 'id' ? 'Klasemen Pembalap' : 'Drivers Standings'}{' '}
        <span style={{ marginLeft: 8, fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 500 }}>
          {SEASON}
        </span>
      </h2>

      {error && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id' ? 'Data dari Jolpica-F1 lagi lambat. Muncul lagi kalau sudah nyambung.' : 'Data from Jolpica-F1 is slow. Will refresh when available.'}
        </div>
      )}

      {loading && drivers.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat klasemen…' : 'Loading standings…'}
        </div>
      )}

      {drivers.length === 0 && !loading && !error && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada balapan. Klasemen akan muncul setelah Australian GP.' : 'No races yet. Standings appear after the Australian GP.'}
        </div>
      )}

      {drivers.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'PEMBALAP' : 'DRIVER'}</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'TIM' : 'TEAM'}</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', width: 40 }}>W</th>
              <th style={{ textAlign: 'right', padding: '4px 0', width: 48 }}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d, i) => {
              const teamMeta = d.teamId ? TEAMS_BY_ID[d.teamId] : null;
              const accent = teamMeta?.accent || C.muted;
              const isHighlighted = selectedConstructor && d.teamId === selectedConstructor;
              return (
                <tr key={d.code || i} style={{
                  borderTop: `1px solid ${C.lineSoft}`,
                  background: isHighlighted ? `${accent}18` : 'transparent',
                }}>
                  <td style={{ padding: '6px 0', color: i === 0 ? F1_RED : C.dim, fontWeight: i === 0 ? 700 : 500 }}>
                    {d.position ?? i + 1}
                  </td>
                  <td style={{ padding: '6px 0', color: C.text, fontWeight: 500 }}>
                    <span style={{
                      display: 'inline-block', width: isHighlighted ? 4 : 3, height: 14,
                      background: accent, verticalAlign: 'middle', marginRight: 8,
                    }} />
                    {d.slug ? (
                      <Link to={`/formula-1-2026/driver/${d.slug}`} style={{ color: C.text, textDecoration: 'none', fontWeight: isHighlighted ? 700 : 500 }}>
                        {d.name}
                      </Link>
                    ) : (
                      d.name
                    )}
                    {d.code && <span style={{ marginLeft: 6, color: C.muted, fontSize: 9.5, letterSpacing: 0.5 }}>{d.code}</span>}
                  </td>
                  <td style={{ padding: '6px 0', color: C.dim }}>
                    {teamMeta?.slug ? (
                      <Link to={`/formula-1-2026/team/${teamMeta.slug}`} style={{ color: isHighlighted ? accent : C.dim, textDecoration: 'none', fontWeight: isHighlighted ? 600 : 400 }}>
                        {teamMeta.short}
                      </Link>
                    ) : (
                      teamMeta?.short || d.teamName || '—'
                    )}
                  </td>
                  <td style={{ padding: '6px 6px', color: C.dim, textAlign: 'right' }}>{d.wins || 0}</td>
                  <td style={{ padding: '6px 0', color: C.text, textAlign: 'right', fontWeight: 600 }}>{d.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ fontSize: 9, color: C.muted, padding: '8px 0 2px', letterSpacing: 0.3 }}>
        {lang === 'id' ? 'Data: Jolpica-F1 · refresh tiap 5 menit' : 'Data: Jolpica-F1 · refreshed every 5 min'}
      </div>
    </section>
  );
}

// ─── Constructor standings table ────────────────────────────────────────────
function ConstructorStandings({ teams, loading, error, lang, selectedConstructor }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <h2 className="panel-title-mono" style={{
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Klasemen Konstruktor' : 'Constructors Standings'}
      </h2>

      {error && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id' ? 'Data lagi lambat.' : 'Data is slow.'}
        </div>
      )}

      {loading && teams.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat…' : 'Loading…'}
        </div>
      )}

      {teams.length === 0 && !loading && !error && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada poin. Mulai 8 Mar.' : 'No points yet. Season starts Mar 8.'}
        </div>
      )}

      {teams.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'KONSTRUKTOR' : 'CONSTRUCTOR'}</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', width: 40 }}>W</th>
              <th style={{ textAlign: 'right', padding: '4px 0', width: 48 }}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => {
              const teamMeta = t.id ? TEAMS_BY_ID[t.id] : null;
              const isHighlighted = selectedConstructor && t.id === selectedConstructor;
              return (
                <tr key={t.id || i} style={{
                  borderTop: `1px solid ${C.lineSoft}`,
                  background: isHighlighted ? `${t.accent}18` : 'transparent',
                }}>
                  <td style={{ padding: '6px 0', color: i === 0 ? F1_RED : C.dim, fontWeight: i === 0 ? 700 : 500 }}>
                    {t.position ?? i + 1}
                  </td>
                  <td style={{ padding: '6px 0', color: C.text, fontWeight: isHighlighted ? 700 : 500 }}>
                    <span style={{
                      display: 'inline-block', width: isHighlighted ? 4 : 3, height: 14,
                      background: t.accent, verticalAlign: 'middle', marginRight: 8,
                    }} />
                    {teamMeta?.slug ? (
                      <Link to={`/formula-1-2026/team/${teamMeta.slug}`} style={{ color: C.text, textDecoration: 'none' }}>
                        {t.short || t.name}
                      </Link>
                    ) : (
                      t.short || t.name
                    )}
                  </td>
                  <td style={{ padding: '6px 6px', color: C.dim, textAlign: 'right' }}>{t.wins || 0}</td>
                  <td style={{ padding: '6px 0', color: C.text, textAlign: 'right', fontWeight: 600 }}>{t.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ─── Context strip (NBA/EPL parity) ─────────────────────────────────────────
// Four-cell strip with the season's most important context at a glance.
//
// Cells:
//   · NEXT RACE          — upcoming GP name + days-until countdown
//   · DRIVERS LEADER     — top driver + points gap to 2nd
//   · CONSTRUCTOR LEADER — top team + points gap to 2nd
//   · CHAMPION ODDS      — top Polymarket champion-odds entry (live)
//
// Before the season starts, DRIVERS/CONSTRUCTOR cells show "Musim belum
// mulai" and we lean on the next-race + champion-odds cells for signal.
function F1ContextStrip({ drivers, teams, races, championOdds, lang }) {
  const next = useMemo(() => nextGP(), []);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Countdown to next race (positive = future, 0 = race day, negative = season over).
  let countdown = null;
  if (next) {
    const raceDate = new Date(next.dateISO + 'T00:00:00Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));
    if (days === 0) countdown = lang === 'id' ? 'Hari ini' : 'Today';
    else if (days === 1) countdown = lang === 'id' ? 'Besok' : 'Tomorrow';
    else if (days > 1) countdown = lang === 'id' ? `${days} hari lagi` : `in ${days} days`;
    else countdown = lang === 'id' ? 'Selesai' : 'Done';
  }

  const leader = drivers?.[0] || null;
  const driverGap = drivers && drivers.length >= 2
    ? (drivers[0].points - drivers[1].points)
    : null;

  const topTeam = teams?.[0] || null;
  const teamGap = teams && teams.length >= 2
    ? (teams[0].points - teams[1].points)
    : null;

  const titleFav = (championOdds || [])[0];

  const cell = (label, valueNode, accent, sub) => (
    <div style={{
      padding: '12px 14px',
      borderRight: `1px solid ${C.lineSoft}`,
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: 1,
        color: accent ? readableOnDark(accent) : C.muted,
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 18,
        fontWeight: 700,
        color: C.text,
        letterSpacing: '-0.01em',
        lineHeight: 1.15,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {valueNode}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: C.muted,
          letterSpacing: 0.3,
          marginTop: 4,
        }}>
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <section className="stat-strip-2col" style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    }}>
      {cell(
        lang === 'id' ? 'BALAPAN BERIKUT' : 'NEXT RACE',
        next ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: F1_RED }} />
            {next.name.replace(' GP', '')}
            {countdown && (
              <span style={{ color: F1_RED_TEXT, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                {countdown.replace(lang === 'id' ? ' hari lagi' : 'in ', '').replace(' days', 'd')}
              </span>
            )}
          </span>
        ) : '—',
        F1_RED,
        next ? `${formatGPDate(next.dateISO, lang)} · ${next.wibTime} WIB` : (lang === 'id' ? 'Kalender musim' : 'Season calendar')
      )}

      {cell(
        lang === 'id' ? 'PEMIMPIN PEMBALAP' : 'DRIVERS LEADER',
        leader ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: TEAMS_BY_ID[leader.teamId]?.accent || F1_RED }} />
            {leader.name}
            <span style={{ color: '#10B981', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              {leader.points} pt
            </span>
          </span>
        ) : (lang === 'id' ? 'Musim belum mulai' : 'Season not started'),
        '#10B981',
        leader && driverGap !== null
          ? `+${driverGap} ${lang === 'id' ? 'ke P2' : 'to P2'}`
          : (lang === 'id' ? 'Australian GP · 8 Mar' : 'Australian GP · Mar 8')
      )}

      {cell(
        lang === 'id' ? 'PEMIMPIN KONSTRUKTOR' : 'CONSTRUCTOR LEADER',
        topTeam ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 16, background: topTeam.accent || F1_RED }} />
            {topTeam.short || topTeam.name}
            <span style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              {topTeam.points} pt
            </span>
          </span>
        ) : (lang === 'id' ? 'Musim belum mulai' : 'Season not started'),
        '#2563EB',
        topTeam && teamGap !== null
          ? `+${teamGap} ${lang === 'id' ? 'ke P2' : 'to P2'}`
          : (lang === 'id' ? '11 tim · regulasi baru' : '11 teams · new regs')
      )}

      <div style={{ padding: '12px 14px', minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, letterSpacing: 1,
          color: '#A855F7', fontWeight: 700,
          marginBottom: 4,
        }}>
          {lang === 'id' ? 'FAVORIT JUARA' : 'CHAMPION FAVORITE'}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 18, fontWeight: 700, color: C.text,
          letterSpacing: '-0.01em', lineHeight: 1.15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titleFav ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 3, height: 16,
                background: titleFav.team?.accent || '#A855F7',
              }} />
              {titleFav.canonicalName || titleFav.name}
              <span style={{ color: '#A855F7', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                {titleFav.pct}%
              </span>
            </span>
          ) : '—'}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, color: C.muted, letterSpacing: 0.3, marginTop: 4,
        }}>
          {lang === 'id' ? 'Polymarket · live' : 'Polymarket · live'}
        </div>
      </div>
    </section>
  );
}

// ─── F1 title odds (top 6 champion favorites) ───────────────────────────────
// Parallels the EPL PeluangJuara. Renders the top 6 Polymarket entries with
// accent-tinted horizontal bars, % value, and delta vs last poll. Hidden
// entirely when the hook returns nothing (market gone / proxy down).
function F1PeluangJuara({ odds, lang }) {
  if (!odds || odds.length === 0) return null;
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${F1_RED}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 10,
      }}>
        <h2 className="panel-title-mono" style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Peluang juara' : 'Championship odds'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {lang === 'id' ? 'POLYMARKET · LIVE' : 'POLYMARKET · LIVE'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        {odds.slice(0, 6).map((o) => {
          const displayName = o.canonicalName || o.name;
          const accent = o.team?.accent || F1_RED;
          const pct = Math.max(1, Math.min(100, o.pct));
          const changeColor = o.change > 0 ? C.green : o.change < 0 ? C.red : C.muted;
          const changeSign = o.change > 0 ? '+' : '';
          const driverSlug = o.driver?.slug;
          return (
            <div
              key={o.name}
              style={{
                display: 'grid',
                // Mobile-friendly: see EPL.jsx title-odds grid note.
                gridTemplateColumns: 'minmax(100px, 1.4fr) 1fr 48px 36px',
                gap: 10,
                alignItems: 'center',
                padding: '7px 10px',
                background: C.panelRow,
                border: `1px solid ${C.lineSoft}`,
                borderLeft: `2px solid ${accent}`,
                borderRadius: 3,
                fontSize: 11.5,
              }}
            >
              <div style={{
                color: C.text, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {driverSlug ? (
                  <Link
                    to={`/formula-1-2026/driver/${driverSlug}`}
                    style={{ color: C.text, textDecoration: 'none' }}
                  >
                    {displayName}
                  </Link>
                ) : displayName}
                {o.driver?.code && (
                  <span style={{ marginLeft: 6, color: C.muted, fontSize: 9.5, letterSpacing: 0.5 }}>
                    {o.driver.code}
                  </span>
                )}
              </div>
              <div style={{
                height: 8, background: C.panel2,
                borderRadius: 2, overflow: 'hidden', position: 'relative',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: accent,
                  transition: 'width 400ms var(--ease-standard, ease-out)',
                }} />
              </div>
              <div style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: 13, fontWeight: 700, color: C.text,
              }}>
                {o.pct}%
              </div>
              <div style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: 10, fontWeight: 600, color: changeColor,
              }}>
                {o.change !== 0 ? `${changeSign}${o.change}` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        fontSize: 9, color: C.muted, letterSpacing: 0.3,
        marginTop: 8, lineHeight: 1.4,
      }}>
        {lang === 'id'
          ? 'Probabilitas pasar prediksi Polymarket. Update tiap 60 detik. Hanya pembalap dengan peluang >0% yang ditampilkan.'
          : 'Polymarket prediction-market probabilities. Refreshes every 60s. Only drivers with >0% odds shown.'}
      </div>
    </section>
  );
}

// ─── F1 key accounts (X/Twitter) ────────────────────────────────────────────
// Parallel to TennisKeyAccounts / EPL AkunResmi. Surfaces the essential F1
// social handles. When a constructor is picked, we swap in its team handle
// and the top driver for that team (from DRIVERS_BY_TEAM, if the constants
// ever gain a `handle` field — today we fall back to a generic label).
//
// Handles verified current as of Apr 2026.
function F1KeyAccounts({ selectedConstructor, accentColor, lang }) {
  const team = selectedConstructor ? TEAMS_BY_ID[selectedConstructor] : null;

  // Curated per-team X handles — verified active as of Apr 2026.
  const TEAM_HANDLES = {
    red_bull: 'redbullracing',
    mclaren: 'McLarenF1',
    ferrari: 'ScuderiaFerrari',
    mercedes: 'MercedesAMGF1',
    aston_martin: 'AstonMartinF1',
    alpine: 'AlpineF1Team',
    williams: 'WilliamsRacing',
    rb: 'VisaRBF1Team',
    sauber_audi: 'AudiOfficial',
    haas: 'HaasF1Team',
    cadillac: 'CadillacF1Team',
  };

  const rows = [
    { handle: 'F1', label: 'Formula 1 (official)' },
    { handle: 'fia', label: 'FIA' },
  ];
  if (team && TEAM_HANDLES[team.id]) {
    rows.push({
      handle: TEAM_HANDLES[team.id],
      label: `${team.short} · ${lang === 'id' ? 'tim kamu' : 'your team'}`,
    });
  }
  rows.push(
    { handle: 'SkySportsF1', label: 'Sky Sports F1' },
    { handle: 'WTF1official', label: 'WTF1 (fans)' },
  );

  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{
        fontSize: 10, letterSpacing: 1.2, color: C.muted,
        fontWeight: 700, marginBottom: 10,
      }}>
        {lang === 'id' ? 'AKUN RESMI · X / TWITTER' : 'KEY ACCOUNTS · X / TWITTER'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 6,
      }}>
        {rows.map((r) => (
          <a
            key={r.handle}
            href={`https://x.com/${r.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10, alignItems: 'center',
              padding: '8px 10px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
              textDecoration: 'none',
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: C.text, fontFamily: 'var(--font-mono)' }}>
                @{r.handle}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                {r.label}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.5 }}>↗</div>
          </a>
        ))}
      </div>
      {!team && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 8, letterSpacing: 0.3 }}>
          {lang === 'id'
            ? 'Pilih tim di kanan atas buat munculin handle tim kamu.'
            : 'Pick a team top-right to surface that team\u2019s handle.'}
        </div>
      )}
    </section>
  );
}

// ─── Disclaimer footer ──────────────────────────────────────────────────────
function Disclaimer({ lang }) {
  return (
    <div style={{
      padding: '10px 14px',
      fontSize: 10, color: C.muted, lineHeight: 1.5,
      borderTop: `1px solid ${C.lineSoft}`,
    }}>
      {lang === 'id'
        ? 'Gibol adalah media olahraga independen Indonesia. Tidak berafiliasi dengan FIA, Formula 1, atau tim/pembalap manapun. Data: Jolpica-F1 · OpenF1.'
        : 'Gibol is an independent Indonesian sports media site. Not affiliated with FIA, Formula 1, or any team/driver. Data: Jolpica-F1 · OpenF1.'}
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function F1() {
  const location = useLocation();
  const { lang, selectedConstructor, setSelectedConstructor, t } = useApp();
  // v0.11.8 — URL ↔ constructor sync. ?team=mclaren restores the pick.
  useQueryParamSync('team', selectedConstructor, setSelectedConstructor);
  const { races, source } = useF1Schedule();
  const { drivers, teams, loading, error } = useF1Standings();
  const { resultsByRound } = useF1Results();
  const { odds: championOdds } = useF1ChampionOdds();

  // v0.2.5 — if a constructor is picked, tint the dashboard chrome with its
  // accent. Falls back to the F1 brand red.
  const activeAccent = (selectedConstructor && TEAMS_BY_ID[selectedConstructor]?.accent) || F1_RED;
  const pickedTeam = selectedConstructor ? TEAMS_BY_ID[selectedConstructor] : null;

  // Default active round = next upcoming GP. Recomputed once races load.
  const initialRound = useMemo(() => nextGP()?.round || 1, []);
  const [activeRound, setActiveRound] = useState(initialRound);

  const activeGP = useMemo(
    () => races.find((gp) => gp.round === activeRound) || null,
    [races, activeRound]
  );
  const activeResult = resultsByRound?.[activeRound] || null;

  // v0.17.0 Phase 2 Sprint B — push <HubStatusStrip> into the V2TopBar
  // subrow. Replaces both the previous flex-end-aligned subrow (just
  // a constructor picker) AND the inline 200px hero block below
  // (eyebrow + 36px h1 + LIVE chip + CopyLinkButton). Picker now docks
  // top-left of the strip per directive §4 ("Picker stays subrow,
  // top-right today, moves to top-left for consistency with NBA / EPL
  // / Tennis"). The SEO h1 rides as `.sr-only` inside the strip.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={pickedTeam
          ? `${pickedTeam.name} · Formula 1 ${SEASON}`
          : `Formula 1 ${SEASON}`}
        accent={pickedTeam ? activeAccent : undefined}
        picker={
          <HubPicker
            kind="f1-team"
            selectedKey={selectedConstructor}
            onSelect={setSelectedConstructor}
          />
        }
        live={
          <span style={{ textTransform: 'uppercase' }}>
            FORMULA 1 · {t('season')} {SEASON}
            {pickedTeam && (
              <span style={{ marginLeft: 8, color: C.muted, fontWeight: 500 }}>
                · <Link
                    to={`/formula-1-2026/team/${pickedTeam.slug}`}
                    style={{ color: readableOnDark(activeAccent), textDecoration: 'none', fontWeight: 700 }}
                  >{pickedTeam.short}</Link>
              </span>
            )}
          </span>
        }
        actions={
          <HubActionRow
            url={pickedTeam ? `/formula-1-2026?team=${pickedTeam.slug}` : '/formula-1-2026'}
            shareText={pickedTeam
              ? (lang === 'id' ? `${pickedTeam.name} · F1 ${SEASON} di gibol.co 🏎️` : `${pickedTeam.name} · F1 ${SEASON} on gibol.co 🏎️`)
              : (lang === 'id' ? `Klasemen + kalender F1 ${SEASON} di gibol.co 🏎️` : `F1 ${SEASON} standings + calendar on gibol.co 🏎️`)}
            accent={F1_RED}
            analyticsEvent="f1_share_hub"
          />
        }
      />
    );
    return () => setTopbarSubrow(null);
  }, [selectedConstructor, setSelectedConstructor, pickedTeam, activeAccent, lang, t]);

  const baseTitle = lang === 'id'
    ? 'Formula 1 2026 · Klasemen Pembalap, Jadwal 23 GP (WIB), Hasil Live | gibol.co'
    : 'Formula 1 2026 · Driver Standings, 23 GP Calendar (WIB), Live Results | gibol.co';
  // v0.11.23 GIB-018 — when a constructor is picked, lead the title (and
  // og:title) with that team so a deep-link share unfurls topical, not
  // generic. og:url + canonical also reflect the ?team= so the share URL
  // and the rendered page match.
  const title = pickedTeam
    ? (lang === 'id'
        ? `${pickedTeam.name} · Formula 1 ${SEASON} | gibol.co`
        : `${pickedTeam.name} · Formula 1 ${SEASON} | gibol.co`)
    : baseTitle;
  const baseDescription = lang === 'id'
    ? `Dashboard live F1 ${SEASON} dalam Bahasa Indonesia — klasemen pembalap + konstruktor, kalender 23 Grand Prix dengan jam start WIB, hasil balapan terbaru, podium, dan tracking juara.`
    : `Live F1 ${SEASON} dashboard in Bahasa Indonesia — driver + constructor standings, 23-GP calendar with WIB start times, latest race results, podium, and championship tracking.`;
  const description = pickedTeam
    ? (lang === 'id'
        ? `Halaman ${pickedTeam.name} di hub F1 ${SEASON} — klasemen pembalap + konstruktor, kalender 23 GP (WIB), hasil balapan, podium. ${baseDescription}`
        : `${pickedTeam.name} view on the F1 ${SEASON} hub — driver + constructor standings, 23-GP calendar in WIB, race results, podium. ${baseDescription}`)
    : baseDescription;
  const seoPath = pickedTeam ? `${location.pathname}?team=${pickedTeam.slug}` : location.pathname;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={seoPath}
        image="https://www.gibol.co/og/hub-f1.png"
        lang={lang}
        keywords="formula 1 2026, f1 2026, klasemen f1, jadwal f1 2026, hasil grand prix, peluang juara f1, max verstappen, lando norris, lewis hamilton, charles leclerc, oscar piastri, f1 bahasa indonesia"
        jsonLd={CHAMPIONSHIP_JSONLD}
      />
      <div className="dashboard-wrap">
        {/* v0.17.0 Phase 2 Sprint B — visible 200px hero stripped.
            Eyebrow + 36px h1 + LIVE chip + CopyLinkButton all
            collapsed into <HubStatusStrip> in the V2TopBar subrow.
            SEO h1 rides as `.sr-only` inside the strip. The calendar
            scroller below now sits ~140px closer to the top of the
            viewport — three race rounds visible above the fold on
            iPhone 14 instead of one. */}

        <div style={{ padding: '8px 24px 20px', display: 'grid', gap: 14, minWidth: 0 }}>
          {/* v0.11.25 layout — Calendar (round-by-round scroller +
              detail) is the F1 hero. Context strip + championship
              odds slot below it. NBA pattern. */}

          {/* ── Row 1 — Round-by-round calendar (the hero). ── */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                color: C.text, letterSpacing: -0.2,
              }}>
                {lang === 'id' ? 'Kalender 2026 · geser kiri-kanan' : '2026 Calendar · swipe'}
              </div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
                {races.length} {lang === 'id' ? 'BALAPAN' : 'ROUNDS'} ·{' '}
                {source === 'jolpica'
                  ? (lang === 'id' ? 'Jolpica-F1 live' : 'Jolpica-F1 live')
                  : (lang === 'id' ? 'snapshot lokal' : 'local snapshot')}
              </div>
            </div>
            <RoundStrip
              races={races}
              activeRound={activeRound}
              onSelect={setActiveRound}
              resultsByRound={resultsByRound}
              lang={lang}
            />
            <RoundDetail gp={activeGP} result={activeResult} lang={lang} />
          </div>

          {/* ── Row 2 — Context strip: next race, leaders, title
              favorite. Demoted from above the calendar. ── */}
          <F1ContextStrip
            drivers={drivers}
            teams={teams}
            races={races}
            championOdds={championOdds}
            lang={lang}
          />

          {/* ── Row 3 — Peluang juara, top 6. ── */}
          <F1PeluangJuara odds={championOdds} lang={lang} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}>
            <DriverStandings drivers={drivers} loading={loading} error={error} lang={lang} selectedConstructor={selectedConstructor} />
            <ConstructorStandings teams={teams} loading={loading} error={error} lang={lang} selectedConstructor={selectedConstructor} />
            <F1News />
          </div>

          {/* Key accounts — X/Twitter handles for F1, FIA, picked team, and
              two global fan/broadcast feeds. Parallels Tennis + EPL. */}
          <F1KeyAccounts
            selectedConstructor={selectedConstructor}
            accentColor={activeAccent}
            lang={lang}
          />
        </div>

        {/* v0.53.1 — Phase C redesign: NewsroomSlice. UI.v2-gated. */}
        {UI.v2 && (
          <div style={{ padding: '0 16px 24px' }}>
            <NewsroomSlice
              sport="f1"
              newsroomLabel="FORMULA 1 NEWSROOM"
              moreHref="/formula-1-2026#newsroom"
            />
          </div>
        )}

        {/* v0.11.25 — F1 SEO/FAQ block at the bottom. */}
        <SEOContent lang={lang} sport="f1" />

        <Disclaimer lang={lang} />

        <footer role="contentinfo" style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · F1 Indonesia</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'semua dashboard' : 'all dashboards'}</a></div>
        </footer>
      </div>
    </div>
  );
}
