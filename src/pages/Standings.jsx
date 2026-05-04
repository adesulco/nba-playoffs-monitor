import React from 'react';
import GeneratedArticle from './GeneratedArticle.jsx';

/**
 * /standings/[slug] — weekly standings explainer (Phase 1 ship #8,
 * v0.29.0).
 *
 * Templated content from the Haiku 4.5 standings agent. Slug shape:
 * `{league}-{season}-pekan-{N}`. Reads JSON from
 * /content/standings/{slug}.json.
 *
 * Same chrome + render path as Preview / MatchRecap via the shared
 * GeneratedArticle component.
 */
export default function Standings() {
  return <GeneratedArticle type="standings" />;
}
