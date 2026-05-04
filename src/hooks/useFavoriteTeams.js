import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * useFavoriteTeams — v0.12.5.
 *
 * Read + write the user's multi-sport favorites stored in
 * `profiles.favorite_teams` JSONB. Used by:
 *   - /onboarding/teams page (multi-select picker)
 *   - HomeV1 FollowingCard (shows the user's favs when logged in)
 *   - PickemHomeHero (skip onboarding if favs already saved)
 *
 * Shape of each favorite:
 *   { sport, id, short, color, name? }
 *
 *   sport   ∈ 'nba' | 'epl' | 'f1' | 'tennis'
 *   id      = sport-specific identifier (see migration 0004)
 *   short   = display abbr (e.g. 'LAL', 'ARS', 'MCL', 'ESP')
 *   color   = hex chip color
 *   name    = optional display label (e.g. 'Los Angeles Lakers')
 *
 * Status states:
 *   'anon'    — no logged-in user
 *   'loading' — fetch in flight
 *   'ready'   — favorites loaded (may be empty array)
 *   'error'   — fetch failed
 */
export function useFavoriteTeams() {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    favorites: [],
  });

  const refetch = useCallback(async (seedUser) => {
    let user = seedUser;
    if (user === undefined) {
      const { data } = await supabase.auth.getSession();
      user = data?.session?.user || null;
    }
    if (!user) {
      setState({ status: 'anon', user: null, favorites: [] });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorite_teams')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const favs = Array.isArray(data?.favorite_teams) ? data.favorite_teams : [];
      setState({ status: 'ready', user, favorites: favs });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[useFavoriteTeams] fetch failed:', err);
      setState({ status: 'error', user, favorites: [] });
    }
  }, []);

  useEffect(() => {
    refetch();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      if (event === 'SIGNED_OUT' || !user) {
        setState({ status: 'anon', user: null, favorites: [] });
        return;
      }
      refetch(user);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [refetch]);

  /**
   * Persist the favorites array. Returns the saved array on success,
   * throws on failure. Caller is responsible for any optimistic UI.
   */
  const save = useCallback(async (nextFavorites) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) throw new Error('not_authenticated');
    // Upsert to handle the case where the profile row doesn't exist yet
    // (some users may have been created before profiles row was auto-
    // generated via trigger). On conflict on `id`, update favorite_teams.
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, favorite_teams: nextFavorites },
        { onConflict: 'id' }
      )
      .select('favorite_teams')
      .maybeSingle();
    if (error) throw error;
    const saved = Array.isArray(data?.favorite_teams) ? data.favorite_teams : nextFavorites;
    setState((prev) => ({ ...prev, favorites: saved }));
    return saved;
  }, []);

  return { ...state, save, refetch };
}
