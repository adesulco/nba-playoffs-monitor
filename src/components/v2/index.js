// v2 primitives — barrel export. Import named primitives anywhere in the
// codebase via `import { Icon, Crest, Pill, Card, CardHead, V2Button,
// Momentum, Spark, Board, Skeleton, SkeletonLine, EmptyState, ErrorState }
// from '../components/v2';`
//
// Logo is re-exported from the v1 path — the existing Logo already renders
// the v2 Brand-v1 target-mark + amber-period wordmark with zero delta.
//
// Gated: every v2 screen must check `UI.v2` from `src/lib/flags.js` before
// rendering. These primitives themselves are innocuous (importing them
// doesn't flip the UI), but any top-level page that assembles them is a
// visible v2 surface and belongs behind the flag.

export { default as Icon, SPORT_ICONS, UI_ICONS } from './Icon.jsx';
export { default as Crest } from './Crest.jsx';
export { default as Pill, LiveDot } from './Pill.jsx';
export { default as Card, CardHead } from './Card.jsx';
export { default as V2Button } from './Button.jsx';
export { default as Momentum } from './Momentum.jsx';
export { default as Spark } from './Spark.jsx';
export { default as Board } from './Board.jsx';
export { Skeleton, SkeletonLine, EmptyState, ErrorState } from './states.jsx';

// Re-export the v1 Logo — already matches Brand v1 / v2 spec (target-mark
// glyph + Inter Tight 900 wordmark with amber period). No duplicate needed.
export { default as Logo } from '../Logo.jsx';
