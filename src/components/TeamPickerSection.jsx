import React from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * TeamPickerSection — extracted in v0.12.9 from OnboardingTeams.jsx.
 *
 * One sport's section in a multi-sport favorites picker. Renders a
 * sport title + a responsive chip grid where each chip is a color
 * swatch + team/player name. Chip clicks call onToggle(item); chips
 * are visually distinct when picked (solid border + ✓ + tinted bg)
 * and disabled when the user has hit the picker's max-pick cap (the
 * parent owns that cap state).
 *
 * Shared by:
 *   /onboarding/teams      (first-login picker)
 *   /settings/teams        (logged-in editor — v0.12.9)
 *
 * Props:
 *   title       — section heading (Bahasa or English, parent's choice)
 *   accent      — left-edge color stripe (sport-color: NBA red, EPL
 *                 purple, F1 red, Tennis gold)
 *   items       — [{ sport, id, short, color, name }]
 *   picked      — Set of "${sport}:${id}" keys already chosen
 *   onToggle    — (item) => void; called when a chip is clicked
 *   maxReached  — boolean; true when picked.size >= max cap (chips
 *                 not in `picked` render disabled)
 */
export default function TeamPickerSection({ title, accent, items, picked, onToggle, maxReached }) {
  return (
    <section style={{
      borderLeft: `3px solid ${accent}`,
      paddingLeft: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <h2 style={{
        margin: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 14, fontWeight: 700, letterSpacing: -0.2,
        color: C.text,
      }}>
        {title}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 6,
      }}>
        {items.map((it) => {
          const key = `${it.sport}:${it.id}`;
          const isPicked = picked.has(key);
          const isDisabled = !isPicked && maxReached;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(it)}
              disabled={isDisabled}
              aria-pressed={isPicked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: isPicked ? `${it.color}22` : 'transparent',
                color: isPicked ? C.text : (isDisabled ? C.muted : C.dim),
                border: isPicked ? `1px solid ${it.color}` : `1px solid ${C.line}`,
                borderLeft: isPicked ? `3px solid ${it.color}` : `1px solid ${C.line}`,
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: isPicked ? 600 : 500,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                textAlign: 'left',
                minHeight: 36,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18, height: 18,
                  background: it.color,
                  borderRadius: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: 0.3,
                  flexShrink: 0,
                }}
              >
                {it.short}
              </span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}>
                {it.name}
              </span>
              {isPicked && (
                <span style={{
                  fontSize: 11,
                  color: it.color,
                  fontWeight: 700,
                  marginLeft: 'auto',
                }} aria-hidden="true">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
