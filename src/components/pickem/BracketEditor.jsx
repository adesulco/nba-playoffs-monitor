import React, { useCallback, useMemo, useState, useTransition } from 'react';
import { COLORS as C } from '../../lib/constants.js';
import { pointsForRoundPick } from '../../lib/pickemScoring.js';
import { useAuth } from '../../lib/AuthContext.jsx';

/**
 * BracketEditor — interactive NBA playoff bracket for Gibol Pick'em.
 *
 * Ported from the Next.js /components/BracketEditor.tsx. Behaviour matches
 * the source:
 *  - Picks cascade: if you pick team A in R1, only A appears in the R2 feeder.
 *  - Optimistic UI: each pick POSTs to /api/pickem/pick and rolls back on fail.
 *  - Finals picks also capture "menang dalam X game" (4..7).
 *
 * Style grammar mirrors existing v2 panels — `var(--bg-2)` cards with 1px
 * line borders, borderLeft accent in amber, 3px radius. Mobile-first grid.
 *
 * Props:
 *   bracketId    — uuid of the bracket being edited
 *   canEdit      — whether the user currently owns + the bracket is `open`
 *   series       — full playoff series skeleton (all rounds) from `series` tbl
 *   teams        — team metadata from `teams` tbl (tricode, name, primary_color)
 *   initialPicks — user's current picks, keyed later by series_id
 */
