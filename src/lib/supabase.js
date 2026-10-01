/**
 * Browser Supabase client — singleton for the Vite SPA.
 *
 * Uses the anon key; reads/writes are gated by the RLS policies on the
 * Supabase Postgres schema (tables: brackets, picks, leagues, league_members,
 * profiles). Auth state (magic link session) is persisted to localStorage so
 * page refreshes keep the user signed in.
 *
 * Env vars:
 *   VITE_SUPABASE_URL       — public, exposed to the browser
 *   VITE_SUPABASE_ANON_KEY  — public, exposed to the browser
 *
 * The server-only service-role key lives in `api/_lib/supabaseAdmin.js` and
 * is NEVER exposed here.
 */

import { createClient } from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://egzacjfbmgbcwhtvqixc.supabase.co';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client = null;
let clientPromise = null;

const CLIENT_OPTIONS = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'gibol-supabase-auth',
  },
};

/**
 * The client library is a dynamic import (doc 17 S2 entry-bundle diet):
 * @supabase/* was 55 % of the entry chunk and most visitors never sign in.
 * Resolves to the real client; created once.
 */
export function getSupabaseAsync() {
  if (client) return Promise.resolve(client);
  if (!clientPromise) {
    if (!url || !anon) console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing');
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(url, anon, CLIENT_OPTIONS);
      return client;
    });
  }
  return clientPromise;
}

/** The real client when it exists, else the deferred proxy below. */
export function getSupabase() {
  return client || supabase;
}

// ── Deferred proxy ──────────────────────────────────────────────────────────
// `supabase.from('t').select('*').eq('a', 1)` and `supabase.auth.getSession()`
// keep working unchanged: property gets and calls are recorded, and the chain
// is replayed on the real client the moment it is awaited (`then`).
// `auth.onAuthStateChange(cb)` is the one synchronous API the app uses — it
// is wired eagerly and returns an unsubscribe handle that waits for the
// client.
function replay(target, ops) {
  let cur = target;
  let parent = null;
  for (const op of ops) {
    if ('get' in op) { parent = cur; cur = cur[op.get]; }
    else { cur = cur.apply(parent, op.call); parent = null; }
  }
  return cur;
}

function deferred(ops) {
  const fn = function deferredSupabase() {};
  return new Proxy(fn, {
    get(_t, prop) {
      if (client) return replay(client, [...ops, { get: prop }]);
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const p = getSupabaseAsync().then((c) => replay(c, ops));
        return p[prop].bind(p);
      }
      if (typeof prop === 'symbol') return undefined;
      return deferred([...ops, { get: prop }]);
    },
    apply(_t, _this, args) {
      if (client) return replay(client, [...ops, { call: args }]);
      const last = ops[ops.length - 1];
      if (last && last.get === 'onAuthStateChange') {
        const pending = getSupabaseAsync().then((c) => replay(c, [...ops, { call: args }]));
        return {
          data: {
            subscription: {
              unsubscribe: () => pending.then((r) => r?.data?.subscription?.unsubscribe?.()),
            },
          },
        };
      }
      return deferred([...ops, { call: args }]);
    },
  });
}

export const supabase = deferred([]);
export default supabase;
