import React, { useMemo } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { useEPLTeam } from '../hooks/useEPLTeam.js';
import { useEPLStandings } from '../hooks/useEPLStandings.js';
import { useEPLTeamRoster } from '../hooks/useEPLTeamRoster.js';
import { CLUBS_BY_SLUG, formatFixtureDate } from '../lib/sports/epl/clubs.js';

// ─── Key Accounts (X/Twitter) ───────────────────────────────────────────────
// Mirrors the NBA "KEY ACCOUNTS" pattern on NBADashboard: club handle +
// league handle + two football-news handles. No tracking, no widgets —
// just outbound <a> links to x.com/<handle>.
const KEY_ACCOUNTS_EPL = [
  { handle: 'premierleague', label: 'Premier League', role: 'league' },
  { handle: 'ESPNFC',        label: 'ESPN FC',        role: 'news' },
  { handle: 'BBCSport',      label: 'BBC Sport',      role: 'news' },
];

/**
 * EPL per-club page — v0.4.0 Phase 1A.
 *
 * /premier-league-2025-26/club/:slug  →  one per 20 clubs.
 *
 * Sections:
 *   1. Hero         — club name + stadium + founded + accent tint (<=14%)
 *   2. Record       — current rank, points, W-D-L, goal difference (from standings)
 *   3. Form         — last 5 pills (M/S/K in Bahasa, W/D/L in English)
 *   4. Jadwal       — next 5 upcoming fixtures (ESPN /schedule)
 *   5. Hasil        — last 5 completed fixtures (ESPN /schedule)
 *   6. Top skor     — any player from this club in the league top 10
 *   7. Tentang      — one Bahasa paragraph (from clubs.js bio) for SEO
 *
 * Emits a SportsTeam JSON-LD in memo, matching F1Team's pattern.
 */

// ─── Small helpers (kept local — used only by this page) ────────────────────

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
      width: 20, height: 20,
      borderRadius: 3,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      fontSize: 11, fontWeight: 700,
      textAlign: 'center', lineHeight: '18px',
      marginRight: 3,
      fontFamily: 'var(--font-mono)',
    }}>{letter}</span>
  );
}

