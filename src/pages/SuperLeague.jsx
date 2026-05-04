import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import SEOContent from '../components/SEOContent.jsx';
// v0.53.1 — Phase C redesign: 3-up Newsroom Slice. Gated UI.v2.
import NewsroomSlice from '../components/v2/NewsroomSlice.jsx';
import { UI } from '../lib/flags.js';
import ContactBar from '../components/ContactBar.jsx';
import SuperLeagueDayScoreboard from '../components/SuperLeagueDayScoreboard.jsx';
// v0.18.0 Phase 2 Sprint C — SuperLeagueClubPicker is now reached via
// <HubPicker kind="liga1-club" />. Import path stays valid for any
// edge case but the hub no longer references it directly.
// v0.17.0 Phase 2 Sprint B — shared chrome row replacing per-hub
// hero blocks. The visible eyebrow / h1 / subhead / red SHARE that
// used to sit at the top of this page have all collapsed into the
// strip; the SEO h1 rides along as `.sr-only` so crawlers + screen
// readers still get a heading on the page.
import HubStatusStrip from '../components/v2/HubStatusStrip.jsx';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import HubPicker from '../components/v2/HubPicker.jsx';
import { setTopbarSubrow } from '../lib/topbarSubrow.js';
import { useApp } from '../lib/AppContext.jsx';
import { useQueryParamSync } from '../hooks/useQueryParamSync.js';
import { useSuperLeagueStandings } from '../hooks/useSuperLeagueStandings.js';
import { useSuperLeagueFixtures } from '../hooks/useSuperLeagueFixtures.js';
// v0.14.3 — shared leaderboard panel (Goals / Assists toggle).
// Replaces v0.14.0's per-sport TopScorerPanel + useSuperLeagueTopScorers
// hook. The new pattern is fed by the generic
// useApiFootballLeaderboard hook and reused across EPL too.
import LeaderboardPanel from '../components/LeaderboardPanel.jsx';
import {
  SEASON, SEASON_START, SEASON_END, CLUBS, formatFixtureDate,
  CLUBS_BY_SLUG, LEAGUE_NAME, LEAGUE_NAME_FULL, LEAGUE_NAME_ID,
} from '../lib/sports/liga-1-id/clubs.js';

const SL_RED = '#E2231A';
const SL_BLUE = '#005BAC'; // Persib accent — used for context strip

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      display: 'inline-block', width: 18, height: 18,
      borderRadius: 3,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color, fontSize: 10, fontWeight: 700,
      textAlign: 'center', lineHeight: '16px',
      marginRight: 2, fontFamily: 'var(--font-mono)',
    }}>{letter}</span>
  );
}

