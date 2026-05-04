import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { useGameDetails } from '../hooks/useGameDetails.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import { buildPerGameOgUrl } from '../lib/share.js';
import { fetchGameSummary, refreshGameSummary, useEditorSession } from '../lib/editorAuth.js';
import HubActionRow from '../components/v2/HubActionRow.jsx';
import {
  Momentum,
  Spark,
  QuarterTable,
  PlayerStatCard,
  LiveSummaryCard,
  PlayFeed,
  SeriesTracker,
  SectionRule,
} from '../components/v2/index.js';

/**
 * /nba-playoff-2026/game/:gameId — NBA Game Center.
 *
 * Phase 2 ship Phase D / v0.55.0 (per docs/redesign-v4-handover.md
 * §4 Phase D). Single deep-dive page per NBA game. Composes:
 *
 *   • Header strip (NBA · ROUND · GM N · VENUE · DATE/TIME)
 *   • Score hero (3-col on desktop: away crest+W-L / score+status /
 *     home crest+W-L) + Momentum bar
 *   • Body 2-col grid:
 *       - Main: QuarterTable → Top performers (4 cards) →
 *         LiveSummaryCard (stub in v1; full infra lands v0.55.1)
 *       - Right rail: Win-prob spark → PlayFeed (max-h 280px) →
 *         SeriesTracker (best-of-7 strip)
 *   • Mobile: collapses to single column, by-quarter table
 *     horizontal-scrolls, right rail moves below body.
 *
 * Why a NEW page (vs extending NBAGameDeepLink): the deep-link is a
 * minimal SEO-only seedling that redirects to /recap/:date. Game
 * Center is a real surface — different intent, different chrome.
 *
 * Data sources (existing hooks; v1 ships with no new infra):
 *   • useGameDetails(eventId) → ESPN /summary (boxscore, plays,
 *     leaders, status, linescores) + win-prob array
 *   • usePlayoffData() → series state for the SeriesTracker chip
 *
 * Extension points for v0.55.1:
 *   • LiveSummaryCard's `body` prop wires to ce_game_summaries
 *     Supabase row once that table + edge function ship.
 *   • Real-photo hero via fm.hero_image (currently null →
 *     gradient placeholder).
 */

// Pick top-N players per team by points. Returns array of {name,
// teamAbbr, position, stats[]} compatible with PlayerStatCard.
function pickTopPerformers(boxscore, limit = 2) {
  if (!Array.isArray(boxscore)) return [];
  const out = [];
  for (const team of boxscore) {
    const sorted = (team.players || [])
      .filter((p) => !p.dnp)
      .sort((a, b) => (b.pts || 0) - (a.pts || 0))
      .slice(0, limit);
    for (const p of sorted) {
      out.push({
        name: p.name,
        short: p.short,
        teamAbbr: team.abbr,
        position: p.position,
        starter: p.starter,
        stats: [
          { label: 'PTS', value: p.pts },
          { label: 'REB', value: p.reb },
          { label: 'AST', value: p.ast },
          { label: '+/-', value: p.plusMinus },
        ],
      });
    }
  }
  return out;
}

// Build the QuarterTable rows from ESPN linescores. Returns the
// `periods` prop array.
function buildPeriods(awayLine, homeLine, awayTotal, homeTotal) {
  const len = Math.max(awayLine?.length || 0, homeLine?.length || 0);
  const periods = [];
  for (let i = 0; i < len; i++) {
    periods.push({
      label: i < 4 ? `Q${i + 1}` : `OT${i - 3}`,
      away: awayLine?.[i],
      home: homeLine?.[i],
    });
  }
  // Append final.
  periods.push({ label: 'F', away: awayTotal, home: homeTotal });
  return periods;
}

