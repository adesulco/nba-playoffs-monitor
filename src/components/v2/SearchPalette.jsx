import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../lib/AppContext.jsx';
import { Icon, Crest } from './index.js';
import { CLUBS } from '../../lib/sports/epl/clubs.js';
import { TEAMS_2026 as F1_TEAMS, DRIVERS_2026 } from '../../lib/sports/f1/constants.js';
import { TENNIS_STARS_BY_SLUG } from '../../lib/sports/tennis/constants.js';

/**
 * Search ⌘K palette — C3 spec (Part 4.1).
 *
 * Overlay: 640px centered modal (top offset 80px on desktop).
 * Mobile (<=560px): full-screen sheet — same component, width 100vw,
 * height 100vh, no border-radius, no top offset.
 *
 * Keyboard:
 *   ↑ ↓   navigate across ALL result rows (flat index, groups are visual)
 *   ⏎     open selected row (push to its path)
 *   ⌘↩    open in new tab (window.open)
 *   ⎋     close palette
 *
 * Default state (empty query): shows a flat "Trending now" list.
 * Typing: groups results by kind (Teams · Matches · Players · Leagues).
 * No results: empty state with browse CTAs.
 *
 * Results source for Phase 3: a local hand-curated catalogue covering the
 * core navigable entities (20 EPL clubs, top F1 drivers + constructors,
 * top tennis tournaments, NBA teams with pages). This keeps search fully
 * client-side, latency-free, and zero-API-cost. A real full-text index
 * across live matches ships in a later phase.
 */

// v0.11.26 NEW (audit) — Trending list localized for BI / EN. The
// LEAGUE titles stay as their canonical brand names ("NBA Playoffs",
// "Premier League"); the `sub` lines and the LIVE/SOON/FEATURE chips
// translate. Tennis 2026 stays "Tennis" in EN and "Tenis" in BI per the
// existing nav vocab.
const TRENDING_BY_LANG = {
  en: [
    { kind: 'LEAGUE', title: 'NBA Playoffs 2026',       sub: 'Bracket · Round 1',        meta: 'LIVE',        path: '/nba-playoff-2026',                iconSport: 'NBA' },
    { kind: 'LEAGUE', title: 'Premier League 2025-26',  sub: '20 clubs · Matchweek 34',  meta: 'LIVE',        path: '/premier-league-2025-26',          iconSport: 'Football' },
    { kind: 'LEAGUE', title: 'Formula 1 2026',          sub: '23 GP calendar',           meta: 'LIVE',        path: '/formula-1-2026',                  iconSport: 'F1' },
    { kind: 'LEAGUE', title: 'Tennis 2026',             sub: 'ATP · WTA',                meta: 'LIVE',        path: '/tennis',                          iconSport: 'Tennis' },
    { kind: 'LEAGUE', title: 'FIFA World Cup 2026',     sub: 'Jun 11 – Jul 19',          meta: 'SOON',        path: '/fifa-world-cup-2026',             iconSport: 'WorldCup' },
    { kind: 'PAGE',   title: 'Playoff Recap',           sub: 'Daily recap',              meta: 'FEATURE',     path: '/recap' },
    { kind: 'PAGE',   title: 'Glossary',                sub: 'Basketball + football terms', meta: 'FEATURE',  path: '/glossary' },
  ],
  id: [
    { kind: 'LEAGUE', title: 'NBA Playoffs 2026',       sub: 'Bracket · Ronde 1',        meta: 'LIVE',        path: '/nba-playoff-2026',                iconSport: 'NBA' },
    { kind: 'LEAGUE', title: 'Liga Inggris 2025-26',    sub: '20 klub · Pekan ke-34',    meta: 'LIVE',        path: '/premier-league-2025-26',          iconSport: 'Football' },
    { kind: 'LEAGUE', title: 'Formula 1 2026',          sub: 'Kalender 23 GP',           meta: 'LIVE',        path: '/formula-1-2026',                  iconSport: 'F1' },
    { kind: 'LEAGUE', title: 'Tenis 2026',              sub: 'ATP · WTA',                meta: 'LIVE',        path: '/tennis',                          iconSport: 'Tennis' },
    { kind: 'LEAGUE', title: 'Piala Dunia FIFA 2026',   sub: '11 Jun – 19 Jul',          meta: 'SOON',        path: '/fifa-world-cup-2026',             iconSport: 'WorldCup' },
    { kind: 'PAGE',   title: 'Catatan Playoff',         sub: 'Recap harian',             meta: 'FEATURE',     path: '/recap' },
    { kind: 'PAGE',   title: 'Glosarium',               sub: 'Istilah basket + bola',    meta: 'FEATURE',     path: '/glossary' },
  ],
};

