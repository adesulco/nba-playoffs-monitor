import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { VERSION_LABEL } from '../lib/version.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { useEPLFixtures } from '../hooks/useEPLFixtures.js';
import { TEAM_META } from '../lib/constants.js';
import { TEAMS_BY_ID as F1_TEAMS_BY_ID } from '../lib/sports/f1/constants.js';
import V2TopBar from '../components/v2/TopBar.jsx';
import {
  Board,
  Card,
  CardHead,
  Pill,
  LiveDot,
  Crest,
  Momentum,
  Icon,
  V2Button,
  EmptyState,
} from '../components/v2/index.js';

/**
 * v2 HomeV1 — Personalized feed (default v2 home per Part 2 §0).
 *
 * Layout (desktop ≥1024px):
 *   [ 200px ][ 1fr ][ 260px ]
 *     left: Following  ·  Fixtures
 *    center: Live hero  ·  Live grid
 *     right: Live pulse  ·  Fans reacting (stubbed for Phase 3)
 *
 * Data sources (real, no mocks):
 *   - NBA hero + live grid: usePlayoffData (ESPN + Polymarket via proxy)
 *   - Upcoming EPL fixtures: useEPLFixtures (ESPN soccer scoreboard)
 *   - Following list: stub until TeamPicker wiring lands in v2 (Phase 3.1)
 *   - Fans reacting: stub — polls not built yet (see D3 backlog)
 *
 * Gated behind the `ui_v2` flag in src/lib/flags.js. App.jsx chooses
 * Home vs HomeV1 at route level based on the flag.
 */

const FANGIR_BANNER_URL = 'https://fangir.com/products/2026-ibl-trading-cards?variant=45045111783600';

// Sport-icon name for the v2 Icon component given an NBA/EPL/etc. sport tag
function iconForSport(sport) {
  if (sport === 'NBA') return 'NBA';
  if (sport === 'PL' || sport === 'EPL' || sport === 'Football') return 'Football';
  if (sport === 'F1') return 'F1';
  if (sport === 'Tennis') return 'Tennis';
  if (sport === 'WC' || sport === 'WorldCup') return 'WorldCup';
  return 'Bookmark';
}

function teamColor(abbr, fallback = '#3B82F6') {
  const meta = TEAM_META[abbr];
  return meta?.color || fallback;
}

// Format an NBA scoreboard game into the hero-card shape.
function pickHeroGame(games) {
  if (!games || games.length === 0) return null;
  // Priority: live > upcoming-soonest > most recent final
  const live = games.find((g) => g.statusState === 'in');
  if (live) return live;
  const upcoming = games
    .filter((g) => g.statusState === 'pre')
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (upcoming[0]) return upcoming[0];
  return games[0];
}

