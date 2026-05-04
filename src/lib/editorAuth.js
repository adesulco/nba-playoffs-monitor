/**
 * Editor authentication + authorization helpers.
 *
 * Phase 1 ship #10. The Gibol content engine has a single editor (Ade)
 * who reviews + approves AI-generated articles before they go public.
 * Auth is via Supabase magic link; authorization is an email whitelist
 * stored in `VITE_EDITOR_EMAIL` (build-time inlined into the bundle).
 *
 * Why client-side email check at all when the API also enforces it:
 * defense in depth + UX. The dashboard refuses to render Approve
 * buttons for non-editor sessions instead of letting them click +
 * eat 403s. Server-side check on /api/approve remains the ground truth.
 *
 * Usage:
 *   const { session, isEditor, loading } = useEditorSession();
 *   if (loading) return <Loading/>;
 *   if (!session) return <Navigate to="/login?next=/editor"/>;
 *   if (!isEditor) return <NotAuthorized/>;
 */

import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/**
 * The whitelisted editor email. Set VITE_EDITOR_EMAIL at build time
 * (Vercel env var). Public — exposed in the JS bundle, but that's
 * intentional: knowing the editor's email doesn't grant access.
 * Magic link delivery + JWT verification do.
 */
export const EDITOR_EMAIL =
  (import.meta.env.VITE_EDITOR_EMAIL || '').toLowerCase();

/**
 * Match a session user against the whitelist. Case-insensitive.
 */
export function isEditorEmail(user) {
  if (!user || !user.email) return false;
  if (!EDITOR_EMAIL) return false;
  return user.email.toLowerCase() === EDITOR_EMAIL;
}

/**
 * React hook returning the current session + an editor flag. Re-renders
 * on auth state changes (sign-in, sign-out, token refresh).
 */
export function useEditorSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evt, sess) => {
        if (!cancelled) setSession(sess || null);
      },
    );
    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
    };
  }, []);

  const user = session?.user || null;
  const isEditor = isEditorEmail(user);
  return { session, user, isEditor, loading };
}

/**
 * POST /api/approve with the current session's JWT.
 * Returns the parsed JSON response. Caller handles UI feedback.
 */
export async function approveArticle({ type, slug, editor_notes }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('not signed in');
  }
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ type, slug, editor_notes }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Surface the server's `detail` field too — it carries the actual
    // Supabase / Postgres error message which is what we need to debug
    // RLS / missing-table / constraint failures.
    const top = body.error || `HTTP ${resp.status}`;
    const err = body.detail ? `${top}: ${body.detail}` : top;
    throw new Error(err);
  }
  return body;
}

/**
 * Reject an article. v0.50.0 — Phase 2 ship #31. Single-row shape;
 * use rejectBatch for multiple. Writes to ce_article_rejections via
 * /api/approve action="reject". Article leaves the Pending tier and
 * is excluded from the approval-rate signal.
 */
export async function rejectArticle({ type, slug, reason }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'reject', type, slug, reason }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const top = body.error || `HTTP ${resp.status}`;
    throw new Error(body.detail ? `${top}: ${body.detail}` : top);
  }
  return body;
}

/** Batch-reject. Same chunking pattern as approveBatch. */
export async function rejectBatch({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true, rejected_count: 0, rejected: [] };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');

  const CHUNK = 200;
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));

  const allRejected = [];
  let totalCount = 0;
  for (const chunk of chunks) {
    const resp = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'reject', items: chunk }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const top = body.error || `HTTP ${resp.status}`;
      const ctx = totalCount > 0 ? ` (${totalCount} rejected before this chunk)` : '';
      throw new Error((body.detail ? `${top}: ${body.detail}` : top) + ctx);
    }
    totalCount += body.rejected_count || 0;
    if (Array.isArray(body.rejected)) allRejected.push(...body.rejected);
  }
  return { ok: true, rejected_count: totalCount, rejected: allRejected };
}

/**
 * Fetch the rejection ledger as a Map keyed by `${type}:${slug}` →
 * { rejecter_email, rejected_at, reason }. Empty Map on error.
 */