function buildCatalogue() {
  // v0.11.22 GIB-006 — catalogue expanded from NBA-only to all four
  // sport hubs (NBA + EPL + F1 + Tennis). Phase 3 spec promised
  // "20 EPL clubs, top F1 drivers + constructors, top tennis
  // tournaments, NBA teams" — we were shipping NBA only. Now full.
  const list = [];

  // NBA teams — every abbr maps to a per-team SEO page
  const NBA_TEAMS = [
    ['Boston Celtics',     'boston-celtics',     'BOS', '#007A33'],
    ['Denver Nuggets',     'denver-nuggets',     'DEN', '#0E2240'],
    ['Oklahoma City Thunder','oklahoma-city-thunder','OKC', '#007AC1'],
    ['Los Angeles Lakers', 'los-angeles-lakers', 'LAL', '#552583'],
    ['Milwaukee Bucks',    'milwaukee-bucks',    'MIL', '#00471B'],
    ['New York Knicks',    'new-york-knicks',    'NYK', '#006BB6'],
    ['Philadelphia 76ers', 'philadelphia-76ers', 'PHI', '#006BB6'],
    ['Cleveland Cavaliers','cleveland-cavaliers','CLE', '#860038'],
    ['Miami Heat',         'miami-heat',         'MIA', '#98002E'],
    ['Orlando Magic',      'orlando-magic',      'ORL', '#0077C0'],
    ['Indiana Pacers',     'indiana-pacers',     'IND', '#FDBB30'],
    ['Minnesota Timberwolves','minnesota-timberwolves','MIN','#0C2340'],
    ['Phoenix Suns',       'phoenix-suns',       'PHX', '#1D1160'],
    ['New Orleans Pelicans','new-orleans-pelicans','NOP', '#0C2340'],
    ['Sacramento Kings',   'sacramento-kings',   'SAC', '#5A2D81'],
    ['Los Angeles Clippers','los-angeles-clippers','LAC','#C8102E'],
  ];
  for (const [name, slug, short, color] of NBA_TEAMS) {
    list.push({
      kind: 'TEAM',
      title: name, sub: 'NBA',
      short, color,
      path: `/nba-playoff-2026/${slug}`,
    });
  }

  // EPL clubs — pulled from the canonical clubs.js so the list stays
  // in sync with the sport-specific dashboards. Per-club SEO page is
  // /premier-league-2025-26/club/{slug}.
  for (const c of CLUBS) {
    list.push({
      kind: 'TEAM',
      title: c.name,
      sub: 'Premier League',
      short: c.polyAbbr ? c.polyAbbr.toUpperCase() : c.name.slice(0, 3).toUpperCase(),
      color: c.accent,
      path: `/premier-league-2025-26/club/${c.slug}`,
    });
  }

  // F1 constructors + drivers — both kinds promote into Player / Team
  // result groups. Driver path uses the per-driver SEO page.
  for (const t of F1_TEAMS) {
    list.push({
      kind: 'TEAM',
      title: t.name,
      sub: 'Formula 1 · Constructor',
      short: (t.short || t.name).slice(0, 3).toUpperCase(),
      color: t.accent,
      path: `/formula-1-2026/team/${t.slug}`,
    });
  }
  for (const d of DRIVERS_2026) {
    list.push({
      kind: 'PLAYER',
      title: d.name,
      sub: 'F1 · Driver',
      short: d.code,
      color: undefined,
      path: `/formula-1-2026/driver/${d.slug}`,
    });
  }

  // Tennis stars — links land on /tennis with player param so the
  // hub's picker reflects on arrival (per v0.11.8 useQueryParamSync).
  for (const slug of Object.keys(TENNIS_STARS_BY_SLUG)) {
    const p = TENNIS_STARS_BY_SLUG[slug];
    list.push({
      kind: 'PLAYER',
      title: p.name,
      sub: `${p.tour?.toUpperCase() || 'Tennis'}${p.ccode ? ` · ${p.ccode}` : ''}`,
      short: p.ccode || (p.short || '').slice(0, 3).toUpperCase(),
      color: p.accent,
      path: `/tennis?player=${slug}`,
    });
  }

  return list;
}

function classifyRow(row) {
  // Visual icon based on kind/sport
  if (row.short && row.color) {
    return <Crest short={row.short} color={row.color} size={18} />;
  }
  if (row.iconSport) {
    return <Icon name={row.iconSport} size={14} color="var(--ink-2)" />;
  }
  return <Icon name="Bookmark" size={14} color="var(--ink-3)" />;
}

