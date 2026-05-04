import React, { useEffect, useMemo } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ProfileLink from '../components/ProfileLink.jsx';
import PeerNav from '../components/PeerNav.jsx';
import ContactBar from '../components/ContactBar.jsx';
// v0.20.0 Phase 2 Sprint F — Shell A leaf chrome.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
import { useApp } from '../lib/AppContext.jsx';
import { useF1Standings } from '../hooks/useF1Standings.js';
import { useF1Results } from '../hooks/useF1Results.js';
import { DRIVERS_2026, DRIVERS_BY_SLUG, DRIVERS_BY_TEAM, TEAMS_BY_ID } from '../lib/sports/f1/constants.js';

/**
 * F1 per-driver page — v0.2.5.
 *
 * /formula-1-2026/driver/:slug
 *
 * Indexable Bahasa-first page per driver. Shows team + number, standings
 * (position, points, wins), season podium tally, and a list of their
 * per-race finishes. Person JSON-LD is emitted by the prerender.
 */
export default function F1Driver() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang, setSelectedConstructor } = useApp();

  const driver = DRIVERS_BY_SLUG[slug];
  if (!driver) return <Navigate to="/formula-1-2026" replace />;

  const team = TEAMS_BY_ID[driver.teamId];
  const accent = team?.accent || '#E10600';

  const { drivers: allDrivers, loading, error } = useF1Standings();
  const { resultsByRound } = useF1Results();

  const standing = allDrivers.find((d) => d.code === driver.code);

  // Per-race finishes for THIS driver across the season.
  const perRaceFinishes = useMemo(() => {
    const rounds = Object.values(resultsByRound || {})
      .sort((a, b) => Number(b.round) - Number(a.round));
    const out = [];
    for (const r of rounds) {
      const hit = (r.podium || []).find((p) => p.code === driver.code);
      // Jolpica results.json returns full result set; we clipped to top 3 in
      // useF1Results. For deeper than P3 this hook would need expanding. For
      // now we show podium hits + "no podium" rows for the other races.
      out.push({ round: r.round, raceName: r.raceName, date: r.date, hit });
    }
    return out;
  }, [resultsByRound, driver.code]);

  const podiums = perRaceFinishes.filter((r) => r.hit).length;
  const wins = perRaceFinishes.filter((r) => r.hit?.position === 1).length;

  // v0.13.0 — `identifier` is not a valid Person property per
  // schema.org; the FIA driver code (VER, HAM, etc.) belongs in
  // `additionalName`. Mirrors the prerender adapter fix.
  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: driver.name,
    additionalName: driver.code,
    jobTitle: 'Formula 1 Driver',
    url: `https://www.gibol.co/formula-1-2026/driver/${driver.slug}`,
    memberOf: team
      ? {
          '@type': 'SportsTeam',
          name: team.name,
          url: `https://www.gibol.co/formula-1-2026/team/${team.slug}`,
        }
      : undefined,
  }), [driver, team]);

  const title = lang === 'id'
    ? `${driver.name} F1 2026 · Poin, Podium, Stats Pembalap ${team?.short || ''} | gibol.co`
    : `${driver.name} F1 2026 · Points, Podiums, ${team?.short || 'Driver'} Stats | gibol.co`;
  const description = lang === 'id'
    ? `${driver.name} (#${driver.number}, ${driver.code}) membalap untuk ${team?.name || 'F1 2026'} musim 2026. Poin klasemen, jumlah podium, jumlah menang, dan peluang juara pembalap.`
    : `${driver.name} (#${driver.number}, ${driver.code}) races for ${team?.name || 'F1 2026'} in 2026. Championship points, podium count, wins, and championship odds.`;

  // v0.20.0 Phase 2 Sprint F — push leaf chrome into V2TopBar
  // subrow per directive §4 ("Strip hero **but** keep the # number
  // tile as a 32 px chip inside StatusStrip (Bebas Neue digit,
  // branded moment). Driver name + nationality flag = picker
  // label."). The # number tile uses Inter Tight 900 here since
  // we don't ship Bebas Neue site-wide; the visual weight is the
  // intent — a confident driver-number badge.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={`${driver.name} (#${driver.number}, ${driver.code}) · Formula 1 2026`}
        accent={accent}
        picker={(
          <Link
            to="/formula-1-2026"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 10px 4px 4px',
              background: `${accent}22`,
              color: 'var(--ink)',
              border: `1px solid ${accent}66`,
              borderRadius: 6,
              fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 32, height: 28, padding: '0 6px',
                background: accent, color: '#fff',
                fontFamily: 'var(--font-sans)', fontWeight: 900,
                fontSize: 14, letterSpacing: -0.5,
                borderRadius: 4,
              }}
            >
              {driver.number}
            </span>
            {driver.name}
            <span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 2 }}>▾</span>
          </Link>
        )}
        live={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', textTransform: 'uppercase' }}>
            FORMULA 1 · 2026 · {lang === 'id' ? 'PEMBALAP' : 'DRIVER'}
            <span style={{ color: 'var(--ink-3)' }}>· {driver.code}</span>
            {team && (
              <span style={{ color: 'var(--ink-3)' }}>
                · <Link
                    to={`/formula-1-2026/team/${team.slug}`}
                    style={{ color: accent, textDecoration: 'none', fontWeight: 700 }}
                    onClick={() => setSelectedConstructor(team.id)}
                  >{team.short || team.name}</Link>
              </span>
            )}
          </span>
        )}
        actions={(
          <HubActionRow
            url={`/formula-1-2026/driver/${driver.slug}`}
            shareText={lang === 'id'
              ? `${driver.name} · F1 2026 di gibol.co 🏎️`
              : `${driver.name} · F1 2026 on gibol.co 🏎️`}
            accent={accent}
            analyticsEvent="f1_driver_share"
          />
        )}
      />
    );
    return () => setTopbarSubrow(null);
  }, [driver, accent, team, lang, setSelectedConstructor]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={title}
        description={description}
        path={location.pathname}
        lang={lang}
        keywords={`${driver.name.toLowerCase()}, ${driver.slug}, ${driver.code.toLowerCase()} f1, f1 2026 ${driver.slug}, pembalap ${team?.short?.toLowerCase() || 'f1'}, klasemen pembalap, podium ${driver.name.toLowerCase()}`}
        jsonLd={schema}
      />
      <div className="dashboard-wrap">

        {/* v0.13.0 — visual breadcrumbs above the hero. */}
        <div style={{ padding: '0 20px' }}>
          <Breadcrumbs
            items={[
              { name: 'Formula 1 2026', to: '/formula-1-2026' },
              { name: driver.name },
            ]}
          />
          {/* v0.46.0 — Phase 2 ship #27. Cross-link to evergreen
              driver profile. Slugifies driver.name (full name) so
              the route resolves to /profile/f1-{slug}. */}
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <ProfileLink sport="f1" driverName={driver.name} />
          </div>
        </div>

        {/* v0.20.0 Phase 2 Sprint F — visible 200px hero stripped.
            Eyebrow + the big "#NN Driver Name" h1 + team link
            collapsed into <HubStatusStrip>. The #NN tile lives as
            a 32px chip inside the strip's picker (the directive's
            "branded moment"). Driver code + team link preserved
            in the strip's live slot. */}

        <div style={{ padding: '16px 20px 20px', display: 'grid', gap: 14 }}>
          {/* Season stats */}
          <section style={{
            padding: 14, background: C.panel, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${accent}`, borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
              {lang === 'id' ? 'STATS MUSIM 2026' : '2026 SEASON STATS'}
            </div>
            {error && (
              <div style={{ fontSize: 11, color: C.muted }}>
                {lang === 'id' ? 'Data Jolpica lagi lambat.' : 'Jolpica data slow.'}
              </div>
            )}
            {!error && loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>{lang === 'id' ? 'Memuat…' : 'Loading…'}</div>
            )}
            {!error && !loading && !standing && (
              <div style={{ fontSize: 11, color: C.dim }}>
                {lang === 'id' ? 'Belum ada balapan musim ini. Mulai 8 Mar 2026.' : 'No races yet. Season starts Mar 8 2026.'}
              </div>
            )}
            {standing && (
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POSISI' : 'POSITION'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 38, lineHeight: 1, color: accent }}>
                    P{standing.position}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'POIN' : 'POINTS'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {standing.points}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'MENANG' : 'WINS'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {standing.wins || wins}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{lang === 'id' ? 'PODIUM' : 'PODIUMS'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 38, lineHeight: 1, color: C.text }}>
                    {podiums}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Per-race podium finishes */}
          {perRaceFinishes.length > 0 && (
            <section style={{
              padding: 14, background: C.panel, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${accent}`, borderRadius: 3,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: 700, marginBottom: 10 }}>
                {lang === 'id' ? 'HASIL PER BALAPAN (PODIUM SAJA)' : 'PER-RACE PODIUM FINISHES'}
              </div>
              <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                {perRaceFinishes.slice(0, 10).map((r) => (
                  <div key={r.round} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 8px', background: C.panelRow, borderRadius: 3,
                  }}>
                    <span style={{ color: C.dim }}>R{String(r.round).padStart(2, '0')} · {r.raceName}</span>
                    <span style={{ color: r.hit ? accent : C.muted, fontWeight: 600 }}>
                      {r.hit
                        ? `P${r.hit.position} · ${r.hit.points} pts`
                        : (lang === 'id' ? '—' : '—')}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 10 }}>
                {lang === 'id'
                  ? 'Finish di luar P3 tidak muncul di sini di rilis ini; hasil lengkap ada di halaman tiap GP.'
                  : 'Finishes outside P3 are not listed in this release; full results on each GP page.'}
              </div>
            </section>
          )}

          {/* v0.13.0 — peer-driver nav. Splits into "teammate(s)"
              first (only 1 row but it's the highest-context link
              for the user) followed by all 22 drivers. PageRank flow
              + UX. */}
          {team && (DRIVERS_BY_TEAM[team.id] || []).length > 1 && (
            <PeerNav
              title={lang === 'id' ? `Rekan tim ${team.short}` : `${team.short} teammates`}
              currentSlug={driver.slug}
              items={(DRIVERS_BY_TEAM[team.id] || []).map((d) => ({
                slug: d.slug,
                name: d.name,
                short: d.code,
                color: team.accent,
                href: `/formula-1-2026/driver/${d.slug}`,
              }))}
              maxItems={5}
            />
          )}
          <PeerNav
            title={lang === 'id' ? 'Pembalap F1 lain' : 'Other F1 drivers'}
            currentSlug={driver.slug}
            items={DRIVERS_2026.map((d) => {
              const t = TEAMS_BY_ID[d.teamId];
              return {
                slug: d.slug,
                name: d.name,
                short: d.code,
                color: t?.accent || '#E10600',
                href: `/formula-1-2026/driver/${d.slug}`,
              };
            })}
            maxItems={22}
          />
        </div>

        <div style={{
          padding: '10px 20px',
          fontSize: 10, color: C.muted, lineHeight: 1.5,
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {lang === 'id'
            ? `Gibol bukan afiliasi resmi ${driver.name} atau ${team?.short || 'tim F1 manapun'}. Data: Jolpica-F1.`
            : `Gibol is not officially affiliated with ${driver.name} or ${team?.short || 'any F1 team'}. Data: Jolpica-F1.`}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · F1 Indonesia</div>
          <ContactBar lang={lang} variant="inline" />
          <div>← <a href="/formula-1-2026" style={{ color: C.dim, textDecoration: 'none' }}>{lang === 'id' ? 'dashboard F1' : 'F1 dashboard'}</a></div>
        </div>
      </div>
    </div>
  );
}
