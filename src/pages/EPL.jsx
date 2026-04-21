import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Chip from '../components/Chip.jsx';
import ShareButton from '../components/ShareButton.jsx';
import FangirBanner from '../components/FangirBanner.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useEPLStandings } from '../hooks/useEPLStandings.js';
import { useEPLFixtures } from '../hooks/useEPLFixtures.js';
import { useEPLScorers } from '../hooks/useEPLScorers.js';
import {
  SEASON, SEASON_START, SEASON_END, CLUBS, formatFixtureDate,
} from '../lib/sports/epl/clubs.js';

const EPL_PURPLE = '#37003C';

// ─── Share helpers (EPL fixture share-text builders) ─────────────────────────
// Bahasa-casual, emoji-inflected. Mirror of the NBA helpers in DayScoreboard
// but EPL-specific (⚽, vs, statusDetail, WIB kickoff).

function buildLiveShareText(m, lang) {
  // ARS 2 – 1 MCI · 67' · live di gibol.co ⚽
  const h = m.home?.shortName || m.home?.name || '—';
  const a = m.away?.shortName || m.away?.name || '—';
  const hs = m.home?.score ?? '0';
  const as = m.away?.score ?? '0';
  const clock = m.statusDetail ? ` · ${m.statusDetail}` : '';
  return lang === 'id'
    ? `${h} ${hs} – ${as} ${a}${clock} · live-update-nya di gibol.co ⚽`
    : `${h} ${hs} – ${as} ${a}${clock} · live on gibol.co ⚽`;
}

function buildUpcomingShareText(m, lang) {
  // ARS vs MCI · Sab 26 Apr · 21:00 WIB · jadwal di gibol.co ⚽
  const h = m.home?.name || '—';
  const a = m.away?.name || '—';
  const when = formatFixtureDate(m.kickoffUtc, lang);
  return lang === 'id'
    ? `${h} vs ${a} · ${when} · jadwal di gibol.co ⚽`
    : `${h} vs ${a} · ${when} · schedule on gibol.co ⚽`;
}

function buildFinalShareText(m, lang) {
  const h = m.home?.shortName || m.home?.name || '—';
  const a = m.away?.shortName || m.away?.name || '—';
  return lang === 'id'
    ? `FINAL · ${h} ${m.homeScore} – ${m.awayScore} ${a} · recap di gibol.co ⚽`
    : `FINAL · ${h} ${m.homeScore} – ${m.awayScore} ${a} · recap on gibol.co ⚽`;
}

// Per-match share URL — dashboard with a hash-anchor fallback. Match-detail
// pages don't exist yet, so this drives to the dashboard + club pages today.
function matchShareUrl(m) {
  return `https://www.gibol.co/premier-league-2025-26#${m.id || ''}`;
}

/**
 * Premier League 2025-26 dashboard — v0.4.0 Phase 1A.
 *
 * Four sections, all Bahasa-first:
 *   1. Hero                        — Step 6 spec (Space Grotesk 36/700/-0.025em)
 *   2. Klasemen 20 klub             — with form guide + qualification zones
 *   3. Jadwal minggu ini            — next 14 days (WIB)
 *   4. Hasil terbaru + Top skor     — side-by-side on ≥680px
 *
 * Data:
 *   - ESPN soccer/eng.1 standings (proxied via espn-v2)
 *   - ESPN soccer/eng.1 scoreboard (proxied via espn)
 *   - ESPN soccer/eng.1 leaders (proxied via espn-common)
 *
 * Design grammar follows F1.jsx — same panel frame, same type scale, same
 * borderLeft accent, same table styling. Differs only in sport accent (PL
 * purple) and section content. Future footie sports (FIFA WC, Liga 1) can
 * rhyme this structure directly.
 */

const EPL_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `Premier League ${SEASON}`,
  description: `The ${SEASON} English Premier League season — 20 clubs, 380 matches. Title race, Champions League qualification, and relegation tracked live in Bahasa.`,
  startDate: SEASON_START,
  endDate: SEASON_END,
  eventStatus: 'https://schema.org/EventScheduled',
  sport: 'Soccer',
  location: { '@type': 'Place', name: 'England & Wales' },
  organizer: {
    '@type': 'SportsOrganization',
    name: 'The Premier League',
    url: 'https://www.premierleague.com',
  },
  url: 'https://www.gibol.co/premier-league-2025-26',
};

