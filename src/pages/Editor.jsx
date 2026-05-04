import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import {
  EDITOR_EMAIL,
  approveArticle,
  approveBatch,
  editArticle,
  fetchArticleEdits,
  fetchPublishLedger,
  fetchRejectionLedger,
  dispatchGeneration,
  planGeneration,
  rejectArticle,
  useEditorSession,
} from '../lib/editorAuth.js';
import { supabase } from '../lib/supabase.js';

/**
 * /editor — manual-review dashboard for content-engine articles.
 *
 * Phase 1 ship #10 (v0.31.0). Now auth-gated: only the email matching
 * VITE_EDITOR_EMAIL can load the dashboard. Anonymous → redirected to
 * /login?next=/editor. Wrong email → "Access denied" screen with
 * sign-out option.
 *
 * Per-article Approve button writes to ce_article_publishes via
 * /api/approve. Once approved, the article body becomes publicly
 * visible (SPA reads the ledger to gate /preview, /match-recap,
 * /standings rendering). The next deploy folds approved articles
 * into the sitemap + emits indexable HTML; until then they're
 * client-side-only.
 *
 * The dashboard fetches BOTH:
 *   1. /content/index.json — full article metadata (built at deploy)
 *   2. ce_article_publishes Supabase rows — current publication state
 *
 * Status icons in the table reflect the ledger state, not the JSON
 * frontmatter. After clicking Approve, the row updates immediately
 * (optimistic) and re-fetches the ledger to confirm.
 */

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'preview', label: 'Preview' },
  { id: 'recap', label: 'Recap' },
  { id: 'standings', label: 'Klasemen' },
  { id: 'team', label: 'Profil' },
  { id: 'h2h', label: 'H2H' },
  { id: 'pending', label: 'Pending review' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
];

// Score-tier filters layered on top of the type/status filters
// (Phase 2 ship #26). Combine with the type chips: e.g. "Profil" +
// "≥85" surfaces every profile article that's safe to one-click.
const SCORE_TIERS = [
  { id: 'all', label: 'Semua skor', color: null },
  { id: 'high', label: '≥85 (ship as-is)', color: '#10B981' },
  { id: 'mid', label: '70–84 (review)', color: '#F59E0B' },
  { id: 'low', label: '<70 (regen)', color: '#EF4444' },
];

const SORTS = [
  // Triage order (Phase 2 ship #26): pending first, time-sensitive
  // types first (recap → preview → standings → team → h2h), then
  // newest, then score desc. One-click priority surface for ade.
  { id: 'triage', label: 'Triage order (recommended)' },
  { id: 'score-asc', label: 'Lint score (worst first)' },
  { id: 'score-desc', label: 'Lint score (best first)' },
  { id: 'newest', label: 'Newest first' },
  { id: 'cost-desc', label: 'Cost (highest first)' },
];

// Type priority for triage sort. Lower = surfaces first. Time-sensitive
// content (recaps especially) ages fastest — playoff recap loses share
// value within 24-48h; profile is evergreen.
const TRIAGE_TYPE_RANK = {
  recap: 0,
  preview: 1,
  standings: 2,
  team: 3,
  h2h: 4,
};

function fmtScore(s) {
  if (s == null) return '—';
  return `${s}`;
}

function scoreColor(s) {
  if (s == null) return C.dim;
  if (s >= 85) return '#10B981';
  if (s >= 70) return '#F59E0B';
  return '#EF4444';
}

