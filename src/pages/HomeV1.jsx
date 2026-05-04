import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { VERSION_LABEL } from '../lib/version.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { useEPLFixtures } from '../hooks/useEPLFixtures.js';
import { useTennisScoreboard } from '../hooks/useTennisScoreboard.js';
import { useUserBracketSummary } from '../hooks/useUserBracketSummary.js';
import { useFavoriteTeams } from '../hooks/useFavoriteTeams.js';
import { trackEvent } from '../lib/analytics.js';
import { TEAM_META } from '../lib/constants.js';
import { TEAMS_BY_ID as F1_TEAMS_BY_ID, nextGP } from '../lib/sports/f1/constants.js';
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
import PickemHomeHero from '../components/PickemHomeHero.jsx';

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
//
// v0.12.9 — each row also carries `sportKey` (lowercase: 'nba' / 'epl'
// / 'f1' / 'tennis' — matches useFavoriteTeams's `sport` field) and
// `favIds` (array of strings to match against favorite ids). The grid
// then sorts rows whose favIds intersect the user's saved favorites
// to the top with a ★ tag.
function normalizeNbaLive(g) {
  const homeFull = TEAM_META[g.home?.abbr]?.name || g.home?.abbr || '—';
  const awayFull = TEAM_META[g.away?.abbr]?.name || g.away?.abbr || '—';
  // NBA favorite `id` is the full team name (see OnboardingTeams nbaTeams),
  // and TEAM_META is keyed by full name with .abbr inside. So we look up
  // by abbr → full to match. Also include the abbr just in case future
  // pickers use it.
  const homeNameKey = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.home?.abbr);
  const awayNameKey = Object.keys(TEAM_META).find((n) => TEAM_META[n].abbr === g.away?.abbr);
  return {
    key: `nba-${g.id}`,
    sport: 'NBA',
    sportKey: 'nba',
    sportLabel: 'NBA',
    homeName: homeFull,
    awayName: awayFull,
    homeShort: g.home?.abbr || '—',
    awayShort: g.away?.abbr || '—',
    homeColor: teamColor(g.home?.abbr, '#0E2240'),
    awayColor: teamColor(g.away?.abbr, '#C8102E'),
    homeScore: g.home?.score,
    awayScore: g.away?.score,
    status: g.status,
    href: `/nba-playoff-2026?game=${g.id}`,
    favIds: [homeNameKey, awayNameKey].filter(Boolean),
  };
}

function normalizeEplLive(m) {
  return {
    key: `epl-${m.id}`,
    sport: 'Football',
    sportKey: 'epl',
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
    // EPL favorite `id` is the club slug (see CLUBS / OnboardingTeams).
    favIds: [m.home?.slug, m.away?.slug].filter(Boolean),
  };
}

function normalizeTennisLive(m) {
  // ESPN tennis groupings shape per useTennisScoreboard normaliser.
  const p1 = m.players?.[0] || {};
  const p2 = m.players?.[1] || {};
  // Build score line "6-4 3-2" from the sets array
  const setsLine = (m.sets || [])
    .map((s) => `${s.p1 ?? '-'}-${s.p2 ?? '-'}`)
    .join(' ');
  return {
    key: `tennis-${m.id}`,
    sport: 'Tennis',
    sportKey: 'tennis',
    sportLabel: 'TENNIS',
    homeName: p1.shortName || p1.name || '—',
    awayName: p2.shortName || p2.name || '—',
    homeShort: (p1.countryCode || p1.country || '—').slice(0, 3).toUpperCase(),
    awayShort: (p2.countryCode || p2.country || '—').slice(0, 3).toUpperCase(),
    homeColor: '#D4A13A',
    awayColor: '#D4A13A',
    homeScore: setsLine.split(' ')[0] || '-',
    awayScore: setsLine.split(' ').slice(1).join(' ') || '-',
    status: m.round || 'LIVE',
    href: '/tennis',
    // Tennis favorite `id` is the player slug (see TENNIS_STARS).
    favIds: [p1.slug, p2.slug].filter(Boolean),
  };
}

