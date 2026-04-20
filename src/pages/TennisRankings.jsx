import React, { useMemo } from 'react';
import { useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import ContactBar from '../components/ContactBar.jsx';
import Chip from '../components/Chip.jsx';
import RankingsTable from '../components/tennis/RankingsTable.jsx';
import { useTennisRankings } from '../hooks/useTennisRankings.js';
import { SEASON, TOURS, TOUR_LABEL } from '../lib/sports/tennis/constants.js';
import adapter from '../lib/sports/tennis/adapter.js';

const TENNIS_ACCENT = '#D4A13A';

function getRankingsMeta(path) {
  const routes = adapter.prerenderRoutes();
  return routes.find((r) => r.path === path) || {};
}

// ─── Tour switcher ──────────────────────────────────────────────────────────
function TourSwitcher({ tour, lang }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: C.panelSoft,
        border: `1px solid ${C.line}`,
        borderRadius: 4,
      }}
    >
      {TOURS.map((x) => {
        const active = x === tour;
        return (
          <Link
            key={x}
            to={`/tennis/rankings/${x}`}
            style={{
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: 0.8,
              color: active ? '#fff' : C.muted,
              background: active ? TENNIS_ACCENT : 'transparent',
              borderRadius: 3,
              textDecoration: 'none',
            }}
          >
            {TOUR_LABEL[x]}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Top-10 podium strip (quick-glance block above the full table) ─────────
function TopPodium({ ranks, lang }) {
  const top = (ranks || []).slice(0, 10);
  if (!top.length) return null;
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${TENNIS_ACCENT}`,
        borderRadius: 3,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          color: C.muted,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {lang === 'id' ? 'TOP 10 · RINGKAS' : 'TOP 10 · SNAPSHOT'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {top.map((r) => (
          <div
            key={(r.athleteId || r.slug || r.name) + r.current}
            style={{
              padding: '8px 10px',
              background: C.panelRow,
              border: `1px solid ${C.lineSoft}`,
              borderLeft: `3px solid ${
                r.current === 1 ? TENNIS_ACCENT : r.current <= 3 ? C.tennisMastersSilv : C.lineSoft
              }`,
              borderRadius: 3,
            }}
          >
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                color: C.muted,
                letterSpacing: 0.5,
                fontWeight: 700,
              }}
            >
              #{r.current}
              {r.countryCode && (
                <span style={{ marginLeft: 6, color: C.dim, letterSpacing: 0.4 }}>
                  {r.countryCode}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: C.text,
                fontWeight: 600,
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {r.name}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: C.dim,
                marginTop: 3,
              }}
            >
              {(r.points || 0).toLocaleString()} pt
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────
export default function TennisRankings() {
  const location = useLocation();
  const params = useParams();
  const { lang } = useApp();

  const tour = (params.tour || '').toLowerCase();
  if (!TOURS.includes(tour)) {
    return <Navigate to="/tennis/rankings/atp" replace />;
  }

  const { ranks, loading, error } = useTennisRankings(tour);
  const meta = getRankingsMeta(`/tennis/rankings/${tour}`);
  const tourLabel = TOUR_LABEL[tour];

  const indonesianRanks = useMemo(
    () =>
      (ranks || []).filter(
        (r) => r.countryCode && ['IDN', 'INA', 'ID'].includes(r.countryCode)
      ),
    [ranks]
  );

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
          backLabel={lang === 'id' ? '← HUB TENIS' : '← TENNIS HUB'}
          accent={TENNIS_ACCENT}
        />

        {/* Hero */}
        <div
          style={{
            padding: '20px 20px 14px',
            background: `linear-gradient(135deg, ${TENNIS_ACCENT}14 0%, transparent 70%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                color: TENNIS_ACCENT,
                fontWeight: 700,
                paddingTop: 4,
              }}
            >
              {tourLabel} TOUR · SEASON {SEASON}
            </div>
            <Chip variant="live" sportId="tennis" accent={TENNIS_ACCENT} label="LIVE" />
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
            {lang === 'id' ? `Peringkat ${tourLabel} ${SEASON}` : `${tourLabel} Rankings ${SEASON}`}
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 720, marginBottom: 12 }}>
            {lang === 'id'
              ? `Top 500 petenis ${tourLabel} dengan poin, perubahan posisi pekanan, dan tren. Refresh setiap Senin sesuai update resmi ${tourLabel}.`
              : `Top 500 ${tourLabel} players with points, weekly position changes, and trend. Refreshed every Monday per the official ${tourLabel} update.`}
          </div>
          <TourSwitcher tour={tour} lang={lang} />
        </div>

        <div style={{ padding: '8px 20px 20px', display: 'grid', gap: 16 }}>
          {error && (
            <div
              style={{
                padding: 12,
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderLeft: `3px solid ${C.tennisLive}`,
                borderRadius: 3,
                fontSize: 11,
                color: C.muted,
              }}
            >
              {lang === 'id'
                ? 'Data ESPN lagi lambat. Muncul lagi kalau sudah nyambung.'
                : 'ESPN data is slow. Will refresh when available.'}
            </div>
          )}

          {loading && (!ranks || ranks.length === 0) ? (
            <div
              style={{
                padding: 18,
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 3,
                fontSize: 11,
                color: C.dim,
              }}
            >
              {lang === 'id' ? `Memuat peringkat ${tourLabel}…` : `Loading ${tourLabel} rankings…`}
            </div>
          ) : (
            <>
              <TopPodium ranks={ranks} lang={lang} />
              {indonesianRanks.length > 0 && (
                <section
                  style={{
                    padding: '10px 14px',
                    background: `${C.tennisSlamGold}10`,
                    border: `1px solid ${C.tennisSlamGold}40`,
                    borderRadius: 3,
                    fontSize: 11,
                    color: C.text,
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: C.tennisSlamGold, letterSpacing: 0.3 }}>
                    {lang === 'id' ? 'Petenis Indonesia di top 500' : 'Indonesian players in top 500'}:
                  </strong>{' '}
                  {indonesianRanks
                    .map((r) => `${r.name} (#${r.current})`)
                    .join(' · ')}
                </section>
              )}
              <RankingsTable ranks={ranks || []} limit={100} tour={tour} />
            </>
          )}
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
            ? `Gibol tidak berafiliasi dengan ${tourLabel}. Data peringkat via ESPN (proxy edge-cached). Update resmi setiap Senin.`
            : `Gibol is not affiliated with ${tourLabel}. Ranking data via ESPN (edge-cached proxy). Official update every Monday.`}
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
          <div>gibol.co · {lang === 'id' ? 'Peringkat Tenis' : 'Tennis Rankings'}</div>
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
