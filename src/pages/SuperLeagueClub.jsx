import React, { useEffect, useMemo } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ProfileLink from '../components/ProfileLink.jsx';
import PeerNav from '../components/PeerNav.jsx';
import ContactBar from '../components/ContactBar.jsx';
// v0.20.0 Phase 2 Sprint F — Shell A leaf chrome. ShareButton orphaned
// after the inline hero strip; HubActionRow takes over share duty.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
import { useApp } from '../lib/AppContext.jsx';
import { useSuperLeagueTeam } from '../hooks/useSuperLeagueTeam.js';
import { useSuperLeagueStandings } from '../hooks/useSuperLeagueStandings.js';
// v0.14.5 — full registered squad via API-Football (league=274).
import { useSuperLeagueClubSquad } from '../hooks/useSuperLeagueClubSquad.js';
import {
  CLUBS, CLUBS_BY_SLUG, formatFixtureDate, SEASON, LEAGUE_NAME_FULL,
} from '../lib/sports/liga-1-id/clubs.js';

// ─── Key Accounts (X/Twitter) ──────────────────────────────────────────────
// Mirrors EPL pattern — club handle + league + a few football-news handles.
const KEY_ACCOUNTS_SUPER_LEAGUE = [
  { handle: 'liga1match',       label: 'Super League ID', role: 'league' },
  { handle: 'BolaCom',          label: 'Bola.com',         role: 'news' },
  { handle: 'detiksport',       label: 'detikSport',       role: 'news' },
];

/**
 * Super League per-club page — v0.13.0 Phase 1A.
 *
 * /super-league-2025-26/club/:slug  →  one per 18 clubs.
 *
 * Sections:
 *   1. Hero         — club name + stadium + founded + accent tint (<=14%)
 *   2. Record       — current rank, points, M-S-K, selisih gol (from standings)
 *   3. Form         — last 5 pills (M/S/K Bahasa, W/D/L English)
 *   4. Jadwal       — next 5 upcoming fixtures
 *   5. Hasil        — last 5 completed fixtures
 *   6. Tentang      — Bahasa paragraph (from clubs.js bio)
 *   7. Key Accounts — club + league + Indonesian football news handles
 *
 * Emits a SportsTeam JSON-LD for SEO.
 */

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
  if (!fx || fx.status !== 'post') return null;
  if (fx.ourScore == null || fx.theirScore == null) return null;
  if (fx.ourScore > fx.theirScore) return 'W';
  if (fx.ourScore < fx.theirScore) return 'L';
  return 'D';
}

