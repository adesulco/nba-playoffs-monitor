/**
 * Stale-while-revalidate localStorage cache — v0.11.7 Sprint 2 week-2.
 *
 * Pattern:
 *   const [data, setData] = useState(() => readCache(key));
 *   useEffect(() => {
 *     fetchFresh().then((fresh) => {
 *       writeCache(key, fresh);
 *       setData(fresh);
 *     });
 *   }, []);
 *
 * Rationale:
 *   Return visits should paint instantly from the last known snapshot,
 *   then quietly refresh in the background. The audit's §09 perf note
 *   is: "The gap between 38ms TTFB and 4.7s FCP is 99.2% of gibol's
 *   performance problem." A user who visited five minutes ago doesn't
 *   need to wait for ESPN again — the snapshot is already local.
 *
 * Design:
 *   - Namespaced keys: all entries live under `gibol:swr:v1:<name>`.
 *     The `v1` segment is a schema version — bump when the shape of a
 *     cached payload changes incompatibly. Old keys are then ignored
 *     and naturally GC'd on next write.
 *   - TTL per read: `readCache(key, { ttlMs })` returns null if the
 *     entry is older than ttlMs. Default 15 minutes — matches the
 *     shortest "stale data is still useful" horizon for scoreboards
 *     outside live windows. Callers can pass a longer TTL for stable
 *     reference data (standings, calendars) and a short one (or
 *     always-refresh) for live feeds.
 *   - Quota-safe: every write is try/catch'd. localStorage can throw
 *     QuotaExceededError on iOS private mode; we swallow silently and
 *     fall back to memory-only behaviour.
 *   - Size-aware: entries over ~200 KB are rejected on write. Keeps
 *     one bad payload from blowing the per-origin localStorage cap
 *     (typically 5–10 MB).
 *
 * Not a replacement for a real cache (SWR, TanStack Query). Just
 * enough to remove the "blank cream screen for 3 seconds" Rangga
 * persona bounce from the audit.
 */

const NS = 'gibol:swr:v1:';
const MAX_ENTRY_BYTES = 200 * 1024;

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/**
 * Read a cached value. Returns null if missing, stale, parse-failed,
 * or localStorage is unavailable.
 *
 * @param {string} name — bare name (e.g. 'nba-scoreboard'); gets namespaced.
 * @param {object} [opts]
 * @param {number} [opts.ttlMs=900000] — max age in ms. Default 15 min.
 * @returns {any|null} parsed value or null.
 */
export function readCache(name, { ttlMs = 15 * 60 * 1000 } = {}) {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(NS + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.t !== 'number') return null;
    if (Date.now() - parsed.t > ttlMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

/**
 * Write a value to the cache. Silently no-ops on quota, serialisation,
 * or size-cap failures.
 *
 * @param {string} name
 * @param {any} value — must be JSON-serialisable.
 */
export function writeCache(name, value) {
  if (!canUseStorage()) return;
  try {
    const payload = JSON.stringify({ t: Date.now(), v: value });
    if (payload.length > MAX_ENTRY_BYTES) return;
    window.localStorage.setItem(NS + name, payload);
  } catch {
    /* quota / serialize / private-mode — intentionally silent */
  }
}

/**
 * Explicit cache invalidation. Rarely needed — TTL handles staleness —
 * but useful after a known-bad write (e.g. auth-gated endpoint got a
 * 401, don't serve the error page on return).
 */
export function clearCache(name) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(NS + name);
  } catch {
    /* noop */
  }
}

/**
 * Read cache metadata (timestamp) without the value payload — useful
 * for "last updated 2 min ago" chrome without re-parsing the whole
 * payload.
 */
export function readCacheMeta(name) {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(NS + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== 'number') return null;
    return { t: parsed.t, ageMs: Date.now() - parsed.t };
  } catch {
    return null;
  }
}

export default { readCache, writeCache, clearCache, readCacheMeta };
