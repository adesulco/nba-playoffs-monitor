import React from 'react';

/**
 * Editorial footnote — "How was this written?" disclosure block that
 * sits at the bottom of every article in the redesigned shell (Phase
 * B). Surfaces AI involvement, sources, and editor in a compact
 * inverted-pyramid box.
 *
 * Phase 2 ship Phase A — additive primitive. The Phase B article
 * shell auto-renders this from frontmatter.
 *
 * Props:
 *   ai        — boolean. true = AI-assisted; false = human-only piece.
 *               Determines copy tone.
 *   sources   — array of {label, url?} or plain strings. Lists data
 *               feeds/links the article relied on. e.g.
 *               [{label:"ESPN play-by-play"}, {label:"API-Football",
 *               url:"https://www.api-football.com"}].
 *   editor    — string. Editor name. Defaults to "Tim editorial Gibol"
 *               when null/undefined per CLAUDE.md decision D1
 *               (Gibol Newsroom org for v1; named human editor on
 *               flagship matches by Month 3).
 *   model     — string. Model id ("claude-sonnet-4-6") for the
 *               attribution line. Optional; only rendered if `ai=true`.
 *   updatedAt — ISO timestamp. Optional; rendered as relative ("3 jam lalu").
 *   className — passthrough.
 *
 * Per CLAUDE.md non-negotiable rule #12, every generated article must
 * carry the AI disclosure footer. This component is the visual home;
 * the static disclosure copy continues to ship in the article body
 * itself (already in the Sonnet prompts).
 */

function _formatRelative(iso, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const diff = (now.getTime() - t.getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.round(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.round(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.round(diff / 86400)} hari lalu`;
  return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditorialFootnote({
  ai = true,
  sources = [],
  editor,
  model,
  updatedAt,
  className = '',
}) {
  const editorName = editor || 'Tim editorial Gibol';
  const updatedRel = _formatRelative(updatedAt);

  // Bahasa-first copy per CLAUDE.md rule #1. Phrasing aligns with the
  // static disclosure footer used in the Sonnet prompts so they don't
  // contradict each other.
  const lead = ai
    ? 'Konten ini disusun dengan bantuan AI dan diverifikasi oleh tim editorial Gibol.'
    : `Reportase dan penulisan oleh ${editorName}. Tidak ada AI yang digunakan.`;

  return (
    <aside
      className={`editorial-footnote ${className}`.trim()}
      style={{
        marginTop: 32,
        padding: '16px 18px',
        background: 'var(--bg-3)',
        border: '1px solid var(--line)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--ink-2)',
      }}
    >
      <div
        className="card-title"
        style={{
          marginBottom: 8,
          color: 'var(--amber)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Bagaimana artikel ini ditulis?
      </div>

      <p style={{ margin: 0, color: 'var(--ink)' }}>{lead}</p>

      {ai && (
        <p style={{ margin: '6px 0 0', color: 'var(--ink-2)' }}>
          Editor: {editorName}
          {model && (
            <span style={{ color: 'var(--ink-3)' }}>
              {' '}· Model: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{model}</code>
            </span>
          )}
        </p>
      )}

      {sources.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ color: 'var(--ink-3)', marginRight: 6 }}>Data live:</span>
          {sources.map((s, i) => {
            const label = typeof s === 'string' ? s : s.label;
            const url = typeof s === 'string' ? null : s.url;
            const sep = i === sources.length - 1 ? '' : ', ';
            return (
              <span key={i}>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}
                  >
                    {label}
                  </a>
                ) : (
                  <span style={{ color: 'var(--ink-2)' }}>{label}</span>
                )}
                {sep}
              </span>
            );
          })}
        </div>
      )}

      {updatedRel && (
        <div
          style={{
            marginTop: 8,
            color: 'var(--ink-3)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.4,
          }}
        >
          Diperbarui {updatedRel}
        </div>
      )}
    </aside>
  );
}