// v0.11.26 NEW-7 — score-based ranking. Audit found "VER" returned 27
// noisy substring matches (Denver Nuggets, Everton, Liverpool,
// Wolverhampton, all 22 F1 drivers) with Verstappen lurking mid-list.
// Now: exact short-code match → 1.0, title-prefix → 0.7, token-prefix
// → 0.5, substring → 0.25. Stable-sort, slice top 8 by default.
function scoreRow(r, needle) {
  const title = (r.title || '').toLowerCase();
  const sub = (r.sub || '').toLowerCase();
  const short = (r.short || '').toLowerCase();
  // 1.0 — exact short-code match (e.g. "VER" → Verstappen, "LAL" → Lakers)
  if (short && short === needle) return 1.0;
  // 0.85 — short-code prefix (handles 2-letter typing toward a 3-letter code)
  if (short && short.startsWith(needle)) return 0.85;
  // 0.7 — title starts with the query (e.g. "Liver" → Liverpool first)
  if (title.startsWith(needle)) return 0.7;
  // 0.5 — any token in the title starts with the query
  //       (e.g. "Cup" matches "World Cup", "FIFA Cup" but not "buyback")
  const tokens = title.split(/\s+/);
  for (const tok of tokens) {
    if (tok.startsWith(needle)) return 0.5;
  }
  // 0.4 — title contains the query as a substring (broad)
  if (title.includes(needle)) return 0.4;
  // 0.3 — sub line starts with the query
  if (sub.startsWith(needle)) return 0.3;
  // 0.25 — sub line contains the query
  if (sub.includes(needle)) return 0.25;
  return 0;
}

function filterRows(rows, q, lang = 'en') {
  if (!q) return [];
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return [];
  // Filter + score in one pass; preserve original order as tie-breaker.
  const scored = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const s = scoreRow(r, needle);
    if (s > 0) scored.push({ r, s, i });
  }
  // Stable sort by score desc, then original index asc.
  scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
  return scored.map((x) => x.r);
}

function groupByKind(rows) {
  // v0.11.26 NEW-7 — preserve the score-ranked order from filterRows().
  // Previously a fixed kind-priority array (TEAM > PLAYER > LEAGUE >
  // PAGE) collapsed every search result into kind buckets in that
  // order, so a high-scored PLAYER (Verstappen, 1.0 from exact short-
  // code match on "VER") was buried below low-scored TEAM substring
  // hits (Denver / Everton / Liverpool / Wolverhampton at 0.4 each).
  // Now the input order — which is the score-ranked order — is
  // preserved; groups appear in the order their best member appeared.
  const labels = {
    TEAM: 'Teams',
    MATCH: 'Matches',
    PLAYER: 'Players',
    LEAGUE: 'Leagues',
    PAGE: 'Pages',
  };
  const groupOrder = []; // first-seen order of kinds
  const buckets = {};
  for (const r of rows) {
    if (!buckets[r.kind]) {
      buckets[r.kind] = [];
      groupOrder.push(r.kind);
    }
    buckets[r.kind].push(r);
  }
  return groupOrder.map((k) => ({ kind: k, label: labels[k] || k, rows: buckets[k] }));
}

