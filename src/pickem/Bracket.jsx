import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import useBracketState from './useBracketState.js';
import {
  STAGES,
  STAGE_LABELS,
  potentialBracketPoints,
} from './bracketData.js';
import { PickemBtn } from './components/social.jsx';
import {
  BracketGroupStage,
  BracketKnockoutStage,
  BracketFinalStage,
  BracketChampion,
  BracketMiniStrip,
  BracketLockConfirm,
  BracketStepper,
} from './components/bracketStages.jsx';
import { upsertBracket } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { usePickemCompetition } from './useCompetition.jsx';

// ============================================================================
// v0.69.0 — <Bracket /> · /pickem/bracket screen (Pick'em P4).
//
// Stage-paged WC 2026 bracket builder. Mobile-first; the entire flow
// works on a 390px screen with one stage on-screen at a time.
//
// Flow:
//   Header (eyebrow + "Bangun bracket kamu" headline + lock countdown)
//   ↓
//   "Pilih semua favorit" + "Reset" pair
//   ↓
//   Sticky stage stepper (7 pills, done/current/locked-ahead)
//   ↓
//   Stage progress meter ("N / total" gates the "Lanjut" CTA)
//   ↓
//   Per-stage body (BracketGroupStage / KnockoutStage / FinalStage /
//                   Champion)
//   ↓
//   Persistent MiniStrip + "Lanjut → / Kunci bracket" CTA
//
// State lives in useBracketState() — localStorage-backed, locks
// idempotent. Server-side bracket scoring lands later (extension to
// migration 0015 → bracket_slots + pickem_score_bracket RPC); for v1
// the lock is purely client-side and the bracket is privately stored.
// ============================================================================

// v0.79.1 — Bracket is WC2026-shape only. When the user is on a competition
// without hasBracket (NBA Playoffs in v1), we render <BracketNotAvailable />
// instead. SEASON used to drive the score-bracket key; now per-competition.

export default function Bracket() {
  return (
    <AuthProvider>
      <BracketInner />
    </AuthProvider>
  );
}

function BracketInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { competition } = usePickemCompetition();
  const COMPETITION = competition.key;
  const SEASON = competition.season;

  // Short-circuit for competitions without a bracket (e.g. NBA Playoffs in
  // v1). Rendering useBracketState() would crash on missing bracketData.
  if (!competition.hasBracket) {
    return <BracketNotAvailable competition={competition} />;
  }

  return <BracketInnerImpl user={user} navigate={navigate} COMPETITION={COMPETITION} SEASON={SEASON} />;
}

function BracketNotAvailable({ competition }) {
  return (
    <PickemRoot active="bracket">
      <div style={{ padding: '40px 16px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div className="p-eyebrow" style={{ marginBottom: 10, opacity: 0.7 }}>BRACKET</div>
        <h1 className="p-display-sm" style={{ marginBottom: 12, color: 'var(--ink-1)' }}>
          Bracket {competition.label} belum aktif
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.55 }}>
          Bracket prediksi tersedia untuk turnamen format grup + KO. {competition.label} pakai format seri best-of-7 — kamu bisa prediksi laga per hari di tab <strong>Prediksi</strong>, ranking di tab <strong>Papan</strong>.
        </p>
        <p style={{ color: 'var(--ink-3, var(--ink-2))', fontSize: 12, marginTop: 18 }}>
          Bracket Piala Dunia 2026 (FIFA WC) aktif mulai 11 Juni 2026.
        </p>
      </div>
    </PickemRoot>
  );
}

