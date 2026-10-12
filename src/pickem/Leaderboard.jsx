import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { LeaderboardRow, SegmentedPicker, EmptyState, PickemBtn } from './components/social.jsx';
import { listLeaderboard, listMyGrups } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { usePickemCompetition } from './useCompetition.jsx';

// ============================================================================
// v0.68.0 — Leaderboard screen (Pick'em P3).
//
// /pickem/board — three scopes:
//   global     leaderboard_competition (default; everyone in WC2026)
//   grup       leaderboard_league      (?grup=<league_id>; picks your
//              first grup if no param)
//   matchday   leaderboard_matchday    (?matchday=<n>; default = latest)
//
// Sticky "you" row at the bottom — uses the `around=user_id` window of
// the list-leaderboard endpoint (±10 rows centered on the user) so a
// user ranked #847 doesn't have to scroll for them to see themselves.
//
// Graceful states for: schema-not-applied (migration 0015 pending),
// empty (no scored predictions yet), and not-in-any-grup.
// ============================================================================

// v0.79.1 — COMPETITION now reads from usePickemCompetition() at render time.
const SCOPES = [
  { k: 'competition', l: 'Global' },
  { k: 'league',      l: 'Grup' },
  { k: 'matchday',    l: 'Matchday' },
];
const PAGE_LIMIT = 50;

export default function Leaderboard() {
  return (
    <AuthProvider>
      <LeaderboardInner />
    </AuthProvider>
  );
}

function LeaderboardInner() {
  const { user } = useAuth();
  const { competition } = usePickemCompetition();
  const COMPETITION = competition.key;
  const [params, setParams] = useSearchParams();
  const initialScope = params.get('scope') || 'competition';
  const initialGrupId = params.get('grup') || null;
  const initialMatchday = params.get('matchday') ? Number(params.get('matchday')) : null;

  const [scope, setScope] = useState(SCOPES.find((s) => s.k === initialScope)?.k || 'competition');
  const [grupId, setGrupId] = useState(initialGrupId);
  const [matchday, setMatchday] = useState(initialMatchday);
  const [matchdayChoices, setMatchdayChoices] = useState([1]);

  const [rows, setRows] = useState([]);
  const [meWindow, setMeWindow] = useState([]);
  const [meRank, setMeRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myGrups, setMyGrups] = useState([]);

  // Keep URL in sync with current state for shareable deep-links.
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('scope', scope);
    if (scope === 'league' && grupId) next.set('grup', grupId);
    if (scope === 'matchday' && matchday != null) next.set('matchday', String(matchday));
    setParams(next, { replace: true });
  }, [scope, grupId, matchday, setParams]);

  // Load the user's grups so the Grup scope picker knows what to render.
  // Re-fetches when the user switches competitions.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await listMyGrups(COMPETITION);
      if (res.ok) {
        setMyGrups(res.grups || []);
        if (!grupId && res.grups?.length) setGrupId(res.grups[0].id);
      }
    })();
  }, [user, COMPETITION]);

  // Main fetch — switches by scope.
  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = scopeParams({ scope, grupId, matchday, competition: COMPETITION });
    if (params._invalid) {
      setRows([]);
      setLoading(false);
      return;
    }

    const top = await listLeaderboard({ ...params, limit: PAGE_LIMIT });
    if (!top.ok) {
      setRows([]);
      setError(top.error);
      setLoading(false);
      return;
    }
    setRows(top.rows || []);

    // If the user is below the top page, fetch the ±10 window around them.
    let around = [];
    let myRank = null;
    if (user?.id && top.rows && !top.rows.find((r) => r.user_id === user.id)) {
      const win = await listLeaderboard({ ...params, around: user.id });
      around = win.rows || [];
      myRank = around.find((r) => r.user_id === user.id)?.rank ?? null;
    } else if (user?.id && top.rows) {
      myRank = top.rows.find((r) => r.user_id === user.id)?.rank ?? null;
    }
    setMeWindow(around);
    setMeRank(myRank);
    setLoading(false);
  }, [scope, grupId, matchday, user?.id, COMPETITION]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return (
    <PickemRoot active="board">
      <div style={{ padding: '20px 16px 32px', maxWidth: 720, margin: '0 auto' }}>
        <Header scope={scope} competition={competition} />

        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <SegmentedPicker items={SCOPES} active={scope} onChange={setScope} />
          {scope === 'league' && myGrups.length > 0 && (
            <GrupSelect grups={myGrups} value={grupId} onChange={setGrupId} />
          )}
          {scope === 'matchday' && (
            <MatchdaySelect value={matchday} onChange={setMatchday} choices={matchdayChoices} />
          )}
        </div>

        {loading && <LoadingState />}

        {!loading && scope === 'league' && myGrups.length === 0 && (
          <EmptyState
            title="Belum ada grup"
            body="Bikin grup atau gabung pakai kode undangan dulu — leaderboard grup baru hidup ketika kamu punya teman main."
            action={
              <PickemBtn variant="primary" onClick={() => (window.location.href = '/pickem/grup/new')}>
                Bikin grup
              </PickemBtn>
            }
          />
        )}

        {!loading && rows.length === 0 && scope !== 'league' && (
          <EmptyState
            title="Belum ada hasil"
            body="Leaderboard hidup setelah pertandingan pertama selesai dan ada yang prediksi."
          />
        )}

        {!loading && rows.length > 0 && (
          <div
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-3)',
              overflow: 'hidden',
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {rows.map((row) => (
              <LeaderboardRow
                key={`${row.user_id}-${row.rank}`}
                row={row}
                you={user?.id === row.user_id}
                podium={scope !== 'league'}
              />
            ))}
          </div>
        )}

        {meWindow.length > 0 && (
          <YouRow rows={meWindow} userId={user?.id} />
        )}

        {error && rows.length === 0 && (
          <div
            role="alert"
            style={{
              marginTop: 16,
              padding: '10px 12px',
              borderRadius: 'var(--r-2)',
              background: 'var(--p-down-wash)',
              color: 'var(--p-down)',
              fontSize: 13,
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {String(error)}
          </div>
        )}
      </div>
    </PickemRoot>
  );
}

