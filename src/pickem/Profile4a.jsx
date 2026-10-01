/**
 * /profil — your profile in the 4a grammar (doc 17 S2). Stats for the
 * current competition, nickname (through update-profile), badges, logout.
 * Guests are sent to /masuk.
 */
import { useEffect, useState } from 'react';
import { onInstallAvailable, promptInstall } from '../lib/pwa.js';
import { useNavigate } from 'react-router-dom';
import { listProfile, updateProfile, signOut } from './api.js';
import { COMPETITIONS, defaultCompetitionKey } from './competitions.js';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronLeft, IconCheck } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Profile4a() {
  return (
    <AuthProvider>
      <ProfileInner />
    </AuthProvider>
  );
}

function ProfileInner() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user, loading: authLoading } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const competitionKey = defaultCompetitionKey();
  const competition = COMPETITIONS[competitionKey];

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  // PWA install (audit: promptInstall was never called anywhere).
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => onInstallAvailable(setCanInstall), []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/masuk?next=' + encodeURIComponent('/profil'), { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      const res = await listProfile({ competition: competitionKey, history_limit: 8 });
      if (cancelled) return;
      if (res?.ok) setProfile(res.profile);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, competitionKey]);

  const saveName = async () => {
    const n = draft.trim();
    if (n.length < 2 || n.length > 20) { setErr(tx('Name must be 2–20 characters.', 'Nama 2–20 karakter.')); return; }
    setSaving(true);
    setErr(null);
    const res = await updateProfile({ nickname: n });
    setSaving(false);
    if (!res?.ok) { setErr(String(res?.error || tx('Save failed', 'Gagal simpan'))); return; }
    setProfile((p) => (p ? { ...p, username: res.profile?.nickname || n } : p));
    setEditing(false);
  };

  const logout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const name = profile?.username || (user?.email ? user.email.split('@')[0] : '');
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title="Profil — Pick'em | gibol.co" description="Profil Pick'em kamu." noindex />
      <header style={S.header}>
        <button type="button" onClick={() => navigate('/')} aria-label={tx('Back', 'Kembali')} style={S.back}>
          <IconChevronLeft size={20} />
        </button>
        <Logo4a size={12} />
        <h1 style={S.title}>{tx('Profile', 'Profil')}</h1>
      </header>

      <div className="g4-body" style={S.body}>
        <div style={S.card}>
          <div style={S.identity}>
            <span style={S.avatar}>{initial}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={20} style={S.input} autoFocus />
                  <button type="button" onClick={saveName} disabled={saving} style={S.savePill} aria-label={tx('Save', 'Simpan')}>
                    <IconCheck size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={S.name}>{name || tx('No name yet', 'Belum ada nama')}</div>
                  <div style={S.email}>{user?.email}</div>
                </>
              )}
              {err && <p style={S.error}>{err}</p>}
            </div>
            {!editing && (
              <button type="button" onClick={() => { setDraft(profile?.username || ''); setEditing(true); }} style={S.editPill}>
                {tx('Edit name', 'Ubah nama')}
              </button>
            )}
          </div>
        </div>

        <div style={S.sectionLabel}>{competition?.label || competitionKey}</div>
        <div style={S.tiles}>
          <Tile value={loading ? '…' : profile?.points ?? 0} label={tx('points', 'poin')} />
          <Tile value={loading ? '…' : profile?.rank ? `#${profile.rank}` : '—'} label={tx('national rank', 'peringkat nasional')} />
          <Tile value={loading ? '…' : profile?.accuracy_pct != null ? `${profile.accuracy_pct}%` : '—'} label={tx('accuracy', 'akurasi')} />
          <Tile value={loading ? '…' : profile?.streak?.current_streak ?? 0} label={tx('streak', 'streak')} />
        </div>

        {profile?.badges?.earned?.length > 0 && (
          <>
            <div style={S.sectionLabel}>{tx('Badges', 'Lencana')}</div>
            <div style={S.badges}>
              {profile.badges.earned.map((b) => (
                <span key={`${b.badge_code}-${b.matchday ?? ''}`} style={S.badge}>
                  {lang === 'id' ? b.name_id : (b.name_en || b.name_id)}
                </span>
              ))}
            </div>
          </>
        )}

        {canInstall && (
          <button type="button" onClick={() => promptInstall()} style={{ ...S.logout, background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'transparent' }}>
            {tx('Install Gibol on this phone', 'Pasang Gibol di HP ini')}
          </button>
        )}
        <button type="button" onClick={logout} style={S.logout}>{tx('Log out', 'Keluar')}</button>
      </div>

      <TabBar4a active="main" lang={lang} />
    </div>
  );
}

function Tile({ value, label }) {
  return (
    <div style={S.tile}>
      <div style={S.tileValue}>{value}</div>
      <div style={S.tileLabel}>{label}</div>
    </div>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)', margin: '0 var(--g4-gutter)' },
  back: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', padding: 4, cursor: 'pointer', display: 'flex' },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '14px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: 'var(--g4-surface)', border: '1.5px solid var(--g4-border)', borderRadius: 'var(--g4-radius-card)', padding: '14px' },
  identity: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '800 18px/1 var(--g4-font-display)', flex: 'none' },
  name: { font: '800 17px/1.1 var(--g4-font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email: { font: '500 12px/1.3 var(--g4-font-ui)', color: 'var(--g4-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  input: { font: '600 15px/1.2 var(--g4-font-ui)', padding: '8px 10px', borderRadius: 'var(--g4-radius-card)', border: '1.5px solid var(--g4-text)', background: 'var(--g4-bg)', color: 'var(--g4-text)', flex: 1, minWidth: 0 },
  savePill: { appearance: 'none', border: 'none', background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderRadius: 'var(--g4-radius-pill)', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  editPill: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 11px/1 var(--g4-font-ui)', padding: '8px 10px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer', flex: 'none' },
  error: { font: '600 12px/1.3 var(--g4-font-ui)', color: 'var(--g4-scarlet)', margin: '6px 0 0' },
  sectionLabel: { font: '700 10px/1 var(--g4-font-ui)', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--g4-text-muted)', margin: '6px 0 0' },
  tiles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  tile: { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderRadius: 'var(--g4-radius-card)', padding: '12px 12px' },
  tileValue: { font: '800 22px/1 var(--g4-font-display)' },
  tileLabel: { font: '600 10px/1 var(--g4-font-ui)', opacity: 0.75, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.4px' },
  badges: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  badge: { font: '700 11px/1 var(--g4-font-ui)', padding: '8px 10px', borderRadius: 'var(--g4-radius-pill)', border: '1.5px solid var(--g4-text)' },
  logout: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 13px/1 var(--g4-font-ui)', padding: '13px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer', marginTop: 10 },
};