export async function fetchRejectionLedger() {
  const { data, error } = await supabase
    .from('ce_article_rejections')
    .select('slug, type, rejected_at, rejecter_email, reason');
  if (error) {
    console.warn('[editorAuth] fetch rejection ledger failed', error.message);
    return new Map();
  }
  const map = new Map();
  for (const row of data || []) {
    map.set(`${row.type}:${row.slug}`, row);
  }
  return map;
}

/**
 * Fetch the latest cached game summary for `gameId`. v0.55.1 —
 * Phase D backend. Public read path via Supabase anon RLS (only
 * rows with `body_md != null` are visible). Returns the row or null.
 */
export async function fetchGameSummary(gameId) {
  if (!gameId) return null;
  const { data, error } = await supabase
    .from('ce_game_summaries')
    .select('game_id, body_md, sources, ai_model, is_live, updated_at, refreshed_by')
    .eq('game_id', String(gameId))
    .maybeSingle();
  if (error) {
    console.warn('[editorAuth] fetch game summary failed', error.message);
    return null;
  }
  return data || null;
}

/**
 * Trigger a server-side regeneration of `gameId`'s live summary.
 * v0.55.1 — Phase D backend. Editor-only: enforced by /api/approve's
 * email gate. Returns the updated row body.
 */
export async function refreshGameSummary({ gameId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'refresh_game_summary', gameId }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.ok) {
    const top = body.message || body.error || `HTTP ${resp.status}`;
    throw new Error(top);
  }
  return body;
}

/**
 * Plan a generation request. v0.49.0 — Phase 2 ship #30A.
 * Editor types natural language; backend (via /api/approve action=
 * "plan_generation") parses intent with Haiku, resolves to specific
 * IDs from the right data feed, returns CLI commands to copy + run
 * locally.
 */
export async function planGeneration({ prompt }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('not signed in');
  }
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'plan_generation', prompt }),
  });
  const body = await resp.json().catch(() => ({}));
  // 400s from this endpoint are user-fixable (bad prompt, missing date,
  // etc.) — return them for the UI to surface, don't throw.
  return body;
}

/**
 * List recent generation failures. v0.59.3 — Ship #30C.
 * Returns rows from ce_generation_failures (articles the engine
 * generated but a quality gate refused to publish).
 */
export async function listFailures({ limit = 30, only_unresolved = true } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'list_failures', limit, only_unresolved }),
  });
  return resp.json().catch(() => ({ ok: false }));
}

/**
 * Mark a generation failure as resolved. v0.59.3 — Ship #30C.
 */
export async function resolveFailure(failure_id) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not signed in');
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'resolve_failure', failure_id }),
  });
  return resp.json().catch(() => ({ ok: false }));
}

/**
 * Dispatch a generation plan to GitHub Actions. v0.59.1 — Ship #30B.
 * Takes the array of CLI commands from a planGeneration() response,
 * POSTs to /api/approve action=dispatch_generation, which calls the
 * GitHub workflow_dispatch API. Returns the run URL + count so the
 * editor UI can link out to the running job.
 */
export async function dispatchGeneration({ commands, label }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('not signed in');
  }
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'dispatch_generation', commands, label }),
  });
  const body = await resp.json().catch(() => ({}));
  return body;
}

/**
 * Save an inline body edit. v0.48.0 — Phase 2 ship #29.
 * Writes to ce_article_edits via /api/approve action="edit". Body is
 * marked lint_stale so the bulk-approve ≥85 batch action skips it
 * until the editor (or a CLI re-lint pass) refreshes the score.
 */
export async function editArticle({ type, slug, edited_body_md, edit_notes }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('not signed in');
  }
  const resp = await fetch('/api/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      action: 'edit',
      type, slug, edited_body_md, edit_notes,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const top = body.error || `HTTP ${resp.status}`;
    const err = body.detail ? `${top}: ${body.detail}` : top;
    throw new Error(err);
  }
  return body;
}

