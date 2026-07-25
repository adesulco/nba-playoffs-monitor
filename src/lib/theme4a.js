/**
 * Edisi Malam theme engine — R1-7 (v0.82.0).
 *
 * Auto dark 19:00–06:00 WIB with a manual override, applied as
 * data-theme4a="light|dark" on <html> (tokens-4a.css reads it).
 *
 * WIB is fixed UTC+7 and never observes DST, so the window is computed
 * from the UTC hour rather than the visitor's local clock — a user in
 * Jakarta and one in London both see Edisi Malam at the same moment,
 * which is what makes "Malam Ini" mean the same thing to a whole grup.
 *
 * The override is sticky but not permanent: it stores which SIDE of the
 * auto schedule the user chose and clears itself once the schedule
 * catches up. Someone who forces dark at noon gets dark now, and is back
 * on automatic tomorrow rather than stuck in dark forever.
 */

const STORAGE_KEY = 'gibol:theme4a';
const WIB_OFFSET_HOURS = 7;
const DARK_FROM = 19; // 19:00 WIB
const DARK_UNTIL = 6; // 06:00 WIB

/** Current hour in WIB (0–23), independent of the visitor's timezone. */
export function wibHour(now = new Date()) {
  return (now.getUTCHours() + WIB_OFFSET_HOURS) % 24;
}

/** What the schedule alone would pick. */
export function scheduledTheme(now = new Date()) {
  const h = wibHour(now);
  return h >= DARK_FROM || h < DARK_UNTIL ? 'dark' : 'light';
}

function readOverride() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.theme === 'light' || parsed?.theme === 'dark') return parsed;
  } catch {}
  return null;
}

function writeOverride(value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

/**
 * The theme to render: the override while it still disagrees with the
 * schedule, otherwise the schedule. A stale override (the schedule has
 * caught up to it) is cleared so auto resumes.
 */
export function resolveTheme(now = new Date()) {
  const scheduled = scheduledTheme(now);
  const override = readOverride();
  if (!override) return scheduled;
  if (override.theme === scheduled) {
    writeOverride(null); // schedule agrees — drop back to automatic
    return scheduled;
  }
  // Expire an override that has outlived a full schedule flip.
  if (override.against && override.against !== scheduled) {
    writeOverride(null);
    return scheduled;
  }
  return override.theme;
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme4a', theme);
}

/** Manual toggle. Passing the scheduled value clears the override. */
export function setTheme(theme, now = new Date()) {
  const scheduled = scheduledTheme(now);
  if (theme === scheduled) writeOverride(null);
  else writeOverride({ theme, against: scheduled });
  applyTheme(theme);
  return theme;
}

export function toggleTheme(now = new Date()) {
  return setTheme(resolveTheme(now) === 'dark' ? 'light' : 'dark', now);
}

/**
 * Apply now and keep applying as the WIB window moves. Checks once a
 * minute — cheap, and a missed flip would be visible for at most that
 * long. Returns a cleanup function.
 */
export function startThemeEngine() {
  if (typeof window === 'undefined') return () => {};
  applyTheme(resolveTheme());
  const id = window.setInterval(() => applyTheme(resolveTheme()), 60_000);
  const onFocus = () => applyTheme(resolveTheme()); // catch a backgrounded tab
  window.addEventListener('focus', onFocus);
  return () => {
    window.clearInterval(id);
    window.removeEventListener('focus', onFocus);
  };
}
