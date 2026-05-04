import React from 'react';

/**
 * Inline mid-article stat block — the "bench problem · Q3 minutes"
 * card that interrupts body copy with a compact data citation.
 *
 * Phase 2 ship Phase B (per docs/redesign-v4-handover.md §4 Phase B).
 *
 * Sport-agnostic: takes columns of {label, value, color, sub} and
 * lays them out in a responsive grid. Used inside <GeneratedArticle>'s
 * body when the markdown has a `:::data` fence (Phase B parser
 * extension), or directly composed in human-edited articles.
 *
 * Props:
 *   title       — short kicker label, e.g. "BENCH PROBLEM · Q3 MINUTES".
 *                 Renders as small mono uppercase.
 *   columns     — array of { label, value, color?, sub? }.
 *                   label  — small caption above value.
 *                   value  — primary number/text (large mono).
 *                   color  — optional accent for value (defaults to ink).
 *                   sub    — optional sub-label rendered under value.
 *   note        — optional small footnote (right-aligned mono).
 *   variant     — "default" (bordered card) | "embedded" (no border,
 *                 used when card sits inside another card).
 *   className   — passthrough.
 *
 * Mobile-first: columns wrap to 2-up on <520px viewport (single row
 * stays for ≤2 columns; 3-4 cols collapse to 2x2 grid).
 */

export default function InlineDataCard({
  title,
  columns = [],
  note,
  variant = 'default',
  className = '',
}) {
  if (!columns.length) return null;

  const containerStyle = variant === 'embedded'
    ? {
        margin: '20px 0',
        padding: '12px 0',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }
    : {
        margin: '28px 0',
        padding: '14px 16px',
        background: 'var(--bg-3)',
        border: '1px solid var(--line)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 6,
      };

  const colCount = columns.length;
  // Responsive grid:
  //   1 col   → single row
  //   2 cols  → 2-up always
  //   3-4 cols → 2-up on mobile, N-up on desktop
  const desktopCols = `repeat(${colCount}, minmax(0, 1fr))`;
  const mobileCols = colCount <= 2 ? desktopCols : 'repeat(2, minmax(0, 1fr))';

  return (
    <aside className={`v2 inline-data-card ${className}`.trim()} style={containerStyle}>
      {(title || note) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 10,
          }}
        >
          {title && (
            <span
              className="card-title"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--amber)',
              }}
            >
              {title}
            </span>
          )}
          {note && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.08em',
              }}
            >
              {note}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileCols,
          gap: '12px 18px',
        }}
        className="inline-data-grid"
      >
        {columns.map((col, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 4,
              }}
            >
              {col.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(20px, 3.6vw, 28px)',
                fontWeight: 700,
                lineHeight: 1.05,
                fontVariantNumeric: 'tabular-nums',
                color: col.color || 'var(--ink)',
              }}
            >
              {col.value}
            </div>
            {col.sub && (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  lineHeight: 1.35,
                }}
              >
                {col.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Media-query for 520px+: bump grid to N columns when room allows. */}
      <style>{`
        @media (min-width: 520px) {
          .inline-data-card .inline-data-grid {
            grid-template-columns: ${desktopCols};
          }
        }
      `}</style>
    </aside>
  );
}
