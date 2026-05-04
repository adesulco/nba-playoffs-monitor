import React from 'react';

/**
 * <HubStatusStrip> — single canonical chrome row above hub content.
 *
 * Phase 2 Sprint B (v0.17.0). Replaces the inline `dashboard-hero` div
 * on every hub. One 44 px row on desktop, 64 px on mobile (2-row
 * collapse below 540 — picker on row 1 full-width, live + actions on
 * row 2).
 *
 *   ┌──────────────────────────────────────────────────────┐ 44 px
 *   │ [picker]            [live]               [actions]   │
 *   └──────────────────────────────────────────────────────┘
 *
 * Mobile (≤540):
 *   ┌──────────────────────────────────────────────────────┐ 32
 *   │ [picker — full width]                                │
 *   ├──────────────────────────────────────────────────────┤ 32
 *   │ [live]                              [actions]        │
 *   └──────────────────────────────────────────────────────┘
 *
 * Slots are children that callers compose:
 *   - `picker`   → typically a HubPicker / club picker / day picker
 *   - `live`     → live status pill + last-updated timestamp + meta
 *   - `actions`  → typically a <HubActionRow> with Copy + Share
 *
 * SEO h1 — pass `srOnlyTitle` to render an `<h1 className="sr-only">`
 * inline. Crawlers and screen readers see the page title; sighted
 * users see only the strip. This is how the directive's "strip the
 * hero, keep the SEO h1" rule is enforced.
 *
 * Mounted via the existing `setTopbarSubrow(...)` pattern OR rendered
 * inline at the top of the page. Either works — the strip is just a
 * styled flexbox.
 */
export default function HubStatusStrip({
  picker,
  live,
  actions,
  srOnlyTitle,
  accent,
  className,
  style,
}) {
  return (
    <>
      {srOnlyTitle ? (
        <h1
          className="sr-only"
          // .sr-only must already exist in src/index.css per Phase 1.
          // If not, the inline fallback styles below ensure it stays
          // visually hidden but accessible to AT.
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {srOnlyTitle}
        </h1>
      ) : null}

      <div
        className={`hub-status-strip${className ? ' ' + className : ''}`}
        role="region"
        aria-label="Page chrome"
        style={{
          width: '100%',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)',
          // Optional 3px sport-accent strip on the left — used by leaf
          // pages (club / driver / team) to carry team color into the
          // chrome without a full-bleed wash.
          borderLeft: accent ? `3px solid ${accent}` : 'none',
          ...style,
        }}
      >
        <div
          className="hub-status-strip__inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '6px 16px',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {picker && (
            <div
              className="hub-status-strip__picker"
              style={{ flex: '0 0 auto', minWidth: 0 }}
            >
              {picker}
            </div>
          )}
          {live && (
            <div
              className="hub-status-strip__live"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--ink-3)',
                fontSize: 11,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: 0.4,
              }}
            >
              {live}
            </div>
          )}
          {actions && (
            <div
              className="hub-status-strip__actions"
              style={{ flex: '0 0 auto', marginLeft: 'auto' }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
