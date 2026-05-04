-- Phase 2 ship #29 — inline body edits from /editor.
--
-- The on-disk article JSON at public/content/{type}/{slug}.json is the
-- AI-generated baseline. Editor wants to fix lint/QC issues without
-- touching the CLI. Vercel functions can't write to the deployed
-- bundle, so edits go to this overlay table; the SPA + prerender
-- both check this table and prefer the edited body when present.
--
-- Single editor (Ade) → no concurrent-edit conflicts. Last write wins.
-- edit_count tracks revision history for the dashboard ("edited 3
-- times"). lint_stale marks the edited body as not-yet-relint so the
-- bulk-approve ≥85 action skips edited rows until they're re-graded.
--
-- RLS: anon read so prerender can pick up edits at build time;
-- service-role-only writes (the /api/approve endpoint with the new
-- `action: "edit"` shape).

BEGIN;

CREATE TABLE IF NOT EXISTS public.ce_article_edits (
    slug             text NOT NULL,
    type             text NOT NULL CHECK (type IN (
        'preview', 'recap', 'standings',
        'team', 'h2h',
        'race-preview', 'race-recap', 'glossary', 'pemain'
    )),
    edited_body_md   text NOT NULL,
    edited_by        text NOT NULL,
    edited_at        timestamptz NOT NULL DEFAULT now(),
    edit_count       int NOT NULL DEFAULT 1,
    -- True when the edited body hasn't been re-linted yet. /editor
    -- bulk-approve ≥85 button skips stale rows. Cleared when a
    -- subsequent re-lint pass writes a fresh voice_lint into the
    -- on-disk JSON (#29.5 follow-up will automate this).
    lint_stale       boolean NOT NULL DEFAULT true,
    -- Optional editor-attached note explaining the edit. Surfaces in
    -- the dashboard alongside the edit_count badge.
    edit_notes       text,
    PRIMARY KEY (slug, type)
);

ALTER TABLE public.ce_article_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_article_edits_read_anon"
    ON public.ce_article_edits;
CREATE POLICY "ce_article_edits_read_anon"
    ON public.ce_article_edits
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Service role bypasses RLS; no INSERT/UPDATE/DELETE policies needed.

CREATE INDEX IF NOT EXISTS ce_article_edits_edited_at_idx
    ON public.ce_article_edits (edited_at DESC);

COMMENT ON TABLE public.ce_article_edits IS
    'Phase 2 ship #29: editor-applied body overrides for AI-generated articles. SPA reads the on-disk JSON for frontmatter + lint metadata, then overlays edited_body_md from this table when present. Service-role writes only.';

COMMIT;
