import React, { useMemo } from 'react';
import { useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Chip from '../components/Chip.jsx';
import LiveMatchCard from '../components/tennis/LiveMatchCard.jsx';
import CountdownToSlam from '../components/tennis/CountdownToSlam.jsx';
import TierChip from '../components/tennis/TierChip.jsx';
import SurfaceChip from '../components/tennis/SurfaceChip.jsx';
import { useTennisScoreboard } from '../hooks/useTennisScoreboard.js';
import { useTennisTournament } from '../hooks/useTennisTournament.js';
import {
  formatTennisDateRange,
  daysUntil,
  humanRelativeDays,
} from '../lib/sports/tennis/constants.js';
import {
  SEASON_YEAR,
  TOURNAMENTS_2026,
  tournamentPath,
} from '../lib/sports/tennis/tournaments.js';
import adapter from '../lib/sports/tennis/adapter.js';

// ─── SEO metadata lookup ────────────────────────────────────────────────────
function getTournamentMeta(path) {
  const routes = adapter.prerenderRoutes();
  return routes.find((r) => r.path === path) || {};
}

// ─── Upcoming variant ───────────────────────────────────────────────────────
function UpcomingBody({ tournament, year, lang }) {
  const days = daysUntil(tournament.startDate);
  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 340px) 1fr',
          gap: 14,
        }}
      >
        <CountdownToSlam variant="full" />
        <TournamentFactSheet tournament={tournament} year={year} lang={lang} />
      </div>
      <div
        style={{
          padding: 14,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          fontSize: 11.5,
          color: C.dim,
          lineHeight: 1.6,
        }}
      >
        {lang === 'id'
          ? `Undian lengkap dan jadwal WIB akan masuk otomatis saat ${tournament.name} dimulai (${tournament.startDate}). Set notifikasi via tombol share di bawah — kita kirim link langsung ke halaman ini begitu match pertama mulai.`
          : `Full draw and WIB schedule will populate automatically once ${tournament.name} begins (${tournament.startDate}). Use the share button below — we'll link straight back to this page when the first match goes live.`}
        {days != null && days > 0 && (
          <div
            style={{
              marginTop: 10,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              color: C.muted,
              letterSpacing: 0.5,
            }}
          >
            {lang === 'id'
              ? `Hitung mundur: ${humanRelativeDays(days, 'id')}`
              : `Countdown: ${humanRelativeDays(days, 'en')}`}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Live variant ───────────────────────────────────────────────────────────
function LiveBody({ tournament, year, lang }) {
  // Show merged ATP + WTA scoreboard, filtered to matches whose tournamentName
  // contains a word from the tournament's name. Rough but effective for slams.
  const atp = useTennisScoreboard('atp');
  const wta = useTennisScoreboard('wta');
  const nameTokens = useMemo(
    () => tournament.name.split(/\s+/).filter((x) => x.length > 3).map((x) => x.toLowerCase()),
    [tournament.name]
  );

  const matches = useMemo(() => {
    const all = [...(atp.matches || []), ...(wta.matches || [])];
    return all
      .filter((m) => {
        const t = (m.tournamentName || '').toLowerCase();
        return nameTokens.some((tok) => t.includes(tok));
      })
      .sort((a, b) => {
        const order = { live: 0, pre: 1, post: 2 };
        const oa = order[a.status] ?? 3;
        const ob = order[b.status] ?? 3;
        if (oa !== ob) return oa - ob;
        return (a.startUTC || '').localeCompare(b.startUTC || '');
      })
      .slice(0, 30);
  }, [atp.matches, wta.matches, nameTokens]);

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <TournamentFactSheet tournament={tournament} year={year} lang={lang} />
      <section
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderLeft: `3px solid ${C.tennisLive}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            background: C.panelSoft,
            borderBottom: `1px solid ${C.line}`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: 1.5,
            color: C.tennisLive,
            fontWeight: 700,
          }}
        >
          {lang === 'id' ? 'PERTANDINGAN LIVE' : 'LIVE MATCHES'}
        </div>
        {matches.length === 0 ? (
          <div style={{ padding: 16, fontSize: 11, color: C.dim }}>
            {lang === 'id'
              ? 'Belum ada match yang terdeteksi dari ESPN. Biasanya karena sedang jeda hari/sesi.'
              : 'No matches detected from ESPN yet — probably a day break.'}
          </div>
        ) : (
          matches.map((m) => <LiveMatchCard key={m.id} match={m} />)
        )}
      </section>
    </section>
  );
}

// ─── Completed variant (archive) ────────────────────────────────────────────
function CompletedBody({ tournament, year, lang }) {
  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <TournamentFactSheet tournament={tournament} year={year} lang={lang} />
      <div
        style={{
          padding: 14,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          fontSize: 11.5,
          color: C.dim,
          lineHeight: 1.6,
        }}
      >
        {lang === 'id'
          ? `${tournament.name} ${year} sudah selesai (${tournament.endDate}). Detail juara, runner-up, dan recap jalur final akan ditambahkan di update berikutnya. Sementara: undian resmi tersedia di ${tournament.web}.`
          : `${tournament.name} ${year} has concluded (${tournament.endDate}). Champion, runner-up, and final-path recap coming in a follow-up release. For now: official draw at ${tournament.web}.`}
      </div>
    </section>
  );
}

// ─── Shared fact sheet ──────────────────────────────────────────────────────
function TournamentFactSheet({ tournament, year, lang }) {
  const t = tournament;
  const toursLabel = t.tours.map((x) => x.toUpperCase()).join(' · ');
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${t.accent || C.tennisSlamGold}`,
        borderRadius: 3,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <TierChip tier={t.tier} size="sm" />
        <SurfaceChip surface={t.surface} size="sm" />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        <Fact label={lang === 'id' ? 'VENUE' : 'VENUE'} value={t.venue} />
        <Fact label={lang === 'id' ? 'KOTA' : 'CITY'} value={t.city} />
        <Fact
          label={lang === 'id' ? 'TANGGAL' : 'DATES'}
          value={formatTennisDateRange(t.startDate, t.endDate, lang)}
        />
        <Fact label={lang === 'id' ? 'TUR' : 'TOUR'} value={toursLabel} />
        <Fact
          label={lang === 'id' ? 'PENYELENGGARA' : 'ORGANIZER'}
          value={t.organizer}
        />
        {t.web && (
          <Fact
            label={lang === 'id' ? 'SITUS RESMI' : 'OFFICIAL'}
            value={
              <a
                href={t.web}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: t.accent || C.tennisSlamGold, textDecoration: 'none' }}
              >
                {t.web.replace(/^https?:\/\//, '')}
              </a>
            }
          />
        )}
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        background: C.panelRow,
        border: `1px solid ${C.lineSoft}`,
        borderRadius: 3,
      }}
    >
      <div
        style={{
          fontSize: 8.5,
          letterSpacing: 1.5,
          color: C.muted,
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          marginTop: 4,
          color: C.text,
          fontWeight: 500,
          lineHeight: 1.3,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Other tournaments (for internal-link SEO) ──────────────────────────────
function RelatedTournaments({ currentId, lang }) {
  const related = TOURNAMENTS_2026.filter((t) => t.id !== currentId).slice(0, 6);
  return (
    <section>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          color: C.muted,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {lang === 'id' ? 'TURNAMEN LAIN' : 'OTHER TOURNAMENTS'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {related.map((t) => (
          <Link
            key={t.id}
            to={tournamentPath(t, SEASON_YEAR)}
            style={{
              padding: '6px 10px',
              background: C.panel,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${t.accent || C.tennisSlamGold}`,
              borderRadius: 3,
              fontSize: 11,
              color: C.text,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {lang === 'id' ? t.nameId : t.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function TennisTournament() {
  const location = useLocation();
  const params = useParams();
  const { lang } = useApp();

  const { tournament, year, phase } = useTennisTournament(params.slug);
  if (!tournament) {
    return <Navigate to="/tennis" replace />;
  }

  const accent = tournament.accent || C.tennisSlamGold;
  const meta = getTournamentMeta(tournamentPath(tournament, year));

  const phaseChip =
    phase === 'live'
      ? { label: lang === 'id' ? 'LIVE' : 'LIVE', color: C.tennisLive }
      : phase === 'completed'
      ? { label: lang === 'id' ? 'SELESAI' : 'COMPLETED', color: C.muted }
      : { label: lang === 'id' ? 'MENDATANG' : 'UPCOMING', color: accent };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.text,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <SEO
        title={meta.title}
        description={meta.description}
        path={location.pathname}
        lang={lang}
        keywords={meta.keywords}
        jsonLd={meta.jsonLd}
      />
      <div className="dashboard-wrap">
        <TopBar
          showBackLink
          backTo="/tennis"
          backLabel={lang === 'id' ? '← SEMUA TURNAMEN' : '← ALL TOURNAMENTS'}
          accent={accent}
        />

        {/* Hero */}
        <div
          style={{
            padding: '20px 20px 14px',
            background: `linear-gradient(135deg, ${accent}14 0%, transparent 70%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                color: accent,
                fontWeight: 700,
                paddingTop: 4,
              }}
            >
              {tournament.tours.map((x) => x.toUpperCase()).join(' · ')} · {tournament.city.toUpperCase()}
            </div>
            <Chip variant="live" sportId="tennis" accent={phaseChip.color} label={phaseChip.label} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: C.text,
              marginBottom: 8,
              textWrap: 'balance',
            }}
          >
            {lang === 'id' ? tournament.nameId : tournament.name} {year}
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 720 }}>
            {lang === 'id'
              ? `${formatTennisDateRange(tournament.startDate, tournament.endDate, 'id')} · ${tournament.venue}, ${tournament.city}. Undian, jadwal WIB, dan hasil live set-per-set untuk tur ${tournament.tours.map((x) => x.toUpperCase()).join(' + ')}.`
              : `${formatTennisDateRange(tournament.startDate, tournament.endDate, 'en')} · ${tournament.venue}, ${tournament.city}. Draw, WIB schedule, and live set-by-set results for ${tournament.tours.map((x) => x.toUpperCase()).join(' + ')}.`}
          </div>
        </div>

        {/* Body branches on phase */}
        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 16 }}>
          {phase === 'upcoming' && (
            <UpcomingBody tournament={tournament} year={year} lang={lang} />
          )}
          {phase === 'live' && (
            <LiveBody tournament={tournament} year={year} lang={lang} />
          )}
          {phase === 'completed' && (
            <CompletedBody tournament={tournament} year={year} lang={lang} />
          )}
          <RelatedTournaments currentId={tournament.id} lang={lang} />
        </div>

        {/* Disclaimer */}
        <div
          style={{
            padding: '10px 14px',
            fontSize: 10,
            color: C.muted,
            lineHeight: 1.5,
            borderTop: `1px solid ${C.lineSoft}`,
          }}
        >
          {lang === 'id'
            ? `Gibol tidak berafiliasi dengan ${tournament.organizer}. Skor + jadwal via ESPN. Undian resmi di ${tournament.web}.`
            : `Gibol is not affiliated with ${tournament.organizer}. Scores + schedule via ESPN. Official draw at ${tournament.web}.`}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: `1px solid ${C.line}`,
            fontSize: 9.5,
            color: C.muted,
            letterSpacing: 0.3,
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>gibol.co · {lang === 'id' ? 'Tenis Indonesia' : 'Tennis Indonesia'}</div>
          <ContactBar lang={lang} variant="inline" />
          <div>
            ← <Link to="/tennis" style={{ color: C.dim, textDecoration: 'none' }}>
              {lang === 'id' ? 'hub tenis' : 'tennis hub'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
