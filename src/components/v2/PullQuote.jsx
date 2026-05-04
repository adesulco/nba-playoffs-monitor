import React from 'react';

/**
 * Editorial pull-quote — used for `<blockquote>` styling inside the
 * v4 article shell. Italic Newsreader serif on amber left rule.
 *
 * Phase 2 ship Phase B (per docs/redesign-v4-handover.md §4 Phase B).
 * Source: design_handoff_gibol_v4/v4/nba.jsx#L461 (the v4 inline
 * blockquote pattern).
 *
 * Two ways to use:
 *   1. Wrap content directly:
 *        <PullQuote attribution="Joe Mazzulla, post-game">
 *          Defense traveled. Offense will follow.
 *        </PullQuote>
 *   2. As a markdown override — pass children as the quote body and
 *      let the article shell pick it up automatically.
 *
 * Mobile-first: max-width caps at the body reading column (720px);
 * left rule + padding shrink on narrow viewports.
 *
 * Props:
 *   children    — quote text (string or rich React node).
 *   attribution — optional. Renders as a small mono caption below
 *                 the quote, prefixed with em-dash.
 *   variant     — "default" (amber rule) | "muted" (line rule).
 *                 Muted reads quieter for editor-flagged sidebar
 *                 quotes vs the lead pull-out.
 *   className   — passthrough.
 */

export default function PullQuote({
  children,
  attribution,
  variant = 'default',
  className = '',
}) {
  const ruleColor = variant === 'muted' ? 'var(--line-loud)' : 'var(--amber)';

  return (
    <blockquote
      className={`v2 pull-quote ${className}`.trim()}
      style={{
        margin: '28px 0',
        padding: '4px 0 4px clamp(16px, 4vw, 24px)',
        borderLeft: `3px solid ${ruleColor}`,
        fontFamily: 'Newsreader, "Inter Tight", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: 'clamp(18px, 2.4vw, 22px)',
        lineHeight: 1.45,
        color: 'var(--ink)',
        // Bahasa-friendly typographic quotes are not added here — keep
        // the markdown body's quote characters as authored. Editor adds
        // typographic quotes only when the source is dialog.
      }}
    >
      <div style={{ marginBottom: attribution ? 8 : 0 }}>{children}</div>
      {attribution && (
        <footer
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontStyle: 'normal',
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
          }}
        >
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}