function BracketInnerImpl({ user, navigate, COMPETITION, SEASON }) {
  const [stage, setStage] = useState('group');
  const [confirmLock, setConfirmLock] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const [lockError, setLockError] = useState(null);
  const [locking, setLocking] = useState(false);
  const b = useBracketState(COMPETITION);

  const stageIdx = STAGES.findIndex((s) => s.k === stage);
  const stageMeta = STAGES[stageIdx];
  const isLast = stage === 'champ';
  const currentCount = b.counts[stage] ?? 0;
  const stageComplete = currentCount >= (stageMeta?.total ?? 0);
  const nextLabel = isLast ? '🔒 Kunci bracket' : `Lanjut ke ${STAGES[stageIdx + 1]?.l} →`;
  const cannotAdvance = !stageComplete || b.locked;

  const potential = useMemo(() => potentialBracketPoints(b.rawState), [b.rawState]);

  const advance = () => {
    if (b.locked) return;
    if (isLast) {
      setConfirmLock(true);
      return;
    }
    setStage(STAGES[stageIdx + 1].k);
  };

  const handleAuto = () => {
    b.autoFill();
    setAutofilled(true);
    setTimeout(() => setAutofilled(false), 2200);
  };

  const handleConfirmLock = async () => {
    setLockError(null);
    setLocking(true);
    // Try to persist + lock server-side first. If the user is signed in
    // AND migration 0016 is applied, the bracket lands in the brackets +
    // picks tables and the server lock_at stamp is authoritative. If
    // either is missing, fall through to a local-only lock — the
    // localStorage state still freezes; a future cron + claim flow can
    // backfill once the schema is up.
    if (user) {
      const payload = buildUpsertPayload(b);
      const res = await upsertBracket({ ...payload, lock: true });
      if (!res.ok) {
        // Soft fail: server can't save (schema missing or transient).
        // Lock locally anyway so the user isn't blocked, surface the
        // error inline.
        setLockError(res.error || 'Gagal simpan ke server — terkunci lokal.');
      }
    }
    b.lock();
    setLocking(false);
    setConfirmLock(false);
  };

  return (
    <PickemRoot active="bracket">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        <Header
          locked={b.locked}
          lockedAt={b.lockedAt}
          onViewTree={() => navigate('/pickem/bracket/tree')}
        />

        {!b.locked && (
          <div style={{ padding: '0 18px 12px', display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAuto} style={autoBtnStyle}>
              <span aria-hidden="true">⚡</span> Pilih semua favorit
            </button>
            <button type="button" onClick={b.reset} style={resetBtnStyle}>
              Reset
            </button>
          </div>
        )}

        <BracketStepper
          stages={STAGES}
          currentStage={stage}
          stageIdx={stageIdx}
          counts={b.counts}
          onStageChange={setStage}
        />

        <StageProgress stage={stage} count={currentCount} total={stageMeta?.total} />

        <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
          {stage === 'group' && (
            <BracketGroupStage
              groups={b.groups}
              setPick={b.setGroupPick}
              locked={b.locked}
            />
          )}
          {stage === 'r32' && (
            <BracketKnockoutStage
              label="R32"
              stage="r32"
              matches={b.r32}
              setPick={b.setKnockoutPick}
              locked={b.locked}
            />
          )}
          {stage === 'r16' && (
            <BracketKnockoutStage
              label="R16"
              stage="r16"
              matches={b.r16}
              setPick={b.setKnockoutPick}
              locked={b.locked}
            />
          )}
          {stage === 'qf' && (
            <BracketKnockoutStage
              label="QF"
              stage="qf"
              matches={b.qf}
              setPick={b.setKnockoutPick}
              locked={b.locked}
            />
          )}
          {stage === 'sf' && (
            <BracketKnockoutStage
              label="SF"
              stage="sf"
              matches={b.sf}
              setPick={b.setKnockoutPick}
              locked={b.locked}
            />
          )}
          {stage === 'final' && (
            <BracketFinalStage
              match={b.final}
              setPick={b.setFinalPick}
              locked={b.locked}
            />
          )}
          {stage === 'champ' && (
            <BracketChampion
              team={b.champion || b.final?.pick}
              onCrown={b.setChampion}
              potentialPoints={potential}
            />
          )}
        </div>

        <div
          style={{
            borderTop: '1px solid var(--line-1)',
            background: 'var(--bg-raised)',
            flexShrink: 0,
          }}
        >
          <BracketMiniStrip
            champion={b.champion || b.final?.pick}
            totalPicks={b.totalPicks}
          />
          <div style={{ padding: '8px 18px 14px' }}>
            {b.locked ? (
              <LockedBanner lockedAt={b.lockedAt} potential={potential} />
            ) : (
              <PickemBtn full size="lg" onClick={advance} disabled={cannotAdvance}>
                {nextLabel}
              </PickemBtn>
            )}
          </div>
        </div>
      </div>

      {autofilled && (
        <AutoFilledToast onDismiss={() => setAutofilled(false)} />
      )}

      {confirmLock && (
        <BracketLockConfirm
          champion={b.champion || b.final?.pick}
          onCancel={() => setConfirmLock(false)}
          onConfirm={handleConfirmLock}
          locking={locking}
          error={lockError}
        />
      )}
    </PickemRoot>
  );
}

/**
 * buildUpsertPayload(b) → the body shape /api/pickem upsert-bracket expects.
 * Reads from useBracketState's exposed fields.
 */
function buildUpsertPayload(b) {
  const groups = {};
  for (const [letter, group] of Object.entries(b.groups || {})) {
    groups[letter] = {};
    for (const [code, rank] of Object.entries(group)) {
      if (rank != null) groups[letter][code] = rank;
    }
  }
  const koArray = (rows) =>
    (rows || [])
      .map((r, i) => (r.pick ? { slot_index: i + 1, picked_team_code: r.pick } : null))
      .filter(Boolean);

  return {
    competition: COMPETITION,
    season: SEASON,
    groups,
    r32: koArray(b.r32),
    r16: koArray(b.r16),
    qf: koArray(b.qf),
    sf: koArray(b.sf),
    final: b.final?.pick ? { picked_team_code: b.final.pick } : undefined,
    champion: b.champion ? { picked_team_code: b.champion } : undefined,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Header({ locked, lockedAt, onViewTree }) {
  return (
    <header style={{ padding: '8px 18px 12px', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="p-eyebrow"
          style={{ color: 'var(--pickem-orange)' }}
        >
          BRACKET · WC 2026
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onViewTree && (
            <button
              type="button"
              onClick={onViewTree}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: '1px solid var(--line-2)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '6px 12px',
                borderRadius: 'var(--r-pill)',
                cursor: 'pointer',
                minHeight: 30,
              }}
            >
              LIHAT TREE →
            </button>
          )}
          {locked ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--p-up)',
                letterSpacing: '0.08em',
              }}
            >
              ✓ TERKUNCI
            </span>
          ) : (
            <LockCountdownLabel />
          )}
        </div>
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 24,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--ink-1)',
        }}
      >
        {locked ? 'Bracket kamu terkunci' : 'Bangun bracket kamu'}
      </h1>
      {locked && lockedAt && (
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 12,
            marginTop: 4,
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          Dikunci {formatLockedAt(lockedAt)}.
        </div>
      )}
    </header>
  );
}

