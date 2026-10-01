/**
 * /aturan — scoring rules + "kenapa gratis, tanpa taruhan" (doc 17 S3).
 * Linked from the pick sheet's ⓘ and the grup home. Public, indexable.
 * Numbers come from the Spec v1 defaults in scoring-core, never typed twice.
 */
import { useNavigate } from 'react-router-dom';
import { SPEC_V1_DEFAULTS, TEMPLATES } from '../../api/_lib/pickem/scoring-core.js';
import Logo4a from './components/Logo4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import { IconChevronLeft } from './components/icons4a.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Aturan4a() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const d = SPEC_V1_DEFAULTS;

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO
        title={tx('How scoring works · gibol.co', 'Cara hitung poin · gibol.co')}
        description={tx('Gibol Pick\'em scoring: exact score 5, result + margin 3, result 2, nyaris 1, jagoan ×2. Free, no betting.', 'Poin Pick\'em Gibol: skor tepat 5, hasil + selisih 3, hasil 2, nyaris 1, jagoan ×2. Gratis, tanpa taruhan.')}
      />
      <header style={S.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label={tx('Back', 'Kembali')} style={S.back}><IconChevronLeft size={20} /></button>
        <Logo4a size={12} />
        <h1 style={S.title}>{tx('Rules', 'Aturan')}</h1>
      </header>

      <div className="g4-body" style={S.body}>
        <section style={S.card}>
          <h2 style={S.h2}>{tx('Tebak Skor — the ladder', 'Tebak Skor — tangga poin')}</h2>
          <table style={S.table}>
            <tbody>
              <Row k={tx('Exact score', 'Skor tepat')} v={d.score_exact} />
              <Row k={tx('Right result + right margin', 'Hasil benar + selisih gol benar')} v={d.score_result_margin} />
              <Row k={tx('Right result', 'Hasil benar')} v={d.score_result} />
              <Row k={tx('Nyaris — wrong result, total goals within 1', 'Nyaris — hasil salah, total gol selisih ≤ 1')} v={d.score_nyaris} />
              <Row k={tx('Miss', 'Meleset')} v={0} />
            </tbody>
          </table>
          <p style={S.p}>{tx('Judged on the score at the end of play (90’ or 120’). A draw is a result. Penalties never enter the score. Picks lock at kickoff; you can change yours until then.', 'Dihitung dari skor akhir laga (90’ atau 120’). Seri itu hasil. Adu penalti tidak masuk skor. Pick terkunci saat kick-off; sebelum itu masih bisa diganti.')}</p>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>{tx('Jagoan ★', 'Jagoan ★')}</h2>
          <p style={S.p}>{tx(`One star per matchweek. A correct starred pick pays ×${d.jagoan_multiplier}. In a Sultan grup a missed star costs ${Math.round(TEMPLATES.sultan.jagoan_penalty * 100)} % of the result tier, and a matchweek never goes below zero.`, `Satu bintang per pekan. Pick berbintang yang benar dibayar ×${d.jagoan_multiplier}. Di grup Sultan, bintang yang meleset dipotong ${Math.round(TEMPLATES.sultan.jagoan_penalty * 100)} % dari poin hasil, dan poin satu pekan tidak pernah di bawah nol.`)}</p>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>{tx('Underdog', 'Underdog')}</h2>
          <p style={S.p}>{tx(`Call a side fewer than ${Math.round(d.underdog_threshold * 100)} % of pickers took at lock, and get it right: ×${d.underdog_multiplier}. Stacks with the star, capped at ${d.stack_cap}× the base.`, `Pilih sisi yang diambil kurang dari ${Math.round(d.underdog_threshold * 100)} % pemilih saat lock, dan benar: ×${d.underdog_multiplier}. Bisa ditumpuk dengan bintang, maksimal ${d.stack_cap}× poin dasar.`)}</p>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>{tx('Grup templates', 'Template grup')}</h2>
          <ul style={S.ul}>
            <li><strong>Santai</strong> — {tx('ladder only.', 'tangga poin saja.')}</li>
            <li><strong>Standar</strong> — {tx('ladder + jagoan + underdog.', 'tangga poin + jagoan + underdog.')}</li>
            <li><strong>Sultan</strong> — {tx(`Standar + star penalty + streak bonus (+${TEMPLATES.sultan.streak_bonus} for ${TEMPLATES.sultan.streak_len} correct picks in a row).`, `Standar + potongan bintang + bonus streak (+${TEMPLATES.sultan.streak_bonus} untuk ${TEMPLATES.sultan.streak_len} pick tepat beruntun).`)}</li>
          </ul>
          <p style={S.p}>{tx('Rules freeze at the first lock. Standings tiebreak: points, then exact scores, then nyaris, then whoever picked earliest.', 'Aturan terkunci saat lock pertama. Urutan klasemen bila seri: poin, lalu skor tepat, lalu nyaris, lalu siapa yang pick lebih dulu.')}</p>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Gugur</h2>
          <p style={S.p}>{tx('One team per matchweek, never the same team twice. A loss or a draw puts you out; so does skipping a week. Last one standing wins the grup.', 'Satu tim per pekan, tidak boleh tim yang sama dua kali. Kalah atau seri = gugur; lewat satu pekan juga gugur. Yang terakhir bertahan juara grup.')}</p>
        </section>

        <section style={{ ...S.card, background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'transparent' }}>
          <h2 style={S.h2}>{tx('Why it’s free — and never betting', 'Kenapa gratis — dan bukan taruhan')}</h2>
          <p style={{ ...S.p, color: 'inherit', opacity: 0.9 }}>{tx('Nothing is wagered and nothing is paid out. Points are bragging rights in your own grup; the only thing on the line is gengsi. Gibol makes money from optional Season Passes for big grups and from sponsors, not from your picks.', 'Tidak ada yang dipertaruhkan dan tidak ada yang dibayarkan. Poin cuma gengsi di grup kamu sendiri. Gibol hidup dari Season Pass opsional buat grup besar dan dari sponsor, bukan dari pick kamu.')}</p>
        </section>
      </div>

      <TabBar4a active="main" lang={lang} />
    </div>
  );
}

function Row({ k, v }) {
  return (
    <tr>
      <td style={S.td}>{k}</td>
      <td style={{ ...S.td, textAlign: 'right', font: '800 18px/1 var(--g4-font-display)' }}>{v}</td>
    </tr>
  );
}

const S = {
  shell: { minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)', fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)', margin: '0 var(--g4-gutter)' },
  back: { appearance: 'none', border: 'none', background: 'transparent', color: 'var(--g4-text)', padding: 4, cursor: 'pointer', display: 'flex' },
  title: { font: '800 20px/1.1 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)', margin: 0 },
  body: { padding: '14px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: 'var(--g4-surface)', border: '1.5px solid var(--g4-border)', borderRadius: 'var(--g4-radius-card)', padding: '14px' },
  h2: { font: '800 16px/1.15 var(--g4-font-display)', margin: '0 0 8px' },
  p: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '8px 0 0' },
  ul: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0, paddingLeft: 18 },
  table: { width: '100%', borderCollapse: 'collapse' },
  td: { padding: '7px 0', borderBottom: '1px solid var(--g4-border)', font: '600 13px/1.3 var(--g4-font-ui)' },
};
