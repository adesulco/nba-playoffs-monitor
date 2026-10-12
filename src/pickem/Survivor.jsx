import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PickemRoot from './PickemRoot.jsx';
import Flag from './Flag.jsx';
import { PickemBtn, EmptyState } from './components/social.jsx';
import { teamLabel, GROUP_LETTERS, SAMPLE_GROUPS } from './bracketData.js';
import { usePickemCompetition } from './useCompetition.jsx';

// ============================================================================
// v0.70.0 — Survivor "Fan Terakhir" screen (Pick'em P5).
//
// /pickem/survivor — the spec §5.5 side-game: pick one team to win each
// matchday, no-reuse, one wrong pick = eliminated. Anatomy from
// design-handoff-pickem/js/screens.jsx#ScreenSurvivor.
//
// v1 ships CLIENT-ONLY:
//   - State lives in localStorage under `gibol:pickem:survivor:WC2026`.
//   - The team pool is the bracket SAMPLE_GROUPS for now (until real WC
//     fixtures are seeded).
//   - Pick selection is the meaningful interaction; server-side
//     advance/elimination already exists in pickem_score_fixture()
//     (migration 0015) and will read from a future `survivor_picks`
//     extension to the predictions table. P5.5 follow-on wires it.
//
// The screen UX still works without any backend — guests can play.
// The reward at lock time is "Pilih [X] · 🔒 [countdown]". Once the
// matchday locks, the pick freezes and the user waits for results.
// ============================================================================

const STORAGE_KEY = 'gibol:pickem:survivor:WC2026';

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readSurvivor() {
  if (!isBrowser()) return defaultSurvivor();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSurvivor();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultSurvivor();
    return { ...defaultSurvivor(), ...parsed };
  } catch {
    return defaultSurvivor();
  }
}

function writeSurvivor(state) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function defaultSurvivor() {
  return {
    status: 'alive',
    current_matchday: 1,
    current_pick: null,
    picks: [], // { matchday, team, result: 'pending'|'win'|'loss' }
    used_teams: [],
    eliminated_matchday: null,
    updated_at: null,
  };
}

/**
 * Build the candidate team pool for this matchday. For v1 we synthesise
 * "matchday X" by rotating through the bracket sample-group teams in
 * pairs (4 picks per matchday so the screen always shows options).
 * Once fixtures.matchday is ingested, swap this for a real fetch.
 */
function buildMatchdayPool(matchday) {
  const all = [];
  for (const g of GROUP_LETTERS) {
    for (const [code] of SAMPLE_GROUPS[g].teams) all.push({ code, group: g });
  }
  // Deterministic rotation by matchday so the user sees consistent picks
  // for the same matchday on reload.
  const offset = ((matchday - 1) % all.length);
  const rotated = all.slice(offset).concat(all.slice(0, offset));
  // Pair into 4 cards (4 winners shown; "vs" opponent is the next team
  // in the rotation — placeholder until real fixtures).
  const cards = [];
  for (let i = 0; i < 8; i += 2) {
    const a = rotated[i % rotated.length];
    const b = rotated[(i + 1) % rotated.length];
    if (!a || !b) continue;
    cards.push({ team: a.code, opponent: b.code });
  }
  return cards;
}

export default function Survivor() {
  const { competition } = usePickemCompetition();
  // Survivor is WC-shape only (one elimination per matchday across an 8-
  // matchday tournament). NBA Playoffs has no matchday-loss equivalent
  // (series last 4-7 games over ~2 weeks), so we short-circuit.
  if (!competition.hasSurvivor) {
    return (
      <PickemRoot active="survivor">
        <div style={{ padding: '40px 16px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div className="p-eyebrow" style={{ marginBottom: 10, opacity: 0.7 }}>SURVIVOR</div>
          <h1 className="p-display-sm" style={{ marginBottom: 12, color: 'var(--ink-1)' }}>
            Survivor {competition.label} belum aktif
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.55 }}>
            Mode Survivor cocok untuk turnamen format gugur per-matchday. {competition.label} pakai seri best-of-7 — fitur ini aktif lagi pas Piala Dunia 2026 mulai 11 Juni.
          </p>
        </div>
      </PickemRoot>
    );
  }
  return <SurvivorImpl />;
}