export default function BracketEditor({
  bracketId,
  canEdit,
  series,
  teams,
  initialPicks,
}) {
  const { authHeader } = useAuth();
  const [picks, setPicks] = useState(() =>
    Object.fromEntries((initialPicks || []).map((p) => [p.series_id, p])),
  );
  const [saving, setSaving] = useState({});
  const [, startTransition] = useTransition();

  const teamByCode = useMemo(
    () => Object.fromEntries((teams || []).map((t) => [t.tricode, t])),
    [teams],
  );
  const seriesById = useMemo(
    () => Object.fromEntries((series || []).map((s) => [s.id, s])),
    [series],
  );

  // Resolve which two teams are eligible for a given series, folding in the
  // cascade from the user's upstream picks.
  const optionsFor = useCallback(
    (s) => {
      if (s.round === 'R1') return [s.team_high, s.team_low];
      const feeds = [s.feeder_high, s.feeder_low].map((id) => {
        if (!id) return null;
        const feeder = seriesById[id];
        if (!feeder) return null;
        if (feeder.winner) return feeder.winner;
        return picks[id]?.picked_team ?? null;
      });
      return feeds;
    },
    [picks, seriesById],
  );

  async function savePick(seriesId, pickedTeam, pickedGames) {
    setSaving((s) => ({ ...s, [seriesId]: true }));
    const optimistic = {
      id: picks[seriesId]?.id ?? `temp-${seriesId}`,
      bracket_id: bracketId,
      series_id: seriesId,
      picked_team: pickedTeam,
      picked_games: pickedGames ?? picks[seriesId]?.picked_games ?? null,
      awarded_points: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    startTransition(() => {
      setPicks((prev) => {
        const next = { ...prev, [seriesId]: optimistic };
        return cascadeClear(next, series);
      });
    });

    try {
      const res = await fetch('/api/pickem/pick', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          bracket_id: bracketId,
          series_id: seriesId,
          picked_team: pickedTeam,
          picked_games: optimistic.picked_games,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setPicks((prev) => ({ ...prev, [seriesId]: saved }));
    } catch (err) {
      console.error('[pick] save failed', err);
      // Roll back: remove the optimistic pick on failure.
      setPicks((prev) => {
        const next = { ...prev };
        delete next[seriesId];
        return next;
      });
    } finally {
      setSaving((s) => ({ ...s, [seriesId]: false }));
    }
  }

  const rounds = [
    { key: 'R1', label: 'Round 1' },
    { key: 'R2', label: 'Semifinal Konferensi' },
    { key: 'CF', label: 'Final Konferensi' },
    { key: 'F',  label: 'NBA Finals' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {rounds.map(({ key, label }) => {
        const roundSeries = (series || []).filter((s) => s.round === key);
        if (roundSeries.length === 0) return null;
        const points = pointsForRoundPick(key);
        return (
          <section key={key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <h2 style={{
                margin: 0,
                font: "700 11px 'Inter Tight', sans-serif",
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: C.dim,
              }}>{label}</h2>
              <span style={{ fontSize: 11, color: C.dim }}>{points} poin / pick</span>
            </div>
            <ul style={{
              listStyle: 'none', margin: 0, padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 10,
            }}>
              {roundSeries.map((s) => {
                const [opt1, opt2] = optionsFor(s);
                const current = picks[s.id];
                return (
                  <li key={s.id} style={{
                    background: 'var(--bg-2)',
                    border: `1px solid ${C.line}`,
                    borderLeft: `3px solid var(--amber)`,
                    borderRadius: 3,
                    padding: 12,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <p style={{
                      margin: 0,
                      font: "700 10px 'Inter Tight'",
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: C.dim,
                    }}>
                      {s.conference === 'Finals' ? 'NBA Finals' : `${s.conference} · Seri ${s.slot}`}
                    </p>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    }}>
                      <TeamButton
                        code={opt1}
                        team={opt1 ? teamByCode[opt1] : null}
                        selected={current?.picked_team === opt1}
                        disabled={!canEdit || !opt1 || Boolean(s.winner)}
                        winnerLocked={s.winner === opt1}
                        onClick={() => opt1 && savePick(s.id, opt1)}
                      />
                      <TeamButton
                        code={opt2}
                        team={opt2 ? teamByCode[opt2] : null}
                        selected={current?.picked_team === opt2}
                        disabled={!canEdit || !opt2 || Boolean(s.winner)}
                        winnerLocked={s.winner === opt2}
                        onClick={() => opt2 && savePick(s.id, opt2)}
                      />
                    </div>
                    {current && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4,
                      }}>
                        <label style={{ fontSize: 11, color: C.dim }}>Menang dalam</label>
                        <select
                          disabled={!canEdit || Boolean(s.winner)}
                          value={current.picked_games ?? ''}
                          onChange={(e) => savePick(s.id, current.picked_team, Number(e.target.value))}
                          style={{
                            background: 'var(--bg-3)',
                            color: C.text,
                            border: `1px solid ${C.line}`,
                            borderRadius: 3,
                            padding: '4px 8px',
                            fontSize: 12,
                          }}
                        >
                          <option value="">—</option>
                          {[4, 5, 6, 7].map((g) => (
                            <option key={g} value={g}>{g} game</option>
                          ))}
                        </select>
                        {saving[s.id] && (
                          <span style={{ fontSize: 11, color: C.dim }}>menyimpan…</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TeamButton({ code, team, selected, disabled, winnerLocked, onClick }) {
  if (!code || !team) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56,
        borderRadius: 3,
        border: `1px dashed ${C.line}`,
        background: 'var(--bg-3)',
        color: C.dim,
        fontSize: 12,
      }}>
        Menunggu
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
        padding: '0 12px',
        borderRadius: 3,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: selected ? 'rgba(245,158,11,0.14)' : 'var(--bg-3)',
        border: selected
          ? `1px solid var(--amber)`
          : `1px solid ${C.line}`,
        color: C.text,
        opacity: disabled && !selected ? 0.4 : 1,
        outline: winnerLocked ? `1px solid var(--up, var(--green))` : 'none',
        transition: 'background 160ms var(--ease-standard, ease), border-color 160ms var(--ease-standard, ease)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: "700 13px 'Inter Tight'" }}>{team.tricode}</span>
        <span style={{ fontSize: 11, color: C.dim }}>{team.name}</span>
      </div>
      <span
        aria-hidden
        style={{
          width: 28, height: 28, borderRadius: 3,
          background: team.primary_color || 'var(--bg-3)',
        }}
      />
    </button>
  );
}

function cascadeClear(picks, allSeries) {
  // Walk downstream series; drop any pick whose team is no longer a valid option.
  const next = { ...picks };
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of allSeries || []) {
      if (s.round === 'R1') continue;
      const current = next[s.id];
      if (!current) continue;
      const feederHighWinner =
        s.feeder_high
          ? next[s.feeder_high]?.picked_team ??
            (allSeries.find((x) => x.id === s.feeder_high)?.winner ?? null)
          : null;
      const feederLowWinner =
        s.feeder_low
          ? next[s.feeder_low]?.picked_team ??
            (allSeries.find((x) => x.id === s.feeder_low)?.winner ?? null)
          : null;
      const valid = [feederHighWinner, feederLowWinner].filter(Boolean);
      if (!valid.includes(current.picked_team)) {
        delete next[s.id];
        changed = true;
      }
    }
  }
  return next;
}
