/**
 * /skor — Skor tab v1 · R2 screen 5 (v0.83.0).
 *
 * Live scores, but with stakes: every tile carries YOUR pick status, which
 * is the whole difference between this and any other scoreboard. Faithful
 * to #t4 — title + live count, sport filter pills, live tiles with the
 * 4px sport left border, a finished list with +pts / 0 pills, and upcoming
 * rows that link into the pick sheet.
 *
 * v1 scope per 13 §2: this reads the existing Pick'em fixtures the cron
 * already keeps fresh. Migrating the full multi-sport hubs onto this
 * surface is R4 (Phase B, when hubs move to skor.gibol.co).
 *
 * "pickmu unggul / tertinggal" is computed against the live score rather
 * than the final outcome, so it updates as the match moves — that's the
 * bit that makes people keep the tab open.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFixtures, listPredictions } from './api.js';
import { listGuestPredictions } from './guestStore.js';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { LiveTile } from './components/primitives4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import SideRail4a from './components/SideRail4a.jsx';
import { IconLiveDot } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

const POLL_MS = 60_000;

/**
 * Which competitions the board should poll: those whose window is open, or
 * closed within the last week so yesterday's results still show.
 *
 * Polling everything in the registry meant fetching EPL's 380 seeded
 * fixtures every minute months before kickoff — slow, and pure waste.
 */
function boardCompetitions(nowMs = Date.now()) {
  const GRACE = 7 * 86400 * 1000;
  const keys = Object.keys(COMPETITIONS).filter((k) => {
    const c = COMPETITIONS[k];
    const opens = c.openAt ? new Date(c.openAt).getTime() : -Infinity;
    const closes = c.closeAt ? new Date(c.closeAt).getTime() : Infinity;
    return nowMs >= opens && nowMs <= closes + GRACE;
  });
  // Never render an empty board just because every window has lapsed.
  return keys.length ? keys : Object.keys(COMPETITIONS);
}

export default function SkorTab() {
  return (
    <AuthProvider>
      <SkorTabInner />
    </AuthProvider>
  );
}

