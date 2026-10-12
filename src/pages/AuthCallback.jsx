import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import { trackEvent } from '../lib/analytics.js';
import SEO from '../components/SEO.jsx';

/**
 * /auth/callback — handles the magic-link redirect.
 *
 * Supabase appends `?code=...` to the callback URL. We call
 * exchangeCodeForSession() to set the JWT in localStorage, then navigate to
 * the `next` param (defaulting to /bracket).
 *
 * Port of /app/auth/callback/route.ts — because Vite SPA has no server-side
 * route handler, we do this exchange client-side. The Supabase client reads
 * the `code` search param and handles the PKCE flow internally when
 * `detectSessionInUrl: true` is set (see src/lib/supabase.js).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const location = useLocation();
  const { lang } = useApp();
  const [status, setStatus] = useState('exchanging');
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next = search.get('next') || '/bracket';
      const safeNext = next.startsWith('/') ? next : '/bracket';

      // Supabase magic links can land here via two flows:
      //   • PKCE (modern):  /auth/callback?code=...&next=...
      //   • Implicit/hash:  /auth/callback?next=...#access_token=...&refresh_token=...
      //
      // The supabase-js client (src/lib/supabase.js) is configured with
      // `detectSessionInUrl: true`, which auto-processes the hash flow on
      // page load — but that runs async, so we give it a tick to settle
      // before reading the session.

      // 1. PKCE explicit code
      const code = search.get('code');
      let exchangeData = null;
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus('error');
          setErrMsg(error.message);
          setTimeout(() => {
            navigate(
              '/login?msg=' + encodeURIComponent('Link expired, kirim ulang ya.'),
              { replace: true },
            );
          }, 1200);
          return;
        }
        exchangeData = data;
      } else {
        // 2. Hash-fragment flow — wait briefly for detectSessionInUrl
        // to finish processing #access_token=... and creating the
        // session, then read it.
        await new Promise((r) => setTimeout(r, 250));
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Neither flow produced a session — surface the actual hash if
          // there is one (helps debugging) and bail.
          const hasHashToken = window.location.hash.includes('access_token=');
          const msg = hasHashToken
            ? 'Sesi gagal terbentuk dari magic link, coba kirim ulang.'
            : 'Link tidak valid.';
          navigate('/login?msg=' + encodeURIComponent(msg), { replace: true });
          return;
        }
        exchangeData = { session, user: session.user };
      }

      // v0.12.5 — if the user has no favorites saved yet, send them
      // to the onboarding picker BEFORE the requested `next` page.
      //
      // v0.31.1 — the editor flow bypasses onboarding entirely. The
      // editor (Ade) doesn't care about favorite teams, and the
      // onboarding page tries to UPSERT into `profiles` which can
      // fail with RLS errors for fresh editor accounts that don't
      // yet have a profile row + the auto-create trigger isn't set
      // up. Skip directly to /editor.
      const skipOnboarding = safeNext.startsWith('/editor');

      try {
        const userId = exchangeData?.session?.user?.id || exchangeData?.user?.id;
        if (userId && !skipOnboarding) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('favorite_teams')
            .eq('id', userId)
            .maybeSingle();
          const favs = Array.isArray(profile?.favorite_teams) ? profile.favorite_teams : [];
          trackEvent('auth_callback_success', {
            had_favs: favs.length > 0,
            fav_count: favs.length,
            next: safeNext,
          });
          if (favs.length === 0) {
            setStatus('ok');
            navigate('/onboarding/teams?next=' + encodeURIComponent(safeNext), { replace: true });
            return;
          }
        } else if (userId) {
          // Editor flow — skip the favorites probe entirely.
          trackEvent('auth_callback_success', { editor: true, next: safeNext });
        } else {
          trackEvent('auth_callback_success', { had_favs: false, fav_count: 0, next: safeNext, no_user_id: true });
        }
      } catch (_) {
        // Profile read failed (network blip, RLS, etc) — fall through
        // to the normal redirect rather than blocking sign-in. Still
        // emit the funnel-top event so the conversion math doesn't
        // double-count network blips as "didn't even sign in".
        trackEvent('auth_callback_success', { had_favs: null, fav_check_failed: true, next: safeNext });
      }

      setStatus('ok');
      navigate(safeNext, { replace: true });
    }

    run();
    return () => { cancelled = true; };
  }, [search, navigate]);

  return (
    <div style={{
      background: C.bg, color: C.text,
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      <SEO
        title={lang === 'id' ? 'Masuk… · Gibol' : 'Signing in… · Gibol'}
        description={lang === 'id' ? 'Menyelesaikan login Gibol.' : 'Completing Gibol sign-in.'}
        path={location.pathname}
        lang={lang}
      />
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
          {status === 'error'
            ? (lang === 'id' ? 'Gagal masuk…' : 'Sign-in failed…')
            : (lang === 'id' ? 'Sebentar, sedang masuk…' : 'Just a sec, signing in…')}
        </p>
        {errMsg && <p style={{ marginTop: 8, fontSize: 11, color: C.red }}>{errMsg}</p>}
      </div>
    </div>
  );
}
