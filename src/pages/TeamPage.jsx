import React, { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { TEAM_META, TEAM_BY_SLUG, COLORS as C, teamSlug } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { useTeamSchedule, computeStreak } from '../hooks/useTeamSchedule.js';
import { useTeamLeaders } from '../hooks/useTeamLeaders.js';
import { useInjuries } from '../hooks/useInjuries.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';
import TitlePath from '../components/TitlePath.jsx';
import PlayerHead from '../components/PlayerHead.jsx';
import FangirBanner from '../components/FangirBanner.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { formatGameDateTime } from '../lib/timezone.js';

// Convert hex to rgba for glass effect on team-color hero.
function withAlpha(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Compute W-L record from completed games in schedule.
function computeRecord(schedule, abbr) {
  let w = 0, l = 0;
  for (const g of schedule) {
    if (!g.isCompleted) continue;
    const side = g.home?.abbr === abbr ? g.home : g.away?.abbr === abbr ? g.away : null;
    if (!side) continue;
    if (side.winner) w++;
    else l++;
  }
  return { w, l, str: `${w}-${l}`, pct: w + l > 0 ? w / (w + l) : 0 };
}

function formatGameDate(isoDate, lang) {
  // Delegates to shared timezone util — returns localized date + tipoff time
  // like "Sab 18 Apr · 10:30 WIB" or "Sat Apr 18 · 10:30 AM WIB"
  return formatGameDateTime(isoDate, lang) || isoDate;
}

export default function TeamPage() {
  const { teamSlug: slug } = useParams();
  const { lang } = useApp();

  const teamName = slug ? TEAM_BY_SLUG[slug.toLowerCase()] : null;

  // All hooks MUST be called before any early return.
  const meta = teamName ? TEAM_META[teamName] : null;
  const abbr = meta?.abbr || null;

  const { schedule } = useTeamSchedule(abbr);
  const { leaders } = useTeamLeaders(abbr);
  const { byTeam: injuriesByTeam } = useInjuries();
  const { champion } = usePlayoffData();

  const championOdds = useMemo(() => champion?.odds || [], [champion]);
  const myOdds = useMemo(
    () => (teamName ? championOdds.find((o) => o.name === teamName) : null),
    [championOdds, teamName]
  );

  const record = useMemo(() => computeRecord(schedule || [], abbr), [schedule, abbr]);
  const streak = useMemo(() => computeStreak(schedule, abbr), [schedule, abbr]);
  const injuries = abbr ? (injuriesByTeam?.[abbr] || []) : [];

  const upcomingGame = useMemo(() => {
    if (!schedule || !abbr) return null;
    return schedule.find((g) => !g.isCompleted);
  }, [schedule, abbr]);

  const recentGames = useMemo(() => {
    if (!schedule) return [];
    return [...schedule]
      .filter((g) => g.isCompleted)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [schedule]);

  // Invalid slug → redirect
  if (!teamName) return <Navigate to="/nba-playoff-2026" replace />;

  const nickname = teamName.split(' ').pop();
  const confLabel = meta.conf === 'E'
    ? (lang === 'id' ? 'Wilayah Timur' : 'Eastern Conference')
    : (lang === 'id' ? 'Wilayah Barat' : 'Western Conference');
  const seedLabel = meta.seed
    ? `#${meta.seed} ${lang === 'id' ? 'Unggulan' : 'Seed'}`
    : (lang === 'id' ? 'Play-In' : 'Play-In');

  // ─── SEO ───────────────────────────────────────────────────────────
  const seoTitle = lang === 'id'
    ? `Skor ${nickname} NBA Playoff 2026 · ${record.str} · Jadwal & Statistik | gibol.co`
    : `${teamName} NBA Playoff 2026 · ${record.str} · Live Scores & Stats | gibol.co`;

  const seoDesc = lang === 'id'
    ? `Skor live ${teamName} (${meta.abbr}) di NBA Playoff 2026. Rekor ${record.str}${streak ? `, ${streak} streak` : ''}. Jadwal lengkap, statistik pemain, laporan cedera, dan peluang juara${myOdds ? ` (${myOdds.pct}%)` : ''}. Star: ${meta.star}.`
    : `Live scores for ${teamName} in the 2026 NBA Playoffs. Record ${record.str}${streak ? `, ${streak} streak` : ''}. Full schedule, player stats, injury report, championship odds${myOdds ? ` (${myOdds.pct}%)` : ''}. Star: ${meta.star}.`;

  const seoKeywords = [
    `skor ${nickname.toLowerCase()}`,
    `skor ${meta.abbr.toLowerCase()}`,
    `${nickname.toLowerCase()} playoff`,
    `${nickname.toLowerCase()} 2026`,
    `jadwal ${nickname.toLowerCase()}`,
    `statistik ${nickname.toLowerCase()}`,
    `peluang juara ${nickname.toLowerCase()}`,
    `${teamName.toLowerCase()}`,
    `${meta.star.toLowerCase()}`,
    `nba playoff 2026`,
    `skor nba live`,
    `gibol`,
  ].join(', ');

  const jsonLdTeam = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: teamName,
    alternateName: meta.abbr,
    sport: 'Basketball',
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'National Basketball Association',
      url: 'https://www.nba.com',
    },
    url: `https://www.gibol.co/nba-playoff-2026/${slug}`,
    athlete: leaders.slice(0, 3).flatMap((c) => (c.athletes || c.leaders || []).slice(0, 1).map((a) => ({
      '@type': 'Person',
      name: a.displayName || a.name || a.athlete?.displayName,
    }))).filter((a) => a.name),
  };

  // ─── Styles ────────────────────────────────────────────────────────
  const accent = meta.color;
  const wrap = { background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' };
  const panel = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 16, marginBottom: 12 };
  const sectionH = { fontSize: 10, letterSpacing: 1.5, color: C.dim, fontWeight: 600, marginBottom: 10 };

  return (
    <div style={wrap}>
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/nba-playoff-2026/${slug}`}
        lang={lang}
        keywords={seoKeywords}
        jsonLd={jsonLdTeam}
      />

      <div className="dashboard-wrap" style={{ maxWidth: 980, margin: '0 auto' }}>
        <TopBar
          showBackLink
          backTo="/nba-playoff-2026"
          backLabel={lang === 'id' ? '← SEMUA TIM PLAYOFF' : '← ALL PLAYOFF TEAMS'}
          title="gibol.co"
          subtitle={`${teamName.toUpperCase()} · NBA PLAYOFF 2026`}
        />

        {/* ─── Team Hero ────────────────────────────────────────── */}
        <div style={{
          padding: '36px 24px',
          background: `linear-gradient(135deg, ${accent} 0%, ${withAlpha(accent, 0.4)} 100%)`,
          borderBottom: `1px solid ${C.line}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Giant abbr watermark */}
          <div style={{
            position: 'absolute', right: -20, bottom: -40,
            fontSize: 220, fontWeight: 900, lineHeight: 1,
            color: 'rgba(255,255,255,0.07)',
            fontFamily: '"Bebas Neue", sans-serif',
            letterSpacing: -4, pointerEvents: 'none',
          }}>{meta.abbr}</div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
              NBA · {confLabel.toUpperCase()} · {seedLabel.toUpperCase()}
            </div>
            <h1 style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 58, lineHeight: 1, letterSpacing: -1,
              color: '#fff', margin: 0, marginBottom: 8,
            }}>{teamName}</h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{record.str}</div>
              {streak && (
                <div style={{
                  padding: '4px 10px',
                  background: streak.startsWith('W') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                  border: `1px solid ${streak.startsWith('W') ? '#22c55e' : '#ef4444'}`,
                  borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                }}>{streak}</div>
              )}
              {myOdds && (
                <div style={{
                  padding: '6px 12px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 3, fontSize: 11,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{lang === 'id' ? 'Peluang Juara' : 'Title Odds'} </span>
                  <strong style={{ color: '#fff', fontSize: 14 }}>{myOdds.pct}%</strong>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                ★ {meta.star}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Body ─────────────────────────────────────────────── */}
        <div style={{ padding: '20px 16px' }}>

          {/* Next game */}
          {upcomingGame && (
            <div style={{ ...panel, borderLeft: `4px solid ${accent}` }}>
              <div style={sectionH}>{lang === 'id' ? 'LAGA BERIKUTNYA' : 'NEXT GAME'}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>
                    {upcomingGame.home?.abbr === abbr ? 'vs' : '@'} {' '}
                    {upcomingGame.home?.abbr === abbr ? upcomingGame.away?.abbr : upcomingGame.home?.abbr}
                  </strong>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                    {formatGameDate(upcomingGame.date, lang)}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>
                  {upcomingGame.broadcast || 'NBA · 2026 PLAYOFFS'}
                </div>
              </div>
            </div>
          )}

          {/* Championship path */}
          {championOdds.length > 0 && meta.seed && (
            <div style={panel}>
              <div style={sectionH}>{lang === 'id' ? 'JALAN MENUJU JUARA' : 'PATH TO THE TITLE'}</div>
              <TitlePath favTeam={teamName} championOdds={championOdds} t={{}} />
            </div>
          )}

          {/* Recent results */}
          {recentGames.length > 0 && (
            <div style={panel}>
              <div style={sectionH}>{lang === 'id' ? 'HASIL TERAKHIR' : 'RECENT RESULTS'}</div>
              {recentGames.map((g, i) => {
                const isHome = g.home?.abbr === abbr;
                const my = isHome ? g.home : g.away;
                const opp = isHome ? g.away : g.home;
                const won = !!my?.winner;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < recentGames.length - 1 ? `1px solid ${C.lineSoft}` : 'none',
                    fontSize: 12,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 3, fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: won ? '#22c55e' : '#ef4444', color: '#fff',
                    }}>{won ? 'W' : 'L'}</div>
                    <div style={{ flex: 1, marginLeft: 10 }}>
                      {isHome ? 'vs' : '@'} <strong>{opp?.abbr}</strong>
                    </div>
                    <div style={{ color: C.dim, fontSize: 11 }}>
                      {my?.score}-{opp?.score}
                    </div>
                    <div style={{ color: C.muted, fontSize: 10, marginLeft: 12, minWidth: 80, textAlign: 'right' }}>
                      {formatGameDate(g.date, lang)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top players */}
          {leaders.length > 0 && (
            <div style={panel}>
              <div style={sectionH}>{lang === 'id' ? 'PEMAIN TERATAS' : 'TOP PLAYERS'}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {leaders.slice(0, 4).map((cat, i) => {
                  const top = (cat.athletes || cat.leaders || [])[0];
                  if (!top) return null;
                  const name = top.displayName || top.name || top.athlete?.displayName;
                  const athId = top.id || top.athlete?.id;
                  const val = top.displayValue || top.value;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 10px', background: C.panelRow, borderRadius: 3,
                    }}>
                      <PlayerHead athleteId={athId} name={name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.8 }}>
                          {cat.displayName || cat.category}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Injuries */}
          {injuries.length > 0 && (
            <div style={panel}>
              <div style={sectionH}>{lang === 'id' ? 'LAPORAN CEDERA' : 'INJURY REPORT'}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {injuries.slice(0, 8).map((inj, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 11,
                    padding: '6px 0', borderBottom: i < Math.min(injuries.length, 8) - 1 ? `1px solid ${C.lineSoft}` : 'none',
                  }}>
                    <span>{inj.athlete}</span>
                    <span style={{
                      color: inj.status === 'Out' ? '#ef4444' : inj.status === 'Questionable' ? '#f59e0b' : C.dim,
                      fontSize: 10, letterSpacing: 0.5, fontWeight: 600,
                    }}>{inj.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO content block — Bahasa-first crawlable prose */}
          <div style={{ ...panel, background: C.panelSoft, fontSize: 12, lineHeight: 1.7 }}>
            {lang === 'id' ? (
              <>
                <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 10, fontFamily: '"Space Grotesk", sans-serif' }}>
                  Tentang {teamName} di NBA Playoff 2026
                </h2>
                <p>
                  <strong>{teamName}</strong> ({meta.abbr}) adalah tim NBA yang berkompetisi di {confLabel} pada Playoffs NBA 2025–26.
                  {meta.seed ? ` Tim menduduki peringkat unggulan #${meta.seed} dengan rekor reguler season ${record.str || '—'}.` : ` Tim harus melewati babak play-in untuk masuk bracket playoff.`}
                  {' '}Bintang utama tim adalah <strong>{meta.star}</strong>.
                  {myOdds ? ` Peluang juara NBA 2026 tim berdasarkan pasar prediksi Polymarket saat ini adalah <strong>${myOdds.pct}%</strong>.` : ''}
                </p>
                <p>
                  Pantau skor live <strong>{nickname}</strong> di setiap laga Playoff 2026 langsung dari gibol.co — win probability real-time, play-by-play tick-by-tick,
                  shot chart, box score pemain, laporan cedera terbaru, dan watchlist pemain dengan alert milestone (20/25/30/40 poin, double-double, triple-double).
                </p>
                <p style={{ color: C.dim, fontSize: 11 }}>
                  Data di-refresh tiap 10–30 detik saat laga berlangsung. Sumber resmi: ESPN Scoreboard API untuk skor & statistik, Polymarket Gamma API untuk peluang juara.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 10, fontFamily: '"Space Grotesk", sans-serif' }}>
                  About {teamName} in the 2026 NBA Playoffs
                </h2>
                <p>
                  <strong>{teamName}</strong> ({meta.abbr}) is an NBA team competing in the {confLabel} during the 2025–26 Playoffs.
                  {meta.seed ? ` The team holds the #${meta.seed} seed with a regular season record of ${record.str || '—'}.` : ` The team must navigate the play-in tournament to reach the bracket.`}
                  {' '}Their franchise star is <strong>{meta.star}</strong>.
                  {myOdds ? ` Their current 2026 NBA championship odds on Polymarket are <strong>${myOdds.pct}%</strong>.` : ''}
                </p>
                <p>
                  Track live <strong>{nickname}</strong> scores from every 2026 Playoff game directly on gibol.co — real-time win probability, tick-by-tick play-by-play,
                  shot chart, player box scores, latest injury report, and a player watchlist with milestone alerts (20/25/30/40-point games, double-doubles, triple-doubles).
                </p>
                <p style={{ color: C.dim, fontSize: 11 }}>
                  Data refreshes every 10–30 seconds during live games. Sources: ESPN Scoreboard API for scores and stats, Polymarket Gamma API for championship odds.
                </p>
              </>
            )}

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}` }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: C.dim, marginBottom: 8 }}>
                {lang === 'id' ? 'LIHAT JUGA' : 'SEE ALSO'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
                <Link to="/nba-playoff-2026" style={{ padding: '5px 10px', background: C.panelRow, borderRadius: 3, color: C.text, textDecoration: 'none', border: `1px solid ${C.line}` }}>
                  ← {lang === 'id' ? 'Dashboard Playoff NBA 2026' : 'NBA Playoff 2026 Dashboard'}
                </Link>
                <Link to="/recap" style={{ padding: '5px 10px', background: C.panelRow, borderRadius: 3, color: C.text, textDecoration: 'none', border: `1px solid ${C.line}` }}>
                  📖 {lang === 'id' ? 'Catatan Playoff Harian' : 'Daily Playoff Recap'}
                </Link>
                {Object.keys(TEAM_META)
                  .filter((n) => TEAM_META[n].conf === meta.conf && n !== teamName)
                  .slice(0, 4)
                  .map((n) => (
                    <Link key={n} to={`/nba-playoff-2026/${teamSlug(n)}`} style={{
                      padding: '5px 10px', background: C.panelRow, borderRadius: 3, color: C.text,
                      textDecoration: 'none', border: `1px solid ${TEAM_META[n].color}`,
                      fontSize: 10.5,
                    }}>
                      {TEAM_META[n].abbr} · {n.split(' ').pop()}
                    </Link>
                  ))}
              </div>
            </div>
          </div>

          <FangirBanner />

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '14px 24px',
          borderTop: `1px solid ${C.line}`, fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · {lang === 'id' ? `halaman tim ${nickname}` : `${nickname} team page`}</div>
          <ContactBar lang={lang} variant="inline" />
          <div>ESPN · Polymarket · NBA</div>
        </div>
      </div>
    </div>
  );
}
