import { supabase } from '../lib/supabase.js';
import { trackEvent } from '../lib/analytics.js';
import { defaultCompetitionKey } from './competitions.js';

// F-010 — Pick'em conversion analytics. trackEvent is consent-gated (no-op
// until the user grants analytics consent) and bridges GA4 + PostHog. Some
// conversions (predictions, bracket edits) auto-save on every keystroke/tap,
// so we dedupe those to one event per key per page session — otherwise the
// raw counts would be dominated by score-stepper taps.
const _firedOnce = new Set();
function trackOnce(key, eventName, params) {
  if (_firedOnce.has(key)) return;
  _firedOnce.add(key);
  trackEvent(eventName, params);
}

// ============================================================================
// v0.67.0 — Pick'em API client.
//
// Wraps the /api/pickem dispatcher (?_action=...) actions added in v0.66.0.
// Two response patterns:
//
//   { ok: true, ...payload }    on success
//   { ok: false, error: '...' } on any failure (network, 4xx, 5xx)
//
// The hub UI never throws on a failed list call — it shows an empty state
// instead. This matters during the v0.66.0 → migration-applied gap, where
// list-fixtures returns "table not found" until 0015 lands. We rewrite that
// error to a graceful "not ready" hint so the UI can show a placeholder.
//
// Auth: upsertPrediction injects the Supabase session JWT as
// Authorization: Bearer <token>. Public reads (fixtures, leaderboards) are
// anon-friendly per the RLS policies in migration 0015.
// ============================================================================

const BASE = '/api/pickem';

// ── Read cache (doc 17 S2): short SWR window + in-flight dedupe for the GET
// actions the screens poll. A pick/join/settings write invalidates the
// matching reads so the next one is fresh.
const CACHE_TTL_MS = 15000;
const _cache = new Map();    // key -> { at, out }
const _inflight = new Map(); // key -> Promise

async function cachedGet(url, { ttl = CACHE_TTL_MS, headers } = {}) {
  const key = headers?.Authorization ? `${url}#auth` : url;
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.out;
  if (_inflight.has(key)) return _inflight.get(key);
  const p = (async () => {
    try {
      const res = await fetch(url, headers ? { headers } : undefined);
      const data = await readJson(res);
      const out = { res, data };
      if (res.ok && data?.ok !== false) _cache.set(key, { at: Date.now(), out });
      return out;
    } finally {
      _inflight.delete(key);
    }
  })();
  _inflight.set(key, p);
  return p;
}

/** Drop cached reads whose key contains any fragment (no fragments = all). */
export function invalidateReads(...fragments) {
  for (const key of [..._cache.keys()]) {
    if (!fragments.length || fragments.some((f) => f && key.includes(f))) _cache.delete(key);
  }
}

async function readBearer() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

function buildUrl(action, params = {}) {
  const usp = new URLSearchParams({ _action: action });
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    usp.set(k, String(v));
  }
  return `${BASE}?${usp.toString()}`;
}

async function readJson(res) {
  try {
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

function isSchemaMissing(error) {
  if (!error) return false;
  const s = String(error).toLowerCase();
  return s.includes("could not find the table 'public.fixtures'")
      || s.includes("could not find the table 'public.predictions'")
      || s.includes("relation \"public.fixtures\" does not exist");
}

function normalizeError(res, data, fallback) {
  if (data && data.error) return data.error;
  if (res && !res.ok) return `${res.status} ${res.statusText || fallback || 'request failed'}`.trim();
  return fallback || 'request failed';
}

// ────────────────────────────────────────────────────────────────────────────
// Public reads
// ────────────────────────────────────────────────────────────────────────────

/**
 * listFixtures({ league, season?, matchday?, status?, after_iso?, limit? })
 * → { ok: true, fixtures: [...], schemaReady: true }
 * or { ok: false, error, schemaReady: false } when migration 0015 isn't applied.
 */
export async function listFixtures(params) {
  if (!params?.league) throw new Error('league required');
  try {
    const { res, data } = await cachedGet(buildUrl('list-fixtures', params));
    if (!res.ok) {
      const err = normalizeError(res, data);
      return { ok: false, error: err, schemaReady: !isSchemaMissing(err), fixtures: [] };
    }
    return { ok: true, fixtures: data?.fixtures || [], schemaReady: true };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.message || err),
      schemaReady: true, // network failure ≠ schema missing
      fixtures: [],
    };
  }
}

