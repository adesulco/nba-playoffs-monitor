import React from 'react';
import GeneratedArticle from './GeneratedArticle.jsx';

/**
 * /h2h/[slug] — head-to-head matchup explainer (Phase 2 ship #23,
 * v0.43.0).
 *
 * Football-first vertical slice; NBA / F1 grid pairs / tennis player
 * H2H follow on the same route with sport-id-prefixed slugs. The
 * slug is alphabetically sorted so "Liverpool vs Arsenal" and
 * "Arsenal vs Liverpool" both land at /h2h/epl-arsenal-vs-liverpool-h2h.
 *
 * Reads JSON from /content/h2h/{slug}.json. Same chrome as Preview /
 * MatchRecap / Standings / Profile via shared GeneratedArticle.
 */
export default function H2H() {
  return <GeneratedArticle type="h2h" />;
}