function Header({ scope, competition }) {
  // v0.79.10 — eyebrow + global-scope subtitle were hardcoded to WC2026.
  // Now read from the active competition (NBA Playoffs / WC2026 / …).
  const compLabel = (competition?.labelLong || competition?.label || 'PICK\'EM').toUpperCase();
  const compShort = competition?.label || 'kompetisi ini';
  const label =
    scope === 'competition' ? 'Papan global'
    : scope === 'league'    ? 'Papan grup'
    : 'Papan matchday';
  const sub =
    scope === 'competition' ? `Semua pemain ${compShort}.`
    : scope === 'league'    ? 'Cuma anggota grup yang dipilih.'
    : 'Skor di matchday yang dipilih.';
  return (
    <header style={{ marginBottom: 18 }}>
      <div className="p-eyebrow" style={{ marginBottom: 6 }}>
        PAPAN PERINGKAT · {compLabel}
      </div>
      <h1 className="p-display-sm" style={{ marginBottom: 4, color: 'var(--ink-1)' }}>
        {label}
      </h1>
      <p style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-ui-pickem)', fontSize: 13 }}>
        {sub}
      </p>
    </header>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
      Memuat papan…
    </div>
  );
}

function GrupSelect({ grups, value, onChange }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--ink-3)',
        fontSize: 12,
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <span>Grup</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--bg-raised)',
          color: 'var(--ink-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: '6px 10px',
          fontFamily: 'var(--font-ui-pickem)',
          fontSize: 13,
        }}
      >
        {grups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function MatchdaySelect({ value, onChange, choices = [] }) {
  // Pick'em P3 doesn't yet know how many matchdays exist for the
  // competition — once a /api/pickem?_action=list-matchdays exists it
  // populates `choices`. For now the user types a number or steps it.
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--ink-3)',
        fontSize: 12,
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <span>Matchday</span>
      <input
        type="number"
        min={1}
        value={value || 1}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        style={{
          width: 70,
          background: 'var(--bg-raised)',
          color: 'var(--ink-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  );
}

function YouRow({ rows, userId }) {
  // Render the ±10 window in a separate panel labelled "Posisi kamu" so the
  // user knows it's the window-around-them view, not the top page.
  return (
    <section
      style={{
        position: 'sticky',
        bottom: 12,
        marginTop: 16,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r-3)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-2)',
      }}
    >
      <div
        className="p-eyebrow"
        style={{ padding: '10px 16px 6px', color: 'var(--ink-3)' }}
      >
        POSISI KAMU
      </div>
      {rows.map((row) => (
        <LeaderboardRow
          key={`me-${row.user_id}-${row.rank}`}
          row={row}
          you={row.user_id === userId}
        />
      ))}
    </section>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function scopeParams({ scope, grupId, matchday, competition }) {
  if (scope === 'competition') return { scope, league: competition };
  if (scope === 'league') {
    if (!grupId) return { scope, _invalid: true };
    return { scope, league_id: grupId };
  }
  if (scope === 'matchday') {
    const md = matchday || 1;
    return { scope, league: competition, matchday: md };
  }
  return { scope, _invalid: true };
}
