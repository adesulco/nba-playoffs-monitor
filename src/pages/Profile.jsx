import React from 'react';
import GeneratedArticle from './GeneratedArticle.jsx';

/**
 * /profile/[slug] — evergreen team / player profile articles
 * (Phase 2 ship #21, v0.42.0).
 *
 * NBA teams first vertical slice; EPL clubs, F1 drivers, tennis
 * players, Liga 1 sides will land at the same route with sport-id
 * prefixed slugs (`nba-boston-celtics`, `epl-arsenal`,
 * `f1-max-verstappen`, `tennis-jannik-sinner`,
 * `liga-1-id-persija-jakarta`).
 *
 * Reads JSON from /content/team/{slug}.json (per the json_writer
 * type_="team" mapping; "team" is the on-disk content folder while
 * "/profile" is the user-facing URL). Same chrome + render path as
 * Preview / MatchRecap / Standings via the shared GeneratedArticle
 * component.
 *
 * Distinct from canonical team dashboards at
 * /nba-playoff-2026/[teamSlug] — those are LIVE data surfaces;
 * profiles are evergreen narrative articles surfaced via SEO and
 * cross-link from the dashboards.
 */
export default function Profile() {
  return <GeneratedArticle type="profile" />;
}
