import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';

/**
 * AuthContext — thin wrapper over Supabase auth for the Pick'em feature.
 *
 * Lives separately from AppContext so the rest of the app (NBA/EPL/F1/Tennis
 * dashboards) doesn't pay the cost of a Supabase subscription on every page
 * load. Pickem pages wrap themselves in <AuthProvider> at mount.
 *
 * Exposes:
 *   - user      : the current Supabase User, or null
 *   - session   : the current Session (for access_token), or null
 *   - loading   : true until the first auth state emission lands
 *   - signOut() : ends the session
 *   - authHeader: { Authorization: 'Bearer <jwt>' } for fetch() to /api/*
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Seed with the current session synchronously-ish (returns a promise but
    // normally resolves instantly from localStorage).
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
    authHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
