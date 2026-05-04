import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Pick'em Home-hero bracket summary — v0.12.2 Theme B.
 *
 * Returns the data needed by `<PickemHomeHero />` + `<LeagueChip />` to
 * render personalized state on Home + TopBar:
 *   - Has the user been authenticated? (anon → render CTA variant)
 *   - Their most-recent bracket: id, name, score, updated_at
 *   - Their primary league (first joined): id, name, member count
 *   - Their rank in that league by score
 *
 * Lives OUTSIDE the AuthProvider context tree on purpose. AuthContext
 * is gated to Pick'em pages by design (per src/lib/AuthContext.jsx
 * comment) so dashboards don't pay the Supabase auth-state subscription
 * on every page mount. This hook reads the session ONCE on mount via
 * supabase.auth.getSession() — a localStorage-backed read with no live
 * subscription. If the user is anon, the hook short-circuits to
 * `{ status: 'anon' }` and fires zero database queries.
 *
 * Cost guard: 0 Supabase round-trips for anonymous visitors. 3 round-
 * trips total for logged-in users (bracket + memberships + league
 * leaderboard rank), bundled via Promise.all so total wall time is
 * bounded by the slowest one (~80–120 ms in practice from Mumbai).
 *
 * Status states:
 *   'anon'        — no session, render CTA
 *   'loading'     — fetch in flight
 *   'no-bracket'  — logged in but no bracket yet (render "create bracket" CTA)
 *   'no-league'   — has bracket but isn't in a league (render bracket-only state)
 *   'ready'       — full hero state available
 *   'error'       — query failed (render quiet fallback, log)
 */
export function useUserBracketSummary() {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    bracket: null,
    primaryLeague: null,
    rank: null,
    totalMembers: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load(seedUser = undefined) {
      try {
        // Step 1 — read the session. When called from an auth-state
        // change the new user is passed in via seedUser; on initial
        // mount we read from localStorage. If no session, short-circuit.
        let user = seedUser;
        if (user === undefined) {
          const { data: sessionData } = await supabase.auth.getSession();
          user = sessionData?.session?.user || null;
        }
        if (!user) {
          if (!cancelled) setState({ status: 'anon', user: null, bracket: null, primaryLeague: null, rank: null, totalMembers: null });
          return;
        }

        // Step 2 — fetch the user's most-recent bracket + their league
        // memberships in parallel. Both are bounded queries (limit 1 +
        // user-scoped) so they run fast.
        const [bracketRes, membershipRes] = await Promise.all([
          supabase
            .from('brackets')
            .select('id, name, status, score, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1),
          supabase
            .from('league_members')
            .select('league:leagues(id, name, invite_code), bracket_id, joined_at')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: true })
            .limit(1),
        ]);

        if (cancelled) return;
        const bracket = (bracketRes.data || [])[0] || null;
        const membership = (membershipRes.data || [])[0] || null;
        const primaryLeague = membership?.league || null;

        if (!bracket) {
          setState({ status: 'no-bracket', user, bracket: null, primaryLeague, rank: null, totalMembers: null });
          return;
        }
        if (!primaryLeague) {
          setState({ status: 'no-league', user, bracket, primaryLeague: null, rank: null, totalMembers: null });
          return;
        }

        // Step 3 — compute the user's rank in the primary league.
        // Pull all member brackets for that league sorted by score desc,
        // find the user's row, count rank. Bounded: leagues are typically
        // 5–200 members, so the round-trip is fine without a server-side
        // RPC.
        const { data: leagueRows } = await supabase
          .from('league_members')
          .select('user_id, bracket_id, brackets:bracket_id(score)')
          .eq('league_id', primaryLeague.id);

        if (cancelled) return;

        const ranked = (leagueRows || [])
          .map((m) => ({
            userId: m.user_id,
            score: m.brackets?.score ?? 0,
          }))
          .sort((a, b) => b.score - a.score);
        const totalMembers = ranked.length;
        const userIdx = ranked.findIndex((r) => r.userId === user.id);
        const rank = userIdx >= 0 ? userIdx + 1 : null;

        setState({
          status: 'ready',
          user,
          bracket,
          primaryLeague,
          rank,
          totalMembers,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useUserBracketSummary] load failed:', err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            status: 'error',
          }));
        }
      }
    }

    // Initial load
    load();

    // v0.12.4 fix B — subscribe to auth state changes so the UI
    // updates immediately after a magic-link sign-in (or sign-out)
    // without requiring a full page reload. Pre-fix: the hook only
    // read the session once on mount, so if the user signed in via
    // /auth/callback redirect, the home Pick'em hero stayed on the
    // anon CTA until the next hard refresh.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const user = session?.user || null;
      if (event === 'SIGNED_OUT' || !user) {
        setState({ status: 'anon', user: null, bracket: null, primaryLeague: null, rank: null, totalMembers: null });
        return;
      }
      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED — re-fetch with the
      // fresh user. Setting status back to 'loading' would cause the
      // hero to flicker, so we let the load() call resolve into the
      // next status without an interim flash.
      load(user);
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  return state;
}