function SurvivorImpl() {
  const [state, setState] = useState(() => readSurvivor());
  const [confirmPick, setConfirmPick] = useState(null);

  useEffect(() => {
    writeSurvivor(state);
  }, [state]);

  const pool = useMemo(
    () => buildMatchdayPool(state.current_matchday).filter((c) => !state.used_teams.includes(c.team)),
    [state.current_matchday, state.used_teams],
  );

  const isOut = state.status === 'out';
  const matchdaysSurvived = state.picks.filter((p) => p.result !== 'loss').length;

  const selectPick = useCallback((team) => {
    if (isOut) return;
    setState((s) => ({ ...s, current_pick: team, updated_at: new Date().toISOString() }));
  }, [isOut]);

  const lockPick = useCallback(() => {
    if (isOut || !state.current_pick) return;
    setState((s) => {
      // Append the locked pick + advance the matchday counter.
      const picks = [
        ...s.picks.filter((p) => p.matchday !== s.current_matchday),
        { matchday: s.current_matchday, team: s.current_pick, result: 'pending', locked_at: new Date().toISOString() },
      ];
      return {
        ...s,
        picks,
        used_teams: Array.from(new Set([...s.used_teams, s.current_pick])),
        current_pick: null,
        current_matchday: s.current_matchday + 1,
        updated_at: new Date().toISOString(),
      };
    });
    setConfirmPick(null);
  }, [isOut, state.current_pick]);

  const resetSurvivor = useCallback(() => {
    setState(defaultSurvivor());
  }, []);

  return (
    <PickemRoot active="predict">
      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32, fontFamily: 'var(--font-ui-pickem)' }}>
        <Header status={state.status} matchday={state.current_matchday} matchdaysSurvived={matchdaysSurvived} />

        {isOut && (
          <div style={{ padding: '0 18px 18px' }}>
            <OutBanner eliminatedMatchday={state.eliminated_matchday} onReset={resetSurvivor} />
          </div>
        )}

        {!isOut && (
          <>
            <StatusBanner state={state} matchdaysSurvived={matchdaysSurvived} />

            <div style={{ padding: '0 18px 14px' }}>
              <div className="p-eyebrow" style={{ marginBottom: 10 }}>
                PILIH SATU TIM YANG MENANG MATCHDAY {state.current_matchday}
              </div>
              {pool.length === 0 ? (
                <EmptyState
                  title="Semua tim sudah kamu pakai"
                  body="Survivor selesai untuk kamu — kamu bertahan sampai akhir."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {pool.slice(0, 4).map((c) => (
                    <PickCard
                      key={c.team}
                      team={c.team}
                      opponent={c.opponent}
                      selected={state.current_pick === c.team}
                      onClick={() => selectPick(c.team)}
                    />
                  ))}
                </div>
              )}
            </div>

            {state.used_teams.length > 0 && (
              <div style={{ padding: '0 18px 14px' }}>
                <div className="p-eyebrow" style={{ marginBottom: 8 }}>SUDAH KAMU PAKAI</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {state.used_teams.map((code) => (
                    <UsedChip key={code} code={code} />
                  ))}
                </div>
                <div
                  style={{
                    color: 'var(--ink-3)',
                    fontSize: 11,
                    marginTop: 6,
                    fontStyle: 'italic',
                  }}
                >
                  Tim yang udah dipakai, nggak bisa dipakai lagi.
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                padding: '14px 18px',
                borderTop: '1px solid var(--line-1)',
                background: 'var(--bg-raised)',
                position: 'sticky',
                bottom: 0,
              }}
            >
              <PickemBtn
                full
                size="lg"
                disabled={!state.current_pick}
                onClick={() => setConfirmPick(state.current_pick)}
              >
                {state.current_pick
                  ? `Pilih ${teamLabel(state.current_pick)} · 🔒`
                  : 'Pilih dulu salah satu tim'}
              </PickemBtn>
            </div>
          </>
        )}
      </div>

      {confirmPick && (
        <LockPickConfirm
          team={confirmPick}
          onCancel={() => setConfirmPick(null)}
          onConfirm={lockPick}
        />
      )}
    </PickemRoot>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Header({ matchday }) {
  return (
    <header style={{ padding: '20px 18px 16px' }}>
      <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 6 }}>
        SURVIVOR · FAN TERAKHIR
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--ink-1)',
        }}
      >
        Matchday {matchday}
        <br />
        <span style={{ color: 'var(--ink-3)' }}>kamu masih hidup.</span>
      </h1>
    </header>
  );
}

