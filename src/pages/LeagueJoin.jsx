import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';

/**
 * /league/:id/join?code=XYZ — WhatsApp-friendly invite landing.
 *
 * Verifies the invite code against the league, then calls
 * /api/pickem/join-league to insert a league_members row.
 *
 * Port of /app/league/[id]/join/page.tsx.
 */

function JoinLeagueInner() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const code = search.get('code') || '';
  const { lang } = useApp();
  const { user, loading, authHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState('checking'); // checking | bad_code | joining | error
  const [league, setLeague] = useState(null);
  const [err, setErr] = useState(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = `/league/${id}/join?code=${encodeURIComponent(code)}`;
      navigate('/login?next=' + encodeURIComponent(next), { replace: true });
      return;
    }
    if (joinedRef.current) return;
    joinedRef.current = true;

    async function run() {
      const { data: lg } = await supabase
        .from('leagues')
        .select('id, name, invite_code')
        .eq('id', id)
        .maybeSingle();
      if (!lg) {
        setPhase('bad_code');
        return;
      }
      setLeague(lg);
      if (!code || code !== lg.invite_code) {
        setPhase('bad_code');
        return;
      }
      setPhase('joining');
      try {
        const res = await fetch('/api/pickem/join-league', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader },
          body: JSON.stringify({ leagueId: lg.id, inviteCode: code }),
        });
        if (!res.ok) throw new Error(await res.text());
        navigate(`/leaderboard/${lg.id}`, { replace: true });
      } catch (e) {
        setErr(e.message || 'Error');
        setPhase('error');
      }
    }
    run();
  }, [id, code, user, loading, authHeader, navigate]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? 'Gabung liga · Gibol' : 'Join league · Gibol'}
        description={lang === 'id'
          ? 'Gabung liga Pick\'em privat di Gibol.'
          : 'Join a private Pick\'em league on Gibol.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink backTo="/bracket" title="gibol.co" subtitle={lang === 'id' ? "pick'em · gabung liga" : "pick'em · join league"} />
        <main style={{ padding: '48px 8px', textAlign: 'center' }}>
          {phase === 'checking' || phase === 'joining' ? (
            <p style={{ fontSize: 13, color: C.dim }}>
              {lang === 'id' ? 'Sebentar, sedang gabungin…' : 'Joining…'}
            </p>
          ) : phase === 'bad_code' ? (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${C.red}`,
              borderRadius: 3,
              padding: 20,
            }}>
              <h1 style={{ margin: 0, font: "700 20px 'Inter Tight'" }}>
                {lang === 'id' ? 'Kode undangan tidak valid' : 'Invalid invite code'}
              </h1>
              <p style={{ marginTop: 8, fontSize: 13, color: C.dim }}>
                {lang === 'id'
                  ? 'Minta admin liga untuk kirim ulang link.'
                  : 'Ask the league admin to resend the link.'}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${C.red}`,
              borderRadius: 3,
              padding: 20,
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {lang === 'id' ? 'Gagal gabung liga' : 'Could not join league'}
              </p>
              {err && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.dim }}>{err}</p>}
              {league && (
                <p style={{ marginTop: 10, fontSize: 12, color: C.dim }}>
                  {lang === 'id' ? 'Liga' : 'League'}: <strong>{league.name}</strong>
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function LeagueJoin() {
  return (
    <AuthProvider>
      <JoinLeagueInner />
    </AuthProvider>
  );
}
