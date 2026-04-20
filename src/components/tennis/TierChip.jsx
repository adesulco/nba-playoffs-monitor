import React from 'react';
import { COLORS as C } from '../../lib/constants.js';
import { TIER_LABEL } from '../../lib/sports/tennis/glossary.js';
import { useApp } from '../../lib/AppContext.jsx';

const TIER_HEX = {
  slam:         C.tennisSlamGold,
  combined1000: C.tennisMastersSilv,
  masters:      C.tennisMastersSilv,
  wta1000:      C.tennisMastersSilv,
  finals:       C.tennisFinalsRed,
};

function withAlpha(hex, alphaHex) {
  return `${hex}${alphaHex}`;
}

export default function TierChip({ tier, size = 'md' }) {
  const { lang } = useApp();
  if (!tier) return null;
  const hex = TIER_HEX[tier] || C.dim;
  const label = (TIER_LABEL[tier] || { id: tier, en: tier })[
    lang === 'en' ? 'en' : 'id'
  ];
  const pad = size === 'sm' ? '2px 6px' : '3px 8px';
  const fontSize = size === 'sm' ? 9.5 : 10.5;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        padding: pad,
        color: hex,
        background: withAlpha(hex, '14'),
        border: `1px solid ${withAlpha(hex, '66')}`,
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
