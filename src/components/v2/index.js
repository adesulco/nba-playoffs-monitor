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

// v0.51.0 — Phase A redesign primitives (per docs/redesign-v4-handover.md).
// Additive: every existing component still renders identically. Phase B
// (article shell) and Phase D (Game Center live summary) consume these.
export { default as AiByline } from './AiByline.jsx';
export { default as EditorialFootnote } from './EditorialFootnote.jsx';

// v0.52.0 — Phase B redesign primitives (article shell building blocks).
// Imported by GeneratedArticle.jsx in Phase B's editorial wrap. Sport-
// agnostic; consumed by Phase D's Game Center hero too.
export { default as HeroBand } from './HeroBand.jsx';
export { default as PullQuote } from './PullQuote.jsx';
export { default as InlineDataCard } from './InlineDataCard.jsx';

// v0.53.0 — Phase C redesign primitives (hub revamp + Newsroom Slice).
// SectionRule = editorial divider; NewsroomSlice = 3-up article grid
// at hub bottom; SubNav = second-tier hub navigation. All ship gated
// behind UI.v2 flag in flags.js — old hubs render unchanged when off.
export { default as SectionRule } from './SectionRule.jsx';
export { default as NewsroomSlice } from './NewsroomSlice.jsx';
export { default as SubNav } from './SubNav.jsx';

// v0.55.0 — Phase D redesign primitives (NBA Game Center). Consumed
// by src/pages/NBAGameCenter.jsx. Sport-agnostic: QuarterTable
// accepts arbitrary periods (works for halves/sets too); PlayFeed
// + SeriesTracker accept generic per-event row shapes. LiveSummaryCard
// ships in stub mode pending v0.55.1 backend infra.
export { default as QuarterTable } from './QuarterTable.jsx';
export { default as PlayerStatCard } from './PlayerStatCard.jsx';
export { default as LiveSummaryCard } from './LiveSummaryCard.jsx';
export { default as PlayFeed } from './PlayFeed.jsx';
export { default as SeriesTracker } from './SeriesTracker.jsx';