function zoneFor(rank) {
  // 18-club Super League zone mapping (per PSSI 2025-26 rules):
  //   Top 1   → AFC Champions League Elite (juara kompetisi)
  //   Top 2-4 → AFC Champions League Two / playoff (kuota Indonesia)
  //   17-18   → Zona degradasi langsung
  //   16      → Zona play-off degradasi
  if (!rank) return null;
  if (rank === 1) return { label: 'Juara · AFC CL Elite', en: 'Champion · AFC CL Elite', color: '#FBBF24' };
  if (rank <= 4) return { label: 'Zona AFC', en: 'AFC zone', color: '#3B82F6' };
  if (rank >= 17) return { label: 'Zona degradasi', en: 'Relegation', color: '#EF4444' };
  if (rank === 16) return { label: 'Play-off degradasi', en: 'Relegation play-off', color: '#F59E0B' };
  return null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SuperLeague() {
  const location = useLocation();
  // toggleLang lived in the old hero's toolbar; the global toggle in
  // V2TopBar now owns it, so we just consume `lang` here.
  const { lang } = useApp();

  // Selected club (drives the spotlight strip + filter — same UX as EPL).
  const [selectedSlug, setSelectedSlug] = useState(null);
  useQueryParamSync('club', selectedSlug, setSelectedSlug);
  const selectedClub = selectedSlug ? CLUBS_BY_SLUG[selectedSlug] : null;

  // v0.17.0 Phase 2 Sprint B — push the canonical chrome row into the
  // V2TopBar subrow slot. Previous version rendered an inline 200px
  // hero (eyebrow + 26px h1 + subhead + red SHARE button) right at
  // the top of the page; that's gone now. SEO h1 rides as `.sr-only`
  // inside the strip so crawlers + screen readers still get a
  // heading on `/super-league-2025-26`.
  useEffect(() => {
    setTopbarSubrow(
      <HubStatusStrip
        srOnlyTitle={lang === 'id'
          ? `Super League Indonesia ${SEASON} — Klasemen + Jadwal Liga 1`
          : `Indonesian Super League ${SEASON} — Live Scores + Standings`}
        picker={
          <HubPicker
            kind="liga1-club"
            selectedKey={selectedSlug}
            onSelect={setSelectedSlug}
            lang={lang}
          />
        }
        live={
          <span style={{ textTransform: 'uppercase' }}>
            {lang === 'id' ? `Super League · Musim ${SEASON}` : `Super League · ${SEASON}`}
          </span>
        }
        actions={
          <HubActionRow
            url="/super-league-2025-26"
            shareText={lang === 'id'
              ? `Klasemen + jadwal Super League ${SEASON} di gibol.co ⚽`
              : `Indonesian Super League ${SEASON} standings + fixtures on gibol.co ⚽`}
            accent={SL_RED}
            analyticsEvent="superleague_share_hub"
          />
        }
      />
    );
    return () => setTopbarSubrow(null);
  }, [lang, selectedSlug]);

  const { rows: standings, loading: stLoading, error: stError } = useSuperLeagueStandings();
  const { upcoming, recent, loading: fxLoading, error: fxError } = useSuperLeagueFixtures();

  // Combine upcoming + recent for the day scoreboard (mirrors EPL pattern).
  const allFixtures = useMemo(
    () => [...(upcoming || []), ...(recent || [])],
    [upcoming, recent]
  );

  // Selected club's standings row (for spotlight).
  const selectedRow = useMemo(
    () => selectedClub ? standings.find((r) => r.teamId === selectedClub.espnId) : null,
    [standings, selectedClub]
  );

  // ─── SEO copy ───────────────────────────────────────────────────────────────
  const title = lang === 'id'
    ? `Super League Indonesia ${SEASON} — Klasemen, Jadwal | gibol.co`
    : `Indonesian Super League ${SEASON} — Standings, Fixtures | gibol.co`;
  const description = lang === 'id'
    ? `Skor Super League Indonesia (BRI Liga 1) ${SEASON} live: klasemen 18 klub, jadwal pekan ini WIB, hasil terbaru, derby Persija vs Persib. Bahasa Indonesia, casual.`
    : `Indonesian Super League (BRI Liga 1) ${SEASON} live: 18-club standings, this week's fixtures (WIB), latest results, Persija vs Persib derby tracker. Bahasa-first.`;
  const keywords = 'super league indonesia, liga 1, bri liga 1, klasemen liga 1, jadwal liga 1, hasil liga 1, persija, persib, persebaya, arema, bali united, el clasico indonesia, super league 2025-26, liga 1 indonesia bahasa';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${LEAGUE_NAME_FULL} ${SEASON}`,
    alternateName: ['Super League Indonesia', 'BRI Liga 1', 'Liga 1 Indonesia'],
    startDate: SEASON_START,
    endDate: SEASON_END,
    eventStatus: 'https://schema.org/EventScheduled',
    sport: 'Soccer',
    location: { '@type': 'Country', name: 'Indonesia' },
    organizer: {
      '@type': 'SportsOrganization',
      name: 'PT Liga Indonesia Baru',
      url: 'https://ligaindonesiabaru.com',
    },
    url: 'https://www.gibol.co/super-league-2025-26',
  };

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
        jsonLd={jsonLd}
      />

      <div className="dashboard-wrap">
        {/* v0.17.0 Phase 2 Sprint B — visible hero stripped.
            Eyebrow + 26px h1 + subhead + filled red BAGIKAN/SHARE
            button all collapsed into <HubStatusStrip> in the V2TopBar
            subrow. The SEO h1 rides as `.sr-only` inside the strip.
            Live data (spotlight strip / scoreboard / standings) is
            now ~140px closer to the top of the viewport. */}

        {/* ─── Spotlight strip when a club is picked ──────────────────────── */}
        {selectedClub && (
          <div style={{
            padding: '14px 20px',
            background: `linear-gradient(90deg, ${selectedClub.accent}22 0%, ${C.bg} 70%)`,
            borderBottom: `1px solid ${C.lineSoft}`,
            display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontSize: 9, color: selectedClub.accent, letterSpacing: 1.4, fontWeight: 700,
              }}>
                {lang === 'id' ? 'KLUB FAVORITE' : 'YOUR CLUB'}
              </div>
              <Link to={`/super-league-2025-26/club/${selectedClub.slug}`} style={{
                color: C.text, textDecoration: 'none', fontSize: 18, fontWeight: 700,
              }}>
                {selectedClub.name} →
              </Link>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                {selectedClub.stadium} · {selectedClub.city}
              </div>
            </div>
            {selectedRow && (
              <div style={{ display: 'flex', gap: 18, fontSize: 11 }}>
                <Stat label={lang === 'id' ? 'POS' : 'POS'} value={`#${selectedRow.rank || '—'}`} />
                <Stat label={lang === 'id' ? 'POIN' : 'PTS'} value={selectedRow.points} />
                <Stat label={lang === 'id' ? 'SG' : 'GD'} value={
                  selectedRow.goalDiff > 0 ? `+${selectedRow.goalDiff}` : selectedRow.goalDiff
                } />
                <Stat label={lang === 'id' ? 'M-S-K' : 'W-D-L'} value={
                  `${selectedRow.wins}-${selectedRow.draws}-${selectedRow.losses}`
                } />
              </div>
            )}
          </div>
        )}

        {/* ─── Body grid ───────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 20px 40px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 26,
        }}>
          {/* Day scoreboard */}
          <section>
            <SectionHeader
              title={lang === 'id' ? 'Jadwal & Hasil' : 'Fixtures & Results'}
              kicker={lang === 'id' ? 'PEKAN INI · WIB' : 'THIS WEEK · WIB'}
            />
            {fxError && (
              <ErrorBanner msg={lang === 'id' ? 'Gagal ambil jadwal dari ESPN. Cek sebentar lagi.' : 'Couldn\'t load fixtures from ESPN. Try again shortly.'} />
            )}
            {fxLoading && allFixtures.length === 0 ? (
              <Skeleton lines={3} />
            ) : (
              <SuperLeagueDayScoreboard fixtures={allFixtures} lang={lang} />
            )}
          </section>

          {/* Standings — v0.13.4: id="standings" anchor for the
              MobileBottomNav SuperLeague "Klasemen" deep link. */}
          <section id="standings" style={{ scrollMarginTop: 60 }}>
            <SectionHeader
              title={lang === 'id' ? 'Klasemen' : 'Standings'}
              kicker={lang === 'id' ? `${SEASON} · 18 KLUB` : `${SEASON} · 18 CLUBS`}
            />
            {stError && (
              <ErrorBanner msg={lang === 'id' ? 'Gagal ambil klasemen dari ESPN.' : 'Couldn\'t load standings from ESPN.'} />
            )}
            {stLoading && standings.length === 0 ? (
              <Skeleton lines={6} />
            ) : (
              <StandingsTable rows={standings} lang={lang} highlightSlug={selectedSlug} />
            )}
          </section>

          {/* v0.14.0 — Top Skor / Golden Boot. Hash anchor matches the
              MobileBottomNav SuperLeague deep link wired in Ship B. */}
          <section id="top-scorer" style={{ scrollMarginTop: 60 }}>
            <SectionHeader
              title={lang === 'id' ? 'Top Skor & Top Assist' : 'Top Scorers & Assists'}
              kicker={lang === 'id' ? `${SEASON} · GOLDEN BOOT` : `${SEASON} · GOLDEN BOOT`}
            />
            <LeaderboardPanel
              league={274}
              season={2025}
              resolveClub={resolveSuperLeagueClub}
              clubHrefBase="/super-league-2025-26/club"
              highlightSlug={selectedSlug}
              lang={lang}
            />
          </section>

          {/* v0.53.1 — Phase C redesign: NewsroomSlice. UI.v2-gated. */}
          {UI.v2 && (
            <NewsroomSlice
              sport="liga-1-id"
              newsroomLabel="SUPER LEAGUE NEWSROOM"
              moreHref="/super-league-2025-26#newsroom"
            />
          )}

          {/* SEO body content */}
          <SEOContent lang={lang} sport="super-league" />
        </div>

        <ContactBar lang={lang} />
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, color: C.text, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

