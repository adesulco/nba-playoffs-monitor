/**
 * User-local timezone utilities for gibol.co.
 *
 * Games come from ESPN with UTC ISO dates. We render them in the user's
 * browser timezone so an Indonesian fan sees "Sab 18 Apr · 10:30 WIB"
 * instead of "FRI 7:30 PM ET".
 */

// Map from Indonesia-specific IANA zone → common Indonesian abbreviation.
// Non-Indonesia users see an offset label like "GMT+8" instead.
const INDO_ZONES = {
  'Asia/Jakarta':    'WIB',    // Western Indonesia Time (GMT+7)
  'Asia/Pontianak':  'WIB',
  'Asia/Makassar':   'WITA',   // Central Indonesia Time (GMT+8)
  'Asia/Ujung_Pandang': 'WITA',
  'Asia/Jayapura':   'WIT',    // Eastern Indonesia Time (GMT+9)
};

/**
 * Get the user's current IANA timezone (e.g. "Asia/Jakarta", "America/New_York").
 * Falls back to 'UTC' if the browser doesn't expose it.
 */
export function getUserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Return a short label for the user's timezone:
 *   - "WIB", "WITA", "WIT" for Indonesia zones
 *   - Otherwise "GMT+7" style offset derived from Date
 */
export function getUserTzLabel() {
  const zone = getUserTimeZone();
  if (INDO_ZONES[zone]) return INDO_ZONES[zone];

  // Compute GMT offset in hours for the fallback label
  try {
    const now = new Date();
    const tzFmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' });
    const parts = tzFmt.formatToParts(now);
    const off = parts.find((p) => p.type === 'timeZoneName');
    if (off?.value) return off.value.replace('GMT', 'GMT'); // e.g. "GMT+7"
  } catch {}

  // Ultimate fallback: compute numerical offset
  const offMinutes = -new Date().getTimezoneOffset();
  const sign = offMinutes >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(offMinutes) / 60));
  return `GMT${sign}${h}`;
}

/**
 * Format a game's kickoff time in the user's local zone.
 *   formatKickoff('2026-04-18T23:30:00Z', 'id') → "10:30 WIB"
 *   formatKickoff('2026-04-18T23:30:00Z', 'en') → "10:30 WIB" (or "7:30 PM GMT+8" abroad)
 *
 * Returns '' if the date is invalid.
 */
export function formatKickoff(isoDate, lang = 'id') {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const zone = getUserTimeZone();
    // Indonesian readers prefer 24-hour format; English readers 12-hour.
    const timeStr = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: lang !== 'id',
      timeZone: zone,
    }).format(d);
    return `${timeStr} ${getUserTzLabel()}`;
  } catch {
    return '';
  }
}

/**
 * Format date+time compact: "Sab 18 Apr · 10:30 WIB" (id) or "Sat Apr 18 · 10:30 AM WIB" (en).
 */
export function formatGameDateTime(isoDate, lang = 'id') {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const zone = getUserTimeZone();
    const dateStr = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: zone,
    }).format(d);
    const time = formatKickoff(isoDate, lang);
    return `${dateStr} · ${time}`;
  } catch {
    return '';
  }
}

/**
 * Given an ESPN status string like "FRI 7:30 PM ET" or "4/17 - 10:00 PM EDT" and
 * the ISO date for that game, return a localized version. If we can't localize
 * (status is live/final or ISO missing), return the original status.
 */
export function localizeGameStatus(rawStatus, isoDate, statusState, lang = 'id') {
  if (!rawStatus) return '';
  // Live/final states include actual game clock — don't touch those.
  if (statusState === 'in' || statusState === 'post') return rawStatus;
  if (!isoDate) return rawStatus;

  const localTime = formatKickoff(isoDate, lang);
  if (!localTime) return rawStatus;
  return localTime;
}
