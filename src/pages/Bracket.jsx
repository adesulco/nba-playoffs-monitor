import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';

/**
 * /bracket — lists the signed-in user's brackets + private-league memberships.
 *
 * Port of /app/bracket/page.tsx. Because we're a client SPA, the auth check
 * happens in useEffect and we navigate to /login if there's no session.
 */

function BracketsIndexInner() {
  const { lang } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [brackets, setBrackets] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/bracket'), { replace: true });
      return;
    }
    let cancelled = false;
    async function load() {
      setFetching(true);
      const [br, mb] = await Promise.all([
        supabase
          .from('brackets')
          .select('id, name, status, score, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('league_members')
          .select('league:leagues(id, name, invite_code), bracket_id')
          .eq('user_id', user.id),
      ]);
      if (cancelled) return;
      setBrackets(br.data || []);
      setMemberships(mb.data || []);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, loading, navigate]);

  const statusLabel = (s) => {
    if (lang === 'id') {
      if (s === 'open') return 'Terbuka';
      if (s === 'locked') return 'Terkunci';
      return 'Dihitung';
    }
    if (s === 'open') return 'Open';
    if (s === 'locked') return 'Locked';
    return 'Scored';
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? "Bracket Pick'em · Gibol" : "Bracket Pick'em · Gibol"}
        description={lang === 'id'
          ? 'Kelola bracket Pick\'em kamu dan liga privat di Gibol.'
          : 'Manage your Pick\'em brackets and private leagues on Gibol.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink title="gibol.co" subtitle={lang === 'id' ? "pick'em · bracket kamu" : "pick'em · your brackets"} />

        <main style={{ padding: '32px 8px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                Pick'em
              </div>
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em',
              }}>{lang === 'id' ? 'Bracket kamu' : 'Your brackets'}</h1>
            </div>
            <Link
              to="/bracket/new"
              style={{
                padding: '10px 16px',
                borderRadius: 3,
                background: 'var(--amber)',
                color: '#0A1628',
                textDecoration: 'none',
                font: "700 13px 'Inter Tight'",
              }}
            >{lang === 'id' ? 'Bracket baru' : 'New bracket'}</Link>
          </header>

          {fetching ? (
            <div style={{ fontSize: 13, color: C.dim }}>Loading…</div>
          ) : brackets.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brackets.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/bracket/${b.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-2)',
                      border: `1px solid ${C.line}`,
                      borderLeft: `3px solid var(--amber)`,
                      borderRadius: 3,
                      padding: 16,
                      color: C.text,
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{b.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: C.dim }}>
                        Status: {statusLabel(b.status)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, font: "900 22px 'Inter Tight'" }}>{b.score ?? 0}</p>
                      <p style={{ margin: 0, fontSize: 10, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {lang === 'id' ? 'poin' : 'points'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid var(--amber)`,
              borderRadius: 3,
              padding: 22,
              textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {lang === 'id' ? 'Belum ada bracket' : 'No brackets yet'}
              </p>
              <p style={{ margin: '6px 0 14px', fontSize: 13, color: C.dim }}>
                {lang === 'id'
                  ? 'Mulai bracket pertama kamu sebelum Round 1 dikunci.'
                  : 'Start your first bracket before Round 1 locks.'}
              </p>
              <Link
                to="/bracket/new"
                style={{
                  display: 'inline-block',
                  padding: '10px 16px',
                  borderRadius: 3,
                  background: 'var(--amber)',
                  color: '#0A1628',
                  textDecoration: 'none',
                  font: "700 13px 'Inter Tight'",
                }}
              >{lang === 'id' ? 'Buat bracket pertama' : 'Create first bracket'}</Link>
            </div>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{
              margin: 0,
              font: "700 14px 'Inter Tight'",
              letterSpacing: '0.02em',
            }}>{lang === 'id' ? 'Liga privat' : 'Private leagues'}</h2>

            {memberships.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memberships.map((m, i) => {
                  const league = m.league;
                  if (!league) return null;
                  return (
                    <li key={i}>
                      <Link
                        to={`/leaderboard/${league.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: 12,
                          borderRadius: 3,
                          background: 'var(--bg-2)',
                          border: `1px solid ${C.line}`,
                          color: C.text, textDecoration: 'none',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{league.name}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>
                          {lang === 'id' ? 'Kode' : 'Code'}: {league.invite_code}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
                {lang === 'id' ? (
                  <>Belum ikut liga.{' '}
                    <Link to="/league/new" style={{ color: 'var(--amber)' }}>Buat liga sendiri</Link>
                    {' '}dan ajak teman lewat WhatsApp.</>
                ) : (
                  <>Not in any league yet.{' '}
                    <Link to="/league/new" style={{ color: 'var(--amber)' }}>Create one</Link>
                    {' '}and invite friends via WhatsApp.</>
                )}
              </p>
            )}
          </section>

          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              to="/leaderboard"
              style={{
                padding: '8px 14px',
                borderRadius: 3,
                border: `1px solid ${C.line}`,
                background: 'var(--bg-3)',
                color: C.text, textDecoration: 'none',
                font: "600 12px 'Inter Tight'",
              }}
            >
              {lang === 'id' ? 'Leaderboard global' : 'Global leaderboard'}
            </Link>
            <Link
              to="/league/new"
              style={{
                padding: '8px 14px',
                borderRadius: 3,
                border: `1px solid ${C.line}`,
                background: 'var(--bg-3)',
                color: C.text, textDecoration: 'none',
                font: "600 12px 'Inter Tight'",
              }}
            >
              {lang === 'id' ? 'Buat liga privat' : 'New private league'}
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function BracketsIndex() {
  return (
    <AuthProvider>
      <BracketsIndexInner />
    </AuthProvider>
  );
}
