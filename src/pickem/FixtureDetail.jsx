import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import FixtureCard from './components/FixtureCard.jsx';
import {
  saveGuestPrediction,
  getGuestPrediction,
} from './guestStore.js';
import { listFixtures, upsertPrediction } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';

// ============================================================================
// v0.67.0 — Fixture Detail (Pick'em P2).
//
// Per-fixture deep-link surface: /pickem/fixture/:id. Same FixtureCard as
// the hub, plus an inline H2H / form-stripe slot (placeholders for P2;
// real data lands in P3 once the historical-results join exists).
//
// Loads the fixture via the same list-fixtures endpoint (single-row
// filter would need a new dispatcher action — for v1 we fetch the full
// hub list and pluck by id, which is fine at the WC2026 scale of <100
// rows). Future optimization: add ?_action=get-fixture&id=... so a
// deep-link doesn't pull the whole hub.
// ============================================================================

const COMPETITION = 'WC2026';
const SEASON = '2026';

export default function FixtureDetail() {
  return (
    <AuthProvider>
      <FixtureDetailInner />
    </AuthProvider>
  );
}

function FixtureDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fixture, setFixture] = useState(null);
  const [prediction, setPrediction] = useState(() => getGuestPrediction(id));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schemaReady, setSchemaReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listFixtures({ league: COMPETITION, season: SEASON });
      if (cancelled) return;
      setSchemaReady(res.schemaReady !== false);
      if (!res.ok) {
        setError(res.error);
      } else {
        const match = (res.fixtures || []).find((f) => f.id === id);
        setFixture(match || null);
        setError(match ? null : 'fixture not found');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePredictionChange = useCallback(
    async (fx, partial) => {
      const current = prediction || {};
      const next = { ...current, ...partial };
      if (!next.picked_outcome) {
        const local = saveGuestPrediction({
          fixture_id: fx.id,
          league:     fx.league,
          matchday:   fx.matchday,
          ...next,
        });
        setPrediction(local);
        return;
      }
      const payload = {
        fixture_id:     fx.id,
        league:         fx.league,
        matchday:       fx.matchday,
        picked_outcome: next.picked_outcome,
        picked_home:    next.picked_home ?? null,
        picked_away:    next.picked_away ?? null,
        is_jagoan:      next.is_jagoan === true,
      };
      if (user) {
        const res = await upsertPrediction(payload);
        if (res.ok && res.prediction) setPrediction(res.prediction);
      } else {
        const local = saveGuestPrediction(payload);
        setPrediction(local);
      }
    },
    [prediction, user],
  );

  const hydrated = useMemo(() => {
    if (!fixture) return null;
    return {
      home: hydrateTeam(fixture, 'home'),
      away: hydrateTeam(fixture, 'away'),
    };
  }, [fixture]);

  return (
    <PickemRoot active="predict">
      <div style={{ padding: '12px 16px 32px', maxWidth: 640, margin: '0 auto' }}>
        <BackButton onClick={() => navigate('/pickem')} />

        {loading && (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 13,
            }}
          >
            Memuat pertandingan…
          </div>
        )}

        {!loading && !schemaReady && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              background: 'var(--bg-raised)',
              border: '1px dashed var(--line-2)',
              borderRadius: 'var(--r-3)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            <div className="p-eyebrow" style={{ marginBottom: 6 }}>SEDANG DISIAPKAN</div>
            <div style={{ fontWeight: 600 }}>Backend belum aktif untuk Pick&apos;em.</div>
          </div>
        )}

        {!loading && schemaReady && !fixture && (
          <div
            style={{
              padding: '32px 16px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-3)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            <div className="p-eyebrow" style={{ marginBottom: 6 }}>404</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Pertandingannya nggak ketemu</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              ID: <span className="g-mono" style={{ fontFamily: 'var(--font-mono)' }}>{id}</span>
            </div>
          </div>
        )}

        {fixture && hydrated && (
          <>
            <div style={{ marginBottom: 16 }}>
              <FixtureCard
                fixture={fixture}
                homeTeam={hydrated.home}
                awayTeam={hydrated.away}
                prediction={prediction}
                onPredictionChange={(partial) => handlePredictionChange(fixture, partial)}
              />
            </div>

            <HistoricalPlaceholder fixture={fixture} />
          </>
        )}

        {error && schemaReady && fixture && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 'var(--r-2)',
              background: 'var(--p-down-wash)',
              color: 'var(--p-down)',
              fontSize: 13,
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </PickemRoot>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Kembali ke daftar prediksi"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px 8px 10px',
        marginBottom: 16,
        background: 'transparent',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r-pill)',
        color: 'var(--ink-2)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui-pickem)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18 9 12l6-6" />
      </svg>
      Kembali
    </button>
  );
}

function HistoricalPlaceholder({ fixture }) {
  // Form + H2H stripe lands in P3 once the historical-results join is
  // wired. For P2 the slot exists so the screen feels finished and the
  // layout doesn't shift when the data fills in.
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-3)',
        padding: 14,
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div className="p-eyebrow" style={{ marginBottom: 6 }}>FORM &amp; H2H</div>
      <div style={{ fontSize: 13 }}>
        Riwayat pertemuan + 5 laga terakhir kedua tim akan muncul di sini.
      </div>
    </div>
  );
}

function hydrateTeam(fixture, side) {
  const embedded = side === 'home' ? fixture.home : fixture.away;
  if (embedded && (embedded.name || embedded.code)) {
    return {
      name: embedded.name || 'TBA',
      short: embedded.short || embedded.abbr || embedded.code || 'TBA',
      code: (embedded.country_code || embedded.code || 'IDN').toUpperCase().slice(0, 3),
    };
  }
  const uuid = side === 'home' ? fixture.home_team : fixture.away_team;
  const short = uuid ? `T${String(uuid).slice(0, 3).toUpperCase()}` : 'TBA';
  return { name: 'TBA', short, code: 'IDN' };
}
