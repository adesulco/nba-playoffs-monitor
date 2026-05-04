-- Phase 1 ship #10 — editor approval workflow.
--
-- The content engine generates articles to public/content/{type}/{slug}.json
-- with `frontmatter.manual_review: true`. Per the locked decision (response
-- doc § 8) Phase 1 has no auto-publish — every article must be approved by
-- the editorial team before public visibility.
--
-- This table is the source of truth for "is this article published?" The
-- SPA reads it (anon, RLS allows SELECT) to decide whether to render the
-- body or redirect unapproved visits to /. The /api/approve serverless
-- function writes (service-role, bypasses RLS) when the editor clicks
-- Approve in /editor.
--
-- Workflow:
--   1. content-engine writes JSON file with manual_review:true
--   2. editor logs in via Supabase magic link (only EDITOR_EMAIL allowed)
--   3. editor opens /editor, reviews the draft, clicks Approve
--   4. /api/approve verifies JWT + email whitelist + upserts a row here
--   5. SPA refresh shows the body publicly
--   6. on next deploy, prerender includes the article in sitemap + emits
--      full HTML with JSON-LD + index meta
--
-- An article with no row here is "unapproved." A row with `published_at`
-- in the past is "approved" (set to now() at insert time). We don't model
-- "unpublished after publishing" yet — that needs Phase 2 + an editor UI.
-- Today, deleting the row is the only un-publish path (manual SQL).

CREATE TABLE IF NOT EXISTS public.ce_article_publishes (
    -- Composite primary key: a slug like "arsenal-vs-fulham-2026-05-02" can
    -- exist as both a preview AND a recap of the same fixture, so we key
    -- by (slug, type) not slug alone.
    slug text NOT NULL,
    type text NOT NULL CHECK (type IN ('preview', 'recap', 'standings')),
    published_at timestamptz NOT NULL DEFAULT now(),
    -- Who approved it — for audit trail. Phase 2 may add multi-editor
    -- approvals (e.g. flagship matches need 2 sign-offs); for Phase 1 a
    -- single approver email is enough.
    approver_email text NOT NULL,
    -- Optional editor notes captured at approval time. Free-text. Surfaced
    -- in the /editor dashboard so the team can leave context for each
    -- other (e.g. "fixed Si Merah → Gooners by hand before approving").
    editor_notes text,
    PRIMARY KEY (slug, type)
);

ALTER TABLE public.ce_article_publishes ENABLE ROW LEVEL SECURITY;

-- Anonymous read access — the SPA queries this from the browser to
-- decide whether to render an article body. There's no PII in this
-- table beyond the editor's own email (which we surface in the
-- editorial UI but not in the public article page).
DROP POLICY IF EXISTS "ce_article_publishes_read_anon"
    ON public.ce_article_publishes;
CREATE POLICY "ce_article_publishes_read_anon"
    ON public.ce_article_publishes
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- No INSERT/UPDATE/DELETE policy → only the service-role key can write.
-- The /api/approve serverless function uses the service-role client
-- (api/_lib/supabaseAdmin.js) after verifying the caller's JWT email
-- matches EDITOR_EMAIL. RLS denies all other writes by default.

-- Index for the prerender + dashboard "newest first" query.
CREATE INDEX IF NOT EXISTS ce_article_publishes_published_at_idx
    ON public.ce_article_publishes (published_at DESC);

COMMENT ON TABLE public.ce_article_publishes IS
    'Editor approval ledger for content-engine articles. Article visibility = exists row here. /api/approve writes; SPA reads for body gating.';
