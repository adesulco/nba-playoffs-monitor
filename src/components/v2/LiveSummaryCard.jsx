import React from 'react';
import AiByline from './AiByline.jsx';

/**
 * Amber-bordered card with AI-generated live summary of an in-progress
 * sport event. Header shows AI byline + relative-time meta; body is
 * markdown-style prose. Source line attributes the data feed.
 *
 * Phase 2 ship Phase D (per docs/redesign-v4-handover.md §4 Phase D).
 *
 * v0.55.0 v1: STUB MODE. The backend infra (game_summaries table +
 * /api/game-summary edge function + cron) is deferred to v0.55.1
 * because Vercel Hobby is at 12/12 functions and adding a new route
 * requires consolidation. For now this component renders a "Coming
 * soon" placeholder when no `body` prop is passed; the page mounts
 * it as a visual hook for the section while the data layer ships
 * separately.
 *
 * Props:
 *   body         — markdown-string body of the AI summary. When null,
 *                  renders a placeholder "Coming soon" message.
 *   updatedAt    — ISO timestamp of last refresh.
 *   sources      — array of {label, url?} feeds the summary cited.
 *   forceRefresh — optional callback for an editor-only "Refresh" button.
 *   className    — passthrough.
 */

function _formatRelative(iso, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const diff = (now.getTime() - t.getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.round(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.round(diff / 3600)} jam lalu`;
  return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function LiveSummaryCard({
  body,
  updatedAt,
  sources = [],
  forceRefresh,
  className = '',
}) {
  const stub = !body || !body.trim();
  const updatedRel = _formatRelative(updatedAt);

  return (
    <section
      className={`v2 live-summary-card ${className}`.trim()}
      style={{
        padding: '14px 16px',
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.32)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 8,
        marginTop: 16,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <AiByline variant="bar" link={false}>
          AI live summary
        </AiByline>
        {updatedRel && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
            }}
          >
            diperbarui {updatedRel}
          </span>
        )}
        {forceRefresh && (
          <button
            type="button"
            onClick={forceRefresh}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
              color: 'var(--amber)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        )}
      </header>

      {stub ? (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            fontStyle: 'italic',
          }}
        >
          AI live summary akan tersedia di v0.55.1 — backend cron + edge
          function masih dalam tahap kerja. Sementara, baca play feed di
          panel kanan untuk update real-time.
        </div>
      ) : (
        <div
          className="live-summary-body"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--ink)',
          }}
        >
          {/* Body is plain markdown-ish text. Caller should pass it
              already-cleaned. Linebreaks become paragraphs. */}
          {body.split(/\n\n+/).map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>
              {p}
            </p>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <footer
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(245,158,11,0.2)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            color: 'var(--ink-3)',
          }}
        >
          Sumber:{' '}
          {sources.map((s, i) => {
            const label = typeof s === 'string' ? s : s.label;
            const url = typeof s === 'string' ? null : s.url;
            const sep = i === sources.length - 1 ? '' : ', ';
            return (
              <span key={i}>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-2)' }}>
                    {label}
                  </a>
                ) : label}
                {sep}
              </span>
            );
          })}
        </footer>
      )}
    </section>
  );
}
