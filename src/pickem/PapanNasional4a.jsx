/**
 * /papan — Papan Nasional (doc 17 S3): the competition-wide board every
 * grup feeds, plus the streak board. Public; your own row is pinned when
 * signed in even if it is off the page.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { leaderboardNational } from './api.js';
import { COMPETITIONS, COMPETITION_ORDER, defaultCompetitionKey } from './competitions.js';
import { LeaderboardRow } from './components/primitives4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronLeft } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

import { avatarColor } from './avatar.js';

export default function PapanNasional4a() {
  return (
    <AuthProvider>
      <PapanInner />
    </AuthProvider>
  );
}

function PapanInner() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const competitions = useMemo(() => {
    const t = Date.now();
    return COMPETITION_ORDER.map((k) => COMPETITIONS[k]).filter((c) => c && new Date(c.openAt).getTime() <= t);
  }, []);
  const league = params.get('league') && COMPETITIONS[params.get('league')] ? params.get('league') : defaultCompetitionKey();
  const board = params.get('board') === 'streak' ? 'streak' : 'points';

  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await leaderboardNational({ league, board, limit: 100 });
      if (cancelled) return;
      if (res?.ok) { setRows(res.rows); setMe(res.me); setTotal(res.total); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [league, board, user]);

  const set = (k, v) => { const next = new URLSearchParams(params); next.set(k, v); setParams(next, { replace: true }); };
  const comp = COMPETITIONS[league];
  const meOffPage = me && !rows.some((r) => r.user_id === me.user_id);

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title={tx(`National board · ${comp?.label || league} | gibol.co`, `Papan Nasional · ${comp?.label || league} | gibol.co`)} description={tx('Everyone who picks, one board.', 'Semua yang pick, satu papan.')} />
      <header style={S.header}>
        <button type="button" onClick={() => navigate('/')} aria-label={tx('Back', 'Kembali')} style={S.back}><IconChevronLeft size={20} /></button>
        <Logo4a size={12} />
        <h1 style={S.title}>{tx('National board', 'Papan Nasional')}</h1>
      </header>

      <div className="g4-body" style={S.body}>
        <div style={S.pills}>
          {competitions.map((c) => (
            <button key={c.key} type="button" onClick={() => set('league', c.key)} style={{ ...S.pill, ...(league === c.key ? S.pillOn : {}) }}>
              {lang === 'id' ? c.labelI18n.id : c.labelI18n.en}
            </button>
          ))}
        </div>
        <div style={S.tabs}>
          <button type="button" onClick={() => set('board', 'points')} style={{ ...S.tab, ...(board === 'points' ? S.tabOn : {}) }}>{tx('Points', 'Poin')}</button>
          <button type="button" onClick={() => set('board', 'streak')} style={{ ...S.tab, ...(board === 'streak' ? S.tabOn : {}) }}>{tx('Streak', 'Streak')}</button>
        </div>

        {board === 'streak' && (
          <p style={S.muted}>{tx('Correct picks in a row. Current first, best ever as the tiebreak.', 'Pick tepat beruntun. Yang sedang jalan dulu, rekor terbaik sebagai pembeda.')}</p>
        )}

        <div style={S.list}>
          {loading && <p style={{ ...S.muted, padding: 12 }}>{tx('Loading…', 'Memuat…')}</p>}
          {!loading && rows.length === 0 && (
            <p style={{ ...S.muted, padding: 12 }}>{tx('No scored picks yet. Be the first on the board.', 'Belum ada pick yang dihitung. Jadilah yang pertama di papan.')}</p>
          )}
          {!loading && rows.map((r, i) => (
            <LeaderboardRow
              key={r.user_id}
              rank={r.rank ?? i + 1}
              name={r.username || `Pemain ${String(r.user_id).slice(0, 4)}`}
              avatarColor={avatarColor(r.user_id)}
              points={board === 'points' ? r.points : r.current_streak}
              streak={board === 'streak' ? r.longest_streak : undefined}
              nyaris={board === 'points' ? r.nyaris_count : undefined}
              isYou={!!user && r.user_id === user.id}
              last={i === rows.length - 1 && !meOffPage}
            />
          ))}
          {!loading && meOffPage && (
            <LeaderboardRow
              rank={me.rank ?? '—'}
              name={me.username || tx('You', 'Kamu')}
              avatarColor={avatarColor(me.user_id)}
              points={board === 'points' ? me.points : me.current_streak}
              streak={board === 'streak' ? me.longest_streak : undefined}
              nyaris={board === 'points' ? me.nyaris_count : undefined}
              isYou
              last
            />
          )}
        </div>
        {total != null && total > rows.length && (
          <p style={S.muted}>{tx(`Top ${rows.length} of ${total}.`, `${rows.length} teratas dari ${total}.`)}</p>
        )}
        <button type="button" onClick={() => navigate('/aturan')} style={S.link}>{tx('How points work →', 'Cara hitung poin →')}</button>
      </div>

      <TabBar4a active="main" lang={lang} />
    </div>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)', margin: '0 var(--g4-gutter)' },
  back: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', padding: 4, cursor: 'pointer', display: 'flex' },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '12px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 10 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 11px/1 var(--g4-font-ui)', padding: '8px 11px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  pillOn: { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'transparent' },
  tabs: { display: 'flex', borderBottom: '2px solid var(--g4-text)' },
  tab: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text-muted)', font: '800 13px/1 var(--g4-font-display)', padding: '10px 14px 8px', cursor: 'pointer' },
  tabOn: { color: 'var(--g4-text)', boxShadow: 'inset 0 -3px 0 var(--g4-scarlet)' },
  list: { background: 'var(--g4-surface)', border: '1.5px solid var(--g4-border)', borderRadius: 'var(--g4-radius-card)', overflow: 'hidden' },
  muted: { font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  link: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', font: '700 13px/1 var(--g4-font-ui)', padding: '10px 0', cursor: 'pointer', textAlign: 'left' },
};
