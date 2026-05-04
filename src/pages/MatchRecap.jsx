import React from 'react';
import GeneratedArticle from './GeneratedArticle.jsx';

/**
 * /match-recap/[slug] — post-match recap articles (Phase 1 ship #3,
 * v0.25.0).
 *
 * Sister page to Preview — fetches the JSON from
 * /content/recap/{slug}.json (written by the Python content engine's
 * recap writer) and renders it through the shared GeneratedArticle
 * component.
 *
 * Path is /match-recap/:slug rather than /recap/:slug because the
 * existing NBA recap landing at /recap/:date would catch the slug
 * param. Future ship may unify by routing /recap intelligently based
 * on whether the param looks like a date or a slug.
 */
export default function MatchRecap() {
  return <GeneratedArticle type="recap" />;
}