function StatusBanner({ matchdaysSurvived }) {
  return (
    <div style={{ padding: '0 18px 14px' }}>
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderLeft: '3px solid var(--p-up)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div className="p-eyebrow" style={{ color: 'var(--p-up)', marginBottom: 2 }}>
            STATUS
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink-1)',
            }}
          >
            Hidup{matchdaysSurvived > 0 ? ` · ${matchdaysSurvived} matchday` : ''}
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
            Tinggal pilih satu tim. Salah sekali, kelar.
          </div>
        </div>
        <span style={{ fontSize: 32 }} aria-hidden="true">
          💀
        </span>
      </div>
    </div>
  );
}

function OutBanner({ eliminatedMatchday, onReset }) {
  return (
    <div
      style={{
        padding: '20px 18px',
        background: 'var(--p-down-wash)',
        border: '1px solid rgba(184, 52, 31, 0.3)',
        borderRadius: 12,
        textAlign: 'center',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">💀</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          marginBottom: 6,
          color: 'var(--ink-1)',
        }}
      >
        Kamu tereliminasi
      </div>
      <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 14 }}>
        {eliminatedMatchday
          ? `Tim pilihanmu kalah di matchday ${eliminatedMatchday}.`
          : 'Tim pilihanmu kalah.'}
      </div>
      <PickemBtn variant="primary" onClick={onReset}>
        Main Survivor lagi musim depan
      </PickemBtn>
    </div>
  );
}

function PickCard({ team, opponent, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        appearance: 'none',
        cursor: 'pointer',
        padding: 14,
        borderRadius: 12,
        background: selected ? 'var(--pickem-orange)' : 'var(--bg-raised)',
        color: selected ? '#0A1628' : 'var(--ink-1)',
        border: '1px solid ' + (selected ? 'var(--pickem-orange)' : 'var(--line-1)'),
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 64,
        fontFamily: 'var(--font-ui-pickem)',
        textAlign: 'left',
        transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      <Flag code={team} w={36} h={26} round={4} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {teamLabel(team)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            opacity: selected ? 0.9 : 0.6,
            marginTop: 2,
          }}
        >
          vs {opponent}
        </div>
      </div>
    </button>
  );
}

function UsedChip({ code }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px 6px 6px',
        background: 'var(--bg-deep)',
        borderRadius: 999,
        opacity: 0.7,
      }}
    >
      <Flag code={code} w={20} h={14} round={2} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        {teamLabel(code)}
      </span>
    </div>
  );
}

function LockPickConfirm({ team, onCancel, onConfirm }) {
  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 16, 29, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        zIndex: 9000,
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kunci pilihan survivor"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderRadius: 18,
          padding: '22px 22px 18px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          color: 'var(--ink-1)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">
          🔒
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 8,
            letterSpacing: '-0.015em',
          }}
        >
          Kunci pilihan?
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          Begitu dikunci, kamu nggak bisa pakai {teamLabel(team)} lagi di Survivor. Pilihan
          dievaluasi setelah matchday selesai.
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-base)',
            border: '1px solid var(--line-1)',
            borderRadius: 10,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Flag code={team} w={32} h={22} round={3} />
          <div style={{ textAlign: 'left' }}>
            <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>
              PILIHANMU
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--pickem-orange)',
              }}
            >
              {teamLabel(team)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PickemBtn full size="lg" variant="primary" onClick={onConfirm}>
            🔒 Kunci pilihan
          </PickemBtn>
          <PickemBtn full size="md" variant="ghost" onClick={onCancel}>
            Nanti aja
          </PickemBtn>
        </div>
      </div>
    </div>
  );
}
