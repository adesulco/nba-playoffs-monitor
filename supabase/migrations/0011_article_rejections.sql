-- Phase 2 ship #31 — explicit Reject action for the editor.
--
-- Before this ship the editor had only one terminal action (Approve);
-- articles ade decided not to publish sat at Pending forever. That
-- dragged down the per-sport approval rate (one of three Phase 2
-- graduation criteria) and cluttered the queue.
--
-- Mirror of ce_article_publishes shape: same primary key (slug, type),
-- service-role-only writes, anon-readable so the SPA + prerender can
-- gate logic on the rejection state.
--
-- Two-table design (vs a single `status` column on ce_article_publishes)
-- keeps the existing approve/publish path clean and lets the SPA's
-- body-gate stay on a single fast lookup. State derivation:
--   • slug in ce_article_publishes  → APPROVED
--   • slug in ce_article_rejections → REJECTED
--   • else                          → PENDING

BEGIN;

CREATE TABLE IF NOT EXISTS public.ce_article_rejections (
    slug             text NOT NULL,
    type             text NOT NULL CHECK (type IN (
        'preview', 'recap', 'standings',
        'team', 'h2h',
        'race-preview', 'race-recap', 'glossary', 'pemain'
    )),
    rejecter_email   text NOT NULL,
    rejected_at      timestamptz NOT NULL DEFAULT now(),
    reason           text,                      -- optional editor note
    PRIMARY KEY (slug, type)
);

ALTER TABLE public.ce_article_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_article_rejections_read_anon"
    ON public.ce_article_rejections;
CREATE POLICY "ce_article_rejections_read_anon"
    ON public.ce_article_rejections
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE INDEX IF NOT EXISTS ce_article_rejections_rejected_at_idx
    ON public.ce_article_rejections (rejected_at DESC);

COMMENT ON TABLE public.ce_article_rejections IS
    'Phase 2 ship #31: editorial rejections. Articles in this table will not be published; the /editor dashboard surfaces them under a "Rejected" filter and excludes them from the per-sport approval-rate signal.';

COMMIT;
