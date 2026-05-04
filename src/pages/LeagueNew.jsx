import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

/**
 * /league/new — create a private league with a name. Backend generates the
 * 6-character invite code.
 *
 * Port of /app/league/new/page.tsx (which used Next.js server actions).
 */

function NewLeagueInner() {
  const { lang } = useApp();
  const { user, loading, authHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/league/new'), { replace: true });
    }
  }, [user, loading, navigate]);

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch('/api/pickem/create-league', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      navigate(`/leaderboard/${body.id}`, { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Error');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? "Liga privat baru · Gibol" : "New private league · Gibol"}
        description={lang === 'id'
          ? 'Buat liga privat Pick\'em NBA Playoffs 2026 dan ajak teman.'
          : 'Create a private NBA Playoffs 2026 Pick\'em league and invite friends.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 40px' }}>

        <section style={{ padding: '40px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{
              margin: 0, fontSize: 11, color: C.dim,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>{lang === 'id' ? 'Liga privat' : 'Private league'}</p>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
            }}>{lang === 'id' ? 'Buat liga baru' : 'Create a new league'}</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
              {lang === 'id'
                ? 'Ajak teman-teman di WhatsApp untuk ikut bracket bareng.'
                : 'Invite friends via WhatsApp to play brackets together.'}
            </p>
          </header>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="name" style={{
                display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700,
              }}>{lang === 'id' ? 'Nama liga' : 'League name'}</label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'id' ? '"Lakers Nation Jakarta"' : '"Lakers Nation Jakarta"'}
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
              disabled={submitting || name.trim().length < 2}
              style={{
                padding: '12px 18px',
                borderRadius: 3,
                background: 'var(--amber)',
                color: '#0A1628',
                border: '1px solid var(--amber)',
                font: "700 14px 'Inter Tight'",
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >{submitting
              ? (lang === 'id' ? 'Membuat…' : 'Creating…')
              : (lang === 'id' ? 'Buat liga' : 'Create league')}</button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function LeagueNew() {
  return (
    <AuthProvider>
      <NewLeagueInner />
    </AuthProvider>
  );
}
