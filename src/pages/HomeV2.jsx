import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import LiveBand from '../components/v2/LiveBand.jsx';
import MatchStrip from '../components/v2/MatchStrip.jsx';
import NewsroomSlice from '../components/v2/NewsroomSlice.jsx';
import SectionRule from '../components/v2/SectionRule.jsx';
import { COLORS as C, TEAM_META } from '../lib/constants.js';
import { usePlayoffData } from '../hooks/usePlayoffData.js';

/**
 * /home (when VITE_FLAG_HOME=2) — HomeV2.
 *
 * Phase 2 ship Phase E (per docs/redesign-v4-handover.md §4 Phase E).
 * Replaces the gateway Home + HomeV1 when the tri-state flag is at 2.
 * Behind VITE_FLAG_HOME (default 0); old homes stay on disk as rollback
 * paths.
 *
 * Composition:
 *   • <LiveBand> — single-row marquee strip across every sport's
 *     in-progress games. NBA via usePlayoffData; other sports drop
 *     in as their hubs publish live data via the same hook pattern
 *     (deferred to v0.57.1 when the homepage_sentence cron lands).
 *   • Front-page sentence — Newsreader serif h1, clamp(28px → 36px).
 *     v1 ships a STATIC sentence read from
 *     /content/homepage-sentence.json (editable without redeploy via
 *     the editor's edit modal flow). v0.57.1 adds the cron-generated
 *     dynamic version. Bahasa-first per CLAUDE.md voice rules.
 *   • Two-column body desktop / single-column mobile:
 *       LEFT (Live console): hero live game card + 3 stacked compact
 *         tiles + "+ N more live · Lihat semua →" CTA.
 *       RIGHT (Newsroom): the existing NewsroomSlice (cross-sport,
 *         not filtered to one league) + Reading list + Popular tags.
 *   • Footer: standard ContactBar + version label (extends existing
 *     pattern; dedicated V2Footer deferred to v0.57.1 polish).
 *
 * Mobile-first: live console + newsroom collapse to single column
 * below 1024px. Live band scrolls horizontally as before.
 *
 * UI.v2 hub primitives (Newsroom Slice, SubNav, Phase B article
 * shell) ship independently behind UI.v2 boolean — HomeV2 is its
 * own flag (homeVariant). Not coupled.
 */

// Build LiveBand items from NBA playoff data. Other sports plug in
// the same shape when their live hooks land (Phase E follow-up).
//
// Game shape (from src/lib/api.js#fetchScoreboard):
//   { id, name, date, status, statusState,
//     home: {abbr, score, record},
//     away: {abbr, score, record} }
function buildLiveItems(games) {
  if (!Array.isArray(games)) return [];
  const out = [];
  for (const g of games) {
    if (g.statusState !== 'in') continue; // live only
    const homeAbbr = g.home?.abbr || '?';
    const awayAbbr = g.away?.abbr || '?';
    out.push({
      sport: 'NBA',
      a: awayAbbr,
      as: g.away?.score ?? '—',
      b: homeAbbr,
      bs: g.home?.score ?? '—',
      // status is ESPN's shortDetail like "Q3 4:12" — already
      // human-readable; no need to reformat.
      tag: g.status || 'LIVE',
      href: `/nba-playoff-2026/game/${g.id}`,
    });
  }
  return out;
}

// Pick the marquee live game (highest combined score; proxy for
// "the most-active live game right now"). When no live games,
// returns null and the live console renders an empty state.
function pickHeroGame(games) {
  if (!Array.isArray(games)) return null;
  const live = games.filter((g) => g.statusState === 'in');
  if (!live.length) return null;
  return [...live].sort((a, b) => {
    const aSum = (Number(a.home?.score) || 0) + (Number(a.away?.score) || 0);
    const bSum = (Number(b.home?.score) || 0) + (Number(b.away?.score) || 0);
    return bSum - aSum;
  })[0];
}

