/**
 * Server-side view of the competition registry (doc 17 §2.1). Reads the
 * generated competitions.json so Node functions, the edge OG card and the
 * scripts all see the same rows the SPA ships.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const registry = require('../../../src/pickem/competitions.json');

export const COMPETITIONS = registry.competitions;
export const COMPETITION_ORDER = registry.order;
export const ACTIVE_FEED_KEYS = registry.activeFeeds;

export function isCompetitionKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(COMPETITIONS, key);
}

/** First row whose window covers now, else most recently opened, else first. */
export function defaultCompetitionKey(now = new Date()) {
  const t = now.getTime();
  for (const key of COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (c && t >= Date.parse(c.window.opensAt) && t <= Date.parse(c.window.closesAt)) return key;
  }
  let best = null, bestTs = -Infinity;
  for (const key of COMPETITION_ORDER) {
    const c = COMPETITIONS[key];
    if (!c) continue;
    const opens = Date.parse(c.window.opensAt);
    if (opens <= t && opens > bestTs) { best = key; bestTs = opens; }
  }
  return best || COMPETITION_ORDER[0];
}

/** Indonesian long label for cards; '' for unknown keys. */
export function labelFor(key, lang = 'id') {
  const c = COMPETITIONS[key];
  if (!c) return '';
  return lang === 'id' ? c.labelLong.id : c.labelLong.en;
}
