import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AI byline pill — appears next to author bylines on every article
 * touched by the content engine. Two variants:
 *
 *   <AiByline />               — small inline pill (article meta row)
 *   <AiByline variant="bar" /> — full-width bar (Game Center live summary)
 *
 * Design source: design_handoff_gibol_v4/v4/extras.jsx#V4AiByline.
 *
 * Per CLAUDE.md non-negotiable rule #2 (AI disclosure): every generated
 * article must surface AI involvement. This is the v2 visual treatment;
 * the static AI-disclosure footer continues to render in body copy
 * (Phase 1 ship #5 added it via prompt — unchanged).
 *
 * Phase 2 ship Phase A — additive primitive. Routes wire it in
 * Phase B (article shell) + Phase D (Game Center live summary).
 *
 * Props:
 *   link      — when true, wraps the pill in a <Link> to /transparency
 *               (the editorial methodology page; built in a future
 *               ship). Default: true. Set false for non-clickable
 *               contexts (read-only previews, embedded screenshots).
 *   variant   — "pill" (default, inline) | "bar" (full-row, used in
 *               LiveSummaryCard).
 *   className — passthrough for layout overrides.
 *   children  — when provided, replaces the default "AI · HUMAN EDITED"
 *               label. Used by Game Center bar to show e.g. "AI live
 *               summary · diperbarui ~1m yang lalu".
 */
export default function AiByline({
  link = true,
  variant = 'pill',
  className = '',
  children,
}) {
  const inner = (
    <>
      <span className="dot-ai" aria-hidden="true" />
      {children || (
        <>
          AI · HUMAN EDITED
          {link && <span style={{ opacity: 0.7, marginLeft: 2 }}>↗</span>}
        </>
      )}
    </>
  );

  // Bar variant: wider padding, slight border, taking full width of
  // its container. Used inside <LiveSummaryCard>'s header.
  if (variant === 'bar') {
    const barStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 4,
      background: 'var(--amber-soft)',
      color: 'var(--amber)',
      border: '1px solid rgba(245,158,11,0.32)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    };
    if (link) {
      return (
        <Link
          to="/transparency"
          className={className}
          style={{ ...barStyle, textDecoration: 'none' }}
          title="AI-assisted, human edited"
        >
          {inner}
        </Link>
      );
    }
    return (
      <span className={className} style={barStyle} title="AI-assisted, human edited">
        {inner}
      </span>
    );
  }

  // Default pill — inherits .v2 .ai-byline styling from index.css
  // (v0.51.0 Phase A token block). Renders inline next to byline meta.
  if (link) {
    return (
      <Link
        to="/transparency"
        className={`ai-byline ${className}`.trim()}
        title="AI-assisted, human edited"
        style={{ cursor: 'pointer', textDecoration: 'none' }}
      >
        {inner}
      </Link>
    );
  }
  return (
    <span
      className={`ai-byline ${className}`.trim()}
      title="AI-assisted, human edited"
    >
      {inner}
    </span>
  );
}