function HeroGameCard({ game }) {
  if (!game) return null;
  const { lang, t } = useApp();
  const homeColor = teamColor(game.home?.abbr, '#0E2240');
  const awayColor = teamColor(game.away?.abbr, '#C8102E');
  const isLive = game.statusState === 'in';
  const homeWinning = Number(game.home?.score || 0) > Number(game.away?.score || 0);
  const awayWinning = Number(game.away?.score || 0) > Number(game.home?.score || 0);

  return (
    <Card style={{ position: 'relative', minHeight: 200, padding: 16, overflow: 'hidden' }}>
      {/* radial-gradient team-color backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(500px 250px at 15% 0, ${homeColor}38, transparent), radial-gradient(500px 250px at 100% 100%, ${awayColor}38, transparent)`,
        }}
      />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLive ? (
              <Pill variant="live">
                <LiveDot />
                LIVE · {game.status}
              </Pill>
            ) : (
              <Pill variant="muted">{game.status?.toUpperCase?.() || 'SCHEDULED'}</Pill>
            )}
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              {(game.name || '').toUpperCase()}
            </span>
          </div>
          <Link
            to={`/nba-playoff-2026?game=${game.id}`}
            style={{ textDecoration: 'none' }}
          >
            <V2Button as="span" variant="amber">
              {lang === 'id' ? 'Buka pertandingan' : 'Open match'} ↗
            </V2Button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Crest short={game.home?.abbr} color={homeColor} size={34} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 16px "Inter Tight"', color: 'var(--ink)' }}>
                {TEAM_META[game.home?.abbr]?.name || game.home?.abbr}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                {game.home?.record ? `${lang === 'id' ? 'KANDANG' : 'HOME'} · ${game.home.record}` : 'HOME'}
              </div>
            </div>
          </div>

          <div
            className="tab"
            style={{
              font: '900 48px "Inter Tight"',
              letterSpacing: '-0.06em',
              lineHeight: 1,
              fontFamily: '"Inter Tight", sans-serif',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: homeWinning ? 'var(--ink)' : 'var(--ink-3)' }}>
              {game.home?.score ?? '—'}
            </span>
            <span style={{ color: 'var(--ink-4)', margin: '0 10px', fontWeight: 400 }}>—</span>
            <span style={{ color: awayWinning ? 'var(--ink)' : 'var(--ink-3)' }}>
              {game.away?.score ?? '—'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', minWidth: 0 }}>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <div style={{ font: '700 16px "Inter Tight"', color: 'var(--ink)' }}>
                {TEAM_META[game.away?.abbr]?.name || game.away?.abbr}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                {game.away?.record ? `${lang === 'id' ? 'TAMU' : 'AWAY'} · ${game.away.record}` : 'AWAY'}
              </div>
            </div>
            <Crest short={game.away?.abbr} color={awayColor} size={34} />
          </div>
        </div>

        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', width: 70 }}>
              {(t('momentum') || 'MOMENTUM').toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <Momentum value={0.5} home={homeColor} away={awayColor} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Normalize a live match (NBA or EPL or other) into a single shape
// the LiveGridCard can render against.
function normalizeNbaLive(g) {
  return {
    key: `nba-${g.id}`,
    sport: 'NBA',
    sportLabel: 'NBA',
    homeName: TEAM_META[g.home?.abbr]?.name || g.home?.abbr || '—',
    awayName: TEAM_META[g.away?.abbr]?.name || g.away?.abbr || '—',
    homeShort: g.home?.abbr || '—',
    awayShort: g.away?.abbr || '—',
    homeColor: teamColor(g.home?.abbr, '#0E2240'),
    awayColor: teamColor(g.away?.abbr, '#C8102E'),
    homeScore: g.home?.score,
    awayScore: g.away?.score,
    status: g.status,
    href: `/nba-playoff-2026?game=${g.id}`,
  };
}

function normalizeEplLive(m) {
  return {
    key: `epl-${m.id}`,
    sport: 'Football',
    sportLabel: 'EPL',
    homeName: m.home?.name || m.home?.shortName || '—',
    awayName: m.away?.name || m.away?.shortName || '—',
    homeShort: m.home?.shortName || '—',
    awayShort: m.away?.shortName || '—',
    homeColor: m.home?.accent || '#37003C',
    awayColor: m.away?.accent || '#37003C',
    homeScore: m.home?.score ?? '-',
    awayScore: m.away?.score ?? '-',
    status: m.statusDetail || 'LIVE',
    href: `/premier-league-2025-26`,
  };
}

function LiveGridCard({ nbaGames, eplUpcoming, lang }) {
  const live = useMemo(() => {
    const rows = [];
    // NBA live
    for (const g of nbaGames || []) {
      if (g.statusState === 'in') rows.push(normalizeNbaLive(g));
    }
    // EPL live (useEPLFixtures puts live matches in `upcoming` with statusState==='in')
    for (const m of eplUpcoming || []) {
      if (m.statusState === 'in') rows.push(normalizeEplLive(m));
    }
    return rows.slice(0, 6);
  }, [nbaGames, eplUpcoming]);

  return (
    <Card>
      <CardHead
        title={`${(lang === 'id' ? 'Live sekarang' : 'Live now')} · ${live.length}`}
        right={
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}
          >
            NBA · EPL
          </span>
        }
      />
      {live.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            icon="Bookmark"
            title={lang === 'id' ? 'Belum ada laga live' : 'No live matches right now'}
            hint={lang === 'id' ? 'Cek jadwal di bawah.' : 'Check fixtures below.'}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {live.map((m, i) => {
            const isLastRow = i >= live.length - 2 - (live.length % 2);
            return (
              <Link
                key={m.key}
                to={m.href}
                style={{
                  padding: 10,
                  borderBottom: isLastRow ? 0 : '1px solid var(--line-soft)',
                  borderRight: i % 2 === 0 ? '1px solid var(--line-soft)' : 0,
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={m.sport} size={11} color="var(--ink-3)" />
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{m.sportLabel}</span>
                    <Pill variant="live" size="sm">
                      <LiveDot />
                      {m.status}
                    </Pill>
                  </span>
                </div>
                <RowLive abbr={m.homeShort} name={m.homeName} color={m.homeColor} score={m.homeScore} />
                <RowLive abbr={m.awayShort} name={m.awayName} color={m.awayColor} score={m.awayScore} />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RowLive({ abbr, name, color, score }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Crest short={abbr} color={color} size={16} />
        <span
          style={{
            font: '600 12px "Inter Tight"',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </span>
      <span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>
        {score ?? '—'}
      </span>
    </div>
  );
}

function Row({ abbr, color, score }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Crest short={abbr} color={color} size={16} />
        <span style={{ font: '600 12px "Inter Tight"' }}>{TEAM_META[abbr]?.name || abbr}</span>
      </span>
      <span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>
        {score ?? '—'}
      </span>
    </div>
  );
}

// Slugify an NBA team name so it matches the TeamPage route slug:
// "Oklahoma City Thunder" → "oklahoma-city-thunder"
function slugifyTeamName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function FollowingCard({ lang, selectedConstructor }) {
  // Pulls real user-selected favorites from localStorage + AppContext.
  //   - NBA: localStorage['gibol:favTeam'] is written by NBADashboard's
  //     TeamPicker. Value is the full team name (e.g. "Boston Celtics").
  //   - F1:  AppContext.selectedConstructor is the constructor id
  //     (e.g. 'mclaren'). Resolved via F1_TEAMS_BY_ID.
  //   - EPL: no picker yet; show a hand-picked editorial default pair
  //     (current title-race leaders) until we wire a club picker.
  const items = useMemo(() => {
    const out = [];

    // NBA favorite from TeamPicker
    try {
      const nbaFav = localStorage.getItem('gibol:favTeam');
      if (nbaFav && TEAM_META[nbaFav]) {
        out.push({
          t: nbaFav.split(' ').slice(-1)[0] || nbaFav,
          c: TEAM_META[nbaFav].color || '#3B82F6',
          s: `NBA · ${TEAM_META[nbaFav].abbr || ''}`,
          path: `/nba-playoff-2026/${slugifyTeamName(nbaFav)}`,
        });
      }
    } catch (_) { /* private mode */ }

    // F1 constructor from AppContext
    if (selectedConstructor) {
      const team = F1_TEAMS_BY_ID[selectedConstructor];
      if (team) {
        out.push({
          t: team.short || team.name,
          c: team.color || '#E10600',
          s: 'F1 · KONSTRUKTOR',
          path: `/formula-1-2026/team/${team.slug}`,
        });
      }
    }

    // Fill with editorial defaults until the list reaches 4 rows
    const seed = [
      { t: 'Thunder',  c: '#007AC1', s: 'NBA · OKC', path: '/nba-playoff-2026/oklahoma-city-thunder' },
      { t: 'Celtics',  c: '#007A33', s: 'NBA · BOS', path: '/nba-playoff-2026/boston-celtics' },
      { t: 'Arsenal',  c: '#EF0107', s: 'EPL',       path: '/premier-league-2025-26/club/arsenal' },
      { t: 'Man City', c: '#6CADDF', s: 'EPL',       path: '/premier-league-2025-26/club/manchester-city' },
    ];
    for (const s of seed) {
      if (out.length >= 4) break;
      if (!out.find((x) => x.path === s.path)) out.push(s);
    }
    return out.slice(0, 4);
  }, [selectedConstructor]);

  return (
    <Card>
      <CardHead
        title={lang === 'id' ? 'Diikuti' : 'Following'}
        right={
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {items.length}
          </span>
        }
      />
      <div style={{ padding: 4 }}>
        {items.map((f) => (
          <Link
            key={f.t}
            to={f.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Crest short={f.t.slice(0, 3).toUpperCase()} color={f.c} size={18} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ font: '600 11.5px "Inter Tight"', color: 'var(--ink)' }}>{f.t}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{f.s}</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function UpcomingCard({ fixtures, lang }) {
  const rows = (fixtures || [])
    .slice(0, 4)
    .map((f) => ({
      w: new Date(f.kickoffUtc).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        weekday: 'short',
      }).toUpperCase().replace('.', ''),
      t: `${f.home?.shortName || f.home?.name} vs ${f.away?.shortName || f.away?.name}`,
      s: new Date(f.kickoffUtc).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }),
      path: '/premier-league-2025-26',
    }));

  return (
    <Card>
      <CardHead title={lang === 'id' ? 'Jadwal' : 'Fixtures'} />
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {lang === 'id' ? 'Belum ada jadwal.' : 'No fixtures yet.'}
          </span>
        ) : (
          rows.map((r) => (
            <Link
              key={`${r.w}-${r.t}`}
              to={r.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                textDecoration: 'none',
                color: 'inherit',
                gap: 8,
              }}
            >
              <span className="mono" style={{ color: 'var(--ink-3)' }}>{r.w}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</span>
              <span className="tab mono" style={{ color: 'var(--ink-3)' }}>{r.s}</span>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function LivePulseCard({ lang }) {
  // Phase 3.0 — a calm, static "awaiting live" state. Phase 3.1 wires the
  // real PBP feed via useGameDetails(activeGameId) once a game is focused.
  return (
    <Card>
      <CardHead
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LiveDot /> {lang === 'id' ? 'Live pulse' : 'Live pulse'}</span>}
      />
      <div style={{ padding: 14 }}>
        <EmptyState
          icon="Bell"
          title={lang === 'id' ? 'Tunggu tip-off' : 'Awaiting tip-off'}
          hint={lang === 'id'
            ? 'Update live otomatis muncul di sini saat laga dimulai.'
            : 'Live updates appear here once matches start.'}
        />
      </div>
    </Card>
  );
}

function FansReactingCard({ lang }) {
  // Polls (D3 backlog) ship in a future phase. Keep the card as a
  // placeholder so the right-rail height matches the center column.
  return (
    <Card>
      <CardHead title={lang === 'id' ? 'Fans bereaksi' : 'Fans reacting'} />
      <div style={{ padding: 14 }}>
        <EmptyState
          icon="Star"
          title={lang === 'id' ? 'Polling segera hadir' : 'Polls coming soon'}
          hint={lang === 'id'
            ? 'Voting live per-laga ditambahkan di Pick\'em launch.'
            : 'Per-match voting lands with the Pick\'em launch.'}
        />
      </div>
    </Card>
  );
}

export default function HomeV1() {
  const { lang, selectedConstructor } = useApp();
  const { games } = usePlayoffData(30000);
  const { upcoming: eplUpcoming } = useEPLFixtures();

  const hero = useMemo(() => pickHeroGame(games || []), [games]);

  return (
    <Board>
      <SEO
        title="gibol.co — gila bola · live scores NBA · Premier League · F1 · Tennis · World Cup 2026"
        description="Live multi-sport hub in Bahasa Indonesia. NBA Playoffs 2026, Premier League 2025-26, Formula 1, Tennis ATP + WTA, FIFA World Cup 2026."
        path="/"
        lang={lang}
      />
      <V2TopBar />

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '200px 1fr 260px', gap: 12 }}>
        {/* Left rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FollowingCard lang={lang} selectedConstructor={selectedConstructor} />
          <UpcomingCard fixtures={eplUpcoming} lang={lang} />
        </aside>

        {/* Center */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {hero && <HeroGameCard game={hero} />}
          <LiveGridCard nbaGames={games} eplUpcoming={eplUpcoming} lang={lang} />
        </main>

        {/* Right rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <LivePulseCard lang={lang} />
          <FansReactingCard lang={lang} />
          <a
            href={FANGIR_BANNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: 12,
              background: 'linear-gradient(100deg, rgba(245,158,11,.1), transparent)',
              border: '1px solid rgba(245,158,11,.3)',
              borderRadius: 10,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 9, letterSpacing: '.14em', color: 'var(--amber)' }}
            >
              FANGIR · SHOP
            </div>
            <div style={{ font: '700 13px "Inter Tight"', marginTop: 4, color: 'var(--ink)' }}>
              2026 IBL Trading Cards · Pack
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
              Rp 37.500 · partner
            </div>
          </a>
        </aside>
      </div>

      {/* Footer */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          borderTop: '1px solid var(--line)',
          fontSize: 10,
          color: 'var(--ink-3)',
          flexWrap: 'wrap',
        }}
      >
        <span>gibol.co · {lang === 'id' ? 'multi-sport live dalam Bahasa' : 'live multi-sport in Bahasa'}</span>
        <span
          className="mono"
          style={{
            padding: '2px 6px',
            border: '1px solid var(--line-soft)',
            borderRadius: 3,
          }}
        >
          {VERSION_LABEL}
        </span>
      </footer>
    </Board>
  );
}
