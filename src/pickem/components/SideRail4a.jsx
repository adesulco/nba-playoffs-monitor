/**
 * SideRail4a — the desktop right rail (>=1200px only).
 *
 * With TabBar4a promoted to a left rail, wide screens had ~380px of dead
 * space on the right and the page read as a phone layout that had merely
 * been stretched. This is the reference pattern's third column: your grup
 * standing, and the shortcuts that are one tap away on mobile but were
 * invisible on desktop.
 *
 * Hidden below 1200px via CSS (not a JS breakpoint) so there's no layout
 * flash on load and mobile never pays for it.
 */

import { useNavigate } from 'react-router-dom';
import { IconChevronRight } from './icons4a.jsx';

export default function SideRail4a({ grups = [], lang = 'en', extra = null }) {
  const navigate = useNavigate();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const primary = grups[0] || null;

  return (
    <aside className="g4-siderail" aria-label={tx('Sidebar', 'Panel samping')}>
      {primary ? (
        <section style={S.card}>
          <div style={S.label}>{tx('YOUR GRUP', 'GRUP KAMU')}</div>
          <button type="button" onClick={() => navigate(`/grup/${primary.invite_code}`)} style={S.grupBtn}>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={S.grupName}>{primary.name}</span>
              <span style={S.grupMeta}>
                {primary.my_rank ? tx(`Rank #${primary.my_rank}`, `Peringkat #${primary.my_rank}`) : tx('View standings', 'Lihat klasemen')}
                {primary.member_count ? ` · ${primary.member_count}` : ''}
              </span>
            </span>
            <IconChevronRight size={16} />
          </button>
        </section>
      ) : (
        <section style={S.card}>
          <div style={S.label}>{tx('YOUR GRUP', 'GRUP KAMU')}</div>
          <p style={S.emptyMeta}>
            {tx('Picking alone is fine. Against friends is the point.',
                'Pick sendirian boleh. Serunya lawan teman sendiri.')}
          </p>
          <button type="button" onClick={() => navigate('/grup')} style={S.ghostBtn}>
            {tx('Find your grup', 'Cari grup kamu')}
          </button>
        </section>
      )}

      <section style={S.card}>
        <div style={S.label}>{tx('QUICK TO', 'CEPAT KE')}</div>
        {[
          { label: tx('Scores', 'Skor'), meta: tx('Live, with your picks', 'Live, plus status pickmu'), to: '/skor' },
          { label: tx('Your grups', 'Grup kamu'), meta: tx('Standings & nudges', 'Klasemen & colek'), to: '/grup' },
        ].map((l) => (
          <button key={l.to} type="button" onClick={() => navigate(l.to)} style={S.linkBtn}>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={S.linkLabel}>{l.label}</span>
              <span style={S.linkMeta}>{l.meta}</span>
            </span>
            <IconChevronRight size={15} />
          </button>
        ))}
      </section>

      {extra}
    </aside>
  );
}

const S = {
  card: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '14px 16px',
    marginBottom: 14,
  },
  label: {
    font: '700 10px/1 var(--g4-font-ui)',
    letterSpacing: '0.6px',
    color: 'var(--g4-text-muted)',
    marginBottom: 10,
  },
  grupBtn: {
    appearance: 'none', border: 'none', width: '100%',
    background: 'var(--g4-ink-block)', color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)', padding: '10px 12px',
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxSizing: 'border-box',
  },
  grupName: { display: 'block', font: '700 13px/1.2 var(--g4-font-ui)' },
  grupMeta: { display: 'block', font: '500 10px/1.3 var(--g4-font-ui)', opacity: 0.72, marginTop: 2 },
  emptyMeta: { font: '500 12px/1.45 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '0 0 10px' },
  ghostBtn: {
    appearance: 'none', width: '100%', background: 'transparent',
    border: '1.5px solid var(--g4-text)', color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-cta)', padding: '9px 12px',
    font: '700 12px/1.2 var(--g4-font-ui)', cursor: 'pointer',
  },
  linkBtn: {
    appearance: 'none', border: 'none', width: '100%', background: 'transparent',
    color: 'var(--g4-text)', padding: '9px 0', display: 'flex', alignItems: 'center',
    gap: 8, cursor: 'pointer', borderTop: '1px solid var(--g4-border)',
  },
  linkLabel: { display: 'block', font: '700 13px/1.2 var(--g4-font-ui)' },
  linkMeta: { display: 'block', font: '500 10px/1.3 var(--g4-font-ui)', color: 'var(--g4-text-muted)', marginTop: 2 },
};
