/**
 * /grup/baru — create a grup in the 4a grammar (doc 17 S2).
 *
 * Three decisions, one screen: name, competition (registry rows with an
 * open or upcoming window), template (Santai / Standar / Sultan →
 * leagues.scoring_config.template, doc 17 §1 Templates). Gugur can be
 * switched on from the grup home afterwards. Signed-in only.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createGrup } from './api.js';
import { COMPETITIONS, COMPETITION_ORDER, defaultCompetitionKey } from './competitions.js';
import TabBar4a from './components/TabBar4a.jsx';
import { IconChevronLeft } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

const TEMPLATES = [
  { key: 'santai',  name: 'Santai',  en: 'Ladder only. Every pick counts the same.',                  id: 'Tangga poin saja. Semua pick setara.' },
  { key: 'standar', name: 'Standar', en: 'Ladder + jagoan ★ ×2 + underdog ×1.5.',                       id: 'Tangga poin + jagoan ★ ×2 + underdog ×1,5.' },
  { key: 'sultan',  name: 'Sultan',  en: 'Standar + jagoan miss costs a point + streak bonus +3.',      id: 'Standar + jagoan meleset kena −1 + bonus streak +3.' },
];

export default function GrupCreate4a() {
  return (
    <AuthProvider>
      <GrupCreateInner />
    </AuthProvider>
  );
}

function GrupCreateInner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { lang } = useApp();
  const { user, loading: authLoading } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const choices = useMemo(() => {
    const t = Date.now();
    return COMPETITION_ORDER
      .map((k) => COMPETITIONS[k])
      .filter((c) => c && new Date(c.closeAt).getTime() > t);
  }, []);

  const [name, setName] = useState('');
  const [competition, setCompetition] = useState(params.get('competition') || defaultCompetitionKey());
  const [template, setTemplate] = useState('standar');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/masuk?next=' + encodeURIComponent('/grup/baru'), { replace: true });
  }, [user, authLoading, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 60) { setError(tx('Name must be 2–60 characters.', 'Nama grup 2–60 karakter.')); return; }
    setSubmitting(true);
    setError(null);
    const comp = COMPETITIONS[competition];
    const res = await createGrup({
      name: n,
      visibility: 'private',
      competition,
      enabled_modes: { match: true, jagoan: template !== 'santai', upset: template !== 'santai', bracket: !!comp?.hasBracket, survivor: false },
      scoring_config: { template },
    });
    setSubmitting(false);
    if (!res?.ok) { setError(String(res?.error || tx('Could not create the grup', 'Gagal bikin grup'))); return; }
    navigate(`/grup/${res.invite_code || res.inviteCode}?welcome=1`, { replace: true });
  };

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title="Bikin grup — Pick'em | gibol.co" description="Bikin grup Pick'em kamu." noindex />
      <header style={S.header}>
        <button type="button" onClick={() => navigate('/grup')} aria-label={tx('Back', 'Kembali')} style={S.back}>
          <IconChevronLeft size={20} />
        </button>
        <h1 style={S.title}>{tx('New grup', 'Grup baru')}</h1>
      </header>

      <form className="g4-body" style={S.body} onSubmit={submit}>
        <label style={S.label}>
          {tx('Grup name', 'Nama grup')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tx('e.g. Tongkrongan Kantor', 'mis. Tongkrongan Kantor')}
            maxLength={60}
            style={S.input}
            autoFocus
          />
        </label>

        <div style={S.label}>{tx('Competition', 'Kompetisi')}</div>
        <div style={S.pills}>
          {choices.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCompetition(c.key)}
              style={{ ...S.pill, ...(competition === c.key ? S.pillOn : {}) }}
            >
              {lang === 'id' ? c.labelI18n.id : c.labelI18n.en} · {c.season}
            </button>
          ))}
        </div>

        <div style={S.label}>{tx('Scoring template', 'Template poin')}</div>
        <div style={S.templates}>
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplate(t.key)}
              style={{ ...S.template, ...(template === t.key ? S.templateOn : {}) }}
            >
              <span style={S.templateName}>{t.name}</span>
              <span style={S.templateDesc}>{lang === 'id' ? t.id : t.en}</span>
            </button>
          ))}
        </div>
        <p style={S.hint}>
          {tx('Exact score 5 · result + margin 3 · result 2 · nyaris 1. Frozen after the first lock.',
              'Skor tepat 5 · hasil + selisih 3 · hasil 2 · nyaris 1. Terkunci setelah lock pertama.')}
        </p>

        {error && <p style={S.error}>{error}</p>}
        <button type="submit" disabled={submitting || name.trim().length < 2} style={{ ...S.cta, opacity: submitting || name.trim().length < 2 ? 0.5 : 1 }}>
          {submitting ? tx('Creating…', 'Membuat…') : tx('Create grup →', 'Bikin grup →')}
        </button>
      </form>

      <TabBar4a active="grup" lang={lang} />
    </div>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)', margin: '0 var(--g4-gutter)' },
  back: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', padding: 4, cursor: 'pointer', display: 'flex' },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '14px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 10 },
  label: { font: '700 11px/1 var(--g4-font-ui)', letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--g4-text-muted)', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 },
  input: { font: '600 16px/1.2 var(--g4-font-ui)', padding: '12px 14px', borderRadius: 'var(--g4-radius-card)', border: '1.5px solid var(--g4-text)', background: 'var(--g4-surface)', color: 'var(--g4-text)', textTransform: 'none', letterSpacing: 0 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { appearance: 'none', border: '1.5px solid var(--g4-text)', background: 'transparent', color: 'var(--g4-text)', font: '700 12px/1 var(--g4-font-ui)', padding: '9px 12px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer' },
  pillOn: { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'transparent' },
  templates: { display: 'flex', flexDirection: 'column', gap: 8 },
  template: { appearance: 'none', textAlign: 'left', border: '1.5px solid var(--g4-border)', background: 'var(--g4-surface)', color: 'var(--g4-text)', padding: '12px 14px', borderRadius: 'var(--g4-radius-card)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 },
  templateOn: { borderColor: 'var(--g4-text)', boxShadow: 'inset 0 0 0 1px var(--g4-text)' },
  templateName: { font: '800 15px/1.1 var(--g4-font-display)' },
  templateDesc: { font: '500 12px/1.35 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  hint: { font: '500 11px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  error: { font: '600 12px/1.3 var(--g4-font-ui)', color: 'var(--g4-scarlet)', margin: 0 },
  cta: { appearance: 'none', border: 'none', background: 'var(--g4-scarlet)', color: '#fff', font: '700 15px/1 var(--g4-font-ui)', padding: '15px 16px', borderRadius: 'var(--g4-radius-pill)', cursor: 'pointer', marginTop: 6 },
};
