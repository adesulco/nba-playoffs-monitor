/**
 * /masuk (alias /login) — magic-link sign-in in the 4a grammar (doc 17 S2:
 * "4a login/profile/logout in the chrome gate"). No password, no account
 * creation step: the link creates the account. `next` must be a
 * same-origin path; the default is the Pick'em home.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendMagicLink } from './api.js';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronLeft } from './components/icons4a.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Login4a() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const rawNext = search.get('next') || '/';
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : '/';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(search.get('msg') || null);

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
      <SEO title={tx('Sign in · gibol.co', 'Masuk · gibol.co')} description={tx('Sign in to Gibol — a login link, no password.', 'Masuk ke Gibol — link login, tanpa password.')} noindex />
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
            <div style={S.eyebrow}>{tx('NO PASSWORD', 'TANPA PASSWORD')}</div>
            <h1 style={S.h1}>{tx('Sign in to Gibol', 'Masuk ke Gibol')}</h1>
            <p style={S.p}>
              {tx('One link to your email. Your picks and your grups follow you.', 'Satu link ke emailmu. Pick dan grupmu ikut kamu.')}
            </p>
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
                autoFocus
              />
            </label>
            {err && <p style={S.error}>{err}</p>}
            <button type="submit" disabled={sending} style={{ ...S.cta, opacity: sending ? 0.6 : 1 }}>
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
  cta: { appearance: 'none', border: 'none', background: 'var(--g4-scarlet)', color: '#fff', font: '700 15px/1 var(--g4-font-ui)', padding: '15px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  ghost: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 13px/1 var(--g4-font-ui)', padding: '12px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  terms: { font: '500 11px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  a: { color: 'var(--g4-text)' },
};