// ─── Zone helpers ────────────────────────────────────────────────────────────
// 1–4: UCL · 5: Europa (League Cup winner bumps to Conf) · 6: Conference playoff
// 18–20: degradasi (relegation). Tints are soft — 1dh hex alpha.
function zoneFor(rank) {
  if (!rank) return null;
  if (rank <= 4) return { key: 'ucl',   color: '#2563EB', label: 'UCL' };
  if (rank === 5) return { key: 'uel',  color: '#F59E0B', label: 'UEL' };
  if (rank === 6) return { key: 'uecl', color: '#10B981', label: 'UECL' };
  if (rank >= 18) return { key: 'rel',  color: '#EF4444', label: 'REL' };
  return null;
}

// ─── Form guide pill ─────────────────────────────────────────────────────────
// W → green (M), D → amber (S), L → red (K). Bahasa letters when lang=id.
function FormPill({ char, lang }) {
  const letter = lang === 'id'
    ? ({ W: 'M', D: 'S', L: 'K' }[char] || '·')
    : (char || '·');
  const color = char === 'W' ? '#10B981'
              : char === 'D' ? '#F59E0B'
              : char === 'L' ? '#EF4444'
              : C.muted;
  return (
    <span style={{
      display: 'inline-block',
      width: 16, height: 16,
      borderRadius: 2,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      fontSize: 9, fontWeight: 700,
      textAlign: 'center', lineHeight: '14px',
      marginRight: 2,
      letterSpacing: 0,
      fontFamily: 'var(--font-mono)',
    }}>{letter}</span>
  );
}

// ─── Klasemen ────────────────────────────────────────────────────────────────
function Klasemen({ rows, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${EPL_PURPLE}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Klasemen 20 klub' : '20-Club Table'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {lang === 'id' ? 'FORM · 5 LAGA TERAKHIR' : 'FORM · LAST 5'}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
          {lang === 'id' ? 'Data ESPN lagi lambat. Muncul lagi otomatis.' : 'ESPN data slow — will refresh.'}
        </div>
      )}

      {!error && loading && rows.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Memuat…' : 'Loading…'}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 560 }}>
            <thead>
              <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: '4px 0', width: 28 }}>#</th>
                <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'KLUB' : 'CLUB'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 34 }}>{lang === 'id' ? 'MAIN' : 'P'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 28 }}>{lang === 'id' ? 'M' : 'W'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 28 }}>{lang === 'id' ? 'S' : 'D'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 28 }}>{lang === 'id' ? 'K' : 'L'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 40 }}>{lang === 'id' ? 'SG' : 'GD'}</th>
                <th style={{ textAlign: 'right', padding: '4px 4px', width: 42 }}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
                <th style={{ textAlign: 'left', padding: '4px 4px', width: 110 }}>{lang === 'id' ? 'FORM' : 'FORM'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const zone = zoneFor(r.rank || i + 1);
                return (
                  <tr key={r.teamId || i} style={{
                    borderTop: `1px solid ${C.lineSoft}`,
                    background: zone ? `${zone.color}0d` : 'transparent',
                  }}>
                    <td style={{ padding: '6px 0', color: zone ? zone.color : C.dim, fontWeight: zone ? 700 : 500 }}>
                      {r.rank || i + 1}
                    </td>
                    <td style={{ padding: '6px 0', color: C.text, fontWeight: 500 }}>
                      <span style={{
                        display: 'inline-block', width: 3, height: 14,
                        background: r.clubAccent, verticalAlign: 'middle', marginRight: 8,
                      }} />
                      {r.slug ? (
                        <Link
                          to={`/premier-league-2025-26/club/${r.slug}`}
                          style={{ color: C.text, textDecoration: 'none', fontWeight: 500 }}
                        >
                          {r.clubName}
                        </Link>
                      ) : r.clubName}
                    </td>
                    <td style={{ padding: '6px 4px', color: C.dim, textAlign: 'right' }}>{r.games}</td>
                    <td style={{ padding: '6px 4px', color: C.dim, textAlign: 'right' }}>{r.wins}</td>
                    <td style={{ padding: '6px 4px', color: C.dim, textAlign: 'right' }}>{r.draws}</td>
                    <td style={{ padding: '6px 4px', color: C.dim, textAlign: 'right' }}>{r.losses}</td>
                    <td style={{ padding: '6px 4px', color: r.goalDiff >= 0 ? C.green : C.red, textAlign: 'right', fontWeight: 500 }}>
                      {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                    </td>
                    <td style={{ padding: '6px 4px', color: C.text, textAlign: 'right', fontWeight: 700 }}>
                      {r.points}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      {r.form && r.form.length > 0
                        ? r.form.split('').map((c, idx) => <FormPill key={idx} char={c} lang={lang} />)
                        : <span style={{ color: C.muted, fontSize: 10 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone legend */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        fontSize: 9, color: C.muted, letterSpacing: 0.3,
        padding: '10px 0 2px', borderTop: `1px solid ${C.lineSoft}`, marginTop: 6,
      }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2563EB', marginRight: 4, verticalAlign: 'middle' }} />{lang === 'id' ? 'Liga Champions (1–4)' : 'Champions League (1–4)'}</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#F59E0B', marginRight: 4, verticalAlign: 'middle' }} />{lang === 'id' ? 'Liga Europa (5)' : 'Europa League (5)'}</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10B981', marginRight: 4, verticalAlign: 'middle' }} />{lang === 'id' ? 'Conference (6)' : 'Conference (6)'}</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#EF4444', marginRight: 4, verticalAlign: 'middle' }} />{lang === 'id' ? 'Zona degradasi (18–20)' : 'Relegation (18–20)'}</span>
      </div>
    </section>
  );
}

