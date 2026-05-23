import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PickemRoot from './PickemRoot.jsx';
import FixtureCard from './components/FixtureCard.jsx';
import {
  saveGuestPrediction,
  listGuestPredictions,
  claimGuestPredictions,
  hasBeenNudged,
  markNudged,
  getGuestPrediction,
} from './guestStore.js';
import { listFixtures, upsertPrediction } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import HubRightRail from './components/HubRightRail.jsx';

// ============================================================================
// v0.67.0 — Predicting Hub (Pick'em P2 spine).
//
// The first user-visible Pick'em route. Replaces the P0 scaffold landing.
//
// Responsibilities:
//   - List today's + upcoming fixtures grouped by matchday for the active
//     Pick'em competition (default WC2026).
//   - Render every fixture through <FixtureCard /> with the user's current
//     prediction state hydrated.
//   - Save predictions: GUEST → localStorage queue; AUTHENTICATED → POST
//     /api/pickem?_action=upsert-prediction.
//   - Fire the first-run nudge ("Mau ikut peringkat?") AFTER the first
//     save, never blocking. "Lewati dulu" keeps predictions local;
//     "Masuk dengan Google" routes to /login.
//   - On AuthContext.user transitioning from null → set, replay the guest
//     queue via claimGuestPredictions().
//   - Schema-missing graceful path: when /api/pickem returns "table not
//     found" (migration 0015 not yet applied), show a "Tunggu sebentar"
//     state instead of crashing.
//
// Competition / season are hard-coded to WC2026 for v1; future phases let
// the user switch via a SegmentedPicker at the top.
// ============================================================================

const COMPETITION = 'WC2026';
const SEASON = '2026';

export default function PredictingHub() {
  // Match the existing Pickem page convention (Bracket.jsx, League*.jsx):
  // each Pickem page owns its own AuthProvider so the Supabase session
  // subscription doesn't leak to the rest of the SPA.
  return (
    <AuthProvider>
      <PredictingHubInner />
    </AuthProvider>
  );
}

