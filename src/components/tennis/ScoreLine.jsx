import React from 'react';
import { COLORS as C } from '../../lib/constants.js';

/**
 * ScoreLine — per-set score line for one player in a match.
 *
 * Props:
 *   sets:       Array<{ p1: number, p2: number, tiebreak?: {p1,p2} }>
 *   playerIdx:  0 | 1 — which side of the match this row represents
 *   isWinner:   boolean — if true the row gets a subtle accent
 *   isServing:  boolean — if true a dot is shown next to the row
 *   bold:       boolean — for set winners, bold the number (standard tennis
 *               convention; e.g. 7-6(5) 6-4 has the 7, 6, 6 bolded on winner)
 *
 * Tiebreak values (when present) render as small superscript beside the set.
 * Mirrors how ATP/WTA scoreboards display tiebreak: e.g. `7⁶ 6` means the
 * player won the first set 7-6 with a 6-point tiebreak second.
 */
export default function ScoreLine({ sets = [], playerIdx = 0, isWinner = false, isServing = false }) {
  const otherIdx = playerIdx === 0 ? 1 : 0;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 14,
      }}
    >
      {isServing && (
        <span
          aria-label="Servis"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: C.tennisLive,
          }}
        />
      )}
      {sets.map((s, i) => {
        const mine = playerIdx === 0 ? s.p1 : s.p2;
        const theirs = playerIdx === 0 ? s.p2 : s.p1;
        const wonSet = Number(mine) > Number(theirs) || (
          Number(mine) === 7 && Number(theirs) === 6
        );
        const tb = s.tiebreak ? (playerIdx === 0 ? s.tiebreak.p1 : s.tiebreak.p2) : null;
        const tbOther = s.tiebreak ? (playerIdx === 0 ? s.tiebreak.p2 : s.tiebreak.p1) : null;
        const showTb = tb != null && tbOther != null && (
          Number(mine) === 7 || Number(theirs) === 7 || Number(mine) === 6 || Number(theirs) === 6
        ) && (tb !== tbOther);
        return (
          <span
            key={i}
            style={{
              fontWeight: wonSet ? 700 : 400,
              color: wonSet ? (isWinner ? C.text : C.text) : C.muted,
              minWidth: 12,
              textAlign: 'center',
            }}
          >
            {mine ?? '—'}
            {showTb && (
              <sup style={{
                fontSize: 9.5,
                marginLeft: 1,
                color: C.tennisTiebreak,
                fontWeight: 400,
                verticalAlign: 'super',
              }}>
                {tb}
              </sup>
            )}
          </span>
        );
      })}
    </div>
  );
}
