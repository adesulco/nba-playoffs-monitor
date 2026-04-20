/**
 * Tennis — season constants and display helpers (v0.5.0 Phase 1A).
 *
 * Phase 1A foundation. Data is mostly dynamic via ESPN, so we hardcode only
 * the few things that must be deterministic for prerender + fallback:
 *   - SEASON (year string)
 *   - TOURS (atp / wta)
 *   - INDONESIAN_PLAYERS (for IndonesianSpotlight component in UI spec)
 *   - formatTennisDate / formatTennisDateRange / daysUntil / humanRelativeDays
 *   - playerSlug derivation (diacritics preserved per project rule)
 *
 * See tournaments.js for the tournament registry (4 slams + 14 combined/
 * single-tour 1000s + 2 year-end finals) and player-seed.json for the
 * marquee player roster.
 */

export const SEASON = '2026';

export const TOURS = ['atp', 'wta'];

export const TOUR_LABEL = {
  atp: 'ATP',
  wta: 'WTA',
};

/**
 * Indonesian player seed — surfaced on IndonesianSpotlight + hub page.
 * Per 00-brief: Aldila Sutjiadi, Priska Madelyn Nugroho, Christopher Rungkat.
 * Tournament status and rank are fetched live from ESPN; this is the
 * deterministic baseline for prerender + offline fallback.
 */
export const INDONESIAN_PLAYERS = [
  {
    slug: 'aldila-sutjiadi',
    displayName: 'Aldila Sutjiadi',
    shortName: 'A. Sutjiadi',
    firstName: 'Aldila',
    lastName: 'Sutjiadi',
    tour: 'wta',
    focus: 'Doubles',
    country: 'Indonesia',
    countryCode: 'IDN',
    bioId:
      'Spesialis ganda putri WTA Tour — pembawa panji Indonesia di turnamen internasional ganda campuran.',
    bioEn:
      "Indonesia's flagship WTA Tour doubles specialist; competes in women's doubles and mixed doubles internationally.",
  },
  {
    slug: 'priska-madelyn-nugroho',
    displayName: 'Priska Madelyn Nugroho',
    shortName: 'P. Nugroho',
    firstName: 'Priska Madelyn',
    lastName: 'Nugroho',
    tour: 'wta',
    focus: 'Singles',
    country: 'Indonesia',
    countryCode: 'IDN',
    bioId:
      'Juara ganda putri Australian Open Junior 2020 dan pembawa panji tunggal putri Indonesia di ITF / WTA tour.',
    bioEn:
      '2020 Australian Open girls’ doubles champion; Indonesia’s leading singles player across the ITF / WTA tour.',
  },
  {
    slug: 'christopher-rungkat',
    displayName: 'Christopher Rungkat',
    shortName: 'C. Rungkat',
    firstName: 'Christopher',
    lastName: 'Rungkat',
    tour: 'atp',
    focus: 'Doubles',
    country: 'Indonesia',
    countryCode: 'IDN',
    bioId:
      'Pemain ganda ATP Tour paling berpengalaman di Indonesia; veteran Piala Davis multi-dekade.',
    bioEn:
      "Indonesia's most-capped ATP Tour doubles player and a multi-decade Davis Cup veteran.",
  },
];

export const INDONESIAN_PLAYERS_BY_SLUG = Object.fromEntries(
  INDONESIAN_PLAYERS.map((p) => [p.slug, p])
);

// ─── Date formatting (mirrors F1 helper pattern) ────────────────────────────
// No ICU dep — we only need Bahasa + English month names, never locale-aware
// weekday. WIB is UTC+7; ESPN returns ISO timestamps in UTC so rendering code
// passes date strings through this helper.

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an ISO date (YYYY-MM-DD) into a short `DD Bulan YYYY` string.
 *   formatTennisDate('2026-05-24', 'id') → '24 Mei 2026'
 *   formatTennisDate('2026-05-24', 'en') → '24 May 2026'
 */
export function formatTennisDate(iso, lang = 'id') {
  if (!iso || typeof iso !== 'string' || iso.length < 10) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return '';
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ID;
  return `${d} ${months[m - 1]} ${y}`;
}

/**
 * Format an ISO date range into a Bahasa / English "24 – 31 Mei 2026" string.
 * Same-month ranges collapse the month. Cross-month keeps both months.
 */
export function formatTennisDateRange(startISO, endISO, lang = 'id') {
  if (!startISO || !endISO) return formatTennisDate(startISO || endISO, lang);
  const s = startISO.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  const e = endISO.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ID;
  if (s[0] === e[0] && s[1] === e[1]) {
    return `${s[2]} – ${e[2]} ${months[s[1] - 1]} ${s[0]}`;
  }
  if (s[0] === e[0]) {
    return `${s[2]} ${months[s[1] - 1]} – ${e[2]} ${months[e[1] - 1]} ${s[0]}`;
  }
  return `${formatTennisDate(startISO, lang)} – ${formatTennisDate(endISO, lang)}`;
}

/** Integer day delta from now → target ISO date. Negative if in past. */
export function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const msPerDay = 86_400_000;
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - base) / msPerDay);
}

/**
 * Human-readable relative-days helper.
 *    3  → "3 hari lagi" / "In 3 days"
 *    0  → "Hari ini"    / "Today"
 *   -1  → "Kemarin"     / "Yesterday"
 *   -5  → "5 hari lalu" / "5 days ago"
 */
export function humanRelativeDays(days, lang = 'id') {
  if (days == null) return '';
  if (lang === 'en') {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days > 0) return `In ${days} days`;
    return `${Math.abs(days)} days ago`;
  }
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  if (days === -1) return 'Kemarin';
  if (days > 0) return `${days} hari lagi`;
  return `${Math.abs(days)} hari lalu`;
}

/**
 * Derive a player slug from `firstName` + `lastName` — lowercased,
 * diacritics-preserved, dash-separated. Matches the architecture contract
 * (player slug is `{first-name}-{last-name}` lowercased).
 *
 * Diacritics ARE preserved (per project rule: "UTF-8 everywhere, normalize on
 * write, don't slugify with diacritics-stripped URLs") — so Carlos Alcaraz
 * Garfia → `carlos-alcaraz-garfia`, Kimi Antonelli → `kimi-antonelli`.
 */
export function playerSlug(firstName, lastName) {
  const norm = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '');
  const f = norm(firstName);
  const l = norm(lastName);
  return [f, l].filter(Boolean).join('-');
}
