/**
 * Sport adapter interface (docs-only — JS, no TS).
 *
 * Every sport under src/lib/sports/<slug>/ must expose an `adapter` object with
 * at minimum the following shape. Hooks and components depend on the interface,
 * not the sport. Per multi-sport build plan §2.1.
 *
 * @typedef {Object} SportAdapter
 * @property {string} id                      — stable slug ('nba', 'f1', 'epl', …)
 * @property {string} name                    — display name in English
 * @property {string} nameId                  — display name in Bahasa
 * @property {string} routeBase               — e.g. '/formula-1-2026'
 * @property {string} accent                  — hex color for the card/border
 * @property {string} glyph                   — emoji used on Home card
 * @property {'live'|'soon'} status           — drives Home card rendering
 * @property {() => Array<{path: string, title: string, description: string, keywords?: string, ogImage?: string}>} prerenderRoutes
 *                                            — list of routes to statically prerender for scrapers/SEO
 *
 * Optional methods each phase adds as needed:
 *   useSportData(opts)     → { events, standings, status, errors, lastUpdate }
 *   useEventDetails(id)    → { events: playByPlay, stats, status }
 *   useOutrightOdds()      → Polymarket-shaped list
 *   getEventSharePayload(event, lang) → { text, url }
 *
 * When a sport is 'soon' it only needs id, name/nameId, routeBase, accent,
 * glyph, status, and prerenderRoutes (which should emit the coming-soon route
 * with its SEO meta so WhatsApp previews still work).
 */
export const SPORT_ADAPTER_SHAPE = null; // placeholder so the file has a real export
