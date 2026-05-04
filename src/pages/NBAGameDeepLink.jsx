import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { usePlayoffData } from '../hooks/usePlayoffData.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import { trackEvent } from '../lib/analytics.js';
import ShareButton from '../components/ShareButton.jsx';
import CopyLinkButton from '../components/CopyLinkButton.jsx';
import { buildPerGameOgUrl } from '../lib/share.js';

/**
 * NBA per-game deep-link page — Theme J seedling, v0.12.1.
 *
 *   /nba-playoff-2026/game/:gameId
 *
 * Minimal route that exists for ONE reason: be the canonical share
 * target so WhatsApp / X / Threads / IG-feed link unfurls show the
 * per-game OG card from /api/recap/:gameId?v=og (v0.12.0 endpoint).
 *
 * Behavior:
 *   1. Look up the game in the live ESPN scoreboard cache (already
 *      fetched on the NBA dashboard via usePlayoffData)
 *   2. Set per-game SEO meta — title, description, og:image, og:url,
 *      og:type, twitter:image
 *   3. Redirect the user to /recap/:date#game-:gameId for the actual
 *      content view (the existing recap UI, not yet refactored — Theme
 *      J full-treatment in S4 will replace this redirect with a
 *      proper per-game page)
 *
 * Why this minimal seedling instead of full Theme J in S1:
 *   - The OG IMAGE was the high-leverage win (v0.12.0). Without per-
 *     game URLs, WhatsApp link unfurls would still show the date-level
 *     recap card, NOT the per-game one — defeating the whole point.
 *   - The PROPER per-game content page (with bracket context, play-by-
 *     play, scrolling timeline, comments hook) is a multi-day build —
 *     parked for S4 Theme J.
 *   - This file ships TODAY in 30 min and lets the per-game OG card
 *     be visible in shares from day 1.
 *
 * Sprint amendments §3.1 + §10.x cites this seedling as the v0.12.1
 * "hybrid" path.
 */
