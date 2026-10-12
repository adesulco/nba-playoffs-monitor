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

export function getSupabase() {
  if (client) return client;
  if (!url || !anon) {
    // Surface misconfig loudly in dev; server pages won't work without env vars.
    // In production, Vercel should inject VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
    console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing');
  }
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'gibol-supabase-auth',
    },
  });
  return client;
}

// Default export for ergonomic `import supabase from '...'` usage.
export const supabase = getSupabase();
export default supabase;