// ─── Live spotlight ──────────────────────────────────────────────────────────
// Renders any currently-live matches prominently at the top. Empty if there
// are none — the section disappears cleanly on off-days so the dashboard
// doesn't carry dead chrome. Live matches read from upcoming[] where
// statusState === 'in' (ESPN's in-progress state).
function LiveSpotlight({ live, lang }) {
  if (!live || live.length === 0) return null;
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${C.red}`,
      borderRadius: 3,
      padding: '14px 14px 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="live-dot" aria-hidden="true" />
          {lang === 'id' ? 'Sedang main' : 'Live now'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {live.length} {lang === 'id' ? 'LAGA LIVE' : 'LIVE'}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {live.map((m) => (
          <div key={m.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 84px 1fr auto',
            gap: 10, alignItems: 'center',
            padding: '10px 12px',
            background: C.panelRow,
            border: `1px solid ${C.lineSoft}`,
            borderRadius: 3,
            fontSize: 12,
          }}>
            <div style={{ color: C.text, textAlign: 'right', fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: 3, height: 14, background: m.home.accent, verticalAlign: 'middle', marginRight: 6 }} />
              {m.home.slug ? (
                <Link to={`/premier-league-2025-26/club/${m.home.slug}`} style={{ color: C.text, textDecoration: 'none' }}>
                  {m.home.name}
                </Link>
              ) : m.home.name}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {m.home.score ?? '-'}–{m.away.score ?? '-'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.red, letterSpacing: 0.5, marginTop: 3 }}>
                {m.statusDetail || (lang === 'id' ? 'LIVE' : 'LIVE')}
              </div>
            </div>
            <div style={{ color: C.text, fontWeight: 600 }}>
              {m.away.slug ? (
                <Link to={`/premier-league-2025-26/club/${m.away.slug}`} style={{ color: C.text, textDecoration: 'none' }}>
                  {m.away.name}
                </Link>
              ) : m.away.name}
              <span style={{ display: 'inline-block', width: 3, height: 14, background: m.away.accent, verticalAlign: 'middle', marginLeft: 6 }} />
            </div>
            <ShareButton
              url={matchShareUrl(m)}
              title={`${m.home.name} vs ${m.away.name}`}
              text={buildLiveShareText(m, lang)}
              accent={EPL_PURPLE}
              size="sm"
              label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
              analyticsEvent="epl_share_live"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Jadwal ──────────────────────────────────────────────────────────────────
function Jadwal({ upcoming, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${EPL_PURPLE}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Jadwal minggu ini' : 'This Week\'s Fixtures'}
      </h2>

      {error && <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>{lang === 'id' ? 'Data ESPN lagi lambat.' : 'ESPN data slow.'}</div>}
      {!error && loading && upcoming.length === 0 && <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>}
      {!error && !loading && upcoming.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada laga terjadwal 7 hari ke depan.' : 'No fixtures in the next 7 days.'}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {upcoming.slice(0, 10).map((m) => (
            <div key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr auto 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '8px 10px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 3,
              fontSize: 11.5,
            }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 0.3 }}>
                {formatFixtureDate(m.kickoffUtc, lang)}
              </div>
              <div style={{ color: C.text, textAlign: 'right', fontWeight: 500 }}>
                <span style={{ display: 'inline-block', width: 3, height: 12, background: m.home.accent, verticalAlign: 'middle', marginRight: 6 }} />
                {m.home.slug ? (
                  <Link to={`/premier-league-2025-26/club/${m.home.slug}`} style={{ color: C.text, textDecoration: 'none' }}>
                    {m.home.name}
                  </Link>
                ) : m.home.name}
              </div>
              <div style={{ color: C.muted, fontWeight: 700, letterSpacing: 0.5, fontSize: 10 }}>vs</div>
              <div style={{ color: C.text, fontWeight: 500 }}>
                {m.away.slug ? (
                  <Link to={`/premier-league-2025-26/club/${m.away.slug}`} style={{ color: C.text, textDecoration: 'none' }}>
                    {m.away.name}
                  </Link>
                ) : m.away.name}
                <span style={{ display: 'inline-block', width: 3, height: 12, background: m.away.accent, verticalAlign: 'middle', marginLeft: 6 }} />
              </div>
              <ShareButton
                url={matchShareUrl(m)}
                title={`${m.home.name} vs ${m.away.name}`}
                text={buildUpcomingShareText(m, lang)}
                accent={EPL_PURPLE}
                size="sm"
                label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
                analyticsEvent="epl_share_upcoming"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Hasil terbaru ───────────────────────────────────────────────────────────
function Hasil({ recent, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${EPL_PURPLE}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Hasil terbaru' : 'Latest Results'}
      </h2>

      {error && <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>{lang === 'id' ? 'Data lagi lambat.' : 'Data is slow.'}</div>}
      {!error && loading && recent.length === 0 && <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>}
      {!error && !loading && recent.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada hasil dalam 7 hari.' : 'No results in the last 7 days.'}
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {recent.slice(0, 8).map((m) => {
            const homeWon = m.homeScore > m.awayScore;
            const awayWon = m.awayScore > m.homeScore;
            return (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 72px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '8px 10px',
                background: C.panelRow,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 3,
                fontSize: 11.5,
              }}>
                <div style={{
                  color: homeWon ? C.text : C.dim,
                  textAlign: 'right', fontWeight: homeWon ? 700 : 500,
                }}>
                  <span style={{ display: 'inline-block', width: 3, height: 12, background: m.home.accent, verticalAlign: 'middle', marginRight: 6 }} />
                  {m.home.slug ? <Link to={`/premier-league-2025-26/club/${m.home.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{m.home.name}</Link> : m.home.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                  color: C.text, textAlign: 'center',
                }}>
                  {m.homeScore}–{m.awayScore}
                </div>
                <div style={{
                  color: awayWon ? C.text : C.dim,
                  fontWeight: awayWon ? 700 : 500,
                }}>
                  {m.away.slug ? <Link to={`/premier-league-2025-26/club/${m.away.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{m.away.name}</Link> : m.away.name}
                  <span style={{ display: 'inline-block', width: 3, height: 12, background: m.away.accent, verticalAlign: 'middle', marginLeft: 6 }} />
                </div>
                <ShareButton
                  url={matchShareUrl(m)}
                  title={`${m.home.name} vs ${m.away.name}`}
                  text={buildFinalShareText(m, lang)}
                  accent={EPL_PURPLE}
                  size="sm"
                  label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
                  analyticsEvent="epl_share_final"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Top skor ────────────────────────────────────────────────────────────────
function TopSkor({ scorers, loading, error, lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${EPL_PURPLE}`,
      borderRadius: 3,
      padding: '14px 14px 8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          margin: 0, color: C.text, letterSpacing: -0.2,
        }}>
          {lang === 'id' ? 'Top skor' : 'Top Scorers'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>GOLDEN BOOT</div>
      </div>

      {error && <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>{lang === 'id' ? 'Data lagi lambat.' : 'Data is slow.'}</div>}
      {!error && loading && scorers.length === 0 && <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>}
      {!error && !loading && scorers.length === 0 && (
        <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
          {lang === 'id' ? 'Belum ada data top skor.' : 'No scorer data yet.'}
        </div>
      )}

      {scorers.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 24 }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>{lang === 'id' ? 'PEMAIN' : 'PLAYER'}</th>
              <th style={{ textAlign: 'left', padding: '4px 0', width: 90 }}>{lang === 'id' ? 'KLUB' : 'CLUB'}</th>
              <th style={{ textAlign: 'right', padding: '4px 0', width: 38 }}>{lang === 'id' ? 'GOL' : 'G'}</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((p, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                <td style={{ padding: '6px 0', color: i === 0 ? EPL_PURPLE : C.dim, fontWeight: i === 0 ? 700 : 500 }}>
                  {p.rank}
                </td>
                <td style={{ padding: '6px 0', color: C.text, fontWeight: 500 }}>
                  {p.name}
                  {p.position && <span style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>{p.position}</span>}
                </td>
                <td style={{ padding: '6px 0', color: C.dim, fontSize: 10.5 }}>
                  <span style={{ display: 'inline-block', width: 3, height: 12, background: p.team.accent, verticalAlign: 'middle', marginRight: 6 }} />
                  {p.team.slug ? (
                    <Link to={`/premier-league-2025-26/club/${p.team.slug}`} style={{ color: C.dim, textDecoration: 'none' }}>
                      {p.team.shortName || p.team.name}
                    </Link>
                  ) : (p.team.shortName || p.team.name)}
                </td>
                <td style={{ padding: '6px 0', color: C.text, textAlign: 'right', fontWeight: 700 }}>
                  {p.goals}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ─── Club quick-index ────────────────────────────────────────────────────────
// A compact grid so every club page is 1-click away from the dashboard — also
// gives crawlers internal links to all 20 SEO pages.
function ClubIndex({ lang }) {
  return (
    <section style={{
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${EPL_PURPLE}`,
      borderRadius: 3,
      padding: '14px 14px 12px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        margin: '0 0 10px', color: C.text, letterSpacing: -0.2,
      }}>
        {lang === 'id' ? 'Halaman klub' : 'Club Pages'}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 6,
      }}>
        {CLUBS.map((c) => (
          <Link
            key={c.slug}
            to={`/premier-league-2025-26/club/${c.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${c.accent}`,
              borderRadius: 3,
              fontSize: 11,
              color: C.text, textDecoration: 'none',
            }}
          >
            <span style={{ fontWeight: 500 }}>{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Disclaimer ──────────────────────────────────────────────────────────────
function Disclaimer({ lang }) {
  return (
    <div style={{
      padding: '10px 14px',
      fontSize: 10, color: C.muted, lineHeight: 1.5,
      borderTop: `1px solid ${C.lineSoft}`,
    }}>
      {lang === 'id'
        ? 'Gibol adalah media olahraga independen Indonesia. Tidak berafiliasi dengan The Premier League, FA, atau klub manapun. Warna klub hanya untuk identitas visual editorial. Data: ESPN.'
        : 'Gibol is an independent Indonesian sports media site. Not affiliated with The Premier League, the FA, or any club. Club colors used for editorial visual identity only. Data: ESPN.'}
    </div>
  );
}

// ─── Page shell ──────────────────────────────────────────────────────────────
export default function EPL() {
  const location = useLocation();
  const { lang } = useApp();

  const { rows, loading: sLoading, error: sError } = useEPLStandings();
  const { upcoming, recent, loading: fLoading, error: fError } = useEPLFixtures();
  const { scorers, loading: tLoading, error: tError } = useEPLScorers({ limit: 10 });

  // Split upcoming into currently-live (statusState === 'in') and scheduled.
  // Live matches get a prominent spotlight at the top; Jadwal only shows
  // unplayed fixtures to avoid duplicating a currently-live match in two places.
  const { live, scheduled } = useMemo(() => {
    const l = [];
    const s = [];
    for (const m of upcoming) {
      if (m.statusState === 'in') l.push(m);
      else s.push(m);
    }
    return { live: l, scheduled: s };
  }, [upcoming]);

  const leaders = useMemo(() => {
    const top = rows.slice(0, 3);
    const btm = rows.slice(-3);
    return { top, btm };
  }, [rows]);

  const title = lang === 'id'
    ? `Liga Inggris ${SEASON} · Klasemen 20 Klub, Jadwal Match-day, Top Skor Golden Boot | gibol.co`
    : `Premier League ${SEASON} · 20-Club Table, Match-day Fixtures, Golden Boot Race | gibol.co`;
  const description = lang === 'id'
    ? `Dashboard live Liga Inggris ${SEASON} dalam Bahasa Indonesia — klasemen 20 klub dengan form 5 laga, jadwal pekan ini dengan waktu WIB, hasil terbaru, dan ras Golden Boot. Semua klub punya halaman sendiri.`
    : `Live Premier League ${SEASON} dashboard in Bahasa Indonesia — 20-club table with 5-match form, this week's fixtures in WIB, latest results, and the Golden Boot race. Every club has its own page.`;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords="liga inggris 2025-26, premier league 2025-26, klasemen liga inggris, top skor epl, skor liga inggris, jadwal liga inggris, arsenal liverpool manchester city chelsea, tottenham, newcastle, aston villa, epl bahasa indonesia"
        jsonLd={EPL_JSONLD}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink accent={EPL_PURPLE} />

        {/* Step 6 hero — Space Grotesk 36/700/-0.025em, chip top-right, tint ≤8%. */}
        <div style={{
          padding: '20px 20px 14px',
          background: `linear-gradient(135deg, ${EPL_PURPLE}14 0%, transparent 70%)`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            gap: 12, marginBottom: 6,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: EPL_PURPLE, fontWeight: 700, paddingTop: 4 }}>
              {lang === 'id' ? `LIGA INGGRIS · MUSIM ${SEASON}` : `PREMIER LEAGUE · SEASON ${SEASON}`}
            </div>
            <Chip variant="live" sportId="epl" accent={EPL_PURPLE} label="LIVE" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 36, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em',
            color: C.text, margin: 0, marginBottom: 8,
            textWrap: 'balance',
          }}>
            {lang === 'id' ? `Liga Inggris ${SEASON}` : `Premier League ${SEASON}`}
          </h1>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 700 }}>
            {lang === 'id'
              ? 'Klasemen 20 klub dengan form 5 laga, jadwal pekan ini dalam WIB, hasil terbaru, dan ras Golden Boot. 380 laga, Agu 2025 – Mei 2026. Setiap klub punya halaman sendiri.'
              : '20-club table with 5-match form, this week\'s fixtures in WIB, latest results, and Golden Boot race. 380 matches, Aug 2025 – May 2026. Every club has its own page.'}
          </div>
          {leaders.top.length >= 3 && (
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10, letterSpacing: 0.3 }}>
              {lang === 'id' ? 'Top-3 saat ini:' : 'Current top 3:'}{' '}
              <span style={{ color: C.text, fontWeight: 600 }}>
                {leaders.top.map((r, i) => `${i + 1}. ${r.clubName} (${r.points})`).join(' · ')}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 14 }}>
          {/* Live now — only renders when any match is in-progress. */}
          <LiveSpotlight live={live} lang={lang} />

          <Klasemen rows={rows} loading={sLoading} error={sError} lang={lang} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}>
            <Jadwal upcoming={scheduled} loading={fLoading} error={fError} lang={lang} />
            <Hasil recent={recent} loading={fLoading} error={fError} lang={lang} />
          </div>

          <TopSkor scorers={scorers} loading={tLoading} error={tError} lang={lang} />

          <ClubIndex lang={lang} />
        </div>

        {/* Partner slot — live IBL Trading Cards pack from Fangir CDN. */}
        <FangirBanner />

        <Disclaimer lang={lang} />

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · Liga Inggris Indonesia</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'semua dashboard' : 'all dashboards'}</a></div>
        </div>
      </div>
    </div>
  );
}