function PredictingHubInner() {
  const { user } = useAuth();
  const [fixtures, setFixtures] = useState([]);
  const [serverPredictions, setServerPredictions] = useState({}); // by fixture_id
  const [guestPredictions, setGuestPredictions] = useState(() => indexByFixture(listGuestPredictions(COMPETITION)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const claimedOnceRef = useRef(false);

  // 1. Fetch fixtures on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listFixtures({ league: COMPETITION, season: SEASON });
      if (cancelled) return;
      setSchemaReady(res.schemaReady !== false);
      if (!res.ok) {
        setError(res.error || 'unknown');
      } else {
        setFixtures(res.fixtures || []);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. On login (or initial-mount-with-session), claim any pending guest
  //    predictions exactly once.
  useEffect(() => {
    if (!user || claimedOnceRef.current) return;
    claimedOnceRef.current = true;
    (async () => {
      const result = await claimGuestPredictions(upsertPrediction);
      // After claim: refresh local guest state (will be empty on full
      // success), and the next fixture refetch will pick up the new
      // server-side predictions. We could fetch /api/pickem?_action=
      // list-predictions next — but we don't have that endpoint yet
      // (deferred), so for v1 the local optimistic state is enough.
      setGuestPredictions(indexByFixture(listGuestPredictions(COMPETITION)));
      if (result.claimed > 0 && typeof window !== 'undefined' && window.gibolToast) {
        window.gibolToast.show({
          text: `${result.claimed} prediksi tersimpan ke akunmu`,
          icon: 'check',
        });
      }
    })();
  }, [user]);

  // 3. Save flow — guest goes to localStorage, authed posts to API.
  const handlePredictionChange = useCallback(
    async (fixture, partial) => {
      // Merge with the current draft (server or guest) so we always send
      // a complete (outcome + optional scores + jagoan) payload.
      const current =
        serverPredictions[fixture.id] || guestPredictions[fixture.id] || {};
      const next = { ...current, ...partial };
      // Don't fire the API on a half-built draft (outcome required).
      if (!next.picked_outcome) {
        // Still persist the partial locally so the UI doesn't snap back.
        const localPartial = saveGuestPrediction({
          fixture_id: fixture.id,
          league:     fixture.league,
          matchday:   fixture.matchday,
          ...next,
        });
        setGuestPredictions((m) => ({ ...m, [fixture.id]: localPartial }));
        return;
      }

      const payload = {
        fixture_id:     fixture.id,
        league:         fixture.league,
        matchday:       fixture.matchday,
        picked_outcome: next.picked_outcome,
        picked_home:    next.picked_home ?? null,
        picked_away:    next.picked_away ?? null,
        is_jagoan:      next.is_jagoan === true,
      };

      if (user) {
        // Optimistic: write a server-side prediction shape locally first.
        setServerPredictions((m) => ({
          ...m,
          [fixture.id]: { ...current, ...payload, user_id: user.id, scored_at: null },
        }));
        const res = await upsertPrediction(payload);
        if (res.ok && res.prediction) {
          setServerPredictions((m) => ({ ...m, [fixture.id]: res.prediction }));
        } else {
          // Roll back optimistic write on failure; surface the error in a toast.
          setServerPredictions((m) => {
            const copy = { ...m };
            delete copy[fixture.id];
            return copy;
          });
          if (typeof window !== 'undefined' && window.gibolToast) {
            window.gibolToast.show({
              kind: 'error',
              text: res.error || 'Gagal menyimpan prediksi',
              icon: 'warn',
            });
          }
        }
      } else {
        const saved = saveGuestPrediction(payload);
        setGuestPredictions((m) => ({ ...m, [fixture.id]: saved }));
        // First-save nudge — fires AFTER the save, framed as upside.
        if (!hasBeenNudged()) {
          markNudged();
          setNudgeVisible(true);
        } else if (typeof window !== 'undefined' && window.gibolToast) {
          window.gibolToast.show({ text: 'Prediksi tersimpan', icon: 'check' });
        }
      }
    },
    [serverPredictions, guestPredictions, user],
  );

  // 4. Group fixtures by matchday.
  const grouped = useMemo(() => groupByMatchday(fixtures), [fixtures]);

  return (
    <PickemRoot active="predict">
      <div
        className="pickem-hub-layout"
        style={{ padding: '20px 16px 32px', maxWidth: 1080, margin: '0 auto' }}
      >
        <div style={{ minWidth: 0 }}>
          <Header user={user} />

          {loading && <LoadingState />}
          {!loading && !schemaReady && <NotReadyState />}
          {!loading && schemaReady && fixtures.length === 0 && <EmptyState />}
          {!loading && schemaReady && fixtures.length > 0 && (
            <FixtureGroups
              groups={grouped}
              serverPredictions={serverPredictions}
              guestPredictions={guestPredictions}
              onChange={handlePredictionChange}
            />
          )}

          {error && schemaReady && fixtures.length === 0 && (
            <div
              role="alert"
              style={{
                marginTop: 24,
                padding: '12px 14px',
                borderRadius: 'var(--r-3)',
                background: 'var(--p-down-wash)',
                color: 'var(--p-down)',
                fontFamily: 'var(--font-ui-pickem)',
                fontSize: 13,
              }}
            >
              Gagal memuat jadwal: <span className="g-mono">{String(error)}</span>
            </div>
          )}
        </div>

        {/* Right rail: streak + grup summary + quick links. The
            .pickem-hub-layout CSS collapses this below the main column
            on <1024 widths so the mobile layout is unchanged. */}
        <HubRightRail user={user} />
      </div>

      {nudgeVisible && (
        <FirstRunNudge
          onLogin={() => {
            setNudgeVisible(false);
            const next = encodeURIComponent('/pickem');
            if (typeof window !== 'undefined') window.location.href = `/login?next=${next}`;
          }}
          onSkip={() => setNudgeVisible(false)}
        />
      )}
    </PickemRoot>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Header({ user }) {
  return (
    <header style={{ marginBottom: 18 }}>
      <div className="p-eyebrow" style={{ marginBottom: 6 }}>
        PIALA DUNIA 2026 · GRUP
      </div>
      <h1 className="p-display-sm" style={{ marginBottom: 4, color: 'var(--ink-1)' }}>
        Prediksi hari ini
      </h1>
      <p
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--font-ui-pickem)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {user
          ? `Halo, ${user.email?.split('@')[0] || 'kamu'}. Prediksi kamu langsung tersimpan.`
          : 'Pilih pemenang dulu — login kamu tanya nanti. Prediksi tersimpan di perangkat ini.'}
      </p>
    </header>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        padding: '40px 0',
        textAlign: 'center',
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-ui-pickem)',
        fontSize: 13,
      }}
    >
      Memuat jadwal…
    </div>
  );
}

function EmptyState() {
  return (
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
      <div className="p-eyebrow" style={{ marginBottom: 8 }}>BELUM ADA</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Jadwal belum dirilis</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        Draw resmi FIFA Juni 2026 — fixtures akan muncul di sini begitu publikasi rilis.
      </div>
    </div>
  );
}

function NotReadyState() {
  return (
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
      <div className="p-eyebrow" style={{ marginBottom: 8 }}>SEDANG DISIAPKAN</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Pick&apos;em baru menyala</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        Backend masih provisioning. Pulihkan halaman ini sebentar lagi.
      </div>
    </div>
  );
}

function FixtureGroups({ groups, serverPredictions, guestPredictions, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map((g) => (
        <section key={g.matchday}>
          <div
            className="p-eyebrow"
            style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}
          >
            <span>Matchday {g.matchday}</span>
            <span style={{ color: 'var(--ink-4)' }}>{g.fixtures.length} laga</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.fixtures.map((fx) => (
              <FixtureCard
                key={fx.id}
                fixture={fx}
                homeTeam={hydrateTeam(fx, 'home')}
                awayTeam={hydrateTeam(fx, 'away')}
                prediction={serverPredictions[fx.id] || guestPredictions[fx.id] || null}
                onPredictionChange={(partial) => onChange(fx, partial)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FirstRunNudge({ onLogin, onSkip }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tersimpan — mau ikut peringkat?"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 16, 29, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-4)',
          padding: 20,
          fontFamily: 'var(--font-ui-pickem)',
          color: 'var(--ink-1)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="p-eyebrow" style={{ marginBottom: 8, color: 'var(--pickem-orange)' }}>
          PREDIKSI TERSIMPAN
        </div>
        <div className="p-headline" style={{ marginBottom: 6 }}>
          Mau ikut peringkat?
        </div>
        <p
          style={{
            color: 'var(--ink-2)',
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 18,
          }}
        >
          Masuk biar prediksi kamu kebaca di papan peringkat global dan grup teman. Prediksi
          yang sudah kamu simpan auto-pindah ke akunmu.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={onLogin}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--pickem-orange)',
              color: '#0A1628',
              fontFamily: 'var(--font-ui-pickem)',
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 18px',
              borderRadius: 'var(--r-pill)',
              minHeight: 48,
            }}
          >
            Masuk dengan email
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-ui-pickem)',
              fontWeight: 600,
              fontSize: 14,
              padding: '10px 14px',
            }}
          >
            Lewati dulu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function indexByFixture(rows) {
  const out = {};
  for (const r of rows || []) {
    if (r && r.fixture_id) out[r.fixture_id] = r;
  }
  return out;
}

function groupByMatchday(fixtures) {
  const map = new Map();
  for (const f of fixtures) {
    const md = f.matchday ?? 0;
    if (!map.has(md)) map.set(md, []);
    map.get(md).push(f);
  }
  const groups = Array.from(map.entries()).map(([matchday, items]) => ({
    matchday,
    fixtures: items.slice().sort((a, b) => {
      const at = new Date(a.kickoff_at || 0).getTime();
      const bt = new Date(b.kickoff_at || 0).getTime();
      return at - bt;
    }),
  }));
  return groups.sort((a, b) => a.matchday - b.matchday);
}

/**
 * Pull team display data off a fixture row. P2 ships without server-side
 * join — the API returns home_team / away_team UUIDs only. Falls back to
 * a "TBA" placeholder; a future P3 enhancement will embed `teams!fixtures_
 * home_team_fkey(...)` in the list-fixtures select.
 */
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
