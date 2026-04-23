/**
 * Server-only Supabase client using the service-role key.
 *
 * NEVER import this from anything under src/ — it bypasses RLS and has full
 * DB access. Use from Vercel Node serverless functions under api/ only.
 *
 * Env vars (Vercel):
 *   SUPABASE_URL          — Supabase project URL (also accepts VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE — service-role JWT (also accepts SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js';

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://egzacjfbmgbcwhtvqixc.supabase.co';

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

let admin = null;

export function getSupabaseAdmin() {
  if (admin) return admin;
  if (!serviceKey) {
    throw new Error(
      'supabaseAdmin: SUPABASE_SERVICE_ROLE is not set in this environment',
    );
  }
  admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/**
 * Validate a Supabase JWT (from the Authorization: Bearer ... header)
 * and return the associated user row — or null if invalid. Used by
 * authenticated API routes to identify the caller without relying on
 * cookies (the Vite SPA sends the session via fetch headers).
 */
export async function getUserFromAuthHeader(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const anonUrl = url;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (!anonKey) return null;

  // Build a throwaway client keyed to this user's JWT. getUser() will validate
  // signature + expiry server-side against Supabase auth.
  const anon = createClient(anonUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
