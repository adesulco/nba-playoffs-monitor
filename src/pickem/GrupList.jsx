/**
 * /grup — "Grup Saya" in the 4a grammar (v0.85.0).
 *
 * Closes the last hole in the new navigation: TabBar4a's Grup tab used to
 * fall back to /pickem/grup — the LEGACY navy screen — whenever the user
 * had no grup context. That was the old website leaking through the new
 * shell's own nav.
 *
 * Lists the user's grups (server), or explains the loop and offers the
 * create/join paths when there are none. Guests get the same explanation
 * plus a login CTA, because grup membership is per-account.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyGrups } from './api.js';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronRight } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

const AVATAR_COLORS = ['#1E3FBB', '#7A2E8E', '#E07B00', '#1F7A3D', '#D92D1C'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function GrupList() {
  return (
    <AuthProvider>
      <GrupListInner />
    </AuthProvider>
  );
}

function GrupListInner() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const [grups, setGrups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return undefined; }
    let cancelled = false;
    (async () => {
      const res = await listMyGrups();
      if (cancelled) return;
      if (res?.ok) setGrups(res.grups || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title="Grup — Pick'em | gibol.co" description="Grup Pick'em kamu." noindex />

      <header style={S.header}>
        <Logo4a size={12} />
        <h1 style={S.title}>{tx('Your grups', 'Grup kamu')}</h1>
      </header>

      <div className="g4-body" style={S.body}>
        {loading && <p style={S.muted}>{tx('Loading…', 'Memuat…')}</p>}

        {!loading && grups.map((g) => (
          <button
            key={g.id || g.invite_code}
            type="button"
            onClick={() => navigate(`/grup/${g.invite_code}`)}
            style={S.row}
          >
            <span style={{ ...S.avatar, background: avatarColor(g.id || g.name) }}>
              {(g.name || '?').charAt(0).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={S.name}>{g.name}</span>
              <span style={S.meta}>
                {g.my_rank ? tx(`Rank #${g.my_rank}`, `Peringkat #${g.my_rank}`) : tx('View standings', 'Lihat klasemen')}
                {g.member_count ? tx(` · ${g.member_count} members`, ` · ${g.member_count} anggota`) : ''}
              </span>
            </span>
            <IconChevronRight size={18} />
          </button>
        ))}

        {!loading && grups.length === 0 && (
          <div style={S.empty}>
            <div style={S.emptyTitle}>
              {user ? tx('No grup yet', 'Belum punya grup') : tx('Grups need an account', 'Grup perlu akun')}
            </div>
            <p style={S.emptyMeta}>
              {tx(
                'Picking alone is fine. Picking against your friends is the point.',
                'Pick sendirian boleh. Tapi serunya pas lawan teman sendiri.'
              )}
            </p>
            <button
              type="button"
              style={S.cta}
              onClick={() => navigate(user ? '/pickem/grup/new' : '/login?next=/grup')}
            >
              {user ? tx('Create a grup', 'Bikin grup') : tx('Log in', 'Masuk')}
            </button>
          </div>
        )}
      </div>

      <TabBar4a active="grup" grupCode={grups[0]?.invite_code} lang={lang} />
    </div>
  );
}

const S = {
  shell: {
    minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto',
    paddingBottom: 96, boxSizing: 'border-box',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '18px var(--g4-gutter) 8px',
    borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)',
    margin: '0 var(--g4-gutter)', paddingLeft: 0, paddingRight: 0,
  },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '12px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 'var(--g4-gap-card-sm)' },
  row: {
    appearance: 'none', border: 'none', width: '100%',
    background: 'var(--g4-ink-block)', color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-card)', padding: '13px 16px',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxSizing: 'border-box',
  },
  avatar: {
    width: 26, height: 26, borderRadius: '50%', color: '#fff',
    font: '700 11px/1 var(--g4-font-ui)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  name: { display: 'block', font: '700 14px/1.2 var(--g4-font-ui)' },
  meta: { display: 'block', font: '500 11px/1.3 var(--g4-font-ui)', opacity: 0.7, marginTop: 2 },
  empty: {
    background: 'var(--g4-surface)', border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)', padding: '16px',
  },
  emptyTitle: { font: '800 18px/1.15 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)' },
  emptyMeta: { font: '500 12px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '6px 0 0' },
  cta: {
    appearance: 'none', border: 'none', width: '100%', marginTop: 12,
    background: 'var(--g4-ink-block)', color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)', padding: 12,
    font: '700 13px/1.2 var(--g4-font-ui)', cursor: 'pointer',
  },
  muted: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', textAlign: 'center', padding: '24px 0' },
};
