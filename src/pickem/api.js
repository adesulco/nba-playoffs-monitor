import { supabase } from '../lib/supabase.js';

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
    const res = await fetch(buildUrl('list-fixtures', params));
    const data = await readJson(res);
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
    const res = await fetch(buildUrl('list-leaderboard', params));
    const data = await readJson(res);
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
export async function listProfile({ competition = 'WC2026', history_limit } = {}) {
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