// Format ESPN plays into PlayFeed rows. Filter to the most
// significant: scoring plays + period-ends + last-30 anyway.
function buildPlayFeed(plays, awayAbbr, homeAbbr, awayColor, homeColor) {
  if (!Array.isArray(plays)) return [];
  const rows = [];
  // Take last 60 plays for a manageable feed; the component scrolls.
  const recent = plays.slice(-60);
  for (const p of recent) {
    const team = p.teamId ? (p.awayScore != null && p.homeScore != null ? null : null) : null;
    // ESPN doesn't expose team abbr per-play directly — infer from
    // homeId/awayId on the parent summary; we fall back to no team.
    rows.push({
      t: p.clock ? `Q${p.period} ${p.clock}` : (p.period ? `Q${p.period}` : ''),
      team: null,  // skip team chip per-play; the score-snap captures momentum
      text: p.text,
      big: !!p.scoringPlay && (p.scoreValue || 0) >= 3,
      color: p.scoringPlay ? 'var(--amber)' : 'var(--ink-3)',
      scoreSnap: (p.awayScore != null && p.homeScore != null)
        ? `${p.awayScore}-${p.homeScore}`
        : null,
    });
  }
  return rows;
}

// Build SeriesTracker from playoff series state. usePlayoffData
// returns a brackets/series structure; we extract the games for
// the matchup containing this game id.
function buildSeriesGames(series, gameId, homeAbbr, awayAbbr) {
  if (!Array.isArray(series)) return [];
  // Find the series that includes this game.
  const target = series.find((s) =>
    (s.events || []).some((e) => String(e.eventId) === String(gameId))
  );
  if (!target) return [];
  const events = target.events || [];
  return events.map((e, i) => {
    const homeWon = e.homeScore != null && e.awayScore != null
      && e.homeScore > e.awayScore;
    const awayWon = e.homeScore != null && e.awayScore != null
      && e.awayScore > e.homeScore;
    let state = 'scheduled';
    if (String(e.eventId) === String(gameId) && e.statusState === 'in') state = 'live';
    else if (homeWon) state = 'won-home';
    else if (awayWon) state = 'won-away';
    else if (e.ifNeeded) state = 'if_needed';
    return {
      label: `G${i + 1}`,
      state,
      score: (e.homeScore != null && e.awayScore != null)
        ? `${e.awayScore}-${e.homeScore}` : null,
      isCurrent: String(e.eventId) === String(gameId),
    };
  });
}

