import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import SEO from '../components/SEO.jsx';

/**
 * /leaderboard — global Indonesia leaderboard for the 2026 playoffs.
 *
 * Port of /app/leaderboard/page.tsx. Reads the `leaderboard_global` view
 * (see supabase/migrations/0002_multi_sport.sql) which is public-readable
 * so no auth gate here.
 */
export default function GlobalLeaderboard() {
  const { lang } = useApp();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('leaderboard_global')
        .select('*')
        .eq('season', '2026')
        .order('rank', { ascending: true })
        .limit(100);
      if (cancelled) return;
      setRows(data || []);
      setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? "Leaderboard Pick'em · Gibol" : "Pick'em Leaderboard · Gibol"}
        description={lang === 'id'
          ? 'Peringkat global Bracket Pick\'em NBA Playoffs 2026 di Indonesia.'
          : 'Global ranking for NBA Playoffs 2026 Pick\'em brackets in Indonesia.'}
        path={location.pathname}
        lang={lang}
      />
      <div className="dashboard-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px 40px' }}>

        <section style={{ padding: '28px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{
              margin: 0, fontSize: 11, color: C.dim,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>Leaderboard</p>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em',
            }}>{lang === 'id'
              ? 'Top 100 Indonesia · 2026 Playoffs'
              : 'Top 100 Indonesia · 2026 Playoffs'}</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
              {lang === 'id' ? (
                <>Update setiap seri selesai.{' '}
                  <Link to="/bracket" style={{ color: 'var(--amber)' }}>Main bracket kamu</Link>.
                </>
              ) : (
                <>Updates after every series.{' '}
                  <Link to="/bracket" style={{ color: 'var(--amber)' }}>Play your bracket</Link>.
                </>
              )}
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
                    padding: 12, textAlign: 'left',
                    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim,
                  }}>{lang === 'id' ? 'Kota' : 'City'}</th>
                  <th style={{
                    padding: 12, textAlign: 'right',
                    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim,
                  }}>{lang === 'id' ? 'Poin' : 'Points'}</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: C.dim }}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: C.dim }}>
                      {lang === 'id'
                        ? 'Belum ada bracket yang dihitung. Round 1 dimulai 19 April.'
                        : 'No brackets scored yet. Round 1 starts April 19.'}
                    </td>
                  </tr>
                ) : rows.map((r) => (
                  <tr key={r.bracket_id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>{r.rank}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" style={{ height: 28, width: 28, borderRadius: '50%' }} />
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            height: 28, width: 28, borderRadius: '50%',
                            background: 'var(--bg-3)', fontSize: 12,
                          }}>{(r.nickname ?? '?').charAt(0).toUpperCase()}</span>
                        )}
                        <span style={{ fontWeight: 500 }}>{r.nickname}</span>
                        {r.favorite_team && (
                          <span style={{
                            fontSize: 10, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}>{r.favorite_team}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 12, color: C.dim }}>{r.city || '—'}</td>
                    <td style={{ padding: 12, textAlign: 'right', font: "900 14px 'Inter Tight'" }}>
                      {r.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
