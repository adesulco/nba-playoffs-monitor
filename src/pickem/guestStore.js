// ============================================================================
// v0.67.0 — Pick'em guest store + predict-first funnel.
//
// First prediction must be reachable in ≤ 2 taps with no login. This module
// owns the local persistence of guest predictions (device-id keyed) and the
// claim-on-login merge that turns a guest into a known user.
//
// Storage shape (localStorage):
//
//   gibol:pickem:device-id          → opaque random id (UUID-ish)
//   gibol:pickem:guest-predictions  → { [fixture_id]: { picked_outcome,
//                                       picked_home, picked_away, is_jagoan,
//                                       league, matchday, updated_at } }
//   gibol:pickem:nudged             → '1' once the first-run nudge has fired
//
// Rationale: keyed-by-fixture lets the user re-pick freely before login
// (latest-wins, no append-only queue). On first authenticated login the
// claimGuestPredictions() helper POSTs each pending row to /api/pickem and
// clears local storage on success. Failures are retried on the next
// useGuestStore() mount.
// ============================================================================

const DEVICE_KEY = 'gibol:pickem:device-id';
const QUEUE_KEY = 'gibol:pickem:guest-predictions';
const NUDGE_KEY = 'gibol:pickem:nudged';

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/** Lazily create + return a stable per-device id. */
export function getDeviceId() {
  if (!isBrowser) return null;
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function readQueue() {
  if (!isBrowser) return {};
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeQueue(map) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Persist (or update) a guest prediction. `partial` is the same shape the
 * /api/pickem upsert-prediction endpoint accepts plus the (league,
 * matchday) needed to replay on claim.
 *
 *   saveGuestPrediction({
 *     fixture_id: '…',
 *     league:     'WC2026',
 *     matchday:   1,
 *     picked_outcome: 'H',
 *     picked_home:    2,
 *     picked_away:    1,
 *     is_jagoan:      false,
 *   });
 */
export function saveGuestPrediction(payload) {
  if (!payload || !payload.fixture_id) return null;
  const map = readQueue();
  const existing = map[payload.fixture_id] || {};

  // If is_jagoan flips on, clear any other guest Jagoan on this
  // (league, matchday) so the "exactly one" rule from §5.2 holds locally
  // before the server has a chance to enforce it.
  if (payload.is_jagoan === true && payload.league != null && payload.matchday != null) {
    for (const [fixId, pred] of Object.entries(map)) {
      if (fixId === payload.fixture_id) continue;
      if (pred.league === payload.league && pred.matchday === payload.matchday && pred.is_jagoan) {
        map[fixId] = { ...pred, is_jagoan: false, updated_at: new Date().toISOString() };
      }
    }
  }

  const merged = { ...existing, ...payload, updated_at: new Date().toISOString() };
  map[payload.fixture_id] = merged;
  writeQueue(map);
  return merged;
}

/** Read the current guest prediction for one fixture (or null). */
export function getGuestPrediction(fixtureId) {
  if (!fixtureId) return null;
  const map = readQueue();
  return map[fixtureId] || null;
}

/** Read every pending guest prediction; optionally filter by league. */
export function listGuestPredictions(league) {
  const map = readQueue();
  const rows = Object.values(map);
  return league ? rows.filter((r) => r.league === league) : rows;
}

/** Remove one fixture from the queue (on successful claim or explicit
 *  delete). */
export function clearGuestPrediction(fixtureId) {
  const map = readQueue();
  if (map[fixtureId]) {
    delete map[fixtureId];
    writeQueue(map);
  }
}

/** Wipe the entire queue (used by claimGuestPredictions on full success). */
export function clearAllGuestPredictions() {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {}
}

/** Has the first-run nudge already fired for this device? */
export function hasBeenNudged() {
  if (!isBrowser) return true;
  try {
    return localStorage.getItem(NUDGE_KEY) === '1';
  } catch {
    return true;
  }
}

/** Mark the first-run nudge as fired (so it never re-prompts). */
export function markNudged() {
  if (!isBrowser) return;
  try {
    localStorage.setItem(NUDGE_KEY, '1');
  } catch {}
}

/**
 * claimGuestPredictions(upsertFn) — replay every pending guest prediction
 * against the authenticated API. `upsertFn` is the API client's
 * upsertPrediction(payload) helper (which carries the user's bearer
 * token); we pass it in to avoid this module depending on the API layer.
 *
 * Strategy: best-effort. Rows that succeed are removed from the queue;
 * rows that fail (locked fixture, validation error, network) stay
 * pending so the next claim attempt picks them up. Returns a summary.
 */
export async function claimGuestPredictions(upsertFn) {
  if (!isBrowser || typeof upsertFn !== 'function') {
    return { ok: false, claimed: 0, skipped: 0, failed: 0 };
  }
  const map = readQueue();
  const ids = Object.keys(map);
  if (ids.length === 0) return { ok: true, claimed: 0, skipped: 0, failed: 0 };

  let claimed = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const fixtureId of ids) {
    const pred = map[fixtureId];
    try {
      const res = await upsertFn({
        fixture_id:     pred.fixture_id,
        picked_outcome: pred.picked_outcome,
        picked_home:    pred.picked_home,
        picked_away:    pred.picked_away,
        is_jagoan:      pred.is_jagoan === true,
      });
      if (res && res.ok) {
        delete map[fixtureId];
        claimed++;
      } else if (res && /locked/i.test(String(res.error || ''))) {
        // Fixture locked since the guest saved — that's an unrecoverable
        // skip, drop it from the queue so we don't keep retrying.
        delete map[fixtureId];
        skipped++;
      } else {
        failed++;
        failures.push({ fixture_id: fixtureId, error: res?.error });
      }
    } catch (err) {
      failed++;
      failures.push({ fixture_id: fixtureId, error: String(err?.message || err) });
    }
  }

  writeQueue(map);
  return { ok: failed === 0, claimed, skipped, failed, failures };
}
