import React from 'react';
import GeneratedArticle from './GeneratedArticle.jsx';

/**
 * /preview/[slug] — pre-match preview articles (Phase 1 ship #1, v0.23.0).
 *
 * Thin wrapper around GeneratedArticle. The shared component handles
 * fetch + markdown render + chrome (TopBar subrow, Breadcrumbs, manual-
 * review banner, AI disclosure footer). Phase 1 ship #3 (v0.25.0)
 * generalized this so MatchRecap can reuse the same machinery.
 */
export default function Preview() {
  return <GeneratedArticle type="preview" />;
}