function SkorTabInner() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const [rows, setRows] = useState([]);
  const [predictions, setPredictions] = useState(new Map());
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fixtures across every board competition, refreshed on a poll so a live
  // score moves without a manual reload.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Parallel, not sequential: four chained round-trips left the board
        // on "Loading scores…" for seconds at a time.
        const results = await Promise.all(
          boardCompetitions().map((key) => listFixtures({ league: key, limit: 500 }))
        );
        if (cancelled) return;
        setRows(results.flatMap((r) => r?.fixtures || []));
      } finally {
        // Always clear the spinner — an early return here previously left
        // the board loading forever if one request failed.
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // My picks, keyed by fixture — server when signed in, device otherwise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = new Map();
      if (user) {
        const results = await Promise.all(
          boardCompetitions().map((key) => listPredictions({ competition: key, limit: 500 }))
        );
        if (cancelled) return;
        for (const res of results) {
          for (const p of res?.predictions || []) map.set(p.fixture_id, p);
        }
      } else {
        for (const p of listGuestPredictions()) map.set(p.fixture_id, p);
      }
      if (!cancelled) setPredictions(map);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((f) => {
      const comp = COMPETITIONS[f.league];
      return skinForCompetition(f.league, comp).key === filter;
    });
  }, [rows, filter]);

  const live = filtered.filter((f) => f.status === 'live');
  const finished = filtered
    .filter((f) => f.status === 'final')
    .sort((a, b) => new Date(b.kickoff_at) - new Date(a.kickoff_at))
    .slice(0, 8);
  const upcoming = filtered
    .filter((f) => f.status === 'scheduled' && new Date(f.kickoff_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
    .slice(0, 6);

  // Which sport pills to offer — only sports actually on the board.
  const sportsPresent = useMemo(() => {
    const set = new Map();
    for (const f of rows) {
      const s = skinForCompetition(f.league, COMPETITIONS[f.league]);
      set.set(s.key, s);
    }
    return [...set.values()];
  }, [rows]);

  return (
    <div className="g4-shell g4-has-rail" style={S.shell}>
      <SEO title="Skor — live | gibol.co" description="Skor live dengan status pickmu." noindex />

      <header style={S.header}>
        <h1 style={S.title}>{tx('Scores', 'Skor')}</h1>
        {live.length > 0 && (
          <span style={S.liveCount}>
            <IconLiveDot size={7} /> {live.length} live
          </span>
        )}
      </header>

      {sportsPresent.length > 1 && (
        <div style={S.pills}>
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
            {tx('All', 'Semua')}
          </Pill>
          {sportsPresent.map((s) => (
            <Pill key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
              {s.label}
            </Pill>
          ))}
        </div>
      )}

      <div className="g4-body" style={S.body}>
        {loading && <p style={S.muted}>{tx('Loading scores…', 'Memuat skor…')}</p>}

        {!loading && live.length === 0 && finished.length === 0 && upcoming.length === 0 && (
          <p style={S.muted}>{tx('Nothing on the board right now.', 'Belum ada yang tayang sekarang.')}</p>
        )}

        {live.length > 0 && (
          <>
            <SectionLabel accent>{tx('LIVE NOW', 'LIVE SEKARANG')}</SectionLabel>
            {live.map((f) => (
              <ScoreTile key={f.id} fixture={f} prediction={predictions.get(f.id)} lang={lang} live />
            ))}
          </>
        )}

        {finished.length > 0 && (
          <>
            <SectionLabel>{tx('FINISHED', 'SELESAI')}</SectionLabel>
            {finished.map((f) => {
              const p = predictions.get(f.id);
              const correct = p && f.outcome && p.picked_outcome === f.outcome;
              return (
                <div key={f.id} style={S.finishedRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.finishedMeta}>
                      {COMPETITIONS[f.league]?.label || f.league} · {tx('FT', 'FT')}
                    </div>
                    <div style={S.finishedScore}>
                      {f.home_team} {f.home_score}–{f.away_score} {f.away_team}
                    </div>
                  </div>
                  {p ? (
                    <span
                      style={{
                        ...S.ptsPill,
                        background: correct ? 'var(--g4-win)' : 'var(--g4-lose-bg)',
                        color: correct ? '#fff' : 'var(--g4-lose)',
                      }}
                    >
                      {p.awarded_points != null ? (correct ? `+${p.awarded_points}` : '0') : (correct ? '✓' : '0')}
                    </span>
                  ) : (
                    <span style={S.noPick}>{tx('no pick', 'gak pick')}</span>
                  )}
                </div>
              );
            })}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionLabel>{tx('UPCOMING', 'BERIKUTNYA')}</SectionLabel>
            {upcoming.map((f) => {
              const picked = predictions.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => navigate(`/pick/${f.id}?league=${encodeURIComponent(f.league)}`)}
                  style={S.upcomingRow}
                >
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <span style={S.finishedMeta}>
                      {COMPETITIONS[f.league]?.label || f.league} ·{' '}
                      {new Date(f.kickoff_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
                        weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
                      })}{' '}
                      WIB
                    </span>
                    <span style={S.finishedScore}>
                      {f.home_team} vs {f.away_team}
                    </span>
                  </span>
                  <span style={{ ...S.linkPill, color: picked ? 'var(--g4-win)' : 'var(--g4-cobalt)' }}>
                    {picked ? tx('picked ✓', 'udah pick ✓') : tx('pick →', 'pick →')}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <SideRail4a lang={lang} />
      <TabBar4a active="skor" lang={lang} />
    </div>
  );
}

/** A live tile with the personal pick status strip. */
function ScoreTile({ fixture: f, prediction, lang, live }) {
  const tx = (en, id) => (lang === 'id' ? id : en);
  const skin = skinForCompetition(f.league, COMPETITIONS[f.league]);

  // Ahead/behind is judged against the CURRENT score, not the final
  // outcome, so the strip moves with the match.
  let pickStatus = null;
  let pickStatusLabel = null;
  if (prediction && f.home_score != null && f.away_score != null) {
    const leading = f.home_score > f.away_score ? 'H' : f.home_score < f.away_score ? 'A' : 'D';
    const winning = prediction.picked_outcome === leading;
    pickStatus = winning ? 'ahead' : 'behind';
    pickStatusLabel = winning
      ? tx('your pick is ahead ✓', 'pickmu unggul ✓')
      : tx('your pick is behind', 'pickmu tertinggal');
  }

  return (
    <LiveTile
      skin={skin}
      live={live}
      statusLabel={`${COMPETITIONS[f.league]?.label || f.league} · ${f.stage === 'regular' ? `MD${f.matchday}` : f.stage}`}
      homeTeam={f.home_team}
      awayTeam={f.away_team}
      homeScore={f.home_score ?? 0}
      awayScore={f.away_score ?? 0}
      pickStatus={pickStatus}
      pickStatusLabel={pickStatusLabel}
      style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
    />
  );
}

function SectionLabel({ children, accent }) {
  return (
    <div
      style={{
        font: '700 10px/1 var(--g4-font-ui)',
        letterSpacing: '0.5px',
        color: accent ? 'var(--g4-accent)' : 'var(--g4-text-muted)',
        margin: '6px 0 2px',
      }}
    >
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        border: active ? '1.5px solid transparent' : '1.5px solid var(--g4-text)',
        background: active ? 'var(--g4-ink-block)' : 'transparent',
        color: active ? 'var(--g4-paper)' : 'var(--g4-text)',
        font: '700 11px/1 var(--g4-font-ui)',
        padding: '6px 12px',
        borderRadius: 'var(--g4-radius-pill)',
        cursor: 'pointer',
        flex: 'none',
      }}
    >
      {children}
    </button>
  );
}

const S = {
  shell: {
    minHeight: '100dvh',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)',
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 96,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '20px var(--g4-gutter) 8px',
    borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)',
    margin: '0 var(--g4-gutter)',
    paddingLeft: 0,
    paddingRight: 0,
  },
  title: {
    font: '800 22px/1.1 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    margin: 0,
  },
  liveCount: {
    font: '700 10px/1 var(--g4-font-ui)',
    color: 'var(--g4-accent)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  pills: {
    display: 'flex',
    gap: 6,
    padding: '12px var(--g4-gutter)',
    overflowX: 'auto',
  },
  body: { padding: '0 var(--g4-gutter)' },
  finishedRow: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card-sm)',
    padding: '11px var(--g4-pad-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 'var(--g4-gap-card-sm)',
  },
  upcomingRow: {
    appearance: 'none',
    width: '100%',
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card-sm)',
    padding: '11px var(--g4-pad-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 'var(--g4-gap-card-sm)',
    cursor: 'pointer',
    boxSizing: 'border-box',
    color: 'var(--g4-text)',
  },
  finishedMeta: {
    display: 'block',
    font: '600 9px/1.2 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
  },
  finishedScore: {
    display: 'block',
    font: '700 13px/1.3 var(--g4-font-ui)',
    marginTop: 2,
  },
  ptsPill: {
    font: '700 11px/1 var(--g4-font-ui)',
    padding: '5px 10px',
    borderRadius: 'var(--g4-radius-pill)',
    flex: 'none',
  },
  noPick: {
    font: '600 10px/1 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    flex: 'none',
  },
  linkPill: { font: '700 11px/1 var(--g4-font-ui)', flex: 'none' },
  muted: {
    font: '500 13px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    padding: '30px 0',
    textAlign: 'center',
  },
};
