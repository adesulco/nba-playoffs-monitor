-- Phase 2 ship #28 — relax ce_article_publishes.type CHECK constraint.
--
-- Migration 0007 (Phase 1 ship #10) created the table with:
--   type text NOT NULL CHECK (type IN ('preview', 'recap', 'standings'))
--
-- Since then ships #21 (team profiles) and #23 (head-to-head) added new
-- content types — but the CHECK constraint was never updated. Single-row
-- approves of profile / h2h articles started failing on the server-side
-- once /api/approve's VALID_TYPES allow-list was expanded (v0.43.1
-- hotfix); batch approves hit it harder because one row's rejection
-- aborts the whole upsert.
--
-- Fix: drop the old constraint and add a new one matching the canonical
-- allow-list maintained in two places (kept in lockstep):
--   1. api/approve.js — VALID_TYPES Set
--   2. packages/content-engine/src/content_engine/publish/json_writer.py
--      — write_article allowed-types
--
-- The expanded list reserves several future content types (race-preview,
-- race-recap, glossary, pemain) so the next content-type ship doesn't
-- trip the same wire.

BEGIN;

ALTER TABLE public.ce_article_publishes
    DROP CONSTRAINT IF EXISTS ce_article_publishes_type_check;

ALTER TABLE public.ce_article_publishes
    ADD CONSTRAINT ce_article_publishes_type_check
    CHECK (type IN (
        'preview',
        'recap',
        'standings',
        'team',          -- /profile/{slug} — Phase 2 ship #21
        'h2h',           -- /h2h/{slug}     — Phase 2 ship #23
        'race-preview',  -- reserved for future F1 race preview
        'race-recap',    -- reserved for future F1 race recap
        'glossary',      -- reserved for future term glossary
        'pemain'         -- reserved for future player-only profile
    ));

COMMIT;
