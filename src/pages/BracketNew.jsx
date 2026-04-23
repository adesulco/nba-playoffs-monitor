import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';

/**
 * /bracket/new — creates a fresh bracket for the active season via
 * POST /api/pickem/create, then redirects to the editor.
 *
 * Port of /app/bracket/new/page.tsx. The server action pattern in the Next
 * source is replaced by a Vercel Node serverless function under api/pickem/.
 */

function NewBracketInner() {
  const { lang } = useApp();
  const { user, loading, authHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/bracket/new'), { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    async function createBracket() {
      try {
        const res = await fetch('/api/pickem/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader },
          body: JSON.stringify({ season: '2026' }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || 'Failed to create bracket');
        }
        const { id } = await res.json();
        navigate(`/bracket/${id}`, { replace: true });
      } catch (e) {
        setErr(e.message || 'Error');
        setBusy(false);
      }
    }
    createBracket();
  }, [user, loading, authHeader, navigate]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? "Bracket baru · Gibol" : "New bracket · Gibol"}
        description={lang === 'id'
          ? 'Mulai bracket Pick\'em NBA Playoffs 2026 baru.'
          : 'Start a new NBA Playoffs 2026 Pick\'em bracket.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink backTo="/bracket" title="gibol.co" subtitle={lang === 'id' ? "pick'em · bracket baru" : "pick'em · new bracket"} />
        <main style={{ padding: '48px 8px', textAlign: 'center' }}>
          {busy ? (
            <p style={{ fontSize: 13, color: C.dim }}>
              {lang === 'id' ? 'Membuat bracket…' : 'Creating bracket…'}
            </p>
          ) : (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${C.red}`,
              borderRadius: 3,
              padding: 20,
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {lang === 'id' ? 'Gagal membuat bracket' : 'Could not create bracket'}
              </p>
              {err && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.dim }}>{err}</p>}
              <button
                type="button"
                onClick={() => { startedRef.current = false; setBusy(true); setErr(null); }}
                style={{
                  marginTop: 14,
                  padding: '10px 16px',
                  borderRadius: 3,
                  background: 'var(--amber)',
                  color: '#0A1628',
                  border: '1px solid var(--amber)',
                  font: "700 13px 'Inter Tight'",
                  cursor: 'pointer',
                }}
              >{lang === 'id' ? 'Coba lagi' : 'Try again'}</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function BracketNew() {
  return (
    <AuthProvider>
      <NewBracketInner />
    </AuthProvider>
  );
}