function LockCountdownLabel() {
  // WC 2026 kickoff is ~June 11 2026 — we'd compute the actual countdown
  // when the schedule is seeded. For the v0.69.0 ship the label is a
  // simple "WC dimulai" reminder so the bracket builder feels live.
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--p-live)',
        letterSpacing: '0.06em',
      }}
    >
      🔒 SEBELUM KICK-OFF
    </span>
  );
}

function StageProgress({ stage, count, total }) {
  const done = count >= total;
  return (
    <div
      style={{
        padding: '12px 18px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--ink-1)',
        }}
      >
        {STAGE_LABELS[stage] || stage}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          color: done ? 'var(--p-up)' : 'var(--ink-3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count} / {total}
      </span>
    </div>
  );
}

function LockedBanner({ lockedAt, potential }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--p-up-wash)',
        border: '1px solid rgba(52, 211, 153, 0.30)',
        borderRadius: 'var(--r-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div>
        <div
          className="p-eyebrow"
          style={{ fontSize: 9, color: 'var(--p-up)', marginBottom: 2 }}
        >
          BRACKET TERKUNCI
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 600 }}>
          Nggak bisa diubah lagi sampai final.
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
          POTENSI POIN
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--pickem-orange)',
          }}
        >
          +{potential}
        </div>
      </div>
    </div>
  );
}

function AutoFilledToast({ onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9001,
        padding: '10px 16px',
        borderRadius: 999,
        background: 'var(--ink-1)',
        color: 'var(--bg-base)',
        fontFamily: 'var(--font-ui-pickem)',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: 'var(--shadow-pop)',
        cursor: 'pointer',
      }}
    >
      ✓ Bracket diisi pakai favorit. Edit yang nggak setuju.
    </div>
  );
}

const autoBtnStyle = {
  appearance: 'none',
  cursor: 'pointer',
  flex: 1,
  padding: '12px 14px',
  minHeight: 44,
  background: 'var(--pickem-orange)',
  color: '#0A1628',
  border: 'none',
  borderRadius: 999,
  fontFamily: 'var(--font-ui-pickem)',
  fontSize: 14,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const resetBtnStyle = {
  appearance: 'none',
  cursor: 'pointer',
  padding: '12px 18px',
  minHeight: 44,
  background: 'transparent',
  color: 'var(--ink-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 999,
  fontFamily: 'var(--font-ui-pickem)',
  fontSize: 14,
  fontWeight: 600,
};

function formatLockedAt(iso) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
