/**
 * POST /api/approve — editor approval endpoint.
 *
 * Phase 1 ship #10. The /editor dashboard's Approve button calls here.
 * Server-side enforces:
 *   1. POST only
 *   2. Authorization: Bearer <supabase JWT>
 *   3. user.email must equal EDITOR_EMAIL env var
 *   4. body { type, slug, editor_notes? } shape
 *   5. type must be one of the allowed content types (kept in sync
 *      with packages/content-engine/src/content_engine/publish/
 *      json_writer.py's allowed-types set)
 *
 * Side effect: upsert into ce_article_publishes (service role bypasses
 * RLS). On success the SPA's body-gate now resolves to "show body" for
 * any visitor. The article is also picked up by the next prerender
 * (full HTML + sitemap entry + JSON-LD).
 *
 * Function slot: this is the 12th of 12 on Vercel Hobby per CLAUDE.md
 * § "Vercel Hobby function limit". Next addition triggers consolidation.
 */

import { getSupabaseAdmin, getUserFromAuthHeader } from './_lib/supabaseAdmin.js';
import { planGeneration } from './_lib/generationPlanner.js';
import { refreshGameSummary } from './_lib/gameSummaryRefresh.js';

// Allowed content types — must match json_writer.write_article's
// allowed-types set in the Python content engine. Adding a new type
// here without adding it there (or vice versa) will leave articles
// either unwritable on disk or unapproveable in /editor.
//
// v0.43.0 — added 'team' (Phase 2 ship #21 profiles) and 'h2h'
// (Phase 2 ship #23 head-to-head). Before this fix, /editor would
// reject Approve clicks on profile + H2H rows with
// "type must be one of preview, recap, standings" — the bug ade hit.
const VALID_TYPES = new Set([
    'preview',
    'recap',
    'standings',
    'team',         // /profile/{slug} — evergreen profiles (NBA team, EPL club, F1 driver, tennis player)
    'h2h',          // /h2h/{slug} — head-to-head matchup explainers
    'race-preview', // reserved for future F1 race preview content type
    'race-recap',   // reserved for future F1 race recap content type
    'glossary',     // reserved for future term glossary
    'pemain',       // reserved for future player-only profile (NBA player, footballer, etc)
]);

