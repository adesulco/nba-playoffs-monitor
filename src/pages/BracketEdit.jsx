import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';
import TopBar from '../components/TopBar.jsx';
import BracketEditor from '../components/pickem/BracketEditor.jsx';
import WhatsAppShare from '../components/pickem/WhatsAppShare.jsx';

/**
 * /bracket/:id — edit / view a single bracket.
 *
 * Port of /app/bracket/[id]/page.tsx. Loads the bracket, its series skeleton,
 * team metadata, and the user's picks via Supabase client (RLS restricts
 * writes to the owner). Hands off to <BracketEditor />.
 */

function BracketEditInner() {
  const { id } = useParams();
  const { lang } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bracket, setBracket] = useState(null);
  const [series, setSeries] = useState([]);
  const [teams, setTeams] = useState([]);
  const [picks, setPicks] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent(`/bracket/${id}`), { replace: true });
      return;
    }
    let cancelled = false;
    async function load() {
      setFetching(true);
      const { data: b } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (!b) {
        setNotFound(true);
        setFetching(false);
        return;
      }
      setBracket(b);
      const [sRes, tRes, pRes] = await Promise.all([
        supabase.from('series').select('*').eq('season', b.season)
          .order('round', { ascending: true })
          .order('slot', { ascending: true }),
        supabase.from('teams').select('*'),
        supabase.from('picks').select('*').eq('bracket_id', b.id),
      ]);
      if (cancelled) return;
      setSeries(sRes.data || []);
      setTeams(tRes.data || []);
      setPicks(pRes.data || []);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id, user, loading, navigate]);

  const isOwner = bracket && user && user.id === bracket.user_id;
  const canEdit = isOwner && bracket?.status === 'open';

  const statusBlurb = bracket?.status === 'open'
    ? (lang === 'id' ? 'Terbuka — kamu masih bisa ubah pick.' : 'Open — picks still editable.')
    : bracket?.status === 'locked'
      ? (lang === 'id' ? 'Terkunci — menunggu hasil.' : 'Locked — awaiting results.')
      : (lang === 'id' ? 'Sudah dihitung.' : 'Scored.');

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={bracket
          ? `${bracket.name} · Gibol Pick'em`
          : (lang === 'id' ? "Bracket · Gibol" : "Bracket · Gibol")}
        description={lang === 'id'
          ? 'Edit bracket NBA Playoffs 2026 Pick\'em di Gibol.'
          : 'Edit your NBA Playoffs 2026 Pick\'em bracket on Gibol.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 980, margin: '0 auto', padding: '0 20px 40px' }}>
        <TopBar showBackLink backTo="/bracket" title="gibol.co" subtitle={lang === 'id' ? "pick'em · bracket" : "pick'em · bracket"} />

        <main style={{ padding: '28px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fetching ? (
            <p style={{ fontSize: 13, color: C.dim }}>Loading…</p>
          ) : notFound ? (
            <div style={{
              background: 'var(--bg-2)',
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${C.red}`,
              borderRadius: 3,
              padding: 20, textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {lang === 'id' ? 'Bracket tidak ditemukan.' : 'Bracket not found.'}
              </p>
              <Link to="/bracket" style={{ color: 'var(--amber)', fontSize: 13 }}>
                {lang === 'id' ? '← Semua bracket' : '← All brackets'}
              </Link>
            </div>
          ) : (
            <>
              <header style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 14, flexWrap: 'wrap',
              }}>
                <div>
                  <Link
                    to="/bracket"
                    style={{ fontSize: 11, color: C.dim, textDecoration: 'none' }}
                  >{lang === 'id' ? '← Semua bracket' : '← All brackets'}</Link>
                  <h1 style={{
                    margin: '6px 0 0',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em',
                  }}>{bracket.name}</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: C.dim }}>{statusBlurb}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, font: "900 28px 'Inter Tight'" }}>{bracket.score ?? 0}</p>
                    <p style={{
                      margin: 0, fontSize: 10, color: C.dim,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                    }}>{lang === 'id' ? 'poin' : 'points'}</p>
                  </div>
                  {isOwner && (
                    <WhatsAppShare
                      text={`Cek bracket NBA Playoffs gue di Gibol — ${bracket.score ?? 0} poin sejauh ini.\nhttps://www.gibol.co/bracket/${bracket.id}/share`}
                    />
                  )}
                </div>
              </header>

              <BracketEditor
                bracketId={bracket.id}
                canEdit={canEdit}
                series={series}
                teams={teams}
                initialPicks={picks}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function BracketEdit() {
  return (
    <AuthProvider>
      <BracketEditInner />
    </AuthProvider>
  );
}
