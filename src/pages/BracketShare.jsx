import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';
import ShareButtons from '../components/pickem/ShareButtons.jsx';

/**
 * /bracket/:id/share — public, read-only view of someone's bracket with
 * OG meta tuned for WhatsApp previews.
 *
 * Port of /app/bracket/[id]/share/page.tsx. Because RLS may restrict
 * non-authenticated reads, this page fetches via the anon client — the
 * schema is configured to allow SELECTs on picks/brackets for share views
 * (per supabase/migrations/0002_multi_sport.sql). If you still hit RLS in
 * production, add a thin `/api/pickem/public-bracket` proxy that uses the
 * service-role client.
 */
export default function BracketShare() {
  const { id } = useParams();
  const { lang } = useApp();
  const location = useLocation();
  const [bracket, setBracket] = useState(null);
  const [picks, setPicks] = useState([]);
  const [series, setSeries] = useState([]);
  const [teams, setTeams] = useState([]);
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setFetching(true);
      const { data: b } = await supabase
        .from('brackets')
        .select('id, user_id, name, score, season')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (!b) {
        setNotFound(true);
        setFetching(false);
        return;
      }
      setBracket(b);
      const [pRes, sRes, tRes, prRes] = await Promise.all([
        supabase.from('picks').select('*').eq('bracket_id', b.id),
        supabase.from('series').select('*').order('round').order('slot'),
        supabase.from('teams').select('tricode, name, primary_color'),
        supabase.from('profiles').select('nickname').eq('id', b.user_id).maybeSingle(),
      ]);
      if (cancelled) return;
      setPicks(pRes.data || []);
      setSeries(sRes.data || []);
      setTeams(tRes.data || []);
      setProfile(prRes.data || null);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const teamByCode = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.tricode, t])),
    [teams],
  );
  const picksById = useMemo(
    () => Object.fromEntries(picks.map((p) => [p.series_id, p])),
    [picks],
  );

  const url = `https://www.gibol.co/bracket/${id}/share`;
  const shareTitle = bracket
    ? `${bracket.name} · ${bracket.score ?? 0} poin · Gibol Pick'em`
    : 'Gibol Pick\'em';

  const roundLabel = (r) => {
    if (r === 'R1') return 'Round 1';
    if (r === 'R2') return lang === 'id' ? 'Semifinal' : 'Semifinal';
    if (r === 'CF') return lang === 'id' ? 'Final Konferensi' : 'Conference Finals';
    return 'Finals';
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={shareTitle}
        description={lang === 'id'
          ? 'Cek bracket NBA Playoffs 2026 di Gibol.'
          : 'Check out this NBA Playoffs 2026 bracket on Gibol.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 40px' }}>

        <section style={{ padding: '28px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fetching ? (
            <p style={{ fontSize: 13, color: C.dim }}>Loading…</p>
          ) : notFound || !bracket ? (
            <p style={{ fontSize: 14, color: C.dim, textAlign: 'center' }}>
              {lang === 'id' ? 'Bracket tidak ditemukan.' : 'Bracket not found.'}
            </p>
          ) : (
            <>
              <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{
                  margin: 0, fontSize: 11, color: C.dim,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  {(profile?.nickname ?? 'Anonim')} · Gibol Pick'em
                </p>
                <h1 style={{
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
                }}>{bracket.name}</h1>
                <p style={{ margin: 0, font: "900 30px 'Inter Tight'", color: 'var(--amber)' }}>
                  {bracket.score ?? 0} {lang === 'id' ? 'poin' : 'pts'}
                </p>
              </header>

              <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {['R1', 'R2', 'CF', 'F'].map((round) => {
                  const group = series.filter((s) => s.round === round);
                  if (group.length === 0) return null;
                  return (
                    <div key={round} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <h3 style={{
                        margin: 0,
                        font: "700 11px 'Inter Tight'",
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: C.dim,
                      }}>{roundLabel(round)}</h3>
                      <ul style={{
                        listStyle: 'none', margin: 0, padding: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 8,
                      }}>
                        {group.map((s) => {
                          const pick = picksById[s.id];
                          const team = pick ? teamByCode[pick.picked_team] : null;
                          return (
                            <li key={s.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: 10,
                              borderRadius: 3,
                              border: `1px ${pick ? 'solid' : 'dashed'} ${C.line}`,
                              background: pick ? 'var(--bg-2)' : 'var(--bg-3)',
                              opacity: pick ? 1 : 0.6,
                            }}>
                              <span style={{ fontSize: 13 }}>{team ? team.name : '—'}</span>
                              {pick?.awarded_points ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(16,185,129,.18)',
                                  color: 'var(--up, var(--green))',
                                  fontSize: 11, fontWeight: 700,
                                }}>+{pick.awarded_points}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </section>

              <ShareButtons url={url} title={shareTitle} />

              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <Link
                  to="/bracket/new"
                  style={{
                    display: 'inline-block',
                    padding: '10px 18px',
                    borderRadius: 3,
                    background: 'var(--amber)',
                    color: '#0A1628',
                    textDecoration: 'none',
                    font: "700 13px 'Inter Tight'",
                  }}
                >{lang === 'id' ? 'Buat bracket kamu juga' : 'Start your own bracket'}</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
