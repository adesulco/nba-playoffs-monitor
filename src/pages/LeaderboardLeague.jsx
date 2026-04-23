import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';

/**
 * /leaderboard/:leagueId — per-league leaderboard for a private league.
 *
 * Port of /app/leaderboard/[leagueId]/page.tsx. Reads the
 * `leaderboard_league` view; access is gated by RLS (members only).
 */

function LeagueLeaderboardInner() {
  const { leagueId } = useParams();
  const { lang } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [league, setLeague] = useState(null);
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent(`/leaderboard/${leagueId}`), { replace: true });
      return;
    }
    let cancelled = false;
    async function load() {
      setFetching(true);
      const { data: lg } = await supabase
        .from('leagues')
        .select('id, name, invite_code, owner_id')
        .eq('id', leagueId)
        .maybeSingle();
      if (cancelled) return;
      if (!lg) {
        setNotFound(true);
        setFetching(false);
        return;
      }
      setLeague(lg);
      const { data } = await supabase
        .from('leaderboard_league')
        .select('*')
        .eq('league_id', leagueId)
        .order('rank', { ascending: true });
      if (cancelled) return;
      setRows(data || []);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [leagueId, user, loading, navigate]);

  const inviteUrl = league
    ? `https://www.gibol.co/league/${league.id}/join?code=${league.invite_code}`
    : '';
  const waHref = league
    ? `https://wa.me/?text=${encodeURIComponent(
        `Gabung liga Pick'em gue "${league.name}" di Gibol:\n${inviteUrl}`,
      )}`
    : '#';

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={league
          ? `${league.name} · Gibol Pick'em`
          : (lang === 'id' ? "Liga · Gibol" : "League · Gibol")}
        description={lang === 'id'
          ? 'Leaderboard liga privat Pick\'em di Gibol.'
          : 'Private Pick\'em league leaderboard on Gibol.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink backTo="/bracket" title="gibol.co" subtitle={lang === 'id' ? "pick'em · liga" : "pick'em · league"} />

        <main style={{ padding: '28px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fetching ? (
            <p style={{ fontSize: 13, color: C.dim }}>Loading…</p>
          ) : notFound ? (
            <p style={{ fontSize: 14, textAlign: 'center', color: C.dim }}>
              {lang === 'id' ? 'Liga tidak ditemukan.' : 'League not found.'}
            </p>
          ) : (
            <>
              <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{
                  margin: 0, fontSize: 11, color: C.dim,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>{lang === 'id' ? 'Liga privat' : 'Private league'}</p>
                <h1 style={{
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em',
                }}>{league.name}</h1>
                <p style={{ margin: 0, fontSize: 12, color: C.dim }}>
                  {lang === 'id' ? 'Undang teman lewat link' : 'Invite friends via link'}
                  : <a href={waHref} target="_blank" rel="noreferrer" style={{ color: '#22c55e' }}>
                    {lang === 'id' ? 'Share WhatsApp' : 'Share WhatsApp'}
                  </a>
                </p>
              </header>

              <div style={{
                overflow: 'hidden',
                border: `1px solid ${C.line}`,
                borderLeft: `3px solid var(--amber)`,
                borderRadius: 3,
                background: 'var(--bg-2)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                      <th style={{
                        padding: 12, textAlign: 'left', width: 48,
                        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim,
                      }}>#</th>
                      <th style={{
                        padding: 12, textAlign: 'left',
                        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim,
                      }}>{lang === 'id' ? 'Pemain' : 'Player'}</th>
                      <th style={{
                        padding: 12, textAlign: 'right',
                        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim,
                      }}>{lang === 'id' ? 'Poin' : 'Points'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: C.dim }}>
                          {lang === 'id'
                            ? 'Belum ada anggota. Share link di atas ke grup WhatsApp.'
                            : 'No members yet. Share the link above in a WhatsApp group.'}
                        </td>
                      </tr>
                    ) : rows.map((r) => (
                      <tr key={r.bracket_id ?? r.user_id ?? r.rank} style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: 12, fontWeight: 700 }}>{r.rank}</td>
                        <td style={{ padding: 12, fontWeight: 500 }}>{r.nickname}</td>
                        <td style={{ padding: 12, textAlign: 'right', font: "900 14px 'Inter Tight'" }}>
                          {r.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link
                to="/bracket"
                style={{
                  display: 'block', textAlign: 'center',
                  fontSize: 13, color: 'var(--amber)', textDecoration: 'none',
                }}
              >{lang === 'id' ? '← Kembali ke bracket kamu' : '← Back to your brackets'}</Link>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function LeagueLeaderboard() {
  return (
    <AuthProvider>
      <LeagueLeaderboardInner />
    </AuthProvider>
  );
}
