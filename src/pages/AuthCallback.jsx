import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
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
      const code = search.get('code');
      const next = search.get('next') || '/bracket';
      const safeNext = next.startsWith('/') ? next : '/bracket';

      if (!code) {
        navigate('/login?msg=' + encodeURIComponent('Link tidak valid.'), { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (error) {
        setStatus('error');
        setErrMsg(error.message);
        // Redirect back to login with friendly message after a beat.
        setTimeout(() => {
          navigate(
            '/login?msg=' + encodeURIComponent('Link expired, kirim ulang ya.'),
            { replace: true },
          );
        }, 1200);
        return;
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
