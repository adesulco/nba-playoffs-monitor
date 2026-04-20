import React from 'react';
import { COLORS as C } from '../../lib/constants.js';

/**
 * PlayerChip — compact "seed · name · country" inline block used in match rows
 * and draw viewers. Keeps to single-line height (no wrapping) so it composes
 * cleanly inside tables and cards.
 *
 * Indonesian players get a subtle flag hint tint on their name for quick
 * scan-discovery during slam weeks.
 */
export default function PlayerChip({
  name,
  shortName,
  seed = null,
  country = null,
  countryCode = null,
  isWinner = false,
  indonesian = false,
  compact = false,
}) {
  const display = compact && shortName ? shortName : name;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: C.text,
        fontWeight: isWinner ? 600 : 500,
      }}
    >
      {seed != null && (
        <span
          style={{
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            color: C.muted,
            minWidth: 14,
            textAlign: 'right',
          }}
        >
          [{seed}]
        </span>
      )}
      <span style={{ color: indonesian ? C.tennisSlamGold : C.text, whiteSpace: 'nowrap' }}>
        {display}
      </span>
      {(countryCode || country) && (
        <span
          style={{
            fontSize: 9.5,
            color: C.muted,
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 0.4,
          }}
        >
          {(countryCode || country || '').toString().slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}
