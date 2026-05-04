import React, { useEffect, useMemo } from 'react';
import { useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ContactBar from '../components/ContactBar.jsx';
// v0.18.0 Phase 2 Sprint C — `<Chip variant="live">` migrated to
// <LiveStatusPill variant="live" /> (the canonical status pill).
import LiveStatusPill from '../components/v2/LiveStatusPill.jsx';
// v0.20.0 Phase 2 Sprint F — Shell A leaf chrome.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
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

  // v0.20.0 Phase 2 Sprint F — push leaf chrome into V2TopBar
  // subrow. Picker label = ATP / WTA tour pill (consolidates the
  // visible TourSwitcher's two pills into a single picker chip
  // for chrome consistency; the inline TourSwitcher stays in the
  // page body for now since it has its own focus styling). Tennis
  // accent on 3px left stripe.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={lang === 'id'
          ? `Peringkat ${tourLabel} ${SEASON} — top 500 petenis dengan poin dan tren`
          : `${tourLabel} Rankings ${SEASON} — top 500 players with points + trend`}
        accent={TENNIS_ACCENT}
        picker={(
          <Link
            to="/tennis"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: `${TENNIS_ACCENT}14`,
              color: 'var(--ink)',
              border: `1px solid ${TENNIS_ACCENT}66`,
              borderRadius: 6,
              fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ width: 3, height: 14, background: TENNIS_ACCENT }} />
            {tourLabel} {lang === 'id' ? 'Peringkat' : 'Rankings'}
            <span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 2 }}>▾</span>
          </Link>
        )}
        live={(
          <span style={{ textTransform: 'uppercase' }}>
            {tourLabel} TOUR · {lang === 'id' ? 'MUSIM' : 'SEASON'} {SEASON}
          </span>
        )}
        actions={(
          <HubActionRow
            url={`/tennis/rankings/${tour}`}
            shareText={lang === 'id'
              ? `Peringkat ${tourLabel} ${SEASON} di gibol.co 🎾`
              : `${tourLabel} Rankings ${SEASON} on gibol.co 🎾`}
            accent={TENNIS_ACCENT}
            analyticsEvent="tennis_rankings_share"
          />
        )}
      />
    );
    return () => setTopbarSubrow(null);
  }, [tour, tourLabel, lang]);

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

        {/* v0.13.0 — visual breadcrumbs above the hero. */}
        <div style={{ padding: '0 20px' }}>
          <Breadcrumbs
            items={[
              { name: lang === 'id' ? 'Tenis 2026' : 'Tennis 2026', to: '/tennis' },
              { name: `${lang === 'id' ? 'Peringkat' : 'Rankings'} ${tourLabel}` },
            ]}
          />
        </div>

        {/* v0.20.0 Phase 2 Sprint F — visible 200px hero stripped.
            Eyebrow + 36px h1 + LIVE chip + tour-label subhead all
            collapsed into <HubStatusStrip>. SEO h1 rides as
            `.sr-only`. The interactive <TourSwitcher> (ATP / WTA
            toggle) stays in the page body — it has its own focus
            styling + click affordance and is best placed near the
            rankings table it controls. */}
        <div style={{ padding: '12px 20px 14px' }}>
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
