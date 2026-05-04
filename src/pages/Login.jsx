import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';

/**
 * /login — magic-link email entry. Supabase delivers the email; on click the
 * user lands at /auth/callback which exchanges the code for a session.
 *
 * Port of /app/auth/login/page.tsx + LoginForm.tsx (server+client halves in
 * the Next.js source). Here both live together as a single React component.
 */
export default function Login() {
  const { lang } = useApp();
  const location = useLocation();
  const [search] = useSearchParams();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(search.get('msg') || null);

  const next = search.get('next') || '/bracket';

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    const safeNext = next.startsWith('/') ? next : '/bracket';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setSending(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  const t = {
    title: lang === 'id' ? 'Masuk · Gibol' : 'Sign in · Gibol',
    desc: lang === 'id'
      ? 'Masuk untuk main Bracket Pick\'em dan simpan pick kamu.'
      : 'Sign in to play Bracket Pick\'em and save your picks.',
    headline: lang === 'id' ? 'Masuk ke Gibol' : 'Sign in to Gibol',
    sub: lang === 'id'
      ? 'Kami kirim link login ke email kamu — tanpa password.'
      : 'We\'ll send a magic login link to your email — no password.',
    emailLabel: 'Email',
    emailPh: 'nama@email.com',
    submit: sending ? (lang === 'id' ? 'Mengirim…' : 'Sending…') : (lang === 'id' ? 'Kirim link masuk' : 'Send login link'),
    sentTitle: lang === 'id' ? 'Cek email kamu' : 'Check your email',
    sentBody: (e) => lang === 'id'
      ? `Kami baru saja kirim link masuk ke ${e}. Link berlaku 1 jam.`
      : `We just sent a login link to ${e}. The link is valid for 1 hour.`,
    terms: lang === 'id'
      ? 'Dengan masuk, kamu setuju dengan Ketentuan dan Kebijakan Privasi Gibol.'
      : 'By signing in, you agree to Gibol\'s Terms and Privacy Policy.',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO title={t.title} description={t.desc} path={location.pathname} lang={lang} />
      <div className="dashboard-wrap" style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 40px' }}>

        <section style={{ padding: '36px 8px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              margin: '0 auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 48, width: 48,
              borderRadius: 8,
              background: 'var(--amber)',
              color: '#0A1628',
              font: "900 20px 'Inter Tight'",
            }}>G</div>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 28, fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>{t.headline}</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>{t.sub}</p>
          </header>

          {sent ? (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid var(--amber)`,
              borderRadius: 3,
              padding: 20,
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <p style={{ margin: 0, fontSize: 22 }}>📬</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{t.sentTitle}</p>
              <p style={{ margin: 0, fontSize: 13, color: C.dim }}>{t.sentBody(email)}</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="email" style={{
                  display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: C.text,
                }}>{t.emailLabel}</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  autoComplete="email"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 3,
                    background: 'var(--bg-2)',
                    border: `1px solid ${C.line}`,
                    color: C.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              {err && <p style={{ margin: 0, fontSize: 12, color: C.red }}>{err}</p>}
              <button
                type="submit"
                disabled={sending || !email}
                style={{
                  padding: '12px 18px',
                  borderRadius: 3,
                  background: 'var(--amber)',
                  color: '#0A1628',
                  border: '1px solid var(--amber)',
                  font: "700 14px 'Inter Tight'",
                  cursor: sending || !email ? 'not-allowed' : 'pointer',
                  opacity: sending || !email ? 0.6 : 1,
                }}
              >{t.submit}</button>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, textAlign: 'center' }}>{t.terms}</p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