function SectionHeader({ title, kicker }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.lineSoft}`,
    }}>
      <h2 style={{
        fontSize: 16, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.2,
      }}>{title}</h2>
      <span style={{ fontSize: 9.5, color: C.muted, letterSpacing: 1.2, fontWeight: 600 }}>
        {kicker}
      </span>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      padding: '10px 14px', background: '#EF444411', border: '1px solid #EF444444',
      borderRadius: 4, color: '#EF4444', fontSize: 11, marginBottom: 10,
    }}>{msg}</div>
  );
}

function Skeleton({ lines = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 32, background: C.panelSoft, borderRadius: 3,
          animation: 'pulse 1.6s infinite',
        }} />
      ))}
    </div>
  );
}

function StandingsTable({ rows, lang, highlightSlug }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        padding: 16, background: C.panelSoft, border: `1px dashed ${C.lineSoft}`,
        borderRadius: 4, color: C.dim, fontSize: 11.5, textAlign: 'center',
      }}>
        {lang === 'id' ? 'Klasemen belum tersedia.' : 'Standings unavailable.'}
      </div>
    );
  }
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, overflowX: 'auto',
    }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 11.5,
        fontFamily: 'var(--font-mono)', minWidth: 640,
      }}>
        <thead>
          <tr style={{ background: C.panelSoft, color: C.muted, fontSize: 9.5, letterSpacing: 0.8 }}>
            <th style={th}>#</th>
            <th style={{ ...th, textAlign: 'left', minWidth: 180 }}>
              {lang === 'id' ? 'KLUB' : 'CLUB'}
            </th>
            <th style={th}>{lang === 'id' ? 'M' : 'P'}</th>
            <th style={th}>{lang === 'id' ? 'M' : 'W'}</th>
            <th style={th}>{lang === 'id' ? 'S' : 'D'}</th>
            <th style={th}>{lang === 'id' ? 'K' : 'L'}</th>
            <th style={th}>{lang === 'id' ? 'GM' : 'GF'}</th>
            <th style={th}>{lang === 'id' ? 'GK' : 'GA'}</th>
            <th style={th}>{lang === 'id' ? 'SG' : 'GD'}</th>
            <th style={th}>{lang === 'id' ? 'POIN' : 'PTS'}</th>
            <th style={{ ...th, minWidth: 90, textAlign: 'left' }}>
              {lang === 'id' ? 'FORM' : 'FORM'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isHighlight = highlightSlug && r.slug === highlightSlug;
            const z = zoneFor(r.rank);
            const formChars = r.form ? r.form.split('').slice(-5) : [];
            return (
              <tr key={r.teamId || r.clubName} style={{
                borderTop: `1px solid ${C.lineSoft}`,
                background: isHighlight ? `${r.clubAccent}1A` : 'transparent',
              }}>
                <td style={{ ...td, position: 'relative' }}>
                  {z && (
                    <span title={lang === 'id' ? z.label : z.en} style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: 3, background: z.color,
                    }} />
                  )}
                  {r.rank || '—'}
                </td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.slug ? (
                    <Link to={`/super-league-2025-26/club/${r.slug}`} style={{
                      color: C.text, textDecoration: 'none', fontWeight: isHighlight ? 700 : 500,
                      borderLeft: `3px solid ${r.clubAccent}`, paddingLeft: 8,
                    }}>
                      {r.clubName}
                    </Link>
                  ) : (
                    <span style={{
                      borderLeft: `3px solid ${r.clubAccent}`, paddingLeft: 8,
                    }}>{r.clubName}</span>
                  )}
                </td>
                <td style={td}>{r.games}</td>
                <td style={td}>{r.wins}</td>
                <td style={td}>{r.draws}</td>
                <td style={td}>{r.losses}</td>
                <td style={td}>{r.goalsFor}</td>
                <td style={td}>{r.goalsAgainst}</td>
                <td style={{ ...td, fontWeight: 600, color: r.goalDiff > 0 ? '#10B981' : r.goalDiff < 0 ? '#EF4444' : C.dim }}>
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>{r.points}</td>
                <td style={{ ...td, textAlign: 'left' }}>
                  {formChars.length === 0 ? (
                    <span style={{ color: C.muted }}>—</span>
                  ) : formChars.map((ch, i) => <FormPill key={i} char={ch} lang={lang} />)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Legend */}
      <div style={{
        padding: '8px 12px', borderTop: `1px solid ${C.lineSoft}`,
        display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 9.5, color: C.muted,
      }}>
        <LegendDot color="#FBBF24" label={lang === 'id' ? 'Juara · AFC CL Elite' : 'Champion · AFC CL Elite'} />
        <LegendDot color="#3B82F6" label={lang === 'id' ? 'Zona AFC' : 'AFC zone'} />
        <LegendDot color="#F59E0B" label={lang === 'id' ? 'Play-off degradasi' : 'Relegation play-off'} />
        <LegendDot color="#EF4444" label={lang === 'id' ? 'Zona degradasi' : 'Relegation'} />
      </div>
    </div>
  );
}

const th = {
  padding: '8px 8px', textAlign: 'center', fontWeight: 600, letterSpacing: 0.6,
};
const td = {
  padding: '8px 8px', textAlign: 'center', color: C.text,
};

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
      {label}
    </span>
  );
}

// v0.14.3 — Map API-Football team names → our local CLUBS registry
// so the shared <LeaderboardPanel> can paint each row with the right
// accent + link to the right per-club page. API-Football uses the long
// stadium-style names ("Persija Jakarta"); CLUBS keys against the
// short ESPN form ("Persija"). Lowercase-substring containment is
// robust to both forms.
const SL_NAME_INDEX = (() => {
  const idx = [];
  for (const c of CLUBS) {
    const tokens = [c.name, c.nameId, c.slug.replace(/-/g, ' ')]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    idx.push({ club: c, tokens });
  }
  return idx;
})();

function resolveSuperLeagueClub(apiFootballTeamName) {
  if (!apiFootballTeamName) return null;
  const needle = String(apiFootballTeamName).toLowerCase();
  for (const { club, tokens } of SL_NAME_INDEX) {
    if (tokens.includes(needle)) return club;
  }
  for (const { club, tokens } of SL_NAME_INDEX) {
    if (tokens.some((t) => needle.includes(t) || t.includes(needle))) return club;
  }
  return null;
}

// SEO body copy lives in SEOContent.jsx under the 'super-league' sport key
// so the page stays focused on the live data.