// Format clock for "updated Xs ago".
function _formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s yang lalu`;
  if (diff < 3600) return `${Math.round(diff / 60)}m yang lalu`;
  return `${Math.round(diff / 3600)}h yang lalu`;
}

export default function HomeV2() {
  // usePlayoffData returns { games, lastUpdate, ... } — NOT schedule/lastFetch.
  // Field-name mismatch was the v0.58.1 bug that left the LiveBand empty
  // even with live games on ESPN. v0.58.2 hotfix.
  const { games, lastUpdate } = usePlayoffData(30000);
  const [sentence, setSentence] = useState(null);
  const [tagsAvailable, setTagsAvailable] = useState([]);

  // v0.57.0 v1: read homepage sentence from a static JSON file.
  // Editor or cron writes the JSON before deploy. v0.57.1 swaps in
  // the cron-generated Supabase row.
  useEffect(() => {
    let cancelled = false;
    fetch('/content/homepage-sentence.json', { credentials: 'same-origin' })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!cancelled && j) setSentence(j); })
      .catch(() => { /* silent: stale-or-absent file is fine */ });
    return () => { cancelled = true; };
  }, []);

  // Pull popular tags from /content/index.json — dedup leagues that
  // have at least one approved article. Same fix as NewsroomSlice
  // (v0.58.0): switched from `manual_review === false` to
  // `approved === true`, with legacy fallback for older indexes.
  useEffect(() => {
    let cancelled = false;
    fetch('/content/index.json', { credentials: 'same-origin' })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled || !j) return;
        const leagues = new Set();
        for (const a of (j.articles || [])) {
          if (a.league && (a.approved === true || a.manual_review === false)) {
            leagues.add(a.league);
          }
        }
        setTagsAvailable([...leagues]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const liveItems = useMemo(() => buildLiveItems(games), [games]);
  const heroGame = useMemo(() => pickHeroGame(games), [games]);
  const liveCount = liveItems.length;
  const restCount = Math.max(0, liveCount - 4); // 1 hero + 3 stacked = 4 visible

  const updatedAgo = lastUpdate ? _formatRelative(lastUpdate) : null;

  // Default Bahasa-first sentence when JSON file isn't present.
  const fallbackSentence = liveCount > 0
    ? `Malam ini ${liveCount} game NBA Playoff lagi seru. Skor live, win-prob, dan play-by-play di bawah.`
    : 'Selamat datang di Gibol — dashboard olahraga Bahasa-first untuk NBA, Premier League, F1, Tenis, dan Liga 1.';
  const headline = sentence?.text || fallbackSentence;

  return (
    <div className="v2 v2-home" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <SEO
        title="gibol.co — skor olahraga live, recap Bahasa, profil tim & pemain"
        description="Dashboard Bahasa-first untuk NBA Playoff 2026, Premier League 2025-26, Formula 1 2026, ATP/WTA Tennis, dan Super League Indonesia. Skor live, peluang juara, recap AI, dan profil evergreen."
        path="/"
      />

      <LiveBand items={liveItems} updatedAgo={updatedAgo} />

      {/* Front-page sentence */}
      <header
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(20px, 4vw, 36px) 20px clamp(16px, 3vw, 24px)',
        }}
      >
        <div className="kicker" style={{ marginBottom: 10 }}>
          GIBOL TODAY · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h1
          className="disp serif"
          style={{
            fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
            fontSize: 'clamp(24px, 3.6vw, 36px)',
            fontWeight: 600,
            lineHeight: 1.18,
            letterSpacing: -0.005,
            color: 'var(--ink)',
            margin: 0,
            maxWidth: 920,
            textWrap: 'balance',
          }}
        >
          {headline}
        </h1>
        {sentence?.attribution && (
          <p
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--ink-3)',
            }}
          >
            — {sentence.attribution}
          </p>
        )}
      </header>

      {/* v0.59.0 — Match strips. Two horizontal-scroll rails between
          the headline and the live-console/newsroom grid:
            • HARI INI & BESOK — kickoffs in next ~36h, all sports
            • SKOR TERAKHIR    — finished games in last ~36h
          Pulls from the existing per-sport hooks (NBA, EPL, Liga 1,
          F1) — no new Vercel function. Components hide themselves
          when there's nothing to show, so off-season sports don't
          leave empty rails. */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        <MatchStrip mode="upcoming" />
        <MatchStrip mode="results" />
      </section>

      {/* Body grid — 2-col desktop, 1-col mobile */}
      <main
        className="home-v2-body"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 28,
        }}
      >
        {/* LEFT — Live console */}
        <section style={{ minWidth: 0 }}>
          <SectionRule>Live console</SectionRule>

          {liveCount === 0 ? (
            <div
              style={{
                padding: '24px 18px',
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--ink-3)',
                fontSize: 14,
              }}
            >
              Tidak ada game live saat ini. Cek{' '}
              <Link to="/nba-playoff-2026" style={{ color: 'var(--amber)' }}>NBA Playoff</Link>
              {' '}atau{' '}
              <Link to="/premier-league-2025-26" style={{ color: 'var(--amber)' }}>Liga Inggris</Link>
              {' '}untuk jadwal berikutnya.
            </div>
          ) : (
            <>
              {/* Hero live game */}
              {heroGame && (() => {
                // Resolve full team names by abbr lookup against TEAM_META.
                const homeAbbr = heroGame.home?.abbr;
                const awayAbbr = heroGame.away?.abbr;
                const homeName = Object.entries(TEAM_META).find(([, m]) => m.abbr === homeAbbr)?.[0];
                const awayName = Object.entries(TEAM_META).find(([, m]) => m.abbr === awayAbbr)?.[0];
                return (
                  <Link
                    to={`/nba-playoff-2026/game/${heroGame.id}`}
                    style={{
                      display: 'block',
                      padding: 18,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--line)',
                      borderLeft: '3px solid var(--live)',
                      borderRadius: 8,
                      marginBottom: 12,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div className="kicker" style={{ color: 'var(--live)', marginBottom: 8 }}>
                      LIVE · NBA · {heroGame.status || 'IN PROGRESS'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 14,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.16em',
                            color: 'var(--ink-3)',
                            marginBottom: 4,
                          }}
                        >
                          {awayAbbr} @ {homeAbbr}
                        </div>
                        <div
                          style={{
                            fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--ink)',
                            lineHeight: 1.2,
                          }}
                        >
                          {awayName || awayAbbr}
                          {' vs '}
                          {homeName || homeAbbr}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 30,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink)',
                          lineHeight: 1,
                        }}
                      >
                        {heroGame.away?.score ?? '—'}
                        <span style={{ color: 'var(--ink-3)', margin: '0 8px' }}>·</span>
                        {heroGame.home?.score ?? '—'}
                      </div>
                    </div>
                  </Link>
                );
              })()}

              {/* Stacked compact tiles — next 3 live games */}
              {liveItems.slice(1, 4).map((it, i) => (
                <Link
                  key={i}
                  to={it.href || '/nba-playoff-2026'}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 6,
                    marginBottom: 6,
                    textDecoration: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700 }}>
                    {it.sport}
                  </span>
                  <span style={{ flex: 1, color: 'var(--ink-2)' }}>
                    <strong style={{ color: 'var(--ink)' }}>{it.a}</strong>{' '}
                    {it.as}{' · '}
                    <strong style={{ color: 'var(--ink)' }}>{it.b}</strong>{' '}
                    {it.bs}
                  </span>
                  <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>
                    {it.tag}
                  </span>
                </Link>
              ))}

              {restCount > 0 && (
                <Link
                  to="/nba-playoff-2026"
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '6px 12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--amber)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 4,
                    textDecoration: 'none',
                    letterSpacing: '0.06em',
                  }}
                >
                  + {restCount} more live · Lihat semua →
                </Link>
              )}
            </>
          )}
        </section>

        {/* RIGHT — Newsroom (cross-sport) */}
        <section style={{ minWidth: 0 }}>
          {/* v0.58.3 — Contextual mode: surfaces match-relevant
              articles tied to the current/recent/upcoming game
              window. Just-finished recaps + upcoming previews +
              this-week standings ranked by recency. Falls back to
              "any approved" if nothing recent. Mixes sports — the
              home page shouldn't pin to one league. */}
          <NewsroomSlice
            contextual={true}
            limit={4}
            newsroomLabel="GIBOL NEWSROOM"
            moreHref="/news"
          />

          {/* Popular tags */}
          {tagsAvailable.length > 1 && (
            <div style={{ marginTop: 18 }}>
              <SectionRule variant="muted">Topik populer</SectionRule>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tagsAvailable.map((tag) => (
                  <Link
                    key={tag}
                    to={(() => {
                      if (tag === 'nba') return '/nba-playoff-2026';
                      if (tag === 'epl') return '/premier-league-2025-26';
                      if (tag === 'liga-1-id') return '/super-league-2025-26';
                      if (tag === 'f1') return '/formula-1-2026';
                      if (tag === 'tennis') return '/tennis';
                      return '/';
                    })()}
                    style={{
                      padding: '6px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      textDecoration: 'none',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {(() => {
                      if (tag === 'nba') return 'NBA';
                      if (tag === 'epl') return 'Liga Inggris';
                      if (tag === 'liga-1-id') return 'Super League';
                      if (tag === 'f1') return 'Formula 1';
                      if (tag === 'tennis') return 'Tennis';
                      return tag.toUpperCase();
                    })()}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Responsive: 2-col body grid kicks in at ≥1024px. */}
      <style>{`
        @media (min-width: 1024px) {
          .v2-home .home-v2-body {
            grid-template-columns: 1.6fr 1fr;
            gap: 36px;
          }
        }
      `}</style>
    </div>
  );
}