export default function NBAGameDeepLink() {
  const { gameId } = useParams();
  const { lang } = useApp();
  const { games } = usePlayoffData(30000);

  // Find the game in the live scoreboard cache. If not found, we still
  // render SEO meta (the OG endpoint will fetch fresh from ESPN); the
  // redirect just falls through to today's recap with the anchor.
  const game = (games || []).find((g) => String(g.id) === String(gameId));

  useEffect(() => {
    trackEvent('nba_game_deeplink_view', {
      gameId,
      hasGame: !!game,
      gameStatus: game?.statusState || null,
    });
  }, [gameId, game]);

  // Build SEO meta from the game when available; fall back to a
  // minimal meta when the game isn't in the cache (the OG endpoint
  // still resolves it via ESPN summary, so the unfurl works).
  const awayMeta = game?.away?.abbr ? TEAM_META[fullName(game.away.abbr)] : null;
  const homeMeta = game?.home?.abbr ? TEAM_META[fullName(game.home.abbr)] : null;
  const awayName = awayMeta?.name || awayMeta?.short || game?.away?.abbr || 'Away';
  const homeName = homeMeta?.name || homeMeta?.short || game?.home?.abbr || 'Home';
  const score = game
    ? `${game.away?.score ?? '–'} – ${game.home?.score ?? '–'}`
    : '';
  const statusLabel = game?.statusState === 'in'
    ? (lang === 'id' ? 'LIVE' : 'LIVE')
    : game?.statusState === 'post'
      ? 'FINAL'
      : (lang === 'id' ? 'JADWAL' : 'SCHEDULED');

  const title = game
    ? (lang === 'id'
        ? `${awayName} ${score} ${homeName} · ${statusLabel} · NBA Playoff 2026 | gibol.co`
        : `${awayName} ${score} ${homeName} · ${statusLabel} · NBA Playoff 2026 | gibol.co`)
    : `NBA Playoff 2026 · Game ${gameId} | gibol.co`;
  const description = game
    ? (lang === 'id'
        ? `Skor live, peluang juara, dan recap ${awayName} vs ${homeName} di gibol.co. NBA Playoff 2026 dalam Bahasa Indonesia.`
        : `Live score, championship odds, and recap of ${awayName} vs ${homeName} on gibol.co. NBA Playoff 2026 in Bahasa Indonesia.`)
    : 'NBA Playoff 2026 game recap on gibol.co.';

  const ogImage = `https://www.gibol.co/api/recap/${encodeURIComponent(gameId)}?v=og`;
  const path = `/nba-playoff-2026/game/${encodeURIComponent(gameId)}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dateIso = game?.date ? new Date(game.date).toISOString().slice(0, 10) : todayIso;
  const recapHref = `/recap/${dateIso}#game-${gameId}`;
  const igStoryUrl = buildPerGameOgUrl(gameId, 'story');
  const accentColor = (homeMeta?.color) || (awayMeta?.color) || C.amber;

  // Render an inline minimal page (not a redirect) so the URL the user
  // shares stays canonical and the per-game OG meta is the page's own
  // meta. Card preview embeds the per-game OG image; below it: clear
  // CTAs to the dashboard, recap, and share buttons. Theme J in S4
  // replaces this stub with a full play-by-play / box-score view.
  return (
    <div style={{
      background: C.bg,
      minHeight: '100vh',
      color: C.text,
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      <SEO
        title={title}
        description={description}
        path={path}
        image={ogImage}
        lang={lang}
      />
      <main style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.muted, fontWeight: 700 }}>
          NBA · PLAYOFF 2026 · GAME {gameId}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 32, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.025em',
          color: C.text, margin: 0,
          textWrap: 'balance',
        }}>
          {game
            ? `${awayName} ${score} ${homeName}`
            : (lang === 'id' ? `Pertandingan #${gameId}` : `Game #${gameId}`)}
        </h1>
        <div style={{ fontSize: 11, color: C.dim, fontFamily: 'var(--font-sans)' }}>
          {statusLabel} · NBA Playoff 2026
        </div>

        {/* Per-game OG card preview — shows what the share unfurl will
            look like, and gives the user something to screenshot if
            they're already on this URL after pasting from a friend. */}
        <div style={{
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          overflow: 'hidden',
          background: C.panel,
        }}>
          <img
            src={ogImage}
            alt={title}
            style={{ display: 'block', width: '100%', height: 'auto' }}
            loading="eager"
          />
        </div>

        {/* Action row — go to dashboard, see recap, share */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}>
          <Link
            to="/nba-playoff-2026"
            style={{
              padding: '10px 16px',
              background: accentColor,
              color: '#fff',
              borderRadius: 4,
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
            }}
          >
            {lang === 'id' ? 'Buka dashboard NBA' : 'Open NBA dashboard'} →
          </Link>
          <Link
            to={recapHref}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: C.text,
              border: `1px solid ${C.line}`,
              borderRadius: 4,
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
            }}
          >
            {lang === 'id' ? 'Recap harian' : 'Daily recap'}
          </Link>
          <CopyLinkButton lang={lang} accent={accentColor} source="nba-game-deeplink" />
          <ShareButton
            url={`https://www.gibol.co${path}`}
            title={title}
            text={description}
            accent={accentColor}
            size="md"
            label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
            ariaLabel={lang === 'id' ? `Bagikan ${awayName} vs ${homeName}` : `Share ${awayName} vs ${homeName}`}
            analyticsEvent="nba_game_deeplink_share"
            igStory={igStoryUrl ? { pngUrl: igStoryUrl } : undefined}
          />
        </div>

        <div style={{
          fontSize: 11,
          color: C.muted,
          lineHeight: 1.5,
          paddingTop: 20,
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {lang === 'id'
            ? 'Halaman ini menampilkan share-card per-game dengan klasemen live, top skor, kuarter, dan peluang menang. Klik dashboard di atas untuk bracket lengkap, watchlist, dan play-by-play.'
            : 'This page shows the per-game share card with live stats, top scorers, quarters, and win probability. Tap the dashboard above for the full bracket, watchlist, and play-by-play.'}
        </div>
      </main>
    </div>
  );
}

/**
 * NBA TEAM_META is keyed by full team name (e.g. "Los Angeles Lakers")
 * but the live ESPN game shape ships abbr ("LAL"). This is a tiny
 * inverse lookup — only for the two teams in the active game so we
 * don't pay for a 30-team map per render.
 */
function fullName(abbr) {
  if (!abbr) return null;
  for (const [name, meta] of Object.entries(TEAM_META)) {
    if (meta.abbr === abbr) return name;
  }
  return null;
}