/**
 * listLeaderboard({ scope, league?, matchday?, league_id?, around?, limit? })
 * scope: 'competition' | 'league' | 'matchday'
 */
export async function listLeaderboard(params) {
  if (!params?.scope) throw new Error('scope required');
  try {
    const { res, data } = await cachedGet(buildUrl('list-leaderboard', params));
    if (!res.ok) {
      return { ok: false, error: normalizeError(res, data), rows: [] };
    }
    return { ok: true, rows: data?.rows || [], scope: data?.scope };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), rows: [] };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Authed writes
// ────────────────────────────────────────────────────────────────────────────

/**
 * upsertPrediction({ fixture_id, picked_outcome, picked_home?, picked_away?, is_jagoan? })
 * Requires a Supabase session — the bearer token is read from supabase.auth.
 * For guest-mode predictions, use src/pickem/guestStore.js#saveGuestPrediction
 * and replay on login via claimGuestPredictions(upsertPrediction).
 */
export async function upsertPrediction(payload) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('upsert-prediction'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    trackOnce(`pred:${payload?.fixture_id}`, 'pickem_prediction_saved', { league: payload?.league });
    invalidateReads('list-predictions', 'league-detail', 'list-leaderboard');
    return { ok: true, prediction: data?.prediction };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * scoreFixture({ fixture_id, home_score, away_score, adminToken })
 * Admin only. The adminToken is required client-side because there's no
 * server-side admin auth in this call's path (matches the legacy score
 * endpoint's pattern). Used by the admin scoring console (P4+).
 */
export async function scoreFixture({ fixture_id, home_score, away_score, adminToken }) {
  if (!adminToken) return { ok: false, error: 'admin_token_required' };
  try {
    const res = await fetch(buildUrl('score-fixture'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ fixture_id, home_score, away_score }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    return { ok: true, fixture: data?.fixture, scoring: data?.scoring };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// v0.68.0 — Grup (private/public league) endpoints
// ────────────────────────────────────────────────────────────────────────────

/**
 * createGrup({ name, visibility?, competition?, enabled_modes?, theme?, color? })
 * Auth required. Returns { ok, id, invite_code, ... } on success.
 */
export async function createGrup(payload) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('create-league'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    trackEvent('pickem_group_created', { competition: payload?.competition });
    invalidateReads('list-grups');
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * joinGrup({ leagueId, inviteCode })
 * Auth required. Returns { ok, leagueId } on success.
 */
export async function joinGrup({ leagueId, inviteCode }) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('join-league'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leagueId, inviteCode }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    trackEvent('pickem_group_joined');
    invalidateReads('league-detail', 'list-grups', 'list-leaderboard');
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * listMyGrups(competition?)
 * Auth required. Returns { ok, grups: [...] }.
 */
export async function listMyGrups(competition) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated', grups: [] };
  try {
    const url = buildUrl('list-grups', competition ? { competition } : {});
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data), grups: [] };
    return { ok: true, grups: data?.grups || [] };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), grups: [] };
  }
}

/**
 * listProfile({ competition?, history_limit? })
 * Auth required. Returns { ok, profile } with stats / streak / badges /
 * recent_predictions in one round trip.
 */
export async function listProfile({ competition = defaultCompetitionKey(), history_limit } = {}) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const url = buildUrl('list-profile', { competition, history_limit });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    return { ok: true, profile: data?.profile };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * listPredictions({ competition?, limit? })
 *
 * v0.79.9 — fetches the authenticated user's predictions for the
 * given competition so PredictingHub can re-mark them as selected
 * after a page reload. Returns { ok, predictions: [{ fixture_id,
 * picked_outcome, picked_home, picked_away, is_jagoan, awarded_points,
 * scored_at, ... }] }.
 *
 * No-op when not signed in — caller falls back to localStorage guest
 * predictions (the same path used pre-login).
 */
