/**
 * /kabar — a static digest (doc 17 S3): the latest published previews,
 * recaps and standings explainers from public/content, listed from the
 * build-time index. No live feed, no generation at runtime; when the
 * content engine is paused the page says so with a date instead of
 * pretending.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronRight } from './components/icons4a.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

const TYPE_LABEL = { preview: 'Preview', recap: 'Recap', standings: 'Klasemen', team: 'Profil', h2h: 'H2H' };

export default function Kabar4a() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // The build-time index is { article_count, articles, generated_at };
    // `approved` is the editor's publish decision (the publish ledger).
    fetch('/content/index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.articles || []);
        setRows(list);
      });
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => (rows || [])
    .filter((r) => r.published_at && r.approved === true && r.path)
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    .slice(0, 40), [rows]);
  const latest = items[0]?.published_at ? new Date(items[0].published_at) : null;

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title="Kabar — gibol.co" description={tx('Match previews, recaps and standings explainers in Bahasa.', 'Preview, recap, dan ulasan klasemen dalam Bahasa.')} />
      <header style={S.header}>
        <Logo4a size={12} />
        <h1 style={S.title}>Kabar</h1>
      </header>
      <div className="g4-body" style={S.body}>
        <p style={S.muted}>
          {latest
            ? tx(`Digest · last published ${latest.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`, `Digest · terakhir terbit ${latest.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
            : tx('Digest · the newsroom is paused; the archive below stays readable.', 'Digest · redaksi sedang jeda; arsip di bawah tetap bisa dibaca.')}
        </p>
        {rows == null && <p style={S.muted}>{tx('Loading…', 'Memuat…')}</p>}
        {rows != null && items.length === 0 && <p style={S.muted}>{tx('Nothing published yet.', 'Belum ada yang terbit.')}</p>}
        {items.map((r) => (
          <button key={r.path} type="button" onClick={() => navigate(r.path)} style={S.row}>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={S.kicker}>{TYPE_LABEL[r.type] || r.type}{r.league ? ` · ${r.league}` : ''}</span>
              <span style={S.name}>{r.title}</span>
              {r.description && <span style={S.meta}>{r.description}</span>}
            </span>
            <IconChevronRight size={18} />
          </button>
        ))}
      </div>
      <TabBar4a active="kabar" lang={lang} />
    </div>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0 8px', borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)', margin: '0 var(--g4-gutter)' },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '12px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 8 },
  muted: { font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '0 0 4px' },
  row: { appearance: 'none', border: '1.5px solid var(--g4-border)', width: '100%', background: 'var(--g4-surface)', color: 'var(--g4-text)', borderRadius: 'var(--g4-radius-card)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxSizing: 'border-box' },
  kicker: { display: 'block', font: '700 10px/1 var(--g4-font-ui)', letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--g4-accent)', marginBottom: 4 },
  name: { display: 'block', font: '800 14px/1.25 var(--g4-font-display)' },
  meta: { display: 'block', font: '500 12px/1.35 var(--g4-font-ui)', color: 'var(--g4-text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