function fmtCost(c) {
  if (c == null) return '—';
  return `$${Number(c).toFixed(4)}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Auth gate screens ────────────────────────────────────────────────────

function AccessDenied({ user }) {
  return (
    <main style={{ maxWidth: 600, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <SEO title="Access denied · gibol.co" path="/editor" noindex />
      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
        Access denied
      </h1>
      <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        Anda masuk sebagai <code>{user?.email || 'unknown'}</code>, tapi halaman editor hanya
        bisa diakses oleh editor terdaftar.
      </p>
      <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/" style={{
          padding: '8px 14px', fontSize: 13, fontWeight: 700,
          background: 'transparent', color: C.text,
          border: `1px solid ${C.line}`, borderRadius: 4, textDecoration: 'none',
        }}>← Kembali ke beranda</Link>
        <button
          type="button"
          onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/'; })}
          style={{
            padding: '8px 14px', fontSize: 13, fontWeight: 700,
            background: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
          }}
        >Keluar</button>
      </div>
    </main>
  );
}

// Phase 2 ship #28 — expandable issue/suggestion panel for a single
// article row. Lazy-fetches /content/{type}/{slug}.json on first
// expand (the index.json strips the heavy arrays for size). Renders
// voice-lint issues + Opus QC suggestions side-by-side so editor sees
// the full critique inline without leaving the queue.
function IssueDetail({ article }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/content/${article.type}/${article.slug}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); });
    return () => { cancelled = true; };
  }, [article.type, article.slug]);

  if (error) {
    return (
      <div style={{ padding: 12, color: '#EF4444', fontSize: 12 }}>
        Couldn't load issues: {error}
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 12, color: C.dim, fontSize: 12 }}>Loading issues…</div>;
  }
  const fm = data.frontmatter || {};
  const lintIssues = fm.voice_lint?.issues || [];
  const qcSuggestions = fm.qc_review?.suggestions || [];

  const sevColor = (s) => {
    const k = (s || '').toLowerCase();
    if (k === 'high') return '#EF4444';
    if (k === 'medium') return '#F59E0B';
    if (k === 'low') return '#9CA3AF';
    return C.dim;
  };

  return (
    <div style={{
      padding: '12px 16px 16px',
      background: 'rgba(255,255,255,0.02)',
      borderTop: `1px dashed ${C.line}`,
      fontSize: 12, lineHeight: 1.5,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Voice-lint issues column */}
        <div>
          <div style={{
            color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8,
          }}>
            Voice-lint issues ({lintIssues.length})
          </div>
          {lintIssues.length === 0 ? (
            <div style={{ color: C.dim, fontStyle: 'italic' }}>
              {fm.voice_lint?.issue_count > 0
                ? 'Issues exist but per-issue details weren\'t saved when this article was generated. Re-run lint via CLI to populate.'
                : 'No issues flagged.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lintIssues.map((iss, i) => (
                <div key={i} style={{
                  padding: 8,
                  background: 'rgba(0,0,0,0.25)',
                  borderLeft: `3px solid ${sevColor(iss.severity)}`,
                  borderRadius: 4,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                    marginBottom: 4,
                  }}>
                    <span style={{
                      color: sevColor(iss.severity), fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{iss.severity || 'medium'}</span>
                    <span style={{ color: C.dim, fontSize: 10 }}>{iss.type}</span>
                  </div>
                  <div style={{ color: C.text, marginBottom: 4, fontStyle: 'italic' }}>
                    "{iss.snippet}"
                  </div>
                  {iss.fix && (
                    <div style={{ color: '#10B981', fontSize: 11 }}>
                      <strong>Fix:</strong> {iss.fix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QC suggestions column */}
        <div>
          <div style={{
            color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8,
          }}>
            Opus QC suggestions ({qcSuggestions.length})
          </div>
          {qcSuggestions.length === 0 ? (
            <div style={{ color: C.dim, fontStyle: 'italic' }}>
              {fm.qc_review
                ? (fm.qc_review.suggestion_count > 0
                  ? 'QC ran but suggestions weren\'t saved when this article was generated. Re-run via CLI to populate.'
                  : 'No suggestions flagged.')
                : 'Not in QC sample (10% rate). Skip or re-run with QC_SAMPLE_RATE=1.0 to force.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qcSuggestions.map((s, i) => (
                <div key={i} style={{
                  padding: 8,
                  background: 'rgba(0,0,0,0.25)',
                  borderLeft: `3px solid ${sevColor(s.priority)}`,
                  borderRadius: 4,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                    marginBottom: 4,
                  }}>
                    <span style={{
                      color: sevColor(s.priority), fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{s.priority || 'medium'}</span>
                  </div>
                  {s.snippet && (
                    <div style={{ color: C.text, marginBottom: 4, fontStyle: 'italic' }}>
                      "{s.snippet}"
                    </div>
                  )}
                  {s.issue && (
                    <div style={{ color: C.dim, marginBottom: 4 }}>
                      <strong>Issue:</strong> {s.issue}
                    </div>
                  )}
                  {s.fix && (
                    <div style={{ color: '#10B981' }}>
                      <strong>Fix:</strong> {s.fix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* QC section comments — Headline / Lead / Structure / Voice */}
          {fm.qc_review && (fm.qc_review.headline_comment || fm.qc_review.lead_comment) && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
              <div style={{
                color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.5, marginBottom: 6,
              }}>QC section scores</div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 30px 1fr', gap: 4, fontSize: 11 }}>
                {[
                  ['Headline', fm.qc_review.headline_score, fm.qc_review.headline_comment],
                  ['Lead',     fm.qc_review.lead_score,     fm.qc_review.lead_comment],
                  ['Structure',fm.qc_review.structure_score,fm.qc_review.structure_comment],
                  ['Voice',    fm.qc_review.voice_score,    fm.qc_review.voice_comment],
                ].map(([label, score, comment]) => (
                  <React.Fragment key={label}>
                    <div style={{ color: C.dim }}>{label}</div>
                    <div style={{
                      color: score >= 85 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444',
                      fontWeight: 700, textAlign: 'right',
                    }}>{score}</div>
                    <div style={{ color: C.text }}>{comment || '—'}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Phase 2 ship #30A — generate-on-demand panel. Editor types a
// natural-language request; Haiku parses + ESPN/API-Football/jolpica
// resolvers map to specific IDs; response = list of CLI commands the
// editor copies + runs locally. v1 stops at "plan" — v2/Ship #30B
// will dispatch via GitHub Actions for hands-free generation.
function GeneratePanel({ open, onToggle }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [copyState, setCopyState] = useState('idle'); // idle | copied
  // v0.59.1 — Ship #30B — dispatch state.
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        style={{
          padding: '8px 14px', fontSize: 12, fontWeight: 700,
          background: 'rgba(245,158,11,0.12)',
          color: C.amber || '#F59E0B',
          border: `1px solid ${(C.amber || '#F59E0B') + '55'}`,
          borderRadius: 6, cursor: 'pointer',
        }}
      >
        ✨ Generate articles…
      </button>
    );
  }

  const submit = async () => {
    if (busy || prompt.trim().length < 5) return;
    setBusy(true);
    setResult(null);
    setDispatchResult(null);
    try {
      // v0.59.1 — Multi-line / multi-sport support. Each non-empty
      // line is planned separately in parallel; results are merged
      // into a single items list. Lets editor batch
      // "previews for tomorrow's NBA games / EPL gameweek 36
      // previews / ATP rankings explainer" in one go.
      const lines = prompt
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length >= 5);
      if (lines.length === 0) {
        setResult({ ok: false, message: 'Enter at least one prompt (5+ chars).' });
        return;
      }
      if (lines.length === 1) {
        const r = await planGeneration({ prompt: lines[0] });
        setResult(r);
        return;
      }
      // Multi-line — fan out, merge.
      const results = await Promise.all(
        lines.map((p) => planGeneration({ prompt: p }).catch((e) => ({
          ok: false, message: String(e?.message || e), prompt: p,
        }))),
      );
      const allItems = [];
      const allNotes = [];
      const explanations = [];
      const fails = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.ok) {
          if (r.intent?.explanation) explanations.push(r.intent.explanation);
          if (Array.isArray(r.items)) allItems.push(...r.items);
          if (Array.isArray(r.notes)) allNotes.push(...r.notes);
        } else {
          fails.push(`"${lines[i].slice(0, 60)}" — ${r.message || 'parse failed'}`);
        }
      }
      if (allItems.length === 0) {
        setResult({
          ok: false,
          message: fails.length
            ? `All ${lines.length} prompts failed:\n• ${fails.join('\n• ')}`
            : 'No items resolved across any prompt.',
        });
        return;
      }
      setResult({
        ok: true,
        intent: { explanation: explanations.join(' + ') || `${lines.length}-line batch` },
        items: allItems,
        notes: [
          ...allNotes,
          ...(fails.length ? [`Skipped: ${fails.join('; ')}`] : []),
        ],
        instructions: `Merged ${allItems.length} commands across ${results.filter((r) => r.ok).length} successful prompts.`,
      });
    } catch (e) {
      setResult({ ok: false, message: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const copyAllCommands = async () => {
    if (!result?.items?.length) return;
    const text = result.items.map((it) => it.command).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  };

  const runOnGitHub = async () => {
    if (dispatching || !result?.items?.length) return;
    const commands = result.items.map((it) => it.command);
    setDispatching(true);
    setDispatchResult(null);
    try {
      const r = await dispatchGeneration({
        commands,
        label: result.intent?.explanation || 'on-demand',
      });
      setDispatchResult(r);
    } catch (e) {
      setDispatchResult({ ok: false, error: String(e?.message || e) });
    } finally {
      setDispatching(false);
    }
  };

  const presets = [
    'Generate previews for tomorrow\'s NBA playoff games',
    'Recap yesterday\'s NBA games',
    'EPL gameweek 36 previews',
    'Profile for Persib Bandung',
    'F1 race recap for round 5',
    'ATP rankings explainer',
  ];

  // v0.59.1 — Multi-line presets that pre-fill the textarea with a
  // common batch shape. Append, don't replace, so editor can stack
  // them.
  const batchPresets = [
    {
      label: '✨ Tonight: NBA + EPL + Liga 1',
      lines: [
        'Recap yesterday\'s NBA games',
        'EPL fixtures today',
        'Liga 1 fixtures today',
      ],
    },
    {
      label: '✨ Weekly: standings + rankings',
      lines: [
        'EPL standings explainer',
        'Liga 1 standings explainer',
        'ATP rankings explainer',
        'WTA rankings explainer',
      ],
    },
  ];

  const appendPreset = (lines) => {
    const existing = prompt.trim();
    const next = existing
      ? `${existing}\n${lines.join('\n')}`
      : lines.join('\n');
    setPrompt(next);
  };

  return (
    <section style={{
      marginBottom: 16, padding: 14,
      background: 'rgba(245,158,11,0.06)',
      border: `1px solid ${(C.amber || '#F59E0B') + '55'}`,
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: C.amber || '#F59E0B', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ✨ Generate articles
        </h2>
        <button
          type="button"
          onClick={onToggle}
          style={{
            padding: '4px 10px', fontSize: 11, color: C.dim,
            background: 'transparent', border: `1px solid ${C.line}`,
            borderRadius: 4, cursor: 'pointer',
          }}
        >Hide</button>
      </div>

      <p style={{ color: C.dim, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
        Describe what you want — <strong>one prompt per line</strong> for multi-sport batches.
        <br/>
        <strong>🚀 Run + auto-deploy</strong> ships everything via GitHub Actions (commits + auto-redeploy).
        <strong> 📋 Copy all</strong> falls back to local CLI in
        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0 4px', margin: '0 4px' }}>
          packages/content-engine/
        </code>.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={"e.g.\nprevíews for tomorrow's NBA playoff games\nEPL gameweek 36 previews\nATP rankings explainer"}
          disabled={busy}
          rows={4}
          style={{
            flex: 1, padding: '8px 10px',
            background: '#000', color: C.text,
            border: `1px solid ${C.line}`, borderRadius: 6,
            fontSize: 13, lineHeight: 1.4, resize: 'vertical',
            fontFamily: 'inherit',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || prompt.trim().length < 5}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 800,
            background: busy ? C.line : (C.amber || '#F59E0B'),
            color: '#000', border: 'none', borderRadius: 6,
            cursor: busy ? 'wait' : 'pointer',
            opacity: prompt.trim().length < 5 ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >{busy ? 'Planning…' : 'Plan'}</button>
      </div>

      {/* Quick presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrompt(p)}
            disabled={busy}
            style={{
              padding: '4px 10px', fontSize: 10, color: C.dim,
              background: 'transparent', border: `1px dashed ${C.line}`,
              borderRadius: 4, cursor: 'pointer',
            }}
          >{p}</button>
        ))}
      </div>

      {/* v0.59.1 — Batch presets append a multi-line shape to the prompt */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {batchPresets.map((bp) => (
          <button
            key={bp.label}
            type="button"
            onClick={() => appendPreset(bp.lines)}
            disabled={busy}
            style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              color: C.amber || '#F59E0B',
              background: 'rgba(245,158,11,0.08)',
              border: `1px solid ${(C.amber || '#F59E0B') + '55'}`,
              borderRadius: 4, cursor: 'pointer',
            }}
          >{bp.label}</button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 12 }}>
          {!result.ok ? (
            <div style={{
              padding: 10,
              background: '#EF444422',
              border: `1px solid #EF444466`,
              borderRadius: 6,
              fontSize: 12, color: '#FCA5A5',
            }}>
              <strong style={{ color: '#EF4444' }}>Couldn't plan that:</strong> {result.message}
              {result.intent?.explanation && (
                <div style={{ marginTop: 6, fontSize: 11, color: C.dim }}>
                  Intent parser: <em>{result.intent.explanation}</em>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8, gap: 10,
              }}>
                <div style={{ fontSize: 12, color: C.dim }}>
                  Plan: <strong style={{ color: C.text }}>{result.intent?.explanation}</strong>{' '}
                  · {result.items?.length} command{result.items?.length === 1 ? '' : 's'}
                </div>
                {result.items?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={runOnGitHub}
                      disabled={dispatching || dispatchResult?.ok}
                      style={{
                        padding: '6px 12px', fontSize: 11, fontWeight: 800,
                        background: dispatchResult?.ok ? '#10B981' : '#7C3AED',
                        color: '#fff', border: 'none', borderRadius: 4,
                        cursor: dispatching ? 'wait' : (dispatchResult?.ok ? 'default' : 'pointer'),
                        whiteSpace: 'nowrap',
                        opacity: dispatching ? 0.7 : 1,
                      }}
                    >
                      {dispatchResult?.ok
                        ? '✓ Dispatched'
                        : dispatching
                        ? 'Dispatching…'
                        : '🚀 Run + auto-deploy'}
                    </button>
                    <button
                      type="button"
                      onClick={copyAllCommands}
                      style={{
                        padding: '6px 12px', fontSize: 11, fontWeight: 700,
                        background: copyState === 'copied' ? '#10B981' : (C.amber || '#F59E0B'),
                        color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >{copyState === 'copied' ? '✓ Copied' : '📋 Copy all (run local)'}</button>
                  </div>
                )}
              </div>

              {/* Dispatch result banner */}
              {dispatchResult && (
                <div style={{
                  marginTop: 8, padding: 10,
                  background: dispatchResult.ok ? '#10B98122' : '#EF444422',
                  border: `1px solid ${dispatchResult.ok ? '#10B98166' : '#EF444466'}`,
                  borderRadius: 6,
                  fontSize: 11, color: dispatchResult.ok ? '#86EFAC' : '#FCA5A5',
                  lineHeight: 1.5,
                }}>
                  {dispatchResult.ok ? (
                    <>
                      <strong style={{ color: '#10B981' }}>
                        ✓ Dispatched {dispatchResult.dispatched_count} command
                        {dispatchResult.dispatched_count === 1 ? '' : 's'}
                      </strong>
                      {dispatchResult.dropped_count > 0 && (
                        <span> ({dispatchResult.dropped_count} dropped — failed safety regex)</span>
                      )}
                      .{' '}
                      Runner will commit + push, which auto-redeploys Vercel.
                      {dispatchResult.runs_url && (
                        <>
                          {' '}
                          <a
                            href={dispatchResult.runs_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#86EFAC', textDecoration: 'underline' }}
                          >
                            Watch on GitHub →
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#EF4444' }}>Dispatch failed:</strong>{' '}
                      {dispatchResult.error || dispatchResult.detail || 'unknown error'}
                      {dispatchResult.error === 'GITHUB_PAT not configured' && (
                        <div style={{ marginTop: 6, color: C.dim, fontSize: 10 }}>
                          One-time setup: create a fine-grained GitHub PAT
                          (Contents:Write + Actions:Write for adesulco/nba-playoffs-monitor)
                          and add it to Vercel env as <code>GITHUB_PAT</code>.
                          Then redeploy. Local CLI fallback still works above.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {result.items?.length > 0 ? (
                <div style={{
                  padding: 10,
                  background: 'rgba(0,0,0,0.4)',
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11, lineHeight: 1.5,
                  overflowX: 'auto',
                }}>
                  {result.items.map((it, i) => (
                    <div key={i} style={{ marginBottom: i === result.items.length - 1 ? 0 : 8 }}>
                      <div style={{ color: C.dim, fontSize: 10, marginBottom: 2 }}># {it.label}</div>
                      <div style={{ color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {it.command}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: C.dim, fontSize: 12, fontStyle: 'italic' }}>
                  No items resolved.
                </div>
              )}

              {result.notes?.length > 0 && (
                <div style={{ marginTop: 8, padding: 8,
                  background: 'rgba(245,158,11,0.08)',
                  border: `1px solid ${(C.amber || '#F59E0B') + '33'}`,
                  borderRadius: 4, fontSize: 11, color: C.dim,
                }}>
                  <strong style={{ color: C.amber || '#F59E0B' }}>Notes:</strong>
                  <ul style={{ margin: '4px 0 0 14px', padding: 0 }}>
                    {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}

              {result.instructions && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
                  <em>{result.instructions}</em>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Phase 2 ship #29 — inline edit modal. Three panels:
//   1. Left: textarea with the body markdown (resizable, monospace)
//   2. Right top: voice-lint issues + Opus QC suggestions (same shape
//      as IssueDetail, just trimmed)
//   3. Right bottom: source-context block hint — basic frontmatter
//      fields that fed the writer, so editor can spot-check grounding
//      while editing
//
// Save fires editArticle() → /api/approve action="edit" → upserts
// ce_article_edits with lint_stale=true. The edited body shows on the
// public article page immediately (SPA overlay); prerender picks it
// up at next deploy for the static HTML.
function EditModal({ state, onChange, onSave, onClose }) {
  const [note, setNote] = useState('');
  if (!state) return null;
  const { article, body, articleData, busy, error } = state;
  const fm = articleData?.frontmatter || {};
  const lintIssues = fm.voice_lint?.issues || [];
  const qcSuggestions = fm.qc_review?.suggestions || [];

  const sevColor = (s) => {
    const k = (s || '').toLowerCase();
    if (k === 'high') return '#EF4444';
    if (k === 'medium') return '#F59E0B';
    if (k === 'low') return '#9CA3AF';
    return C.dim;
  };

  // Source-context heuristic: any frontmatter field that looks like
  // the input data block fed to the writer. Mirrors the backfill
  // script's _reconstruct_source_context, kept as a quick visual
  // reference only.
  const sourceFields = [
    ['league', fm.league], ['competition', fm.competition], ['season', fm.season_label],
    ['home', fm.home_team], ['away', fm.away_team],
    ['score', fm.home_score != null && fm.away_score != null ? `${fm.home_score}-${fm.away_score}` : null],
    ['team', fm.team_name], ['country', fm.team_country], ['founded', fm.team_founded],
    ['venue', fm.venue_name], ['athlete', fm.athlete_name], ['driver', fm.driver_name],
    ['championship_pos', fm.championship_pos], ['championship_points', fm.championship_points],
    ['current_rank', fm.current_rank], ['points', fm.points],
    ['as_of', fm.as_of_id], ['kickoff', fm.kickoff_utc],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
      padding: 16,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1200, width: '100%', maxHeight: '92vh',
          padding: 20, background: '#0b0b0b',
          border: `1px solid ${C.line}`, borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <header style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>
              ✎ Edit body — {article.title}
            </h2>
            <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>
              {article.type} · {article.slug} · {body.length} chars
              {fm.voice_lint?.score != null && ` · lint score ${fm.voice_lint.score}`}
              {fm.qc_review?.verdict && ` · QC ${fm.qc_review.verdict}`}
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: 'transparent', color: C.text,
              border: `1px solid ${C.line}`, borderRadius: 6, cursor: 'pointer',
            }}
          >Cancel</button>
        </header>

        {error && (
          <div style={{ padding: 10, background: '#EF444422', color: '#EF4444', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
            {error}
          </div>
        )}
        {busy && !articleData && (
          <div style={{ padding: 30, color: C.dim, textAlign: 'center', fontSize: 13 }}>Loading article…</div>
        )}

        {articleData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 16,
            flex: 1, minHeight: 0, overflowY: 'hidden',
          }}>
            {/* LEFT: textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <textarea
                value={body}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
                disabled={busy}
                style={{
                  width: '100%', flex: 1, minHeight: 360,
                  padding: 12,
                  background: '#000', color: C.text,
                  border: `1px solid ${C.line}`, borderRadius: 6,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 13, lineHeight: 1.55,
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Edit notes (optional, e.g. 'fixed Juara Dunia training inference')"
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: '6px 10px', fontSize: 12,
                    background: 'transparent', color: C.text,
                    border: `1px solid ${C.line}`, borderRadius: 6,
                  }}
                />
                <button
                  type="button"
                  onClick={() => onSave(note)}
                  disabled={busy || body.trim().length < 50}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 800,
                    background: busy ? C.line : '#10B981',
                    color: '#fff', border: 'none', borderRadius: 6,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >{busy ? 'Saving…' : 'Save edit'}</button>
              </div>
              <div style={{ color: C.dim, fontSize: 10, marginTop: 6 }}>
                Save flags this article as <code>lint_stale=true</code>. Bulk-approve ≥85
                will skip it until re-linted (CLI re-run or #29.5 polish ship).
              </div>
            </div>

            {/* RIGHT: issues + source context */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: 0, overflowY: 'auto',
              padding: '0 4px 0 0',
            }}>
              <div>
                <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Voice-lint issues ({lintIssues.length})
                </div>
                {lintIssues.length === 0 ? (
                  <div style={{ color: C.dim, fontSize: 11, fontStyle: 'italic' }}>None.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lintIssues.map((iss, i) => (
                      <div key={i} style={{
                        padding: 7, fontSize: 11,
                        background: 'rgba(0,0,0,0.25)',
                        borderLeft: `3px solid ${sevColor(iss.severity)}`,
                        borderRadius: 4,
                      }}>
                        <div style={{ color: sevColor(iss.severity), fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>
                          {iss.severity || 'medium'} · {iss.type}
                        </div>
                        <div style={{ color: C.text, fontStyle: 'italic', marginBottom: 3 }}>
                          "{iss.snippet}"
                        </div>
                        {iss.fix && (
                          <div style={{ color: '#10B981' }}>→ {iss.fix}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Opus QC suggestions ({qcSuggestions.length})
                </div>
                {qcSuggestions.length === 0 ? (
                  <div style={{ color: C.dim, fontSize: 11, fontStyle: 'italic' }}>
                    {fm.qc_review ? 'None.' : 'Not in QC sample.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {qcSuggestions.map((s, i) => (
                      <div key={i} style={{
                        padding: 7, fontSize: 11,
                        background: 'rgba(0,0,0,0.25)',
                        borderLeft: `3px solid ${sevColor(s.priority)}`,
                        borderRadius: 4,
                      }}>
                        <div style={{ color: sevColor(s.priority), fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>
                          {s.priority || 'medium'}
                        </div>
                        {s.snippet && (
                          <div style={{ color: C.text, fontStyle: 'italic', marginBottom: 3 }}>"{s.snippet}"</div>
                        )}
                        {s.issue && <div style={{ color: C.dim, marginBottom: 3 }}>{s.issue}</div>}
                        {s.fix && <div style={{ color: '#10B981' }}>→ {s.fix}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sourceFields.length > 0 && (
                <div>
                  <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    Ground-truth fields (from frontmatter)
                  </div>
                  <div style={{
                    padding: 7, fontSize: 11,
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${C.line}`,
                    borderRadius: 4,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {sourceFields.map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: C.dim }}>{k}:</span>{' '}
                        <span style={{ color: C.text }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorMisconfigured() {
  return (
    <main style={{ maxWidth: 600, margin: '60px auto', padding: 24 }}>
      <SEO title="Editor not configured · gibol.co" path="/editor" noindex />
      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
        Editor not configured
      </h1>
      <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        The <code>VITE_EDITOR_EMAIL</code> build-time env var is empty. The
        editor whitelist can't resolve, so this page refuses to render
        Approve controls.
      </p>
      <p style={{ color: C.dim, fontSize: 14 }}>
        Set <code>VITE_EDITOR_EMAIL</code> in Vercel and redeploy.
      </p>
    </main>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────

export default function Editor() {
  const location = useLocation();
  const { session, user, isEditor, loading: authLoading } = useEditorSession();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [scoreTier, setScoreTier] = useState('all');
  const [sort, setSort] = useState('triage');
  const [ledger, setLedger] = useState(new Map());
  // v0.50.0 — Phase 2 ship #31. Rejection ledger keyed by `${type}:${slug}`.
  const [rejections, setRejections] = useState(new Map());
  const [busySlugs, setBusySlugs] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  // Phase 2 ship #26 — multi-select for bulk approve. Keys are
  // `${type}:${slug}` strings (matches the ledger map keys).
  const [selected, setSelected] = useState(new Set());
  const [batchInFlight, setBatchInFlight] = useState(false);
  // Confirmation dialog state. null = closed; otherwise:
  //   { items: [...], message: "Approve N profiles ≥85?", samples: ["title", ...] }
  const [confirmState, setConfirmState] = useState(null);
  // Phase 2 ship #30A — generate-on-demand panel open/closed.
  // Default closed because most editor sessions are review-only;
  // panel is opt-in for batch-generation flows.
  const [generateOpen, setGenerateOpen] = useState(false);

  // Phase 2 ship #28 — per-row expanded state for "Show issues" panel.
  // Keys are `${type}:${slug}`. Lazy-fetches the full article JSON
  // when first expanded (the index.json strips heavy arrays).
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Phase 2 ship #29 — edit modal state. null = closed; otherwise
  // { article, body, articleData, busy, error }.
  const [editState, setEditState] = useState(null);
  // Map of edited articles keyed by `${type}:${slug}` → row from
  // ce_article_edits. Used to show the (edited Nx) badge in the
  // dashboard and to seed the modal with the latest revision.
  const [edits, setEdits] = useState(new Map());

  const refreshEdits = useCallback(async () => {
    const next = await fetchArticleEdits();
    setEdits(next);
  }, []);

  const toggleExpanded = useCallback((article) => {
    const key = `${article.type}:${article.slug}`;
    setExpandedRows((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Phase 2 ship #29 — open the edit modal. Fetches the full article
  // JSON (we need body_md + voice_lint.issues + qc_review.suggestions)
  // and seeds the textarea with either the latest edited revision or
  // the AI-generated baseline.
  const openEdit = useCallback(async (article) => {
    const key = `${article.type}:${article.slug}`;
    setEditState({ article, body: '', articleData: null, busy: true, error: null, key });
    try {
      const resp = await fetch(`/content/${article.type}/${article.slug}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const articleData = await resp.json();
      const existingEdit = edits.get(key);
      const seed = existingEdit?.edited_body_md || articleData.body_md || '';
      setEditState({ article, body: seed, articleData, busy: false, error: null, key });
    } catch (e) {
      setEditState({ article, body: '', articleData: null, busy: false, error: String(e?.message || e), key });
    }
  }, [edits]);

  const saveEdit = useCallback(async (note) => {
    if (!editState) return;
    setEditState((s) => s ? { ...s, busy: true } : s);
    try {
      await editArticle({
        type: editState.article.type,
        slug: editState.article.slug,
        edited_body_md: editState.body,
        edit_notes: note || null,
      });
      await refreshEdits();
      pushToast(`Saved edit for ${editState.article.slug}`);
      setEditState(null);
    } catch (e) {
      pushToast(`Save failed: ${e.message || e}`, 'error');
      setEditState((s) => s ? { ...s, busy: false } : s);
    }
  }, [editState, refreshEdits]);

  // Fetch the article index + publication ledger + edits overlay after
  // auth resolves. v0.48.0 added the third fetch (edits) for ship #29.
  useEffect(() => {
    if (authLoading) return;
    if (!isEditor) return;
    let cancelled = false;
    Promise.all([
      fetch('/content/index.json', { credentials: 'same-origin' })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetchPublishLedger(),
      fetchArticleEdits(),
      fetchRejectionLedger(),
    ]).then(([idx, ldg, edt, rej]) => {
      if (cancelled) return;
      setData(idx);
      setLedger(ldg);
      setEdits(edt);
      setRejections(rej);
    }).catch((e) => {
      if (!cancelled) setError(String(e?.message || e));
    });
    return () => { cancelled = true; };
  }, [authLoading, isEditor]);

  const refreshLedger = useCallback(async () => {
    const next = await fetchPublishLedger();
    setLedger(next);
  }, []);

  const refreshRejections = useCallback(async () => {
    const next = await fetchRejectionLedger();
    setRejections(next);
  }, []);

  // v0.50.0 — Phase 2 ship #31. Reject single article. Modal-light: a
  // window.confirm with the article title is enough for a single editor;
  // we can graduate to a styled modal if mass-reject becomes routine.
  const onReject = useCallback(async (article) => {
    const ok = window.confirm(
      `Reject "${article.title}"?\n\nThe article leaves the Pending tier and won't be published. You can still re-Approve later if you change your mind (rejection state is per-slug, not destructive).`
    );
    if (!ok) return;
    const reason = window.prompt('Reason (optional, surfaces in the dashboard):') || null;
    const key = `${article.type}:${article.slug}`;
    setBusySlugs((s) => new Set(s).add(key));
    try {
      await rejectArticle({ type: article.type, slug: article.slug, reason });
      await refreshRejections();
      pushToast(`Rejected ${article.slug}`);
    } catch (e) {
      pushToast(`Reject failed: ${e.message || e}`, 'error');
    } finally {
      setBusySlugs((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }, [refreshRejections]);

  function pushToast(text, kind = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  const onApprove = useCallback(async (article) => {
    const key = `${article.type}:${article.slug}`;
    setBusySlugs((s) => new Set(s).add(key));
    try {
      await approveArticle({ type: article.type, slug: article.slug });
      // v0.50.0 — refresh both ledgers because approve can be a
      // re-approve flow (server strips rejection on approve).
      await Promise.all([refreshLedger(), refreshRejections()]);
      pushToast(`Approved ${article.slug}`);
    } catch (e) {
      pushToast(`Approve failed: ${e.message || e}`, 'error');
    } finally {
      setBusySlugs((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }, [refreshLedger, refreshRejections]);

  // Phase 2 ship #26 — bulk-approve actions. Show confirmation
  // dialog with sample titles, then fire the batch endpoint. The
  // server caps each request at 250; the helper auto-chunks if the
  // queue is bigger.
  const askConfirmAndApprove = useCallback((articles, label) => {
    if (!articles.length) {
      pushToast('No articles to approve in current selection', 'error');
      return;
    }
    const samples = articles.slice(0, 5).map((a) => a.title || a.slug);
    setConfirmState({
      label,
      items: articles.map((a) => ({ type: a.type, slug: a.slug })),
      samples,
      total: articles.length,
    });
  }, []);

  const fireBatch = useCallback(async () => {
    const cs = confirmState;
    if (!cs) return;
    setConfirmState(null);
    setBatchInFlight(true);
    try {
      const result = await approveBatch({ items: cs.items });
      // v0.50.0 — also refresh rejections in case any items were
      // previously rejected (the server strips them on re-approve).
      await Promise.all([refreshLedger(), refreshRejections()]);
      setSelected(new Set());
      pushToast(`Approved ${result.approved_count} article${result.approved_count !== 1 ? 's' : ''}`);
    } catch (e) {
      pushToast(`Batch approve failed: ${e.message || e}`, 'error');
    } finally {
      setBatchInFlight(false);
    }
  }, [confirmState, refreshLedger, refreshRejections]);

  const toggleSelected = useCallback((article) => {
    const key = `${article.type}:${article.slug}`;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const selectAllInView = useCallback((rows) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const pending = rows.filter((a) => !a._publish);
      // If all pending are already selected → unselect all in view.
      const allSelected = pending.every((a) => next.has(`${a.type}:${a.slug}`));
      if (allSelected) {
        for (const a of pending) next.delete(`${a.type}:${a.slug}`);
      } else {
        for (const a of pending) next.add(`${a.type}:${a.slug}`);
      }
      return next;
    });
  }, []);

  // ── Auth gate ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <main style={{ maxWidth: 600, margin: '60px auto', padding: 24 }}>
        <p style={{ color: C.dim, fontSize: 14 }}>Memeriksa sesi…</p>
      </main>
    );
  }
  if (!EDITOR_EMAIL) {
    return <EditorMisconfigured />;
  }
  if (!session) {
    const nextParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${nextParam}`} replace />;
  }
  if (!isEditor) {
    return <AccessDenied user={user} />;
  }

  // ── Loading / error states ────────────────────────────────────────
  if (error) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
        <h1 style={{ fontSize: 22, color: C.text }}>Editor dashboard</h1>
        <p style={{ color: C.dim, fontSize: 14 }}>
          Could not load /content/index.json. {error}
        </p>
        <p style={{ color: C.dim, fontSize: 13 }}>
          The index is built at deploy time by <code>scripts/prerender.mjs</code>.
        </p>
      </main>
    );
  }
  if (!data) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
        <p style={{ color: C.dim, fontSize: 14 }}>Loading editor index…</p>
      </main>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────
  // v0.50.0 — three-way state: APPROVED (in ledger) > REJECTED (in
  // rejections) > PENDING. Approve trumps reject if somehow both rows
  // exist (shouldn't happen but defensive).
  const articlesWithStatus = data.articles.map((a) => {
    const key = `${a.type}:${a.slug}`;
    const pub = ledger.get(key);
    const rej = rejections.get(key);
    return { ...a, _publish: pub || null, _reject: pub ? null : (rej || null) };
  });

  let rows = articlesWithStatus;
  if (['preview', 'recap', 'standings', 'team', 'h2h'].includes(filter)) {
    rows = rows.filter((a) => a.type === filter);
  } else if (filter === 'pending') {
    // Pending = neither approved nor rejected.
    rows = rows.filter((a) => !a._publish && !a._reject);
  } else if (filter === 'published') {
    rows = rows.filter((a) => !!a._publish);
  } else if (filter === 'rejected') {
    rows = rows.filter((a) => !!a._reject);
  }
  // Score-tier filter (layered on top of type/status filter).
  if (scoreTier !== 'all') {
    rows = rows.filter((a) => {
      const s = a.voice_lint?.score;
      if (s == null) return scoreTier === 'mid';  // un-scored treated as mid
      if (scoreTier === 'high') return s >= 85;
      if (scoreTier === 'mid') return s >= 70 && s < 85;
      if (scoreTier === 'low') return s < 70;
      return true;
    });
  }
  rows = [...rows];
  if (sort === 'triage') {
    // Pending first, then time-sensitive type rank, then newest, then score desc.
    rows.sort((a, b) => {
      // Pending (unpublished) first.
      const aPending = a._publish ? 1 : 0;
      const bPending = b._publish ? 1 : 0;
      if (aPending !== bPending) return aPending - bPending;
      // Then by type priority.
      const aRank = TRIAGE_TYPE_RANK[a.type] ?? 99;
      const bRank = TRIAGE_TYPE_RANK[b.type] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      // Then newest first.
      const aPub = a.published_at || '';
      const bPub = b.published_at || '';
      if (aPub !== bPub) return bPub.localeCompare(aPub);
      // Tiebreak: score desc (higher = closer to ship-as-is).
      return (b.voice_lint?.score ?? 0) - (a.voice_lint?.score ?? 0);
    });
  } else if (sort === 'score-asc') {
    rows.sort((a, b) => (a.voice_lint?.score ?? 100) - (b.voice_lint?.score ?? 100));
  } else if (sort === 'score-desc') {
    rows.sort((a, b) => (b.voice_lint?.score ?? 0) - (a.voice_lint?.score ?? 0));
  } else if (sort === 'newest') {
    rows.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  } else if (sort === 'cost-desc') {
    rows.sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0));
  }

  // Selection helpers — derived from `rows` + `selected` state.
  const selectedArticles = rows.filter((a) => selected.has(`${a.type}:${a.slug}`));
  const pendingInView = rows.filter((a) => !a._publish);
  const allViewSelected = pendingInView.length > 0 && pendingInView.every(
    (a) => selected.has(`${a.type}:${a.slug}`),
  );
  // High-score pending in current filter = the "Approve all ≥85" target.
  // v0.48.0 — Phase 2 ship #29 — also exclude articles whose body was
  // edited but not yet re-linted (lint_stale=true). Their on-disk
  // voice_lint.score reflects the OLD body, not the edited one;
  // approving on a stale score risks shipping a regression.
  // v0.50.0 — Phase 2 ship #31 — also exclude rejected articles.
  const highScorePending = articlesWithStatus.filter((a) => {
    if (a._publish) return false;
    if (a._reject) return false;
    if ((a.voice_lint?.score ?? 0) < 85) return false;
    const edit = edits.get(`${a.type}:${a.slug}`);
    if (edit && edit.lint_stale) return false;
    return true;
  });

  // v0.50.0 — pending = neither approved nor rejected.
  const pendingCount = articlesWithStatus.filter((a) => !a._publish && !a._reject).length;
  const publishedCount = articlesWithStatus.filter((a) => !!a._publish).length;
  const rejectedCount = articlesWithStatus.filter((a) => !!a._reject).length;
  const totalCost = data.articles.reduce((s, a) => s + (a.cost_usd || 0), 0);
  const avgScore = data.articles.length
    ? Math.round(
        data.articles.reduce((s, a) => s + (a.voice_lint?.score || 0), 0) / data.articles.length,
      )
    : 0;

  // ── Per-sport stability metrics (Ship #16) ────────────────────────
  // Bucket articles by their `league` frontmatter, compute the three
  // graduation criteria from CLAUDE.md rule #8 + locked decision § 8:
  //   1. ≥ 100 approved articles for the sport
  //   2. avg voice-lint score ≥ 85
  //   3. editor approval rate ≥ 80 % (approved / total)
  // When ALL three are true, the sport is eligible for auto-publish.
  // Editor flips it on by setting AUTO_PUBLISH_SPORTS=<sport-id> in
  // Vercel + GitHub Actions secrets per docs/15-auto-publish.md.
  const SPORT_LABELS = {
    epl: 'Liga Inggris',
    'liga-1-id': 'Super League',
    nba: 'NBA Playoffs',
    f1: 'Formula 1',
    tennis: 'Tennis',
  };
  const STABILITY_THRESHOLDS = { approved: 100, lint: 85, rate: 0.80 };
  // v0.50.0 — per-sport totals exclude rejected articles. Approval
  // rate becomes "approved / (approved + pending)" rather than dragging
  // down on rejected articles the editor decided not to ship anyway.
  const sportBuckets = {};
  for (const a of articlesWithStatus) {
    if (a._reject) continue;  // exclude rejected from stability signals entirely
    const key = a.league || 'unknown';
    if (!sportBuckets[key]) {
      sportBuckets[key] = { total: 0, approved: 0, lintScores: [] };
    }
    const b = sportBuckets[key];
    b.total++;
    if (a._publish) b.approved++;
    if (typeof a.voice_lint?.score === 'number') b.lintScores.push(a.voice_lint.score);
  }
  const sportStability = Object.entries(sportBuckets).map(([id, b]) => {
    const approvalRate = b.total > 0 ? b.approved / b.total : 0;
    const avgLint = b.lintScores.length
      ? b.lintScores.reduce((x, y) => x + y, 0) / b.lintScores.length
      : null;
    const eligible = (
      b.approved >= STABILITY_THRESHOLDS.approved
      && avgLint != null && avgLint >= STABILITY_THRESHOLDS.lint
      && approvalRate >= STABILITY_THRESHOLDS.rate
    );
    return {
      id,
      label: SPORT_LABELS[id] || id,
      total: b.total,
      approved: b.approved,
      approvalRate,
      avgLint,
      eligible,
      criteria: {
        approved: b.approved >= STABILITY_THRESHOLDS.approved,
        lint: avgLint != null && avgLint >= STABILITY_THRESHOLDS.lint,
        rate: approvalRate >= STABILITY_THRESHOLDS.rate,
      },
    };
  });
  // Sort by approved-count descending so the most-mature sports
  // surface first.
  sportStability.sort((a, b) => b.approved - a.approved);

  return (
    <main style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px 60px', fontFamily: 'var(--font-sans)' }}>
      <SEO
        title="Editor — Manual Review Queue · gibol.co"
        description="Editorial dashboard for content-engine generated articles."
        path="/editor"
        noindex
      />

      <header style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            Editor — Manual Review Queue
          </h1>
          <p style={{ color: C.dim, fontSize: 13 }}>
            Generated {fmtDate(data.generated_at)} · {data.article_count} total ·
            {' '}<span style={{ color: pendingCount > 0 ? '#F59E0B' : C.dim }}>{pendingCount} pending</span>
            {' '}· <span style={{ color: '#10B981' }}>{publishedCount} published</span>
            {rejectedCount > 0 && (
              <>{' '}· <span style={{ color: '#EF4444' }}>{rejectedCount} rejected</span></>
            )}
            {' '}· avg lint {avgScore}
            {' '}· spend {fmtCost(totalCost)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.dim }}>
          <span>{user.email}</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/'; })}
            style={{
              padding: '6px 10px', fontSize: 11,
              background: 'transparent', color: C.dim,
              border: `1px solid ${C.line}`, borderRadius: 4, cursor: 'pointer',
            }}
          >Sign out</button>
        </div>
      </header>

      {/* Phase 2 ship #30A — generate-on-demand. Toggle button when
          collapsed, full panel with NL input + plan output when open. */}
      <div style={{ marginBottom: 16 }}>
        <GeneratePanel open={generateOpen} onToggle={() => setGenerateOpen((v) => !v)} />
      </div>

      {/* Per-sport stability dashboard (Ship #16) */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 13, fontWeight: 700, color: C.dim,
          textTransform: 'uppercase', letterSpacing: 0.5,
          marginBottom: 10,
        }}>Stability per sport · Phase 2 graduation criteria</h2>
        <p style={{ color: C.dim, fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
          A sport is eligible to auto-publish when ALL three are met: ≥100 approved articles,
          avg voice-lint score ≥85, editor approval rate ≥80%. Flagship matches always need
          manual review regardless. Flip on via <code>AUTO_PUBLISH_SPORTS</code> env var.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}>
          {sportStability.map((s) => {
            const eligibleColor = s.eligible ? '#10B981' : C.dim;
            const lintColor = s.criteria.lint ? '#10B981' : (s.avgLint == null ? C.dim : '#EF4444');
            const rateColor = s.criteria.rate ? '#10B981' : (s.total > 0 ? '#F59E0B' : C.dim);
            const approvedColor = s.criteria.approved ? '#10B981' : '#F59E0B';
            return (
              <div key={s.id} style={{
                padding: 12,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.eligible ? '#10B981' : C.line}`,
                borderLeft: `3px solid ${eligibleColor}`,
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{s.label}</span>
                  {s.eligible ? (
                    <span title="All three graduation criteria met" style={{
                      padding: '2px 6px', fontSize: 9, fontWeight: 700,
                      background: '#10B98122', color: '#10B981',
                      borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>ELIGIBLE</span>
                  ) : (
                    <span style={{
                      padding: '2px 6px', fontSize: 9, fontWeight: 700,
                      background: 'rgba(255,255,255,0.04)', color: C.dim,
                      borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.4,
                    }}>NOT YET</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
                  {s.approved}/{s.total} approved · avg lint{' '}
                  {s.avgLint != null ? Math.round(s.avgLint) : '—'} ·{' '}
                  {Math.round(s.approvalRate * 100)}% rate
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <div style={{ color: approvedColor }}>
                    {s.criteria.approved ? '✓' : '○'} Approved ≥{STABILITY_THRESHOLDS.approved}
                    {' '}<span style={{ color: C.dim }}>(have {s.approved})</span>
                  </div>
                  <div style={{ color: lintColor }}>
                    {s.criteria.lint ? '✓' : '○'} Avg lint ≥{STABILITY_THRESHOLDS.lint}
                    {' '}<span style={{ color: C.dim }}>(have {s.avgLint != null ? Math.round(s.avgLint) : 'n/a'})</span>
                  </div>
                  <div style={{ color: rateColor }}>
                    {s.criteria.rate ? '✓' : '○'} Approval ≥{Math.round(STABILITY_THRESHOLDS.rate * 100)}%
                    {' '}<span style={{ color: C.dim }}>(have {Math.round(s.approvalRate * 100)}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
          {sportStability.length === 0 && (
            <p style={{ color: C.dim, fontSize: 12, gridColumn: '1 / -1', textAlign: 'center', padding: 16 }}>
              No articles yet — run the discovery script or wait for cron.
            </p>
          )}
        </div>
      </section>

      {/* Filter + sort bar */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        marginBottom: 12, padding: 12,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${C.line}`, borderRadius: 8,
      }}>
        {/* Row 1: type/status filters + sort dropdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: filter === f.id ? C.amber : 'transparent',
                  color: filter === f.id ? '#000' : C.text,
                  border: `1px solid ${filter === f.id ? C.amber : C.line}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >{f.label}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <select
              value={sort} onChange={(e) => setSort(e.target.value)}
              style={{
                padding: '6px 10px', fontSize: 12,
                background: 'transparent', color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 6,
              }}
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {/* Row 2: score-tier chips (Phase 2 ship #26) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 }}>
            Skor:
          </span>
          {SCORE_TIERS.map((t) => {
            const active = scoreTier === t.id;
            const bg = active && t.color ? t.color + '33' : (active ? C.amber : 'transparent');
            const fg = active && t.color ? t.color : (active ? '#000' : C.text);
            const bd = active && t.color ? t.color : (active ? C.amber : C.line);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setScoreTier(t.id)}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: bg, color: fg,
                  border: `1px solid ${bd}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >{t.label}</button>
            );
          })}
        </div>
      </div>

      {/* Phase 2 ship #26 — bulk-approve action bar. Always visible
          when there's anything to act on. */}
      {(highScorePending.length > 0 || selected.size > 0) && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
          marginBottom: 16, padding: 10,
          background: '#10B98111',
          border: `1px solid #10B98144`, borderRadius: 8,
          fontSize: 13,
        }}>
          <span style={{ color: '#10B981', fontWeight: 700 }}>Bulk approve:</span>

          {highScorePending.length > 0 && (
            <button
              type="button"
              disabled={batchInFlight}
              onClick={() => askConfirmAndApprove(highScorePending, `all pending articles with lint score ≥85`)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                background: '#10B981', color: '#fff', border: 'none', borderRadius: 6,
                cursor: batchInFlight ? 'wait' : 'pointer',
                opacity: batchInFlight ? 0.6 : 1,
              }}
            >
              ✓ Approve all ≥85 ({highScorePending.length})
            </button>
          )}

          {selected.size > 0 && (
            <>
              <button
                type="button"
                disabled={batchInFlight}
                onClick={() => askConfirmAndApprove(selectedArticles, `the ${selected.size} selected article${selected.size !== 1 ? 's' : ''}`)}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  background: C.amber, color: '#000', border: 'none', borderRadius: 6,
                  cursor: batchInFlight ? 'wait' : 'pointer',
                  opacity: batchInFlight ? 0.6 : 1,
                }}
              >
                ✓ Approve selected ({selected.size})
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: 'transparent', color: C.dim,
                  border: `1px solid ${C.line}`, borderRadius: 6, cursor: 'pointer',
                }}
              >Clear selection</button>
            </>
          )}

          {batchInFlight && (
            <span style={{ color: C.dim, fontSize: 12 }}>Batch in flight…</span>
          )}
        </div>
      )}

      {/* Article table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.line}` }}>
              <th style={{ textAlign: 'center', padding: '10px 8px', width: 32 }}>
                <input
                  type="checkbox"
                  checked={allViewSelected}
                  onChange={() => selectAllInView(rows)}
                  title={allViewSelected ? "Unselect all in view" : "Select all pending in view"}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ textAlign: 'left', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Article</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Voice</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }} title="Opus 4.7 editorial review (10% sample)">QC</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Fact</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Chars</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Cost</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: C.dim, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const score = a.voice_lint?.score;
              const factPassed = a.fact_check?.passed;
              const isPublished = !!a._publish;
              const key = `${a.type}:${a.slug}`;
              const isBusy = busySlugs.has(key);
              return (
                <React.Fragment key={key}>
                <tr style={{
                  borderBottom: expandedRows.has(key) ? 'none' : `1px solid ${C.lineSoft || C.line}`,
                  background: selected.has(key) ? 'rgba(245,158,11,0.07)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 8px', textAlign: 'center', width: 32 }}>
                    {!isPublished && (
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleSelected(a)}
                        disabled={batchInFlight}
                        style={{ cursor: batchInFlight ? 'wait' : 'pointer' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', color: C.dim, textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
                    {a.type}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link to={`${a.path}?preview=1`} style={{ color: C.text, textDecoration: 'none', fontWeight: 600 }}>
                      {a.title}
                    </Link>
                    <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                      {a.home_team && a.away_team
                        ? `${a.home_team} ${a.home_score != null ? a.home_score + '-' + a.away_score : 'vs'} ${a.away_team}`
                        : a.slug}
                      {' · '}{fmtDate(a.kickoff_utc || a.published_at)}
                      {' · '}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(a)}
                        title="Show voice-lint issues + Opus QC suggestions"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: expandedRows.has(key) ? C.amber : C.dim,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: 11,
                          padding: 0,
                        }}
                      >
                        {expandedRows.has(key) ? '▾ hide issues' : '▸ show issues'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px',
                      background: scoreColor(score) + '22',
                      color: scoreColor(score),
                      borderRadius: 4, fontWeight: 700, fontSize: 12,
                    }}>{fmtScore(score)}</span>
                    {a.voice_lint?.issue_count > 0 && (
                      <div style={{ color: C.dim, fontSize: 10, marginTop: 2 }}>
                        {a.voice_lint.issue_count} issue{a.voice_lint.issue_count > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {(() => {
                      const qc = a.qc_review;
                      if (!qc) {
                        return <span style={{ color: C.dim }} title="Not in QC sample (10% rate)">—</span>;
                      }
                      const verdict = qc.verdict;
                      const overall = typeof qc.overall_score === 'number' ? qc.overall_score : null;
                      const summary = qc.summary || '';
                      const suggCount = typeof qc.suggestion_count === 'number' ? qc.suggestion_count : 0;
                      let bg = '#10B98122';
                      let fg = '#10B981';
                      let label = 'SHIP';
                      if (verdict === 'edit') {
                        bg = '#F59E0B22';
                        fg = '#F59E0B';
                        label = 'EDIT';
                      } else if (verdict === 'regenerate') {
                        bg = '#EF444422';
                        fg = '#EF4444';
                        label = 'REGEN';
                      }
                      const tooltipParts = [];
                      if (summary) tooltipParts.push(summary);
                      if (suggCount > 0) tooltipParts.push(`${suggCount} suggestion${suggCount > 1 ? 's' : ''}`);
                      const title = tooltipParts.length ? tooltipParts.join(' · ') : `Opus QC verdict: ${label}`;
                      return (
                        <span title={title} style={{
                          display: 'inline-block', padding: '2px 6px',
                          background: bg, color: fg,
                          borderRadius: 4, fontWeight: 700, fontSize: 10,
                          letterSpacing: 0.3,
                        }}>
                          {label}
                          {overall != null && (
                            <span style={{ marginLeft: 4, fontWeight: 600, opacity: 0.85 }}>{overall}</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {factPassed === true && <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>}
                    {factPassed === false && <span style={{ color: '#EF4444', fontWeight: 700 }}>✗</span>}
                    {factPassed == null && <span style={{ color: C.dim }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: C.dim, fontVariantNumeric: 'tabular-nums' }}>
                    {a.chars}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: C.dim, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCost(a.cost_usd)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {isPublished ? (
                      <span title={`Approved by ${a._publish.approver_email}`} style={{
                        display: 'inline-block', padding: '2px 6px',
                        background: '#10B98122', color: '#10B981',
                        borderRadius: 4, fontSize: 10, fontWeight: 700,
                      }}>PUBLISHED</span>
                    ) : a._reject ? (
                      <span title={a._reject.reason || `Rejected by ${a._reject.rejecter_email}`} style={{
                        display: 'inline-block', padding: '2px 6px',
                        background: '#EF444422', color: '#EF4444',
                        borderRadius: 4, fontSize: 10, fontWeight: 700,
                      }}>REJECTED</span>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '2px 6px',
                        background: '#F59E0B22', color: '#F59E0B',
                        borderRadius: 4, fontSize: 10, fontWeight: 700,
                      }}>PENDING</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {isPublished ? (
                      <span style={{ color: C.dim, fontSize: 11 }}>{fmtDate(a._publish.published_at)}</span>
                    ) : a._reject ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <span style={{ color: C.dim, fontSize: 11 }}>{fmtDate(a._reject.rejected_at)}</span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onApprove(a)}
                          title="Re-approve a previously rejected article (rejection state is non-destructive)"
                          style={{
                            padding: '3px 10px', fontSize: 10, fontWeight: 600,
                            background: 'transparent', color: '#10B981',
                            border: `1px solid #10B98155`, borderRadius: 4,
                            cursor: isBusy ? 'wait' : 'pointer', minWidth: 90,
                          }}
                        >↻ Re-approve</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onApprove(a)}
                          style={{
                            padding: '4px 12px', fontSize: 11, fontWeight: 700,
                            background: isBusy ? C.line : C.amber,
                            color: '#000', border: 'none', borderRadius: 4,
                            cursor: isBusy ? 'wait' : 'pointer',
                            minWidth: 72,
                          }}
                        >{isBusy ? '...' : 'Approve'}</button>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            title={(() => {
                              const e = edits.get(key);
                              if (!e) return 'Edit body inline';
                              return `Edited ${e.edit_count}× by ${e.edited_by || 'editor'}`;
                            })()}
                            style={{
                              padding: '3px 8px', fontSize: 10, fontWeight: 600,
                              background: 'transparent',
                              color: edits.has(key) ? '#10B981' : C.dim,
                              border: `1px solid ${edits.has(key) ? '#10B98155' : C.line}`,
                              borderRadius: 4, cursor: 'pointer',
                            }}
                          >
                            {edits.has(key) ? `✎ (${edits.get(key).edit_count}×)` : '✎ Edit'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onReject(a)}
                            title="Reject — marks the article as won't-publish; doesn't delete files"
                            style={{
                              padding: '3px 8px', fontSize: 10, fontWeight: 600,
                              background: 'transparent', color: '#EF4444',
                              border: `1px solid #EF444444`, borderRadius: 4,
                              cursor: isBusy ? 'wait' : 'pointer',
                            }}
                          >✗ Reject</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedRows.has(key) && (
                  <tr style={{ borderBottom: `1px solid ${C.lineSoft || C.line}` }}>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <IssueDetail article={a} />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', padding: 40 }}>
          No articles matching filter.
        </p>
      )}

      {/* Phase 2 ship #29 — inline edit modal */}
      <EditModal
        state={editState}
        onChange={(body) => setEditState((s) => s ? { ...s, body } : s)}
        onSave={saveEdit}
        onClose={() => editState && !editState.busy && setEditState(null)}
      />

      {/* Phase 2 ship #26 — bulk-approve confirmation modal */}
      {confirmState && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setConfirmState(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 540, width: 'calc(100% - 32px)',
              padding: 24,
              background: '#0b0b0b',
              border: `1px solid ${C.line}`, borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              Approve {confirmState.total} article{confirmState.total !== 1 ? 's' : ''}?
            </h2>
            <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              You're about to approve {confirmState.label}. This makes them publicly
              visible (next deploy folds them into the sitemap with full HTML + JSON-LD).
            </p>
            {confirmState.samples.length > 0 && (
              <div style={{
                padding: 12,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.line}`, borderRadius: 6,
                fontSize: 12, color: C.dim, marginBottom: 18,
                maxHeight: 180, overflowY: 'auto',
              }}>
                <div style={{ color: C.text, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Sample titles {confirmState.total > 5 ? `(first 5 of ${confirmState.total})` : ''}
                </div>
                {confirmState.samples.map((s, i) => (
                  <div key={i} style={{ marginBottom: 4, paddingLeft: 6, borderLeft: `2px solid ${C.line}` }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  background: 'transparent', color: C.text,
                  border: `1px solid ${C.line}`, borderRadius: 6, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                type="button"
                onClick={fireBatch}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 800,
                  background: '#10B981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >Approve {confirmState.total}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
          {toasts.map((t) => (
            <div key={t.id} style={{
              padding: '10px 14px',
              background: t.kind === 'error' ? '#EF4444' : '#10B981',
              color: '#fff',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>{t.text}</div>
          ))}
        </div>
      )}

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.line}`, color: C.dim, fontSize: 11, lineHeight: 1.6 }}>
        <p>
          Phase 1 ship #10. Click an article title to open in preview mode (your
          editor session is required to view unpublished bodies). Approve writes
          to ce_article_publishes; the public site reads that ledger to gate
          /preview, /match-recap, /standings rendering. Until approved, public
          visits redirect to home.
        </p>
      </footer>
    </main>
  );
}