export async function listPredictions({ competition, limit } = {}) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const params = {};
    if (competition) params.competition = competition;
    if (limit) params.limit = limit;
    const { res, data } = await cachedGet(buildUrl('list-predictions', params), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    return { ok: true, predictions: data?.predictions || [] };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * upsertBracket({ bracket_id?, competition, season?, groups, r32, r16,
 *                 qf, sf, final, champion, lock? })
 * Auth required. Replace-all save of the WC bracket picks; optional
 * lock in the same call. Returns { ok, bracket_id, picks_written,
 * status, locked, locked_at }.
 */
export async function upsertBracket(payload) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('upsert-bracket'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) {
      const err = normalizeError(res, data);
      return { ok: false, error: err, schemaReady: !isSchemaMissing(err) };
    }
    trackOnce('bracket', 'pickem_bracket_saved');
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * upsertSurvivorPick({ fixture_id, picked_team_id })
 * Auth required. Returns { ok, prediction, survivor_entry } on success.
 */
export async function upsertSurvivorPick({ fixture_id, picked_team_id, league_id }) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('upsert-survivor-pick'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fixture_id, picked_team_id, league_id }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    trackEvent('pickem_survivor_pick');
    invalidateReads('list-survivor', 'survivor-board');
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * listSurvivor({ competition? })
 * Auth required. Returns { ok, entry, picks: [...] }.
 */
export async function listSurvivor({ competition = defaultCompetitionKey(), league_id } = {}) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated', entry: null, picks: [] };
  try {
    const url = buildUrl('list-survivor', { competition, league_id });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, error: normalizeError(res, data), entry: null, picks: [] };
    }
    return { ok: true, entry: data?.entry || null, picks: data?.picks || [] };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), entry: null, picks: [] };
  }
}

/**
 * survivorBoard({ code })
 * R4a-1 (M1 Gugur) — the grup's survivor board, public read by invite
 * code (display names + alive/eliminated only; no auth needed, same
 * posture as leagueDetail). Powers the pantau state and the GrupHome
 * Gugur strip.
 */
