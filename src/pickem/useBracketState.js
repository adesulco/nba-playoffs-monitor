import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GROUP_LETTERS,
  SAMPLE_GROUPS,
  SAMPLE_R32,
  SAMPLE_R16_DEFAULT,
  SAMPLE_QF,
  SAMPLE_SF,
  SAMPLE_FINAL,
} from './bracketData.js';

// ============================================================================
// v0.69.0 — useBracketState() hook (Pick'em P4).
//
// Ported VERBATIM from design-handoff-pickem/js/bracket.jsx per the
// handover's critical-integration-decision: "rebuild — the WC bracket
// is groups → KO; port useBracketState() from the design's
// js/bracket.jsx instead."
//
// Semantics preserved exactly:
//
//   - exclusive-rank-per-group: only one team per (group, rank) slot.
//     Setting rank R on team T clears whoever previously held rank R.
//   - toggle-off-on-resame: setting the same rank twice clears the pick.
//   - autoFill: prefills every pick from the odds table (highest odds
//     becomes rank 1, next rank 2, next rank 3, etc.). The KO bracket
//     fills with the home team of each match-up.
//   - reset: returns to the initial empty state without touching the
//     seed match-ups.
//   - counts: per-stage pick totals, used by the stepper to gate the
//     "Lanjut" CTA.
//
// Additions on top of the verbatim port:
//
//   1. Persistence to localStorage under
//      `gibol:pickem:bracket:<competition>` — survives page reload
//      without requiring the server. The first prediction lands locally
//      (predict-first principle from spec §"Predict-first guest flow").
//
//   2. A `locked` flag + `lockedAt` timestamp. Once locked, all setter
//      calls become no-ops — matches the spec rule that brackets lock
//      at first kickoff and can't be edited until the tournament ends.
//
//   3. `loaded` boolean so callers can avoid rendering against the
//      initial defaults during the localStorage hydration tick.
// ============================================================================

const STORAGE_KEY_PREFIX = 'gibol:pickem:bracket:';
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function initialGroups() {
  const o = {};
  for (const g of GROUP_LETTERS) {
    o[g] = SAMPLE_GROUPS[g].teams.reduce(
      (acc, [code]) => ({ ...acc, [code]: null }),
      {},
    );
  }
  return o;
}

function initialState() {
  return {
    groups: initialGroups(),
    r32: SAMPLE_R32.map((m) => ({ ...m, pick: null })),
    r16: SAMPLE_R16_DEFAULT.map((m) => ({ ...m, pick: null })),
    qf:  SAMPLE_QF.map((m) => ({ ...m, pick: null })),
    sf:  SAMPLE_SF.map((m) => ({ ...m, pick: null })),
    final: { ...SAMPLE_FINAL, pick: null },
    champion: null,
    locked: false,
    lockedAt: null,
  };
}

function readSaved(competition) {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + competition);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive — if the saved shape doesn't match (older app version),
    // fall back to defaults rather than crashing the bracket builder.
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.groups || !parsed.r32 || !parsed.final) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSaved(competition, state) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + competition, JSON.stringify(state));
  } catch {}
}

function countPicks(state) {
  const group = Object.values(state.groups || {}).reduce(
    (sum, g) => sum + Object.values(g).filter((v) => v !== null).length,
    0,
  );
  return {
    group,
    r32: (state.r32 || []).filter((m) => m.pick).length,
    r16: (state.r16 || []).filter((m) => m.pick).length,
    qf:  (state.qf  || []).filter((m) => m.pick).length,
    sf:  (state.sf  || []).filter((m) => m.pick).length,
    final: state.final?.pick ? 1 : 0,
    champ: state.champion ? 1 : 0,
  };
}

export default function useBracketState(competition = 'WC2026') {
  const [state, setState] = useState(() => readSaved(competition) || initialState());
  const [loaded, setLoaded] = useState(true);

  // Persist any state change. The locked flag is stored too, so refresh
  // after lock keeps the read-only view.
  useEffect(() => {
    writeSaved(competition, state);
  }, [competition, state]);

  const setGroupPick = useCallback((group, team, rank) => {
    setState((prev) => {
      if (prev.locked) return prev;
      const next = { ...prev.groups[group] };
      // Toggle-off-on-resame
      if (next[team] === rank) {
        next[team] = null;
        return { ...prev, groups: { ...prev.groups, [group]: next } };
      }
      // Exclusive-rank-per-group — clear any other team that held this rank
      for (const t of Object.keys(next)) {
        if (next[t] === rank) next[t] = null;
      }
      next[team] = rank;
      return { ...prev, groups: { ...prev.groups, [group]: next } };
    });
  }, []);

  const setKnockoutPick = useCallback((stage, id, team) => {
    setState((prev) => {
      if (prev.locked) return prev;
      const rows = prev[stage] || [];
      return {
        ...prev,
        [stage]: rows.map((r) =>
          r.id === id ? { ...r, pick: r.pick === team ? null : team } : r,
        ),
      };
    });
  }, []);

  const setFinalPick = useCallback((team) => {
    setState((prev) => {
      if (prev.locked) return prev;
      const next = prev.final?.pick === team ? null : team;
      return { ...prev, final: { ...prev.final, pick: next } };
    });
  }, []);

  const setChampion = useCallback((team) => {
    setState((prev) => {
      if (prev.locked) return prev;
      return { ...prev, champion: team };
    });
  }, []);

  const autoFill = useCallback(() => {
    setState((prev) => {
      if (prev.locked) return prev;
      const groups = {};
      for (const g of GROUP_LETTERS) {
        const sorted = [...SAMPLE_GROUPS[g].teams].sort((a, b) => b[1] - a[1]);
        groups[g] = {};
        sorted.forEach(([c], i) => {
          groups[g][c] = i < 3 ? i + 1 : null;
        });
      }
      return {
        ...prev,
        groups,
        r32: prev.r32.map((r) => ({ ...r, pick: r.home })),
        r16: prev.r16.map((r) => ({ ...r, pick: r.home })),
        qf:  prev.qf.map((r) => ({ ...r, pick: r.home })),
        sf:  prev.sf.map((r) => ({ ...r, pick: r.home })),
        final: { ...prev.final, pick: prev.final.home },
        champion: prev.final.home,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.locked) return prev;
      return initialState();
    });
  }, []);

  const lock = useCallback(() => {
    setState((prev) => {
      if (prev.locked) return prev;
      return { ...prev, locked: true, lockedAt: new Date().toISOString() };
    });
  }, []);

  const unlockForDev = useCallback(() => {
    // Dev-only escape hatch. Not exposed in the UI for v1 — locked is
    // locked is locked, per spec. Surfaced here so a future admin
    // override RPC can clear it without code surgery.
    setState((prev) => ({ ...prev, locked: false, lockedAt: null }));
  }, []);

  const counts = useMemo(() => countPicks(state), [state]);
  const totalPicks = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts],
  );

  return {
    // state
    groups: state.groups,
    r32: state.r32,
    r16: state.r16,
    qf: state.qf,
    sf: state.sf,
    final: state.final,
    champion: state.champion,
    locked: state.locked,
    lockedAt: state.lockedAt,
    loaded,
    counts,
    totalPicks,
    // raw state for scoring helpers (potentialBracketPoints in bracketData.js)
    rawState: state,
    // setters
    setGroupPick,
    setKnockoutPick,
    setFinalPick,
    setChampion,
    autoFill,
    reset,
    lock,
    unlockForDev,
  };
}
