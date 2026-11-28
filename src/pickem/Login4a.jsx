/**
 * /masuk (alias /login) — magic-link sign-in in the 4a grammar (doc 17 S2:
 * "4a login/profile/logout in the chrome gate"). No password, no account
 * creation step: the link creates the account. `next` must be a
 * same-origin path; the default is the Pick'em home.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendMagicLink, signInWithGoogle } from './api.js';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronLeft } from './components/icons4a.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export default function Login4a() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const rawNext = search.get('next') || '/';
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : '/';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(search.get('msg') || null);

  const handleGoogle = async () => {
    if (oauthBusy || sending) return;
    setOauthBusy(true);
    setErr(null);
    const res = await signInWithGoogle({ next });
    if (!res?.ok) {
      setOauthBusy(false);
      setErr(String(res?.error || tx('Google sign-in unavailable right now', 'Masuk Google belum siap saat ini')));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setErr(tx('That email looks off.', 'Emailnya kayaknya salah.')); return; }
    setSending(true);
    setErr(null);
    const res = await sendMagicLink({ email: addr, next });
    setSending(false);
    if (!res?.ok) setErr(String(res?.error || tx('Could not send the link', 'Gagal kirim link')));
    else setSent(true);
  };

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title={tx('Sign in · gibol.co', 'Masuk · gibol.co')} description={tx('Sign in to Gibol — 1-tap Google or email link, no password.', 'Masuk ke Gibol — 1-tap Google atau link email, tanpa password.')} noindex />
      <header style={S.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label={tx('Back', 'Kembali')} style={S.back}>
          <IconChevronLeft size={20} />
        </button>
        <Logo4a size={12} />
      </header>

      <div className="g4-body" style={S.body}>
        {sent ? (
          <div style={S.card}>
            <div style={S.eyebrow}>{tx('CHECK YOUR EMAIL', 'CEK EMAILMU')}</div>
            <h1 style={S.h1}>{tx('Link sent.', 'Link terkirim.')}</h1>
            <p style={S.p}>
              {tx(`We sent a login link to ${email.trim()}. It works for an hour; your picks on this device are claimed the moment you open it.`,
                  `Kami kirim link masuk ke ${email.trim()}. Berlaku 1 jam; pick di perangkat ini langsung diklaim begitu kamu buka link-nya.`)}
            </p>
            <button type="button" onClick={() => setSent(false)} style={S.ghost}>{tx('Use another email', 'Pakai email lain')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={S.card}>
            <div style={S.eyebrow}>{tx('1 TAP · NO PASSWORD', '1 TAP · TANPA PASSWORD')}</div>
            <h1 style={S.h1}>{tx('Sign in to Gibol', 'Masuk ke Gibol')}</h1>
            <p style={S.p}>
              {tx('Claim your picks and join your WhatsApp grup in seconds.', 'Klaim pickmu dan gabung ke grup WhatsApp dalam hitungan detik.')}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={oauthBusy || sending}
              style={{ ...S.googleBtn, opacity: oauthBusy ? 0.65 : 1 }}
            >
              <GoogleMark />
              <span>{oauthBusy ? tx('Opening Google…', 'Membuka Google…') : tx('Continue with Google', 'Lanjutkan dengan Google')}</span>
            </button>

            <div style={S.dividerRow}>
              <span style={S.dividerLine} />
              <span style={S.dividerText}>{tx('or use email link', 'atau pakai link email')}</span>
              <span style={S.dividerLine} />
            </div>

            <label style={S.label}>
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                style={S.input}
              />
            </label>
            {err && <p style={S.error}>{err}</p>}
            <button type="submit" disabled={sending || oauthBusy} style={{ ...S.cta, opacity: sending ? 0.6 : 1 }}>
              {sending ? tx('Sending…', 'Mengirim…') : tx('Send me the link →', 'Kirim link-nya →')}
            </button>
            <p style={S.terms}>
              {tx('By signing in you agree to the ', 'Dengan masuk, kamu setuju dengan ')}
              <a href="/terms" style={S.a}>{tx('Terms', 'Ketentuan')}</a>{tx(' and ', ' dan ')}
              <a href="/privacy" style={S.a}>{tx('Privacy Policy', 'Kebijakan Privasi')}</a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', margin: '0 var(--g4-gutter)' },
  back: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', padding: 4, cursor: 'pointer', display: 'flex' },
  body: { padding: '18px var(--g4-gutter) 0' },
  card: { background: 'var(--g4-surface)', border: '1.5px solid var(--g4-text)', borderRadius: 'var(--g4-radius-card)', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  eyebrow: { font: '700 10px/1 var(--g4-font-ui)', letterSpacing: '0.6px', color: 'var(--g4-accent)' },
  h1: { font: '800 24px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  p: { font: '500 13px/1.45 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  label: { font: '700 11px/1 var(--g4-font-ui)', letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--g4-text-muted)', display: 'flex', flexDirection: 'column', gap: 8 },
  input: { font: '600 16px/1.2 var(--g4-font-ui)', padding: '12px 14px', borderRadius: 'var(--g4-radius-card)', border: '1.5px solid var(--g4-text)', background: 'var(--g4-bg)', color: 'var(--g4-text)', textTransform: 'none', letterSpacing: 0 },
  error: { font: '600 12px/1.3 var(--g4-font-ui)', color: 'var(--g4-scarlet)', margin: 0 },
  googleBtn: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    font: '700 15px/1 var(--g4-font-ui)',
    padding: '14px 16px',
    borderRadius: 'var(--g4-radius-pill)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' },
  dividerLine: { flex: 1, height: 1, background: 'var(--g4-border)' },
  dividerText: { font: '600 11px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  cta: { appearance: 'none', border: 'none', background: 'var(--g4-scarlet)', color: '#fff', font: '700 15px/1 var(--g4-font-ui)', padding: '15px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  ghost: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 13px/1 var(--g4-font-ui)', padding: '12px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  terms: { font: '500 11px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  a: { color: 'var(--g4-text)' },
};