function LiveGridCard({ nbaGames, eplUpcoming, tennisLive, lang }) {
  // v0.12.9 — read favorites so we can sort matching live games to
  // the top of the grid with a ★ tag. The hook is anon-safe (returns
  // status: 'anon', favorites: []) so this works for logged-out
  // visitors without breaking — they just see the default order.
  const { favorites: savedFavs } = useFavoriteTeams();
  const favIdsBySport = useMemo(() => {
    const m = { nba: new Set(), epl: new Set(), f1: new Set(), tennis: new Set() };
    for (const f of savedFavs || []) {
      if (m[f.sport]) m[f.sport].add(f.id);
    }
    return m;
  }, [savedFavs]);

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
    // v0.12.4 — Tennis live ATP + WTA matches, max 3 to keep grid balanced
    for (const m of (tennisLive || []).slice(0, 3)) {
      rows.push(normalizeTennisLive(m));
    }
    // v0.12.9 — tag and sort favorites to the top. A row is `isFav`
    // when ANY of its favIds intersects the favorites set for that
    // sport. Stable sort (preserves the underlying NBA→EPL→Tennis
    // order within each tier) by relying on JS's TimSort.
    const tagged = rows.map((r) => {
      const set = favIdsBySport[r.sportKey];
      const isFav = !!set && (r.favIds || []).some((id) => set.has(id));
      return { ...r, isFav };
    });
    tagged.sort((a, b) => Number(b.isFav) - Number(a.isFav));
    return tagged.slice(0, 6);
  }, [nbaGames, eplUpcoming, tennisLive, favIdsBySport]);

  // v0.12.9 — fire one telemetry event per render if the grid is
  // showing at least one favorite-prioritized row, so we can measure
  // how often the favorites loop actually pays off (i.e. user has
  // favs AND a fav game is currently live).
  const favCount = live.filter((r) => r.isFav).length;
  useEffect(() => {
    if (favCount > 0) {
      trackEvent('live_grid_fav_prioritized', {
        fav_rows: favCount,
        total_rows: live.length,
      });
    }
    // intentionally only on row-set change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.map((r) => r.key).join('|'), favCount]);

  // v0.12.4 — when no live games, surface NEXT UP across sports as a
  // fallback so anon visitors don't land on an empty home. Card title
  // flips from "Live now" to "Coming up" with the same 2-col grid.
  const upcoming = useMemo(() => {
    if (live.length > 0) return [];
    const rows = [];
    // NBA upcoming — pick the next pre-status game from the playoff data
    const nbaNext = (nbaGames || []).find((g) => g.statusState === 'pre');
    if (nbaNext) {
      rows.push({
        ...normalizeNbaLive(nbaNext),
        status: nbaNext.status || (lang === 'id' ? 'JADWAL' : 'UPCOMING'),
      });
    }
    // EPL upcoming — first non-live fixture
    const eplNext = (eplUpcoming || []).find((m) => m.statusState !== 'in');
    if (eplNext) rows.push({ ...normalizeEplLive(eplNext), status: eplNext.statusDetail || (lang === 'id' ? 'JADWAL' : 'UPCOMING') });
    // F1 next GP
    try {
      const next = nextGP(new Date());
      if (next) {
        rows.push({
          key: `f1-next`,
          sport: 'F1',
          sportLabel: 'F1',
          homeName: next.name,
          awayName: next.country,
          homeShort: 'F1',
          awayShort: '',
          homeColor: '#E10600',
          awayColor: '#E10600',
          homeScore: next.dateISO?.slice(5) || '',
          awayScore: '',
          status: next.wibTime ? `${next.wibTime} WIB` : (lang === 'id' ? 'BERIKUTNYA' : 'NEXT'),
          href: '/formula-1-2026',
        });
      }
    } catch (_) { /* no next race */ }
    return rows.slice(0, 6);
  }, [live, nbaGames, eplUpcoming, lang]);

  const showLive = live.length > 0;
  const items = showLive ? live : upcoming;
  const headerTitle = showLive
    ? `${lang === 'id' ? 'Live sekarang' : 'Live now'} · ${live.length}`
    : (lang === 'id' ? 'Mendatang' : 'Coming up');

  return (
    <Card>
      <CardHead
        title={headerTitle}
        right={
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}
          >
            NBA · EPL · F1 · TENNIS
          </span>
        }
      />
      {items.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            icon="Bookmark"
            title={lang === 'id' ? 'Cek jadwal di bawah' : 'Check fixtures below'}
            hint={lang === 'id' ? 'Skor live muncul saat laga mulai.' : 'Live scores appear when matches start.'}
          />
        </div>
      ) : (
        // v0.11.23 GIB-021 + GIB-012 — bump cell padding 10 → 14 so each
        // live card is ≥ 96 px tall (= 14 + 11 chip + 8 + 22 row + 6 + 22
        // row + 14). WCAG 2.5.5 enhanced says ≥ 44 px target; we land
        // comfortably above. RowLive itself is bumped from 12 → 13 px
        // text + 18 → 20 px crest for the same audit.
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {items.map((m, i) => {
            const isLastRow = i >= items.length - 2 - (items.length % 2);
            return (
              <Link
                key={m.key}
                to={m.href}
                style={{
                  padding: 14,
                  minHeight: 96,
                  display: 'block',
                  borderBottom: isLastRow ? 0 : '1px solid var(--line-soft)',
                  borderRight: i % 2 === 0 ? '1px solid var(--line-soft)' : 0,
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={m.sport} size={11} color="var(--ink-3)" />
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{m.sportLabel}</span>
                    {/* v0.12.4 — live games keep the red Pill, upcoming
                        games show a quieter mono status chip so users
                        can tell live vs scheduled at a glance. */}
                    {showLive ? (
                      <Pill variant="live" size="sm">
                        <LiveDot />
                        {m.status}
                      </Pill>
                    ) : (
                      <span className="mono" style={{
                        fontSize: 9,
                        letterSpacing: 0.5,
                        color: 'var(--ink-3)',
                        padding: '2px 6px',
                        border: '1px solid var(--line-soft)',
                        borderRadius: 3,
                      }}>{m.status}</span>
                    )}
                  </span>
                  {/* v0.12.9 — ★ FAVORIT tag for rows that matched a
                      saved favorite. Closes the loop: pick a team in
                      onboarding → see it surface here when it plays. */}
                  {m.isFav && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: 0.5,
                        color: 'var(--amber)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ★ {lang === 'id' ? 'FAVORIT' : 'FAV'}
                    </span>
                  )}
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
  // v0.11.23 GIB-021 — readability bump. Crest 16 → 20, name 12 → 13,
  // score 13 → 14 so the row is legible without leaning in on a
  // 14-inch laptop. Vertical rhythm (marginTop 3 → 5) keeps the
  // home/away pair distinct without ballooning the card.
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Crest short={abbr} color={color} size={20} />
        <span
          style={{
            font: '600 13px "Inter Tight"',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </span>
      <span className="tab mono" style={{ fontWeight: 800, fontSize: 14 }}>
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

function FollowingCard({ lang, selectedConstructor, isAnon }) {
  // v0.12.5 — logged-in users now see their saved favorite teams from
  // profiles.favorite_teams (set via /onboarding/teams). Falls back to
  // the localStorage + seed-list path for users who skipped onboarding.
  // Anon users see seed list labeled "Trending teams" with a sign-in
  // nudge in the footer.
  const { favorites: savedFavs, status: favsStatus } = useFavoriteTeams();
  const items = useMemo(() => {
    // v0.12.5 — when the user has saved favorites, render those
    // exclusively (no fallback to seed teams). Each saved fav links
    // to the appropriate per-sport page.
    if (favsStatus === 'ready' && savedFavs && savedFavs.length > 0) {
      return savedFavs.slice(0, 6).map((f) => {
        let path;
        let s;
        if (f.sport === 'nba') {
          path = `/nba-playoff-2026/${slugifyTeamName(f.id)}`;
          s = `NBA · ${f.short || ''}`;
        } else if (f.sport === 'epl') {
          path = `/premier-league-2025-26/club/${f.id}`;
          s = `EPL · ${f.short || ''}`;
        } else if (f.sport === 'f1') {
          path = `/formula-1-2026/team/${f.id}`;
          s = `F1 · ${f.short || ''}`;
        } else if (f.sport === 'tennis') {
          path = `/tennis?player=${f.id}`;
          s = `TENIS · ${f.short || ''}`;
        } else {
          path = '/';
          s = (f.sport || '').toUpperCase();
        }
        const t = (f.name || f.short || f.id || '').split(' ').slice(-2).join(' ');
        return { t, c: f.color || '#3B82F6', s, path };
      });
    }

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
  }, [selectedConstructor, savedFavs, favsStatus]);

  // v0.12.5 — for logged-in users with no saved favs, the FollowingCard
  // now nudges toward the onboarding picker instead of showing seed
  // teams as if they were favorites. Anon users still see seed +
  // sign-in nudge.
  const showOnboardNudge = !isAnon && favsStatus === 'ready' && (!savedFavs || savedFavs.length === 0);

  // v0.12.4 — anon vs logged-in label differentiation
  const cardTitle = isAnon
    ? (lang === 'id' ? 'Tim Trending' : 'Trending teams')
    : (lang === 'id' ? 'Diikuti' : 'Following');

  return (
    <Card>
      <CardHead
        title={cardTitle}
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
              gap: 10,
              // v0.11.23 GIB-012 — was '7px 10px' giving ~32 px tall rows
              // (under WCAG 2.5.5 44 px target). Bump padding + crest +
              // text so each row clears 48 px and the team name reads at
              // a glance.
              padding: '10px 10px',
              minHeight: 48,
              borderRadius: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Crest short={f.t.slice(0, 3).toUpperCase()} color={f.c} size={22} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ font: '600 13px "Inter Tight"', color: 'var(--ink)' }}>{f.t}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{f.s}</div>
            </div>
          </Link>
        ))}
      </div>
      {/* v0.12.4 — anon footer nudge to sign in + save favs. Logged-in
          users with no favs yet see a different nudge to pick teams. */}
      {isAnon && (
        <Link
          to="/login?next=/onboarding/teams"
          style={{
            display: 'block',
            padding: '10px 12px',
            margin: 4,
            borderTop: '1px solid var(--line-soft)',
            fontSize: 11,
            color: 'var(--amber)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            fontWeight: 600,
          }}
        >
          {lang === 'id' ? '★ Masuk untuk simpan tim favorit →' : '★ Sign in to save favorites →'}
        </Link>
      )}
      {/* v0.12.5 — logged-in users who skipped onboarding see a nudge
          to pick teams. Once they save favs, this disappears and the
          card renders their saved selections (logic above). */}
      {showOnboardNudge && (
        <Link
          to="/onboarding/teams"
          style={{
            display: 'block',
            padding: '10px 12px',
            margin: 4,
            borderTop: '1px solid var(--line-soft)',
            fontSize: 11,
            color: 'var(--blue)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            fontWeight: 600,
          }}
        >
          {lang === 'id' ? '★ Pilih tim favoritmu →' : '★ Pick your favorite teams →'}
        </Link>
      )}
      {/* v0.12.9 — closed-loop edit affordance. Logged-in users with
          saved favs get a quiet "Edit favorit →" routing to the new
          /settings/teams page so they can prune / add picks without
          re-running the first-run /onboarding/teams flow. */}
      {!isAnon && favsStatus === 'ready' && savedFavs && savedFavs.length > 0 && (
        <Link
          to="/settings/teams"
          style={{
            display: 'block',
            padding: '8px 12px',
            margin: 4,
            borderTop: '1px solid var(--line-soft)',
            fontSize: 10,
            color: 'var(--ink-3)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            fontWeight: 600,
          }}
        >
          {lang === 'id' ? 'Edit favorit →' : 'Edit favorites →'}
        </Link>
      )}
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
      {/* v0.11.23 GIB-021 + GIB-012 — fixture rows were ~14.5 px tall,
          well under WCAG 2.5.5. Bump to minHeight 44 + 12 px text so a
          finger / cursor lands cleanly without misclicks. */}
      <div style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--ink-3)', padding: 10 }}>
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
                minHeight: 44,
                padding: '8px 8px',
                borderRadius: 6,
                fontSize: 12,
                textDecoration: 'none',
                color: 'inherit',
                gap: 10,
              }}
            >
              <span className="mono" style={{ color: 'var(--ink-3)', minWidth: 28 }}>{r.w}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: '600 12px "Inter Tight"', color: 'var(--ink)' }}>{r.t}</span>
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
  // v0.12.4 — Tennis live for cross-sport LiveGridCard. Pull both
  // tours and merge live-status matches; useTennisScoreboard caches
  // 5-minute idle so this is cheap on Home.
  const { matches: atpMatches } = useTennisScoreboard('atp');
  const { matches: wtaMatches } = useTennisScoreboard('wta');
  const tennisLive = useMemo(() => {
    const all = [...(atpMatches || []), ...(wtaMatches || [])];
    return all.filter((m) => m.status === 'live');
  }, [atpMatches, wtaMatches]);

  // v0.12.4 — read auth state to differentiate Following card label
  // and footer nudge. Anon users see "Trending teams" + sign-in
  // prompt; logged-in users see "Following" with their saved favs.
  const summary = useUserBracketSummary();
  const isAnon = summary.status === 'anon';

  const hero = useMemo(() => pickHeroGame(games || []), [games]);

  return (
    <Board>
      <SEO
        title={lang === 'id'
          ? 'gibol.co — gila bola · skor live NBA · Liga Inggris · F1 · Tenis · Piala Dunia 2026'
          : 'gibol.co — gila bola · live scores NBA · Premier League · F1 · Tennis · World Cup 2026'}
        description={lang === 'id'
          ? 'Hub multi-olahraga Bahasa Indonesia. NBA Playoffs 2026, Liga Inggris 2025-26, Formula 1, Tenis ATP + WTA, Piala Dunia FIFA 2026.'
          : 'Live multi-sport hub in Bahasa Indonesia. NBA Playoffs 2026, Premier League 2025-26, Formula 1, Tennis ATP + WTA, FIFA World Cup 2026.'}
        path="/"
        lang={lang}
      />
      {/* A11y — single <h1> per page for screen-reader rotor. */}
      <h1 className="sr-only">
        {lang === 'id'
          ? 'gibol.co — dashboard olahraga live dalam Bahasa Indonesia'
          : 'gibol.co — live sports dashboards in Bahasa Indonesia'}
      </h1>

      {/* v0.12.2 Theme B — Pick'em Home hero ABOVE the sport grid. Branches
          on auth state (anon → CTA, logged-in → bracket standing + league
          rank). Renders nothing during loading state to avoid first-paint
          skeleton noise for the typical anon user. */}
      <PickemHomeHero />

      {/* v0.12.3 M-1 — `.homev1-grid` collapses 200/1fr/260 → single
          column below the laptop breakpoint (1024px). Inline padding
          / gap kept for desktop but the responsive collapse now lives
          in src/index.css. */}
      {/* v0.19.5 Phase 2 Sprint E — direct children of .homev1-grid
          gain `homev1-card--*` classNames so the mobile reorder
          rules in src/index.css can target them by role. The
          asides + section preserve their desktop column layout;
          on ≤540px viewports they switch to display:contents so
          every card becomes a direct flex item of the grid and
          the order:* declarations re-stack them per directive §4
          (Live → Trending → Pulse → FansReact → Fangir, with
          HeroGame + Upcoming demoted below). */}
      <div className="homev1-grid">
        {/* Left rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="homev1-card--trending">
            <FollowingCard lang={lang} selectedConstructor={selectedConstructor} isAnon={isAnon} />
          </div>
          <div className="homev1-card--upcoming">
            <UpcomingCard fixtures={eplUpcoming} lang={lang} />
          </div>
        </aside>

        {/* Center */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {hero && (
            <div className="homev1-card--hero">
              <HeroGameCard game={hero} />
            </div>
          )}
          <div className="homev1-card--livegrid">
            <LiveGridCard nbaGames={games} eplUpcoming={eplUpcoming} tennisLive={tennisLive} lang={lang} />
          </div>
        </section>

        {/* Right rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="homev1-card--livepulse">
            <LivePulseCard lang={lang} />
          </div>
          <div className="homev1-card--fansreact">
            <FansReactingCard lang={lang} />
          </div>
          <a
            className="homev1-card--fangir"
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

      {/* Footer — v0.11.20 GIB-014. Explicit role so axe/rotor pick
          it up as contentinfo landmark even when nested inside an
          outer <main>. Implicit footer semantics only fire when the
          element is a direct child of <body>. */}
      <footer
        role="contentinfo"
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
