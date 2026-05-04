/**
 * Shared JSON-LD schema builders — v0.13.0 SEO sprint.
 *
 * Why a shared module: every sport adapter (NBA, EPL, F1, Tennis,
 * FIFA WC, Liga 1) needs to emit the same BreadcrumbList shape on
 * its leaf routes (per-team, per-club, per-driver, per-tournament).
 * Without a helper, each adapter would re-implement the schema and
 * drift over time. One source of truth → consistent SERP rich
 * results across sports.
 */

const SITE = 'https://www.gibol.co';

/**
 * Build a schema.org BreadcrumbList for a hub-to-leaf path.
 *
 * Usage:
 *   breadcrumbSchema([
 *     { name: 'Home',                 url: '/' },
 *     { name: 'NBA Playoff 2026',     url: '/nba-playoff-2026' },
 *     { name: 'Oklahoma City Thunder', url: '/nba-playoff-2026/thunder' },
 *   ])
 *
 * Each `url` is normalized with the SITE prefix if it starts with /.
 * Per Google: positions are 1-indexed, the last item should still
 * include the URL (don't omit it for the current page — Google
 * requires it for the "current location" interpretation).
 */
export function breadcrumbSchema(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url?.startsWith('http') ? item.url : `${SITE}${item.url || ''}`,
    })),
  };
}

/**
 * WebSite schema with a SearchAction — emitted on the home / hub
 * pages so Google can show a sitelinks search box in SERPs. Only
 * useful where the URL really IS the canonical site root, so
 * scope to / and /nba-playoff-2026 / similar entry points.
 */
export function websiteSearchSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE,
    name: 'gibol.co',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Organization schema. Same considerations as websiteSearchSchema —
 * emit once on the home page so Google's knowledge panel can pick
 * up the brand.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'gibol.co',
    alternateName: 'gila bola',
    url: SITE,
    logo: `${SITE}/gibol-logo-1024.png`,
    sameAs: [
      // No verified social handles yet; populate when ready.
    ],
  };
}