function jsonResponse(res, status, body) {
    res.status(status);
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        // CORS preflight — same-origin from www.gibol.co. Permissive
        // headers are OK because the auth check is on the JWT, not
        // the origin.
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
        res.setHeader('access-control-allow-headers', 'authorization, content-type');
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        return jsonResponse(res, 405, { error: 'POST only' });
    }

    const editorEmail = process.env.EDITOR_EMAIL;
    if (!editorEmail) {
        return jsonResponse(res, 500, {
            error: 'EDITOR_EMAIL not configured on server',
        });
    }

    // 1. Verify caller via Supabase JWT in Authorization header.
    const user = await getUserFromAuthHeader(req.headers.authorization);
    if (!user) {
        return jsonResponse(res, 401, { error: 'Invalid or missing session' });
    }

    // 2. Email whitelist — only the configured editor can approve.
    if ((user.email || '').toLowerCase() !== editorEmail.toLowerCase()) {
        return jsonResponse(res, 403, {
            error: 'Not authorized as editor',
            user_email: user.email,
        });
    }

    // 3. Parse + validate body.
    let body = req.body;
    // Vercel parses JSON bodies automatically when Content-Type is JSON,
    // but some test paths send a raw string. Defensively handle both.
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    // v0.55.1 — Phase D backend — action="refresh_game_summary" branch.
    // Editor (or cron in v0.55.2) sends { gameId } to trigger an
    // Anthropic Haiku call that summarizes the latest ESPN play-by-
    // play and writes the result to ce_game_summaries. Public reads
    // happen client-side via Supabase anon RLS — no server endpoint
    // for the read path. This avoids consuming a new Vercel function
    // slot (we're at 12/12).
    if (body.action === 'refresh_game_summary') {
      let admin;
      try { admin = getSupabaseAdmin(); }
      catch (err) {
        return jsonResponse(res, 500, {
          error: 'supabase admin not configured',
          detail: String(err?.message || err),
        });
      }
      const result = await refreshGameSummary({
        gameId: body.gameId,
        admin,
        editorEmail: user.email,
      });
      const code = result.ok ? 200 : 400;
      return jsonResponse(res, code, result);
    }

    // v0.50.0 — Phase 2 ship #31 — action="reject" branch handles
    // explicit editorial rejections. Mirror of approve: writes to
    // ce_article_rejections (separate table). State derivation in the
    // SPA: in publishes → APPROVED; in rejections → REJECTED; else
    // PENDING. The dashboard's per-sport approval-rate signal
    // excludes rejections from "total" so a stuck-pending pile no
    // longer drags the rate below the 80% Phase 2 graduation
    // threshold.
    if (body.action === 'reject') {
      let admin;
      try { admin = getSupabaseAdmin(); }
      catch (err) {
        return jsonResponse(res, 500, {
          error: 'supabase admin not configured',
          detail: String(err?.message || err),
        });
      }
      // Accept either single {type, slug, reason?} or batch {items: [...]}
      const isRejBatch = Array.isArray(body.items);
      const rejItems = isRejBatch
        ? body.items
        : [{ type: body.type, slug: body.slug, reason: body.reason }];

      if (!rejItems.length) {
        return jsonResponse(res, 400, { error: 'items array empty' });
      }
      if (rejItems.length > 250) {
        return jsonResponse(res, 400, {
          error: 'too many items; max 250 per request',
          count: rejItems.length,
        });
      }
      const rejBad = [];
      for (let i = 0; i < rejItems.length; i++) {
        const it = rejItems[i] || {};
        if (!it.type || !it.slug) {
          rejBad.push({ index: i, error: 'type + slug required', item: it }); continue;
        }
        if (!VALID_TYPES.has(it.type)) {
          rejBad.push({ index: i, error: `type must be one of ${[...VALID_TYPES].join(', ')}`, item: it }); continue;
        }
        if (typeof it.slug !== 'string' || !/^[a-z0-9-]+$/.test(it.slug)) {
          rejBad.push({ index: i, error: 'slug must be kebab-case alphanumeric', item: it });
        }
      }
      if (rejBad.length) {
        return jsonResponse(res, 400, {
          error: 'one or more items failed validation',
          rejected: rejBad,
        });
      }

      const now = new Date().toISOString();
      const rejRows = rejItems.map((it) => ({
        slug: it.slug,
        type: it.type,
        rejecter_email: user.email,
        rejected_at: now,
        reason: it.reason || null,
      }));
      const { error: rejErr, data: rejData } = await admin
        .from('ce_article_rejections')
        .upsert(rejRows, { onConflict: 'slug,type' })
        .select();
      if (rejErr) {
        return jsonResponse(res, 500, {
          error: 'failed to upsert rejection rows',
          detail: rejErr.message,
        });
      }
      // State invariant: a slug is in publishes OR rejections, never
      // both. If the editor rejects an already-approved article (e.g.
      // they shipped it then changed their mind), strip the approval
      // row so the public body-gate flips back to redirect-home.
      // Same path for re-approve in the SPA: onApprove already
      // upserts to ce_article_publishes; re-approving a rejected
      // article should also strip the rejection — handled below in
      // the approve branch.
      const rejPairs = rejRows.map((r) => ({ slug: r.slug, type: r.type }));
      // Build OR filter to delete matching (slug, type) pairs.
      let delQuery = admin.from('ce_article_publishes').delete();
      // Supabase supports composite IN via .or() on individual eq pairs.
      const orClause = rejPairs
        .map((p) => `and(slug.eq.${p.slug},type.eq.${p.type})`)
        .join(',');
      if (orClause) {
        const { error: delErr } = await delQuery.or(orClause);
        if (delErr) {
          // Non-fatal — rejection row exists, just log so we can investigate.
          console.warn('[approve] reject: clear-publishes failed', delErr.message);
        }
      }

      if (!isRejBatch) {
        const r0 = rejRows[0];
        return jsonResponse(res, 200, {
          ok: true, action: 'reject',
          slug: r0.slug, type: r0.type,
          rejecter_email: user.email, rejected_at: r0.rejected_at,
        });
      }
      return jsonResponse(res, 200, {
        ok: true, action: 'reject',
        rejecter_email: user.email,
        rejected_count: rejRows.length,
        rejected: (rejData || []).map((r) => ({ slug: r.slug, type: r.type })),
      });
    }

    // v0.49.0 — Phase 2 ship #30A — action="plan_generation" branch.
    // Editor types natural language ("previews for tomorrow's NBA
    // games"); Haiku parses intent; backend resolves IDs from the
    // right data feed (ESPN / API-Football / jolpica); response
    // contains a list of CLI commands the editor copies + runs
    // locally. Pair with action=dispatch_generation (#30B) to
    // run them on GitHub Actions instead of locally.
    if (body.action === 'plan_generation') {
      const { prompt } = body;
      try {
        const result = await planGeneration({
          prompt,
          todayIso: new Date().toISOString().slice(0, 10),
        });
        const code = result.ok ? 200 : 400;
        return jsonResponse(res, code, result);
      } catch (e) {
        return jsonResponse(res, 500, {
          error: 'plan_generation crashed',
          detail: String(e?.message || e),
        });
      }
    }

    // v0.59.1 — Phase 2 ship #30B — action="dispatch_generation".
    // Companion to plan_generation: takes the planner's output
    // (an array of CLI commands), POSTs to GitHub's workflow_dispatch
    // API, and returns the actions-run URL so the editor UI can
    // link out to the running job.
    //
    // Why server-side dispatch instead of generating in this function:
    //   • Anthropic Sonnet generation runs 30-60s per article;
    //     Vercel Hobby caps function execution at 10s.
    //   • Python content-engine has heavy deps; bloating a Vercel
    //     function deployment is the wrong cost shape.
    //   • Articles need to land in the repo as JSON files anyway —
    //     committing from the runner is the primary ship gesture.
    //
    // Required Vercel env vars:
    //   GITHUB_PAT — fine-grained PAT with Contents:Write +
    //                Actions:Write for adesulco/nba-playoffs-monitor
    //   GITHUB_OWNER, GITHUB_REPO — defaults to adesulco /
    //                nba-playoffs-monitor; override only if forked
    //
    // GitHub-side requirements: ANTHROPIC_API_KEY + the Supabase
    // secrets are already configured via content-cron.yml.
    if (body.action === 'dispatch_generation') {
      const { commands, label } = body;
      if (!Array.isArray(commands) || commands.length === 0) {
        return jsonResponse(res, 400, {
          error: 'commands required (non-empty string array)',
        });
      }
      const pat = process.env.GITHUB_PAT;
      if (!pat) {
        return jsonResponse(res, 500, {
          error: 'GITHUB_PAT not configured',
          detail: 'Add a fine-grained personal access token (Contents:Write + Actions:Write) to Vercel env as GITHUB_PAT.',
        });
      }
      const owner = process.env.GITHUB_OWNER || 'adesulco';
      const repo = process.env.GITHUB_REPO || 'nba-playoffs-monitor';
      // Defense-in-depth — runner also enforces this regex, but
      // reject obviously bad commands before we even pay the API
      // round-trip.
      const safe = commands.filter(
        (c) => typeof c === 'string' && /^python\s+-m\s+content_engine\./.test(c.trim()),
      );
      if (safe.length === 0) {
        return jsonResponse(res, 400, {
          error: 'no commands matched the safe regex',
          detail: 'Each command must start with "python -m content_engine." — runner rejects anything else.',
        });
      }

      const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/generate-on-demand.yml/dispatches`;
      try {
        const dispatchRes = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${pat}`,
            'accept': 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              commands: safe.join('\n'),
              label: (label || 'on-demand').slice(0, 60),
              requested_by: user.email || 'editor',
            },
          }),
        });
        if (!dispatchRes.ok) {
          const text = await dispatchRes.text();
          return jsonResponse(res, 502, {
            error: 'github dispatch failed',
            detail: `${dispatchRes.status} ${text.slice(0, 500)}`,
          });
        }
        // workflow_dispatch returns 204 No Content on success —
        // there's no run_id in the response. Best we can do is
        // point the editor at the workflow runs list filtered to
        // the most recent.
        const runsUrl = `https://github.com/${owner}/${repo}/actions/workflows/generate-on-demand.yml`;
        return jsonResponse(res, 200, {
          ok: true,
          action: 'dispatch_generation',
          dispatched_count: safe.length,
          dropped_count: commands.length - safe.length,
          runs_url: runsUrl,
          message: `Dispatched ${safe.length} command${safe.length === 1 ? '' : 's'} to GitHub Actions. The runner will commit + push, which triggers Vercel auto-deploy. Watch: ${runsUrl}`,
        });
      } catch (e) {
        return jsonResponse(res, 500, {
          error: 'dispatch_generation crashed',
          detail: String(e?.message || e),
        });
      }
    }

    // v0.48.0 — Phase 2 ship #29 — action="edit" branch handles
    // inline body edits from /editor's edit modal. Writes to the
    // ce_article_edits overlay table; the SPA + prerender check
    // this table and prefer the edited body when present. Single-
    // editor (Ade) so last-write-wins is fine.
    //
    // Why piggyback on /api/approve instead of a new endpoint:
    // Vercel Hobby caps at 12 functions and we're at 12/12 per
    // CLAUDE.md. This endpoint becomes the omnibus "editor write"
    // endpoint — approve, reject (future), edit, request-generation
    // (#30) all flow through here, dispatched by `action`.
    if (body.action === 'edit') {
        let admin;
        try { admin = getSupabaseAdmin(); }
        catch (err) {
            return jsonResponse(res, 500, {
                error: 'supabase admin not configured',
                detail: String(err?.message || err),
            });
        }
        const { type, slug, edited_body_md, edit_notes } = body;
        if (!type || !slug || !edited_body_md) {
            return jsonResponse(res, 400, {
                error: 'type + slug + edited_body_md required',
            });
        }
        if (!VALID_TYPES.has(type)) {
            return jsonResponse(res, 400, {
                error: `type must be one of ${[...VALID_TYPES].join(', ')}`,
            });
        }
        if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
            return jsonResponse(res, 400, {
                error: 'slug must be kebab-case alphanumeric',
            });
        }
        if (typeof edited_body_md !== 'string' || edited_body_md.trim().length < 50) {
            return jsonResponse(res, 400, {
                error: 'edited_body_md must be a non-trivial string (>= 50 chars)',
            });
        }
        if (edited_body_md.length > 50000) {
            return jsonResponse(res, 400, {
                error: 'edited_body_md too long (max 50000 chars)',
            });
        }

        // Read existing edit_count for the row (if any) to increment.
        const { data: existing } = await admin
            .from('ce_article_edits')
            .select('edit_count')
            .eq('slug', slug)
            .eq('type', type)
            .maybeSingle();
        const nextCount = ((existing && existing.edit_count) || 0) + 1;

        const { error: editErr } = await admin
            .from('ce_article_edits')
            .upsert({
                slug,
                type,
                edited_body_md,
                edited_by: user.email,
                edited_at: new Date().toISOString(),
                edit_count: nextCount,
                lint_stale: true,
                edit_notes: edit_notes || null,
            }, { onConflict: 'slug,type' });
        if (editErr) {
            return jsonResponse(res, 500, {
                error: 'failed to upsert article edit',
                detail: editErr.message,
            });
        }

        return jsonResponse(res, 200, {
            ok: true,
            slug,
            type,
            edited_by: user.email,
            edit_count: nextCount,
            chars: edited_body_md.length,
            lint_stale: true,
        });
    }

    // v0.45.0 — Phase 2 ship #26 — accept BOTH shapes:
    //   single: {type, slug, editor_notes?}        (existing, kept)
    //   batch:  {items: [{type, slug, editor_notes?}, ...]}
    //
    // Backward compat: any client sending the single shape keeps
    // working. The /editor dashboard's bulk-approve flow sends the
    // batch shape with up to ~200 items; one Supabase upsert handles
    // them all in <1s.
    const isBatch = Array.isArray(body.items);
    const items = isBatch
        ? body.items
        : [{ type: body.type, slug: body.slug, editor_notes: body.editor_notes }];

    if (!items.length) {
        return jsonResponse(res, 400, { error: 'items array empty' });
    }
    // Hard cap to keep request small + Supabase upsert fast.
    if (items.length > 250) {
        return jsonResponse(res, 400, {
            error: 'too many items; max 250 per request',
            count: items.length,
        });
    }

    // Validate every item — fail-fast if any are malformed so partial
    // batches don't silently drop rows. Editor UI is responsible for
    // pre-screening, so 400s here mean a coding bug.
    const rejected = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        if (!it.type || !it.slug) {
            rejected.push({ index: i, error: 'type + slug required', item: it });
            continue;
        }
        if (!VALID_TYPES.has(it.type)) {
            rejected.push({
                index: i,
                error: `type must be one of ${[...VALID_TYPES].join(', ')}`,
                item: it,
            });
            continue;
        }
        if (typeof it.slug !== 'string' || !/^[a-z0-9-]+$/.test(it.slug)) {
            rejected.push({
                index: i,
                error: 'slug must be kebab-case alphanumeric',
                item: it,
            });
            continue;
        }
        if (it.editor_notes != null && typeof it.editor_notes !== 'string') {
            rejected.push({
                index: i,
                error: 'editor_notes must be string',
                item: it,
            });
            continue;
        }
    }
    if (rejected.length) {
        return jsonResponse(res, 400, {
            error: 'one or more items failed validation',
            rejected,
        });
    }

    // 4. Upsert via service-role client (bypasses RLS).
    let admin;
    try {
        admin = getSupabaseAdmin();
    } catch (err) {
        return jsonResponse(res, 500, {
            error: 'supabase admin not configured',
            detail: String(err?.message || err),
        });
    }

    const now = new Date().toISOString();
    const rows = items.map((it) => ({
        slug: it.slug,
        type: it.type,
        approver_email: user.email,
        editor_notes: it.editor_notes || null,
        published_at: now,
    }));
    const { error, data } = await admin
        .from('ce_article_publishes')
        .upsert(rows, { onConflict: 'slug,type' })
        .select();
    if (error) {
        return jsonResponse(res, 500, {
            error: 'failed to upsert publish rows',
            detail: error.message,
            attempted: rows.length,
        });
    }

    // v0.50.0 — Phase 2 ship #31 — state invariant: a slug is in
    // publishes OR rejections, never both. If approve hits a slug
    // that was previously rejected (re-approve flow), strip the
    // rejection row so the dashboard reflects the current decision.
    const orClause = rows
        .map((r) => `and(slug.eq.${r.slug},type.eq.${r.type})`)
        .join(',');
    if (orClause) {
        const { error: stripErr } = await admin
            .from('ce_article_rejections')
            .delete()
            .or(orClause);
        if (stripErr) {
            console.warn('[approve] approve: clear-rejections failed', stripErr.message);
        }
    }

    // Backward-compat: single-shape callers expect the old response.
    if (!isBatch) {
        const row = rows[0];
        return jsonResponse(res, 200, {
            ok: true,
            slug: row.slug,
            type: row.type,
            approver_email: user.email,
            published_at: row.published_at,
        });
    }

    return jsonResponse(res, 200, {
        ok: true,
        approver_email: user.email,
        approved_count: rows.length,
        published_at: now,
        approved: (data || []).map((r) => ({ slug: r.slug, type: r.type })),
    });
}