export async function survivorBoard({ code } = {}) {
  try {
    const url = buildUrl('survivor-board', { code });
    const res = await fetch(url);
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data), rows: [] };
    return data;
  } catch (err) {
    return { ok: false, error: String(err?.message || err), rows: [] };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// v0.80.1 — Flagship Track A ticket A3: pool-first commissioner layer.
// SEAM RULE (pickem-flagship/00-HANDOVER.md §3): Track B screens consume
// ONLY these functions; signatures are stable. No fetch calls in components.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Public read powering the /g/:inviteCode invite landing + grup home.
 * NO AUTH — by design (social proof before signup).
 * @param {{code?: string, id?: string}} ref invite code OR league id
 * @returns {Promise<{ok:boolean, league?:object, members?:Array, error?:string}>}
 *   league: { id, name, invite_code, competition, formats, late_join_policy,
 *             scoring_config, max_members, tier, owner_id, member_count,
 *             pending_count }
 *   members: [{ user_id, display_name, points, exact_count, status,
 *               is_owner, is_managed }] sorted by points desc
 */
export async function leagueDetail({ code, id } = {}) {
  try {
    const url = buildUrl('league-detail', code ? { code } : { id });
    const { res, data } = await cachedGet(url);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    return { ok: true, league: data?.league, members: data?.members || [] };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Commissioner-only pool-config update. Rejected (409) once play has
 * started for the competition — rules freeze at first lock.
 * @param {{league_id:string, scoring_config?:object, formats?:string[],
 *          late_join_policy?:'median'|'zero'}} payload
 * @returns {Promise<{ok:boolean, league?:object, error?:string}>}
 */
export async function updateLeagueSettings(payload) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('update-league-settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    invalidateReads('league-detail', 'list-grups');
    return { ok: true, league: data?.league };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Batch-merge guest picks after first login. Server wins when a fixture
 * is locked; guest wins while it's open. is_jagoan is intentionally NOT
 * merged (user re-stars post-login).
 * @param {Array<{fixture_id:string, picked_outcome:'H'|'D'|'A',
 *                picked_home?:number, picked_away?:number}>} predictions
 * @returns {Promise<{ok:boolean, merged?:number, skipped_locked?:number,
 *                    errors?:Array, error?:string}>}
 */
export async function mergeGuest(predictions) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('merge-guest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ predictions }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(res, data) };
    invalidateReads('list-predictions', 'league-detail');
    return { ok: true, merged: data?.merged ?? 0, skipped_locked: data?.skipped_locked ?? 0, errors: data?.errors || [] };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Commissioner approves a pending member. 402 + needs_upgrade:true when
 * the free cap is full (drives the upgrade sheet).
 * @param {{league_id:string, user_id:string}} payload
 * @returns {Promise<{ok:boolean, status?:string, needs_upgrade?:boolean, error?:string}>}
 */
/**
 * leaderboardNational({ league, board, limit, offset }) → { ok, rows, me, total }.
 * Sends the bearer when there is one so `me` comes back.
 */
export async function leaderboardNational({ league, board = 'points', limit = 50, offset = 0 } = {}) {
  try {
    const token = await readBearer();
    const { res, data } = await cachedGet(
      buildUrl('leaderboard-national', { league, board, limit, offset }),
      token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    );
    if (!res.ok || !data?.ok) return { ok: false, error: normalizeError(res, data, 'board unavailable'), rows: [] };
    return { ok: true, rows: data.rows || [], me: data.me || null, total: data.total ?? null };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), rows: [] };
  }
}

/**
 * sendMagicLink({ email, next }) → { ok } — the only auth call screens make.
 */
export async function sendMagicLink({ email, next = '/' }) {
  try {
    const safeNext = /^\/(?![\/\\])/.test(String(next || '')) ? next : '/';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: String(email).trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * onSession(cb) — calls cb(session) now if signed in, and on every later
 * sign-in. Returns an unsubscribe function. Keeps screens off Supabase.
 */
export function onSession(cb) {
  let done = false;
  supabase.auth.getSession().then(({ data }) => { if (!done && data?.session) cb(data.session); }).catch(() => {});
  const sub = supabase.auth.onAuthStateChange((evt, session) => {
    if (session && (evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED' || evt === 'INITIAL_SESSION')) cb(session);
  });
  return () => { done = true; sub?.data?.subscription?.unsubscribe?.(); };
}

/** signOut() → ends the session and clears every cached read. */
export async function signOut() {
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
  invalidateReads();
  return { ok: true };
}

/**
 * getFixture({ id }) → { ok, fixture } — one fixture with teams embedded.
 */
export async function getFixture({ id }) {
  try {
    const res = await fetch(buildUrl('get-fixture', { id }));
    const data = await readJson(res);
    if (!res.ok || !data?.ok) return { ok: false, error: normalizeError(res, data, 'fixture unavailable') };
    return { ok: true, fixture: data.fixture };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * getPrediction({ fixture_id }) → { ok, prediction|null }. Auth required.
 */
export async function getPrediction({ fixture_id }) {
  try {
    const token = await readBearer();
    if (!token) return { ok: false, error: 'not_authenticated' };
    const res = await fetch(buildUrl('get-prediction', { fixture_id }), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) return { ok: false, error: normalizeError(res, data, 'prediction unavailable') };
    return { ok: true, prediction: data.prediction ?? null };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * updateProfile({ nickname?, favorite_teams?, favorite_team?, city? })
 * → { ok, profile }. The only profile write path (seam rule).
 */
export async function updateProfile(patch) {
  try {
    const token = await readBearer();
    if (!token) return { ok: false, error: 'not_authenticated' };
    const res = await fetch(buildUrl('update-profile'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch || {}),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) return { ok: false, error: normalizeError(res, data, 'profile update failed') };
    return { ok: true, profile: data.profile };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function approveMember(payload) {
  const token = await readBearer();
  if (!token) return { ok: false, error: 'not_authenticated' };
  try {
    const res = await fetch(buildUrl('approve-member'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, error: normalizeError(res, data), needs_upgrade: data?.needs_upgrade === true };
    }
    invalidateReads('league-detail', 'list-leaderboard');
    return { ok: true, status: data?.status };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}
