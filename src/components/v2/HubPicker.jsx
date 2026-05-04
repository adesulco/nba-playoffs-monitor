import React, { lazy, Suspense } from 'react';

/**
 * <HubPicker> — single polymorphic entry-point for every hub-level
 * picker (Liga 1 club, EPL club, F1 constructor, tennis player,
 * NBA team).
 *
 * Phase 2 Sprint C (v0.18.0). Each underlying picker is fine on its
 * own — the directive's instruction is "wrap, don't rebuild." So
 * HubPicker is a thin dispatcher: it takes `kind` plus the relevant
 * selection props, and renders the existing component for that
 * kind. Internal dropdown logic + per-domain item lists stay where
 * they are (in `EPLClubPicker.jsx` etc.).
 *
 * Why this matters:
 *   1. The 5 hubs now import one component, not five — easier to
 *      reason about and easier to swap behavior centrally (e.g. the
 *      future "first run" tooltip, the favorites integration, the
 *      analytics tracking call) without touching every picker.
 *   2. Lazy-loaded — picker chunks only ship when they're actually
 *      mounted, keeping the hub bundles lean.
 *   3. Establishes the prop-shape contract: every picker receives
 *      `selectedKey` + `onSelect` + optional `lang`. Underlying
 *      components keep their original prop names (selectedSlug,
 *      selectedTeam, etc.) — HubPicker just forwards.
 *
 * Usage:
 *   <HubPicker kind="liga1-club" selectedKey={slug} onSelect={setSlug} lang={lang} />
 *   <HubPicker kind="epl-club"   selectedKey={slug} onSelect={setSlug} lang={lang} />
 *   <HubPicker kind="f1-team"    selectedKey={team} onSelect={setTeam} />
 *   <HubPicker kind="tennis"     selectedKey={slug} onSelect={setSlug} lang={lang} />
 *   <HubPicker kind="nba-team"   selectedKey={team} onSelect={setTeam} />
 */

const EPLClubPicker        = lazy(() => import('../EPLClubPicker.jsx'));
const SuperLeagueClubPicker = lazy(() => import('../SuperLeagueClubPicker.jsx'));
const ConstructorPicker    = lazy(() => import('../ConstructorPicker.jsx'));
const TennisPlayerPicker   = lazy(() => import('../TennisPlayerPicker.jsx'));
const TeamPicker           = lazy(() => import('../TeamPicker.jsx'));

// Tiny skeleton used while a picker chunk loads. Keeps the
// HubStatusStrip's left edge stable so we don't get layout shift.
function PickerSkeleton() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        height: 32,
        width: 200,
        background: 'var(--bg-3)',
        border: '1px solid var(--line)',
        borderRadius: 6,
      }}
    />
  );
}

export default function HubPicker({ kind, selectedKey, onSelect, lang }) {
  const inner = (() => {
    switch (kind) {
      case 'liga1-club':
        return <SuperLeagueClubPicker selectedSlug={selectedKey} onSelect={onSelect} lang={lang} />;
      case 'epl-club':
        return <EPLClubPicker selectedSlug={selectedKey} onSelect={onSelect} lang={lang} />;
      case 'f1-team':
        return <ConstructorPicker selectedConstructor={selectedKey} onSelect={onSelect} />;
      case 'tennis':
        return <TennisPlayerPicker selectedSlug={selectedKey} onSelect={onSelect} lang={lang} />;
      case 'nba-team':
        return <TeamPicker selectedTeam={selectedKey} onSelect={onSelect} />;
      default:
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`[HubPicker] unknown kind="${kind}" — render skipped`);
        }
        return null;
    }
  })();

  return (
    <Suspense fallback={<PickerSkeleton />}>
      {inner}
    </Suspense>
  );
}