/**
 * Fetch all editor-applied body overrides as a Map keyed by
 * `${type}:${slug}` → { edited_body_md, edited_at, edit_count, ... }.
 * v0.48.0 — used by /editor to display an "edited" badge per row,
 * and by GeneratedArticle to overlay the edited body at render time.
 */
export async function fetchArticleEdits() {
  const { data, error } = await supabase
    .from('ce_article_edits')
    .select('slug, type, edited_body_md, edited_at, edit_count, lint_stale, edit_notes');
  if (error) {
    console.warn('[editorAuth] fetch edits failed', error.message);
    return new Map();
  }
  const map = new Map();
  for (const row of data || []) {
    map.set(`${row.type}:${row.slug}`, row);
  }
  return map;
}

/**
 * Fetch a single edit by (type, slug). Used by GeneratedArticle when
 * mounting an article — only one fetch per render instead of pulling
 * the full edits map.
 */
export async function fetchArticleEdit({ type, slug }) {
  const { data, error } = await supabase
    .from('ce_article_edits')
    .select('edited_body_md, edited_at, edit_count, lint_stale, edited_by')
    .eq('slug', slug)
    .eq('type', type)
    .maybeSingle();
  if (error) {
    console.warn('[editorAuth] fetch single edit failed', error.message);
    return null;
  }
  return data || null;
}

/**
 * Batch-approve multiple articles in one /api/approve call.
 * v0.45.0 — Phase 2 ship #26. Sends `{items: [...]}` shape that the
 * server understands alongside the single-row shape (backward
 * compatible). Server caps to 250 per request and validates every
 * item; either all rows succeed or the whole call returns 400.
 *
 * `items` is an array of `{type, slug, editor_notes?}` objects.
 * Returns `{ok, approved_count, approved: [{slug, type}, ...]}`.
 *
 * If items.length > 250, we chunk — caller doesn't have to think
 * about the cap.
 */
export async function approveBatch({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true, approved_count: 0, approved: [] };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('not signed in');
  }

  const CHUNK = 200;  // server caps at 250, leave headroom
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK) {
    chunks.push(items.slice(i, i + CHUNK));
  }

  const allApproved = [];
  let totalCount = 0;
  for (const chunk of chunks) {
    const resp = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ items: chunk }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const top = body.error || `HTTP ${resp.status}`;
      const err = body.detail ? `${top}: ${body.detail}` : top;
      // Include partial-success info if any chunk already landed.
      const ctx = totalCount > 0 ? ` (${totalCount} approved before this chunk)` : '';
      throw new Error(err + ctx);
    }
    totalCount += body.approved_count || 0;
    if (Array.isArray(body.approved)) {
      allApproved.push(...body.approved);
    }
  }
  return { ok: true, approved_count: totalCount, approved: allApproved };
}

/**
 * Fetch the current publication ledger from Supabase. Used by:
 *   - /editor dashboard to show which articles are already approved
 *   - GeneratedArticle.jsx to gate body rendering
 *
 * Returns Map keyed by `${type}:${slug}` → { published_at, approver_email,
 * editor_notes }. Empty Map on error (defensive — visitors fail closed,
 * which means "treat as unapproved").
 */
export async function fetchPublishLedger() {
  const { data, error } = await supabase
    .from('ce_article_publishes')
    .select('slug, type, published_at, approver_email, editor_notes');
  if (error) {
    console.warn('[editorAuth] fetch ledger failed', error.message);
    return new Map();
  }
  const map = new Map();
  for (const row of data || []) {
    map.set(`${row.type}:${row.slug}`, row);
  }
  return map;
}

/**
 * Look up a single publish row. Used by the article body gate. Returns
 * the row or null. Treats errors as null (fail-closed for visitors).
 */
export async function fetchPublishStatus({ type, slug }) {
  const { data, error } = await supabase
    .from('ce_article_publishes')
    .select('slug, type, published_at, approver_email, editor_notes')
    .eq('slug', slug)
    .eq('type', type)
    .maybeSingle();
  if (error) {
    console.warn('[editorAuth] fetch publish status failed', error.message);
    return null;
  }
  return data || null;
}