function formResult(fx) {
  // Derive W/D/L from a fixture result as experienced by *this* club.
  if (!fx || fx.status !== 'post') return null;
  if (fx.ourScore == null || fx.theirScore == null) return null;
  if (fx.ourScore > fx.theirScore) return 'W';
  if (fx.ourScore < fx.theirScore) return 'L';
  return 'D';
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EPLClub() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang } = useApp();

  const club = CLUBS_BY_SLUG[slug];
  if (!club) return <Navigate to="/premier-league-2025-26" replace />;

  const { info, fixtures, loading, error } = useEPLTeam(club.espnId);
  const { rows: standings } = useEPLStandings();
  const {
    topScorers: rosterTopScorers,
    topAssisters: rosterTopAssisters,
    injured: rosterInjured,
  } = useEPLTeamRoster(club.espnId);

  // Current-season standing row for the club (if standings have loaded)
  const standing = useMemo(
    () => standings.find((r) => r.teamId === club.espnId) || null,
    [standings, club.espnId]
  );

  // Derive form from completed fixtures if standing.form is empty.
  const form = useMemo(() => {
    if (standing?.form && standing.form.length > 0) {
      return standing.form.split('');
    }
    const completed = (fixtures || [])
      .filter((f) => f.status === 'post')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .reverse() // oldest → newest so last pill is most recent
      .map(formResult)
      .filter(Boolean);
    return completed;
  }, [standing, fixtures]);

  // Upcoming + recent splits
  const upcoming = useMemo(
    () => (fixtures || [])
      .filter((f) => f.status !== 'post')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5),
    [fixtures]
  );
  const recent = useMemo(
    () => (fixtures || [])
      .filter((f) => f.status === 'post')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5),
    [fixtures]
  );

  // ─── JSON-LD ──────────────────────────────────────────────────────────────
  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: club.name,
    alternateName: club.nameId !== club.name ? club.nameId : undefined,
    sport: 'Soccer',
    url: `https://www.gibol.co/premier-league-2025-26/club/${club.slug}`,
    foundingDate: String(club.founded),
    location: { '@type': 'Place', name: club.city },
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'The Premier League',
      url: 'https://www.gibol.co/premier-league-2025-26',
    },
  }), [club]);

  // ─── SEO copy ─────────────────────────────────────────────────────────────
  const title = lang === 'id'
    ? `${club.name} Liga Inggris 2025-26 · Klasemen, Jadwal, Hasil | gibol.co`
    : `${club.name} Premier League 2025-26 · Standing, Fixtures, Results | gibol.co`;
  const description = lang === 'id'
    ? `${club.name} di Premier League 2025-26 — klasemen sementara, form 5 laga terakhir, jadwal pekan ini, hasil laga terbaru, dan top skor klub. Kandang di ${club.stadium}, ${club.city}. Dashboard Bahasa Indonesia.`
    : `${club.name} in the 2025-26 Premier League — current standing, last 5 form, upcoming fixtures, latest results, and top scorers. Home: ${club.stadium}, ${club.city}. Indonesian-language dashboard.`;
  const keywords = [
    club.name.toLowerCase(),
    club.nameId.toLowerCase(),
    `${club.slug} 2025-26`,
    'liga inggris',
    'premier league',
    'epl 2025-26',
    `klasemen ${club.name.toLowerCase()}`,
    `jadwal ${club.name.toLowerCase()}`,
    `hasil ${club.name.toLowerCase()}`,
    `top skor ${club.name.toLowerCase()}`,
    club.stadium.toLowerCase(),
    club.city.toLowerCase(),
  ].join(', ');

  const zone = !standing ? null
    : standing.rank <= 4 ? { label: 'Zona UCL', labelEn: 'UCL spot', color: '#2563EB' }
    : standing.rank === 5 ? { label: 'Zona UEL', labelEn: 'UEL spot', color: '#F59E0B' }
    : standing.rank === 6 ? { label: 'Zona Conference', labelEn: 'Conference spot', color: '#10B981' }
    : standing.rank >= 18 ? { label: 'Zona degradasi', labelEn: 'Relegation zone', color: '#EF4444' }
    : null;

  return (
    <div style={{
      background: C.bg, minHeight: '100vh', color: C.text,
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords={keywords}
        jsonLd={schema}
      />

      <div className="dashboard-wrap">
        <TopBar showBackLink accent={club.accent} />

        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '28px 20px 22px',
          background: `linear-gradient(135deg, ${club.accent}14 0%, ${C.bg} 85%)`,
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{
            fontSize: 9, letterSpacing: 1.5, color: club.accent,
            fontWeight: 700, marginBottom: 4,
          }}>
            LIGA INGGRIS 2025-26 · {lang === 'id' ? 'KLUB' : 'CLUB'}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 36, fontWeight: 700, lineHeight: 1.05, margin: 0,
            marginBottom: 8, letterSpacing: '-0.025em', color: C.text,
            textWrap: 'balance',
          }}>
            {club.name}
          </h1>
          <div style={{
            fontSize: 11, color: C.dim, display: 'flex',
            flexWrap: 'wrap', gap: '4px 12px',
          }}>
            <span>{lang === 'id' ? 'Kandang' : 'Home'}: {club.stadium}</span>
            <span>·</span>
            <span>{club.city}</span>
            <span>·</span>
            <span>{lang === 'id' ? 'Didirikan' : 'Founded'}: {club.founded}</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link
              to="/premier-league-2025-26"
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                padding: '8px 14px',
                background: 'transparent',
                color: C.dim,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 3, textDecoration: 'none',
              }}
            >
              ← {lang === 'id' ? 'Dashboard Liga Inggris' : 'EPL dashboard'}
            </Link>
          </div>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'grid', gap: 14 }}>
          {/* ─── Klasemen + form ───────────────────────────────────────────── */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap',
            }}>
              <div style={{
                fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700,
              }}>
                {lang === 'id' ? 'KLASEMEN SEMENTARA' : 'CURRENT STANDING'}
              </div>
              {zone && (
                <div style={{
                  fontSize: 9, letterSpacing: 0.8, fontWeight: 700,
                  color: zone.color,
                  padding: '3px 8px',
                  background: `${zone.color}1a`,
                  border: `1px solid ${zone.color}40`,
                  borderRadius: 3,
                }}>
                  {lang === 'id' ? zone.label : zone.labelEn}
                </div>
              )}
            </div>
            {error && (
              <div style={{ fontSize: 11, color: C.muted }}>
                {lang === 'id' ? 'Data ESPN lagi lambat. Muncul lagi begitu nyambung.' : 'ESPN data slow — will refresh.'}
              </div>
            )}
            {!error && loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Memuat…' : 'Loading…'}
              </div>
            )}
            {!error && !loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id'
                  ? 'Belum ada poin musim ini.'
                  : 'No standing data yet.'}
              </div>
            )}
            {standing && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: 14, alignItems: 'baseline',
                }}>
                  <Stat label={lang === 'id' ? 'POSISI' : 'POS'} value={`#${standing.rank}`} accent={club.accent} big />
                  <Stat label={lang === 'id' ? 'POIN' : 'PTS'} value={standing.points} big />
                  <Stat label={lang === 'id' ? 'MAIN' : 'P'} value={standing.games} />
                  <Stat label={lang === 'id' ? 'M' : 'W'} value={standing.wins} color="#10B981" />
                  <Stat label={lang === 'id' ? 'S' : 'D'} value={standing.draws} color="#F59E0B" />
                  <Stat label={lang === 'id' ? 'K' : 'L'} value={standing.losses} color="#EF4444" />
                  <Stat label="SG/GD" value={standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff} />
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: C.muted, letterSpacing: 0.8 }}>
                  {lang === 'id' ? 'GOL: ' : 'GOALS: '}
                  <span style={{ color: C.text }}>{standing.goalsFor}</span>
                  {' · '}
                  {lang === 'id' ? 'KEMASUKAN: ' : 'CONCEDED: '}
                  <span style={{ color: C.text }}>{standing.goalsAgainst}</span>
                </div>
              </>
            )}

            {/* Form guide last 5 */}
            {form && form.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  fontSize: 9, letterSpacing: 1, color: C.muted,
                  fontWeight: 700, marginBottom: 6,
                }}>
                  {lang === 'id' ? 'FORM 5 LAGA TERAKHIR' : 'LAST 5 FORM'}
                </div>
                <div>
                  {form.map((ch, i) => <FormPill key={i} char={ch} lang={lang} />)}
                  <span style={{
                    fontSize: 10, color: C.muted, marginLeft: 8, letterSpacing: 0.5,
                  }}>
                    {lang === 'id' ? '(kiri: paling lama · kanan: terbaru)' : '(left: oldest · right: most recent)'}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ─── Jadwal (upcoming) ───────────────────────────────────────── */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.2, color: C.muted,
              fontWeight: 700, marginBottom: 10,
            }}>
              {lang === 'id' ? 'JADWAL SELANJUTNYA' : 'UPCOMING FIXTURES'}
            </div>
            {upcoming.length === 0 && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Belum ada jadwal terbaru.' : 'No upcoming fixtures yet.'}
              </div>
            )}
            {upcoming.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {upcoming.map((fx) => {
                  const oppHref = fx.opponentSlug
                    ? `/premier-league-2025-26/club/${fx.opponentSlug}`
                    : null;
                  const oppLabel = fx.isHome
                    ? `vs ${fx.opponentName || '—'}`
                    : `@ ${fx.opponentName || '—'}`;
                  return (
                    <div key={fx.id} style={{
                      display: 'grid', gap: 10,
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: C.panelRow,
                      borderRadius: 3,
                      fontSize: 11,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {oppHref ? (
                            <Link to={oppHref} style={{ color: C.text, textDecoration: 'none' }}>
                              {oppLabel}
                            </Link>
                          ) : oppLabel}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 0.3, marginTop: 2 }}>
                          {formatFixtureDate(fx.date, lang)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9, letterSpacing: 0.8, fontWeight: 700,
                        padding: '3px 8px',
                        background: fx.isHome ? `${club.accent}22` : 'transparent',
                        border: `1px solid ${fx.isHome ? `${club.accent}55` : C.lineSoft}`,
                        color: fx.isHome ? club.accent : C.dim,
                        borderRadius: 3,
                      }}>
                        {fx.isHome
                          ? (lang === 'id' ? 'KANDANG' : 'HOME')
                          : (lang === 'id' ? 'TANDANG' : 'AWAY')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ─── Hasil (recent) ───────────────────────────────────────────── */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.2, color: C.muted,
              fontWeight: 700, marginBottom: 10,
            }}>
              {lang === 'id' ? 'HASIL TERBARU' : 'LATEST RESULTS'}
            </div>
            {recent.length === 0 && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Belum ada hasil musim ini.' : 'No results yet.'}
              </div>
            )}
            {recent.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {recent.map((fx) => {
                  const res = formResult(fx);
                  const resColor = res === 'W' ? '#10B981'
                                : res === 'L' ? '#EF4444'
                                : res === 'D' ? '#F59E0B'
                                : C.muted;
                  const resLetter = lang === 'id'
                    ? ({ W: 'M', D: 'S', L: 'K' }[res] || '·')
                    : (res || '·');
                  const oppHref = fx.opponentSlug
                    ? `/premier-league-2025-26/club/${fx.opponentSlug}`
                    : null;
                  const score = fx.ourScore != null && fx.theirScore != null
                    ? (fx.isHome ? `${fx.ourScore}-${fx.theirScore}` : `${fx.theirScore}-${fx.ourScore}`)
                    : '—';
                  return (
                    <div key={fx.id} style={{
                      display: 'grid', gap: 10,
                      gridTemplateColumns: '22px 1fr auto',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: C.panelRow,
                      borderRadius: 3,
                      fontSize: 11,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11, fontWeight: 700,
                        textAlign: 'center',
                        background: `${resColor}22`,
                        border: `1px solid ${resColor}55`,
                        color: resColor,
                        borderRadius: 2,
                        lineHeight: '20px',
                      }}>{resLetter}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {oppHref ? (
                            <Link to={oppHref} style={{ color: C.text, textDecoration: 'none' }}>
                              {fx.isHome ? `vs ${fx.opponentName}` : `@ ${fx.opponentName}`}
                            </Link>
                          ) : (fx.isHome ? `vs ${fx.opponentName}` : `@ ${fx.opponentName}`)}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 0.3, marginTop: 2 }}>
                          {formatFixtureDate(fx.date, lang)}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13, fontWeight: 700, color: C.text,
                        letterSpacing: 0.3,
                      }}>
                        {score}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ─── Akun resmi (Key Accounts — X/Twitter) ──────────────────── */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.2, color: C.muted,
              fontWeight: 700, marginBottom: 10,
            }}>
              {lang === 'id' ? 'AKUN RESMI · X / TWITTER' : 'KEY ACCOUNTS · X / TWITTER'}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {/* Club account first, accent-tinted */}
              {club.handle && (
                <a
                  href={`https://x.com/${club.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '8px 10px',
                    background: `${club.accent}1a`,
                    border: `1px solid ${club.accent}55`,
                    borderRadius: 3,
                    textDecoration: 'none',
                    fontSize: 11,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: club.accent, fontFamily: 'var(--font-mono)' }}>
                      @{club.handle}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                      {lang === 'id' ? 'Akun resmi klub' : 'Official club account'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: club.accent, letterSpacing: 0.5 }}>↗</div>
                </a>
              )}
              {/* League + news accounts */}
              {KEY_ACCOUNTS_EPL.map((a) => (
                <a
                  key={a.handle}
                  href={`https://x.com/${a.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '8px 10px',
                    background: C.panelRow,
                    borderRadius: 3,
                    textDecoration: 'none',
                    fontSize: 11,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: C.text, fontFamily: 'var(--font-mono)' }}>
                      @{a.handle}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                      {a.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.5 }}>↗</div>
                </a>
              ))}
            </div>
          </section>

          {/* ─── Top skor klub (roster-derived, full squad) ──────────────── */}
          {/* Uses the team /roster endpoint rather than the league top-20,
              so even clubs whose scorers aren't in the league's top 20
              still get a "top scorers" block (e.g. relegation-zone sides). */}
          {rosterTopScorers && rosterTopScorers.length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap',
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700,
                }}>
                  {lang === 'id' ? 'TOP SKOR TIM' : 'TOP SCORERS'}
                </div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.8 }}>
                  {lang === 'id' ? 'MUSIM 2025–26 · ESPN' : 'SEASON 2025–26 · ESPN'}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {rosterTopScorers.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr auto auto',
                    gap: 10, alignItems: 'center',
                    padding: '8px 10px',
                    background: C.panelRow,
                    borderRadius: 3,
                    fontSize: 11,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12, color: i === 0 ? club.accent : C.dim, fontWeight: 700,
                      textAlign: 'center',
                    }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                        {p.position || '—'} · {lang === 'id' ? 'Main' : 'Apps'} {p.appearances}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                        {p.goals}
                      </div>
                      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5, marginTop: 2 }}>
                        {lang === 'id' ? 'GOL' : 'GOALS'}
                      </div>
                    </div>
                    {p.assists > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: C.dim, lineHeight: 1 }}>
                          {p.assists}
                        </div>
                        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5, marginTop: 2 }}>
                          {lang === 'id' ? 'ASIS' : 'AST'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Top asis klub (only when distinct from top scorers) ───── */}
          {rosterTopAssisters && rosterTopAssisters.length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap',
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700,
                }}>
                  {lang === 'id' ? 'TOP ASIS' : 'TOP ASSISTERS'}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {rosterTopAssisters.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '8px 10px',
                    background: C.panelRow,
                    borderRadius: 3,
                    fontSize: 11,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12, color: i === 0 ? club.accent : C.dim, fontWeight: 700,
                      textAlign: 'center',
                    }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                        {p.position || '—'} · {p.goals} {lang === 'id' ? 'GOL' : 'G'}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16, fontWeight: 700, color: C.text,
                    }}>
                      {p.assists}
                      <span style={{ fontSize: 9, color: C.muted, marginLeft: 4, letterSpacing: 0.5 }}>
                        {lang === 'id' ? 'ASIS' : 'AST'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Cedera (Injuries) — conditional, only when data exists ── */}
          {rosterInjured && rosterInjured.length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid #EF4444`, borderRadius: 3,
            }}>
              <div style={{
                fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10,
              }}>
                {lang === 'id' ? 'CEDERA · LAPORAN ESPN' : 'INJURY REPORT · ESPN'}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {rosterInjured.map((p) => (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10, alignItems: 'center',
                    padding: '8px 10px',
                    background: C.panelRow,
                    borderRadius: 3,
                    fontSize: 11,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 0.3 }}>
                        {p.position || '—'}{p.injuryDescription ? ` · ${p.injuryDescription}` : ''}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, letterSpacing: 0.8, fontWeight: 700,
                      padding: '3px 8px',
                      background: 'rgba(239,68,68,.14)',
                      border: '1px solid rgba(239,68,68,.4)',
                      color: '#EF4444',
                      borderRadius: 3,
                      textTransform: 'uppercase',
                    }}>
                      {p.injuryStatus}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Tentang / About ─────────────────────────────────────────── */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${club.accent}`, borderRadius: 3,
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.2, color: C.muted,
              fontWeight: 700, marginBottom: 10,
            }}>
              {lang === 'id' ? `TENTANG ${club.nameId.toUpperCase()}` : `ABOUT ${club.name.toUpperCase()}`}
            </div>
            <p style={{
              margin: 0, fontSize: 12, lineHeight: 1.65, color: C.text,
              fontFamily: 'var(--font-sans)',
            }}>
              {club.bio}
            </p>
          </section>
        </div>

        {/* ─── Disclaimer ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '10px 20px',
          fontSize: 10, color: C.muted, lineHeight: 1.5,
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {lang === 'id'
            ? `Gibol bukan afiliasi resmi ${club.nameId}. Warna klub & lambang hanya sebagai identitas visual editorial. Data: ESPN.`
            : `Gibol is not officially affiliated with ${club.name}. Club colors used for editorial visual identity only. Data: ESPN.`}
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · Liga Inggris</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/premier-league-2025-26" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'dashboard Liga Inggris' : 'EPL dashboard'}</a></div>
        </div>
      </div>
    </div>
  );
}

// ─── Small Stat atom for the standing summary row ───────────────────────────
function Stat({ label, value, accent, color, big }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 700,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: big ? 32 : 22, lineHeight: 1,
        color: accent || color || C.text,
        marginTop: 4,
      }}>
        {value}
      </div>
    </div>
  );
}