export default function SearchPalette({ onClose }) {
  const { lang } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // v0.11.26 — TRENDING + buildCatalogue depend on lang for the
  // localized strings introduced by the audit. Re-memo on lang flip.
  const trending = useMemo(() => TRENDING_BY_LANG[lang] || TRENDING_BY_LANG.en, [lang]);
  const catalogue = useMemo(() => [...trending, ...buildCatalogue()], [trending]);
  const results = useMemo(() => {
    // v0.11.26 NEW-7 — when there is an active query, slice 8 (audit's
    // recommended cap to avoid choice paralysis on noisy matches like
    // "VER"). Trending list keeps the full 7-row default.
    const base = q ? filterRows(catalogue, q, lang) : trending;
    return base.slice(0, q ? 8 : 30);
  }, [catalogue, q, trending, lang]);
  const groups = useMemo(() => (q ? groupByKind(results) : [{ kind: 'TRENDING', label: lang === 'id' ? 'Sedang populer' : 'Trending now', rows: results }]), [q, results, lang]);

  // Flatten for keyboard index
  const flatRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset index when query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  // Keyboard handling
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatRows.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        const row = flatRows[activeIdx];
        if (!row) return;
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          window.open(row.path, '_blank', 'noopener,noreferrer');
        } else {
          navigate(row.path);
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, flatRows, navigate, onClose]);

  // Close on backdrop click
  function onBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'id' ? 'Pencarian' : 'Search'}
      onClick={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,22,40,0.72)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div
        style={{
          width: 640,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'min(520px, calc(100vh - 160px))',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          boxShadow: '0 24px 64px rgba(0,0,0,.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <Icon name="Search" size={16} color="var(--ink-3)" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'id' ? 'Cari tim, laga, pemain, liga…' : 'Search teams, matches, players, leagues…'}
            aria-label={lang === 'id' ? 'Pencarian' : 'Search'}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              font: '500 15px "Inter Tight", sans-serif',
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={lang === 'id' ? 'Hapus pencarian' : 'Clear'}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 3,
                color: 'var(--ink-3)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              ×
            </button>
          )}
          <span
            className="mono"
            style={{
              fontSize: 9,
              padding: '3px 6px',
              border: '1px solid var(--line)',
              borderRadius: 3,
              color: 'var(--ink-3)',
            }}
          >
            esc
          </span>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* v0.11.22 GIB-022 — empty-state hint banner. Shown above
              Trending when the query box is empty so users see "what
              can I search for?" at a glance. The audit's Diandra
              persona never gets to "LAL" because the modal opened
              looked sparse. This row makes the affordance explicit. */}
          {!q && (
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--line-soft)',
                fontSize: 11,
                color: 'var(--ink-3)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>
                {lang === 'id' ? 'Coba: ' : 'Try: '}
              </span>
              <span>Lakers · OKC · Arsenal · Verstappen · Alcaraz · Sinner</span>
            </div>
          )}

          {flatRows.length === 0 && q && (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  padding: 14,
                  borderRadius: '50%',
                  background: 'var(--bg-3)',
                  color: 'var(--ink-3)',
                }}
              >
                <Icon name="Search" size={20} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {lang === 'id' ? `Tidak ada hasil untuk "${q}"` : `No matches for "${q}"`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', maxWidth: 360, lineHeight: 1.5 }}>
                {lang === 'id'
                  ? 'Coba nama tim (misalnya Arsenal), pemain, atau liga.'
                  : 'Try a team name (e.g. Arsenal), a player, or a league.'}
              </div>
            </div>
          )}

          {flatRows.length > 0 &&
            groups.map((g) => {
              let idxBase = 0;
              for (const gg of groups) {
                if (gg === g) break;
                idxBase += gg.rows.length;
              }
              return (
                <div key={g.kind}>
                  <div
                    style={{
                      padding: '10px 16px 4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--ink-3)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {g.label}
                    </span>
                    {q && (
                      <span
                        className="mono"
                        style={{ fontSize: 9, color: 'var(--ink-4)' }}
                      >
                        {g.rows.length}
                      </span>
                    )}
                  </div>
                  {g.rows.map((r, i) => {
                    const globalIdx = idxBase + i;
                    const active = globalIdx === activeIdx;
                    return (
                      <button
                        key={`${g.kind}-${r.path}-${i}`}
                        type="button"
                        onClick={() => {
                          navigate(r.path);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '9px 16px',
                          background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
                          borderLeft: `2px solid ${active ? 'var(--amber)' : 'transparent'}`,
                          width: '100%',
                          border: 0,
                          borderRight: 0,
                          borderTop: 0,
                          borderBottom: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: r.short && r.color ? 'transparent' : 'var(--bg-3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ink-2)',
                          }}
                        >
                          {classifyRow(r)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                            {r.title}
                            {r.sub && (
                              <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · {r.sub}</span>
                            )}
                          </div>
                          {r.meta && (
                            <div
                              className="mono"
                              style={{
                                fontSize: 9,
                                color: 'var(--ink-3)',
                                marginTop: 2,
                                letterSpacing: '0.06em',
                              }}
                            >
                              {r.meta}
                            </div>
                          )}
                        </div>
                        <span
                          className="mono"
                          style={{
                            fontSize: 9,
                            color: 'var(--ink-4)',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {r.kind}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {/* Footer — keyboard hints */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--line-soft)',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            fontSize: 10,
            color: 'var(--ink-3)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> {lang === 'id' ? 'navigasi' : 'navigate'}
          </span>
          <span>
            <Kbd>↩</Kbd> {lang === 'id' ? 'buka' : 'open'}
          </span>
          <span>
            <Kbd>⌘↩</Kbd> {lang === 'id' ? 'tab baru' : 'new tab'}
          </span>
          <span>
            <Kbd>esc</Kbd> {lang === 'id' ? 'tutup' : 'close'}
          </span>
          <span style={{ marginLeft: 'auto' }} className="mono">
            gibol · search
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        padding: '2px 5px',
        border: '1px solid var(--line)',
        borderRadius: 3,
        color: 'var(--ink-2)',
        background: 'var(--bg-3)',
      }}
    >
      {children}
    </span>
  );
}