export default function NBAGameCenter() {
  const { gameId } = useParams();
  const { summary, winProb, error } = useGameDetails(gameId);
  const { schedule } = usePlayoffData(60000);
  const { isEditor } = useEditorSession();

  // v0.55.1 — Phase D backend: fetch cached AI live summary from
  // Supabase. Refresh polls every 60s when game is live so the
  // surface mirrors the cron's writes (cron lands in v0.55.2; until
  // then editor manually triggers via the refresh button).
  const [aiSummary, setAiSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  useEffect(() => {
    if (!gameId) return undefined;
    let cancelled = false;
    let timer;
    async function load() {
      try {
        const row = await fetchGameSummary(gameId);
        if (!cancelled) setAiSummary(row);
      } catch (_) {
        // silent — anon read can return null when no row exists
      }
      // Re-poll every 60s while live; once every 5 min when not.
      const liveCheck = summary?.statusState === 'in';
      timer = setTimeout(load, liveCheck ? 60000 : 300000);
    }
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [gameId, summary?.statusState]);

  const handleRefresh = useCallback(async () => {
    if (!gameId || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const result = await refreshGameSummary({ gameId });
      // Optimistically update local state with the freshly written row.
      setAiSummary({
        game_id: result.game_id,
        body_md: result.body_md,
        is_live: result.is_live,
        updated_at: result.updated_at,
        sources: ['ESPN play-by-play'],
        ai_model: 'claude-haiku-4-5-20251001',
      });
    } catch (e) {
      setRefreshError(String(e?.message || e));
    } finally {
      setRefreshing(false);
    }
  }, [gameId, refreshing]);

  // Resolve the game from the schedule cache for venue / round /
  // date metadata (ESPN summary header has some, but the schedule
  // entry typically has more reliable round labels).
  const event = useMemo(() => {
    if (!Array.isArray(schedule)) return null;
    return schedule.find((g) => String(g.eventId) === String(gameId));
  }, [schedule, gameId]);

  // Resolve home/away team meta from TEAM_META lookup. Use ESPN
  // abbr when available; fall back to schedule entry.
  const homeAbbr = summary?.homeAbbr || event?.homeAbbr;
  const awayAbbr = summary?.awayAbbr || event?.awayAbbr;
  const homeTeam = useMemo(() => {
    if (!homeAbbr) return null;
    return Object.values(TEAM_META).find((t) => t.abbr === homeAbbr);
  }, [homeAbbr]);
  const awayTeam = useMemo(() => {
    if (!awayAbbr) return null;
    return Object.values(TEAM_META).find((t) => t.abbr === awayAbbr);
  }, [awayAbbr]);
  const homeName = useMemo(() => {
    if (!homeAbbr) return null;
    return Object.entries(TEAM_META).find(([, m]) => m.abbr === homeAbbr)?.[0];
  }, [homeAbbr]);
  const awayName = useMemo(() => {
    if (!awayAbbr) return null;
    return Object.entries(TEAM_META).find(([, m]) => m.abbr === awayAbbr)?.[0];
  }, [awayAbbr]);

  const homeColor = homeTeam?.color || '#3B82F6';
  const awayColor = awayTeam?.color || '#F59E0B';

  // Compute Momentum bar value from latest win-prob if live.
  const momentumValue = useMemo(() => {
    if (!Array.isArray(winProb) || !winProb.length) return 0.5;
    const last = winProb[winProb.length - 1];
    return typeof last.homePct === 'number' ? last.homePct : 0.5;
  }, [winProb]);

  // Build derived data.
  const periods = useMemo(() => {
    if (!summary) return [];
    return buildPeriods(
      summary.awayLine, summary.homeLine, summary.awayScore, summary.homeScore,
    );
  }, [summary]);

  const topPerformers = useMemo(() => {
    if (!summary) return [];
    return pickTopPerformers(summary.boxscore, 2);
  }, [summary]);

  const playFeedRows = useMemo(() => {
    if (!summary) return [];
    return buildPlayFeed(summary.plays, awayAbbr, homeAbbr, awayColor, homeColor);
  }, [summary, awayAbbr, homeAbbr, awayColor, homeColor]);

  // Win-prob spark: just feed homePct values.
  const sparkData = useMemo(() => {
    if (!Array.isArray(winProb) || !winProb.length) return [];
    return winProb.map((p) => p.homePct).filter((v) => typeof v === 'number');
  }, [winProb]);

  // Loading / error states.
  if (error && !summary) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
        <h1 style={{ fontSize: 22, color: 'var(--ink)' }}>Game Center belum tersedia</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          Tidak bisa memuat data untuk game id <code>{gameId}</code>. {error}
        </p>
        <Link to="/nba-playoff-2026" style={{ color: 'var(--amber)' }}>
          ← Kembali ke NBA Playoff Hub
        </Link>
      </main>
    );
  }
  if (!summary) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Memuat game center…</p>
      </main>
    );
  }

  // Header line: "NBA · WEST CONF SF · GM 3 · BALL ARENA · 03 MAY · 19:30 LOCAL"
  const headerParts = ['NBA'];
  if (event?.roundLabel) headerParts.push(event.roundLabel.toUpperCase());
  if (event?.gameNumber) headerParts.push(`GM ${event.gameNumber}`);
  if (event?.venue) headerParts.push(event.venue.toUpperCase());
  if (event?.dateLocal) headerParts.push(event.dateLocal);
  const headerLine = headerParts.join(' · ');

  const isLive = summary.statusState === 'in';
  const isFinal = summary.statusState === 'post';

  // Status caption — "LIVE Q3 4:12" / "FINAL" / "TIPOFF 19:30"
  const statusCaption = isLive
    ? `LIVE · Q${summary.period} ${summary.clock || ''}`.trim()
    : isFinal
      ? 'FINAL'
      : (summary.status || 'SCHEDULED').toUpperCase();

  // Series games for the SeriesTracker.
  const seriesGames = buildSeriesGames(
    schedule?.filter?.((s) => s.events) || [],
    gameId, homeAbbr, awayAbbr,
  );

  return (
    <main className="v2 v2-game-center" style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 20px 60px' }}>
      <SEO
        title={`${awayName || awayAbbr} @ ${homeName || homeAbbr} · NBA Game Center · gibol.co`}
        description={`Live score, play-by-play, top performers, win probability, dan series tracker untuk ${awayName} @ ${homeName} · NBA Playoff 2026.`}
        path={`/nba-playoff-2026/game/${gameId}`}
        image={buildPerGameOgUrl(gameId)}
      />

      <Breadcrumbs
        items={[
          { name: 'Beranda', to: '/' },
          { name: 'NBA Playoffs', to: '/nba-playoff-2026' },
          { name: `${awayAbbr} @ ${homeAbbr}` },
        ]}
      />

      {/* Kicker header strip */}
      <div className="kicker" style={{ marginTop: 8, marginBottom: 14 }}>
        {headerLine}
      </div>

      {/* Score hero — 3-col on desktop, stacks on mobile */}
      <section
        style={{
          padding: 'clamp(16px, 2.5vw, 24px)',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div
          className="score-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 'clamp(12px, 3vw, 28px)',
          }}
        >
          {/* Away */}
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: awayColor, letterSpacing: '0.18em', marginBottom: 4 }}>
              {awayAbbr}
            </div>
            <Link
              to={awayName ? `/nba-playoff-2026/${awayName.split(' ').pop().toLowerCase()}` : '#'}
              style={{
                fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
                fontSize: 'clamp(18px, 2.4vw, 24px)',
                fontWeight: 700,
                color: 'var(--ink)',
                textDecoration: 'none',
                lineHeight: 1.15,
                display: 'block',
                marginBottom: 6,
              }}
            >
              {awayName || awayAbbr}
            </Link>
          </div>

          {/* Score + status */}
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{
              display: 'flex',
              gap: 'clamp(8px, 2vw, 16px)',
              alignItems: 'baseline',
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(36px, 7vw, 64px)',
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1,
            }}>
              <span>{summary.awayScore ?? '—'}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 'clamp(20px, 3vw, 28px)' }}>·</span>
              <span>{summary.homeScore ?? '—'}</span>
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: isLive ? 'var(--amber)' : isFinal ? 'var(--ink-2)' : 'var(--ink-3)',
              }}
            >
              {isLive && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: 'var(--amber)',
                    borderRadius: 50,
                    marginRight: 6,
                    verticalAlign: 'middle',
                    animation: 'live-pulse 1.4s ease-in-out infinite',
                  }}
                />
              )}
              {statusCaption}
            </div>
          </div>

          {/* Home */}
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: homeColor, letterSpacing: '0.18em', marginBottom: 4 }}>
              {homeAbbr}
            </div>
            <Link
              to={homeName ? `/nba-playoff-2026/${homeName.split(' ').pop().toLowerCase()}` : '#'}
              style={{
                fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
                fontSize: 'clamp(18px, 2.4vw, 24px)',
                fontWeight: 700,
                color: 'var(--ink)',
                textDecoration: 'none',
                lineHeight: 1.15,
                display: 'block',
                marginBottom: 6,
              }}
            >
              {homeName || homeAbbr}
            </Link>
          </div>
        </div>

        {/* Momentum bar */}
        {(isLive || isFinal) && (
          <div style={{ marginTop: 14 }}>
            <Momentum
              value={momentumValue}
              home={homeColor}
              away={awayColor}
              height={6}
              ariaLabel={`Momentum bar — ${homeAbbr} ${Math.round(momentumValue * 100)}% / ${awayAbbr} ${Math.round((1 - momentumValue) * 100)}%`}
            />
          </div>
        )}

        <HubActionRow
          url={`/nba-playoff-2026/game/${gameId}`}
          shareText={`${awayName} ${summary.awayScore ?? ''} @ ${homeName} ${summary.homeScore ?? ''} · NBA Playoff · gibol.co`}
          analyticsEvent="game_center_share"
        />
      </section>

      {/* Body 2-col grid */}
      <div
        className="game-center-body"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 16,
        }}
      >
        {/* MAIN COLUMN */}
        <div style={{ minWidth: 0 }}>
          <SectionRule>By quarter</SectionRule>
          <QuarterTable
            periods={periods}
            awayLabel={awayAbbr}
            homeLabel={homeAbbr}
            awayColor={awayColor}
            homeColor={homeColor}
          />

          <SectionRule>Top performers</SectionRule>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              marginTop: 4,
            }}
          >
            {topPerformers.map((p, i) => (
              <PlayerStatCard
                key={`${p.teamAbbr}-${p.name}-${i}`}
                name={p.short || p.name}
                teamAbbr={p.teamAbbr}
                teamColor={p.teamAbbr === homeAbbr ? homeColor : awayColor}
                position={p.position}
                stats={p.stats}
                hot={i === 0 || (p.stats[0]?.value || 0) >= 30}
              />
            ))}
            {topPerformers.length === 0 && (
              <p style={{ color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
                Box score belum tersedia.
              </p>
            )}
          </div>

          <LiveSummaryCard
            body={aiSummary?.body_md || null}
            updatedAt={aiSummary?.updated_at || null}
            sources={aiSummary?.sources || ['ESPN play-by-play']}
            forceRefresh={isEditor ? handleRefresh : null}
          />
          {refreshing && (
            <p style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              Memperbarui AI live summary…
            </p>
          )}
          {refreshError && (
            <p style={{ marginTop: 6, fontSize: 11, color: 'var(--down)' }}>
              ⚠ {refreshError}
            </p>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside style={{ minWidth: 0 }}>
          <SectionRule variant="muted">Win probability</SectionRule>
          {sparkData.length > 1 ? (
            <div style={{
              padding: 12,
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              marginBottom: 14,
            }}>
              <Spark data={sparkData} stroke={homeColor} fill="rgba(0,0,0,0.0)" height={56} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.08em',
              }}>
                <span>{awayAbbr} {Math.round((1 - momentumValue) * 100)}%</span>
                <span>{homeAbbr} {Math.round(momentumValue * 100)}%</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--ink-3)', fontSize: 12, fontStyle: 'italic' }}>
              Win probability tidak tersedia (game belum dimulai atau data feed sedang offline).
            </p>
          )}

          <SectionRule variant="muted">Play feed</SectionRule>
          <PlayFeed plays={playFeedRows} maxHeight={320} reverse={true} />

          {seriesGames.length > 0 && (
            <>
              <SectionRule variant="muted">Series</SectionRule>
              <SeriesTracker
                games={seriesGames}
                awayLabel={awayAbbr}
                homeLabel={homeAbbr}
                awayColor={awayColor}
                homeColor={homeColor}
              />
            </>
          )}
        </aside>
      </div>

      {/* Responsive: 2-col body grid kicks in at ≥1024px. */}
      <style>{`
        @media (min-width: 1024px) {
          .v2-game-center .game-center-body {
            grid-template-columns: 1.6fr 1fr;
            gap: 24px;
          }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </main>
  );
}