export default function SuperLeagueClub() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang } = useApp();

  const club = CLUBS_BY_SLUG[slug];
  if (!club) return <Navigate to="/super-league-2025-26" replace />;

  const { info, fixtures, loading, error } = useSuperLeagueTeam(club.espnId);
  const { rows: standings } = useSuperLeagueStandings();
  // v0.14.5 — full registered squad via API-Football.
  const { players: squad, loading: squadLoading, error: squadError } = useSuperLeagueClubSquad(club.slug);

  const standing = useMemo(
    () => standings.find((r) => r.teamId === club.espnId) || null,
    [standings, club.espnId]
  );

  // v0.20.0 Phase 2 Sprint F — Shell A leaf chrome. Inline 200px
  // hero (eyebrow + 28px h1 + venue meta + filled red BAGIKAN
  // button) collapsed into <HubStatusStrip>. Picker label shows
  // club name; club accent rides the strip's 3px left stripe.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={lang === 'id'
          ? `${club.name} · Super League Indonesia ${SEASON}`
          : `${club.name} · Indonesian Super League ${SEASON}`}
        accent={club.accent}
        picker={(
          <Link
            to="/super-league-2025-26"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: `${club.accent}14`,
              color: 'var(--ink)',
              border: `1px solid ${club.accent}66`,
              borderRadius: 6,
              fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ width: 3, height: 14, background: club.accent }} />
            {club.name}
            <span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 2 }}>▾</span>
          </Link>
        )}
        live={(
          <span style={{ textTransform: 'uppercase' }}>
            {lang === 'id' ? `SUPER LEAGUE · MUSIM ${SEASON}` : `INDONESIAN SUPER LEAGUE · ${SEASON}`}
            <span style={{ marginLeft: 8, color: 'var(--ink-4)' }}>
              · {club.stadium} · {club.city}
            </span>
          </span>
        )}
        actions={(
          <HubActionRow
            url={`/super-league-2025-26/club/${club.slug}`}
            shareText={lang === 'id'
              ? `${club.name} · Super League ${SEASON} di gibol.co ⚽`
              : `${club.name} · Indonesian Super League ${SEASON} on gibol.co ⚽`}
            accent={club.accent}
            analyticsEvent="superleague_club_share"
          />
        )}
      />
    );
    return () => setTopbarSubrow(null);
  }, [club, lang]);

  const form = useMemo(() => {
    if (standing?.form && standing.form.length > 0) {
      return standing.form.split('');
    }
    const completed = (fixtures || [])
      .filter((f) => f.status === 'post')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .reverse()
      .map(formResult)
      .filter(Boolean);
    return completed;
  }, [standing, fixtures]);

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
    url: `https://www.gibol.co/super-league-2025-26/club/${club.slug}`,
    foundingDate: String(club.founded),
    location: { '@type': 'Place', name: club.city },
    memberOf: {
      '@type': 'SportsOrganization',
      name: LEAGUE_NAME_FULL,
      url: 'https://www.gibol.co/super-league-2025-26',
    },
  }), [club]);

  // ─── SEO copy ─────────────────────────────────────────────────────────────
  const title = lang === 'id'
    ? `${club.name} Super League ${SEASON} · Klasemen, Jadwal, Hasil | gibol.co`
    : `${club.name} Indonesian Super League ${SEASON} · Standing, Fixtures, Results | gibol.co`;
  const description = lang === 'id'
    ? `${club.name} di Super League Indonesia ${SEASON} — klasemen sementara, form 5 laga terakhir, jadwal pekan ini, hasil laga terbaru. Kandang di ${club.stadium}, ${club.city}. Dashboard Bahasa Indonesia.`
    : `${club.name} in the ${SEASON} Indonesian Super League — current standing, last 5 form, upcoming fixtures, latest results. Home: ${club.stadium}, ${club.city}. Bahasa-first dashboard.`;
  const keywords = [
    club.name.toLowerCase(),
    club.nameId.toLowerCase(),
    `${club.slug} 2025-26`,
    'super league indonesia',
    'liga 1',
    'bri liga 1',
    `klasemen ${club.name.toLowerCase()}`,
    `jadwal ${club.name.toLowerCase()}`,
    `hasil ${club.name.toLowerCase()}`,
    club.stadium.toLowerCase(),
    club.city.toLowerCase(),
  ].join(', ');

  // ─── Zone (relegation/AFC) for the standing chip ─────────────────────────
  const zone = !standing ? null
    : standing.rank === 1 ? { label: 'Puncak · AFC CL Elite', en: 'Top · AFC CL Elite', color: '#FBBF24' }
    : standing.rank <= 4 ? { label: 'Zona AFC', en: 'AFC zone', color: '#3B82F6' }
    : standing.rank === 16 ? { label: 'Play-off degradasi', en: 'Relegation play-off', color: '#F59E0B' }
    : standing.rank >= 17 ? { label: 'Zona degradasi', en: 'Relegation', color: '#EF4444' }
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

        {/* v0.13.0 — visual breadcrumbs above the hero. */}
        <div style={{ padding: '0 20px' }}>
          <Breadcrumbs
            items={[
              { name: lang === 'id' ? `Super League ${SEASON}` : `Indonesian Super League ${SEASON}`, to: '/super-league-2025-26' },
              { name: club.name },
            ]}
          />
          {/* v0.46.0 — Phase 2 ship #27. Cross-link to evergreen profile.
              Liga 1 uses canonicalSlug because club.slug is a short form
              (e.g. "persib") while the profile slug uses API-Football
              full names (e.g. "liga-1-id-persib-bandung") — ProfileLink
              has the lookup table. */}
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <ProfileLink
              sport="liga-1-id"
              canonicalSlug={club.slug}
              teamFullName={club.nameId || club.name}
            />
          </div>
        </div>

        {/* v0.20.0 Phase 2 Sprint F — visible 200px hero stripped.
            Eyebrow + 28px h1 + venue meta + filled red BAGIKAN
            button collapsed into <HubStatusStrip> in V2TopBar
            subrow above. Standing card below now sits closer to
            the top of the viewport. The zone chip (UCL / UEL /
            Conference / Relegation) is rendered inside the
            standing card per club page below — no longer needed
            here in the hero. */}

        {/* ─── Body grid ─────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 40px', display: 'grid', gap: 22 }}>

          {/* Record */}
          <section>
            <Header title={lang === 'id' ? 'Catatan Musim' : 'Season Record'} />
            {standing ? (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 10,
              }}>
                <Stat label={lang === 'id' ? 'POSISI' : 'POSITION'} value={`#${standing.rank || '—'}`} accent={club.accent} />
                <Stat label={lang === 'id' ? 'POIN' : 'POINTS'} value={standing.points} accent={club.accent} />
                <Stat label={lang === 'id' ? 'MAIN' : 'PLAYED'} value={standing.games} />
                <Stat label={lang === 'id' ? 'M-S-K' : 'W-D-L'}
                  value={`${standing.wins}-${standing.draws}-${standing.losses}`} />
                <Stat label={lang === 'id' ? 'GOL' : 'GOALS'}
                  value={`${standing.goalsFor}–${standing.goalsAgainst}`} />
                <Stat label={lang === 'id' ? 'SELISIH' : 'GD'}
                  value={standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
                  accent={standing.goalDiff > 0 ? '#10B981' : standing.goalDiff < 0 ? '#EF4444' : null} />
              </div>
            ) : (
              <Empty msg={lang === 'id' ? 'Klasemen belum tersedia.' : 'Standings unavailable.'} />
            )}
          </section>

          {/* Form */}
          <section>
            <Header title={lang === 'id' ? 'Form 5 Laga Terakhir' : 'Last 5 Form'} />
            {form.length === 0 ? (
              <Empty msg={lang === 'id' ? 'Belum ada laga selesai musim ini.' : 'No completed matches yet.'} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {form.map((ch, i) => <FormPill key={i} char={ch} lang={lang} />)}
              </div>
            )}
          </section>

          {/* Upcoming fixtures */}
          <section>
            <Header title={lang === 'id' ? 'Jadwal Berikutnya' : 'Upcoming Fixtures'}
              kicker={lang === 'id' ? 'WIB' : 'WIB'} />
            {loading && upcoming.length === 0 ? (
              <Skeleton lines={3} />
            ) : upcoming.length === 0 ? (
              <Empty msg={lang === 'id' ? 'Tidak ada jadwal mendatang.' : 'No upcoming fixtures.'} />
            ) : (
              <FixtureList fixtures={upcoming} lang={lang} club={club} kind="upcoming" />
            )}
          </section>

          {/* Recent results */}
          <section>
            <Header title={lang === 'id' ? 'Hasil Terbaru' : 'Latest Results'} />
            {loading && recent.length === 0 ? (
              <Skeleton lines={3} />
            ) : recent.length === 0 ? (
              <Empty msg={lang === 'id' ? 'Belum ada hasil.' : 'No results yet.'} />
            ) : (
              <FixtureList fixtures={recent} lang={lang} club={club} kind="recent" />
            )}
          </section>

          {/* Tentang */}
          <section>
            <Header title={lang === 'id' ? 'Tentang Klub' : 'About the Club'} />
            <p style={{
              fontSize: 12.5, lineHeight: 1.65, color: C.dim, margin: 0,
              padding: '12px 14px', background: C.panelSoft,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${club.accent}`,
              borderRadius: 3,
            }}>
              {club.bio}
            </p>
          </section>

          {/* Key Accounts */}
          <section>
            <Header title={lang === 'id' ? 'Akun Resmi' : 'Key Accounts'} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <KeyAccount handle={club.handle} label={club.name} accent={club.accent} primary />
              {KEY_ACCOUNTS_SUPER_LEAGUE.map((a) => (
                <KeyAccount key={a.handle} handle={a.handle} label={a.label} />
              ))}
            </div>
          </section>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#EF444411', border: '1px solid #EF444444',
              borderRadius: 4, color: '#EF4444', fontSize: 11,
            }}>
              {lang === 'id' ? 'Gagal ambil data dari ESPN: ' : 'ESPN data error: '}{error}
            </div>
          )}

          {/* v0.14.5 — Squad section. Pulls full registered roster
              from API-Football (league=274, /players/squads). Same
              shape as EPLClub Squad. */}
          <SLSquadSection
            players={squad}
            loading={squadLoading}
            error={squadError}
            accent={club.accent || '#E2231A'}
            lang={lang}
          />

          {/* v0.13.0 — peer nav across all 18 SL clubs. */}
          <PeerNav
            title={lang === 'id' ? 'Klub Super League lain' : 'Other Super League clubs'}
            currentSlug={club.slug}
            items={CLUBS.map((c) => ({
              slug: c.slug,
              name: c.nameId || c.name,
              short: (c.name || '').slice(0, 3).toUpperCase(),
              color: c.accent || '#E2231A',
              href: `/super-league-2025-26/club/${c.slug}`,
            }))}
            maxItems={18}
          />
        </div>

        <ContactBar lang={lang} />
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

// v0.14.5 — Full registered squad via API-Football, grouped by
// position. Mirrors the EPLClub SquadSection shape. Hidden silently
// if the API key isn't configured or the team can't be resolved on
// API-Football's side (some Liga 1 clubs may not have full coverage).
function SLSquadSection({ players, loading, error, accent, lang }) {
  if (error === 'unauthorized') return null;
  if (error === 'team_id_not_found') return null;
  if (loading && (!players || players.length === 0)) {
    return (
      <section style={{ marginTop: 18, padding: '14px 0' }}>
        <SLSquadHeader accent={accent} lang={lang} />
        <div style={{ fontSize: 11, color: C.dim }}>
          {lang === 'id' ? 'Memuat skuad…' : 'Loading squad…'}
        </div>
      </section>
    );
  }
  if (error || !players || players.length === 0) return null;

  const groups = {
    Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [], Other: [],
  };
  for (const p of players) {
    if (groups[p.position]) groups[p.position].push(p);
    else groups.Other.push(p);
  }
  const labelById = {
    Goalkeeper: lang === 'id' ? 'Kiper' : 'Goalkeeper',
    Defender:   lang === 'id' ? 'Bek' : 'Defender',
    Midfielder: lang === 'id' ? 'Gelandang' : 'Midfielder',
    Attacker:   lang === 'id' ? 'Penyerang' : 'Attacker',
    Other:      lang === 'id' ? 'Lainnya' : 'Other',
  };

  return (
    <section style={{ marginTop: 18, padding: '14px 0' }}>
      <SLSquadHeader accent={accent} lang={lang} count={players.length} />
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {Object.keys(groups).map((pos) => {
          const list = groups[pos];
          if (list.length === 0) return null;
          return (
            <div key={pos} style={{
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 4, padding: '10px 12px',
              background: C.panelSoft,
            }}>
              <div style={{
                fontSize: 9.5, letterSpacing: 1.2, color: C.dim,
                fontWeight: 700, textTransform: 'uppercase',
                marginBottom: 6, fontFamily: 'var(--font-mono)',
              }}>
                {labelById[pos]} <span style={{ color: C.muted, fontWeight: 400 }}>· {list.length}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 3 }}>
                {list.map((p) => (
                  <li key={p.id || p.name} style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr 36px',
                    gap: 6, alignItems: 'baseline', fontSize: 11,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', color: C.dim, fontWeight: 700, textAlign: 'right',
                    }}>{p.number ?? '·'}</span>
                    <span style={{ color: C.text }}>{p.name}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', color: C.muted, fontSize: 10, textAlign: 'right',
                    }}>{p.age ?? ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 8, fontSize: 9, color: C.muted, letterSpacing: 0.4,
      }}>
        {lang === 'id' ? 'Sumber: API-Football · update tiap jam' : 'Source: API-Football · refreshes hourly'}
      </div>
    </section>
  );
}

function SLSquadHeader({ accent, lang, count }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      marginBottom: 10, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 6,
    }}>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-sans)',
        fontSize: 14, fontWeight: 700, letterSpacing: -0.2, color: C.text,
      }}>{lang === 'id' ? 'Skuad' : 'Squad'}</h2>
      {count > 0 && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5,
          color: accent, fontWeight: 700, letterSpacing: 0.6,
        }}>{count} {lang === 'id' ? 'PEMAIN' : 'PLAYERS'}</span>
      )}
    </div>
  );
}

function Header({ title, kicker }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 10, paddingBottom: 5, borderBottom: `1px solid ${C.lineSoft}`,
    }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.1,
      }}>{title}</h2>
      {kicker && <span style={{
        fontSize: 9, color: C.muted, letterSpacing: 1.2, fontWeight: 600,
      }}>{kicker}</span>}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      padding: '10px 12px', background: C.panel,
      border: `1px solid ${C.line}`,
      borderTop: accent ? `2px solid ${accent}` : `1px solid ${C.line}`,
      borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: 18, color: accent || C.text, fontWeight: 700,
        fontFamily: 'var(--font-mono)', letterSpacing: -0.3,
      }}>{value}</span>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{
      padding: '12px 14px', background: C.panelSoft,
      border: `1px dashed ${C.lineSoft}`, borderRadius: 3,
      color: C.dim, fontSize: 11, textAlign: 'center',
    }}>{msg}</div>
  );
}

function Skeleton({ lines = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 40, background: C.panelSoft, borderRadius: 3,
          animation: 'pulse 1.6s infinite',
        }} />
      ))}
    </div>
  );
}

function FixtureList({ fixtures, lang, club, kind }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {fixtures.map((fx) => {
        const isHome = fx.isHome;
        const isFinal = fx.status === 'post';
        const ourScore = fx.ourScore;
        const theirScore = fx.theirScore;
        const result = isFinal ? formResult(fx) : null;
        const resultColor = result === 'W' ? '#10B981'
                          : result === 'L' ? '#EF4444'
                          : result === 'D' ? '#F59E0B' : C.muted;
        return (
          <div key={fx.id} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center', gap: 12,
            padding: '10px 12px', background: C.panel,
            border: `1px solid ${C.line}`, borderRadius: 3,
            borderLeft: `3px solid ${isFinal ? resultColor : club.accent}`,
          }}>
            <span style={{
              fontSize: 9, color: C.muted, letterSpacing: 0.6, fontWeight: 600,
              minWidth: 38, textAlign: 'center',
            }}>{isHome ? (lang === 'id' ? 'HOME' : 'H') : (lang === 'id' ? 'TANDANG' : 'A')}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {fx.opponentSlug ? (
                  <Link to={`/super-league-2025-26/club/${fx.opponentSlug}`} style={{
                    color: C.text, textDecoration: 'none',
                    fontSize: 12.5, fontWeight: 600,
                  }}>
                    {isHome ? 'vs' : '@'} {fx.opponentName}
                  </Link>
                ) : (
                  <span style={{ color: C.text, fontSize: 12.5, fontWeight: 600 }}>
                    {isHome ? 'vs' : '@'} {fx.opponentName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                {formatFixtureDate(fx.date, lang)}
                {fx.statusDetail && fx.status !== 'post' && (
                  <span style={{ color: C.dim, marginLeft: 6 }}>· {fx.statusDetail}</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {isFinal ? (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  fontWeight: 700, color: resultColor,
                }}>
                  {ourScore ?? 0}–{theirScore ?? 0}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5 }}>
                  {fx.statusDetail || (lang === 'id' ? 'BELUM MAIN' : 'UPCOMING')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KeyAccount({ handle, label, accent, primary }) {
  return (
    <a
      href={`https://x.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: '6px 12px',
        background: primary && accent ? accent : C.panel2,
        border: `1px solid ${primary && accent ? accent : C.line}`,
        color: C.text, textDecoration: 'none',
        borderRadius: 3, fontSize: 11,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      <span style={{ fontSize: 9, opacity: 0.7 }}>𝕏</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.7 }}>@{handle}</span>
    </a>
  );
}
