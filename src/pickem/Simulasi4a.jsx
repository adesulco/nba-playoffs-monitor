/**
 * /simulasi & /simulasi/:competition — Zero-Login Skenario & Dream Bracket
 * Simulator (Playoff Pick'em v3, Decision D4 Layer 1).
 *
 * PlayoffLabs.id-inspired viral top-of-funnel:
 *   - 100% client-side (zero login wall, Rp 0 database cost)
 *   - Instant 5-shape Playoff simulation (M8 Double-Elim, BWF Istora, UCL Sahur,
 *     NBA Bo7, IBL Bo5, Sudirman, Asian Cup Timnas Garuda)
 *   - 1-tap dark 1080x1080 Satori PNG share card (`g4-bracket`) + URL state (`?s=...`)
 *   - Primary viral conversion CTA: "Tantang Grup WA pakai Bagan Ini ->"
 *     hydrates guestStore and launches `/grup/baru?competition=...&from=simulasi`!
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  COMPETITIONS,
  BRACKET_COMPETITION_ORDER,
  defaultPlayoffCompetitionKey,
} from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import {
  getTopology,
  createEmptyTopologyState,
  applyTopologyPick,
  applyTopologyDetail,
  promoteGroupTeam,
  randomizeTopologyState,
  summarizeTopologyState,
  encodeTopologyToSlots,
  encodeSimQuery,
  decodeSimQuery,
} from './playoffTopology.js';
import { saveGuestBracket, getGuestBracket } from './guestStore.js';
import { shareCard } from './share.js';
import TopologyTree4a from './components/TopologyTree4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import SideRail4a from './components/SideRail4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronLeft, IconShare } from './components/icons4a.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { trackEvent } from '../lib/analytics.js';
import SEO from '../components/SEO.jsx';

export default function Simulasi4a() {
  const { competition: paramComp } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const compKey = useMemo(() => {
    if (paramComp && getTopology(paramComp)) return paramComp;
    const def = defaultPlayoffCompetitionKey();
    return getTopology(def) ? def : BRACKET_COMPETITION_ORDER[0];
  }, [paramComp]);

  const competition = COMPETITIONS[compKey];
  const topology = getTopology(compKey);
  const skin = useMemo(
    () => skinForCompetition(compKey, competition),
    [compKey, competition]
  );

  const [state, setState] = useState(() => {
    const q = searchParams.get('s');
    if (q && topology) return decodeSimQuery(topology, q);
    const saved = getGuestBracket(compKey, 'full');
    if (saved?.state) return saved.state;
    return createEmptyTopologyState(topology);
  });

  const [shareFeedback, setShareFeedback] = useState(null);

  useEffect(() => {
    if (!topology) return;
    const q = searchParams.get('s');
    if (q) {
      setState(decodeSimQuery(topology, q));
      return;
    }
    const saved = getGuestBracket(compKey, 'full');
    setState(saved?.state || createEmptyTopologyState(topology));
  }, [compKey, topology]);

  const summary = useMemo(
    () => summarizeTopologyState(topology, state, 'full'),
    [topology, state]
  );

  const persistLocal = (nextState) => {
    setState(nextState);
    if (!topology) return;
    const slots = encodeTopologyToSlots(topology, nextState);
    saveGuestBracket({
      competition: compKey,
      season: competition?.season || '2027',
      entryPhase: 'full',
      state: nextState,
      slots,
    });
  };

  const handlePickWinner = (nodeId, winnerCode) => {
    const next = applyTopologyPick(topology, state, nodeId, winnerCode);
    persistLocal(next);
  };

  const handlePickDetail = (nodeId, detail) => {
    const next = applyTopologyDetail(topology, state, nodeId, detail);
    persistLocal(next);
  };

  const handlePromoteGroup = (groupKey, teamCode, rank) => {
    const next = promoteGroupTeam(topology, state, groupKey, teamCode, rank);
    persistLocal(next);
  };

  const handleChaos = () => {
    if (!topology) return;
    const next = randomizeTopologyState(topology);
    persistLocal(next);
    trackEvent('pickem_simulasi_chaos', { competition: compKey });
  };

  const handleReset = () => {
    if (!topology) return;
    const empty = createEmptyTopologyState(topology);
    persistLocal(empty);
    if (searchParams.has('s')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('s');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const shareUrl = useMemo(() => {
    const encoded = encodeSimQuery(topology, state);
    const base = `https://www.gibol.co/simulasi/${encodeURIComponent(compKey)}`;
    return encoded ? `${base}?s=${encodeURIComponent(encoded)}` : base;
  }, [topology, state, compKey]);

  const handleShare = async () => {
    const champName = summary.champion?.name || competition?.label || 'Juara';
    const runnerName = summary.runnerUp?.name || '';
    const compLabel = lang === 'id' ? competition?.labelI18n?.id : competition?.labelI18n?.en;
    const via = await shareCard({
      type: 'bracket',
      params: {
        context: 'SIMULASI PLAYOFF',
        champ: champName,
        runnerUp: runnerName,
        comp: compLabel || compKey,
        slug: compKey,
        sub: summary.finalDetail
          ? tx(`Final score: ${summary.finalDetail}`, `Skor final: ${summary.finalDetail}`)
          : tx('Do you agree with this path?', 'Setuju sama skenario ini?'),
      },
      title: `${champName} — ${compLabel || compKey}`,
      text: tx(
        `My ${compLabel || compKey} champion scenario: ${champName}! Build yours on Gibol:`,
        `Skenario juara ${compLabel || compKey} versiku: ${champName}! Coba racik baganmu di Gibol:`
      ),
      url: shareUrl,
    });
    if (via === 'copy') {
      setShareFeedback(tx('Link copied!', 'Link skenario tersalin!'));
      setTimeout(() => setShareFeedback(null), 2400);
    }
  };

  const handleChallengeGrup = () => {
    if (topology) {
      const slots = encodeTopologyToSlots(topology, state);
      saveGuestBracket({
        competition: compKey,
        season: competition?.season || '2027',
        entryPhase: 'full',
        state,
        slots,
      });
    }
    trackEvent('pickem_simulasi_to_grup', {
      competition: compKey,
      picked_count: summary.pickedCount,
      complete: summary.complete,
    });
    navigate(`/grup/baru?competition=${encodeURIComponent(compKey)}&from=simulasi`);
  };

  return (
    <div className="g4-shell g4-has-rail" style={S.shell}>
      <SEO
        title={tx(
          `${competition?.labelI18n?.en || 'Playoff'} Bracket Simulator — gibol.co`,
          `Simulasi Bagan ${competition?.labelI18n?.id || 'Playoff'} — gibol.co`
        )}
        description={tx(
          'Simulate the knockout bracket in 30 seconds with no login, share your champion card, and challenge your WhatsApp grup.',
          'Simulasikan skenario fase gugur dalam 30 detik tanpa login, bagikan kartu juaramu, dan tantang grup WhatsApp kamu.'
        )}
      />

      <header style={S.header}>
        <div style={S.headerLeft}>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={tx('Back', 'Kembali')}
            style={S.backBtn}
          >
            <IconChevronLeft size={20} />
          </button>
          <Logo4a size={11} />
          <span style={S.headerTitle}>{tx('Bracket Simulator', 'Simulasi Bagan')}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/bagan/${encodeURIComponent(compKey)}`)}
          style={S.lockSwitchBtn}
        >
          {tx('Official Lock →', 'Kunci Resmi →')}
        </button>
      </header>

      <div className="g4-body" style={S.body}>
        {/* Competition selector strip */}
        <div style={S.compStrip}>
          {BRACKET_COMPETITION_ORDER.map((k) => {
            const c = COMPETITIONS[k];
            if (!c) return null;
            const active = k === compKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => navigate(`/simulasi/${encodeURIComponent(k)}`)}
                style={{
                  ...S.compPill,
                  ...(active
                    ? { background: skin.accent, color: '#fff', borderColor: skin.accent }
                    : {}),
                }}
              >
                {lang === 'id' ? c.labelI18n.id : c.labelI18n.en}
              </button>
            );
          })}
        </div>

        {/* Hero / Progress + Chaos controls */}
        <div style={S.heroCard}>
          <div style={{ ...S.heroStrip, background: skin.accent }}>
            <span>
              {skin.emoji} {tx('ZERO-LOGIN SANDBOX', 'SIMULASI TANPA LOGIN')}
            </span>
            <span>
              {summary.pickedCount}/{summary.totalNodes} {tx('picked', 'dipilih')}
            </span>
          </div>
          <div style={S.heroBody}>
            <h1 style={S.h1}>
              {lang === 'id' ? competition?.labelLongI18n?.id : competition?.labelLongI18n?.en}
            </h1>
            {topology?.seedNote && (
              <p style={S.seedNote}>
                {lang === 'id' ? topology.seedNote.id : topology.seedNote.en}
              </p>
            )}
            <div style={S.toolRow}>
              <button type="button" onClick={handleChaos} style={S.chaosBtn}>
                ⚡ {tx('Randomize Chaos', 'Acak Skenario')}
              </button>
              <button type="button" onClick={handleReset} style={S.resetBtn}>
                {tx('Reset', 'Ulangi')}
              </button>
            </div>
          </div>
        </div>

        {/* Champion Reveal + Viral Share / Grup Conversion Card */}
        {summary.champion && (
          <div style={S.champCard}>
            <div style={S.champEyebrow}>
              {tx('YOUR PREDICTED CHAMPION', 'JUARA VERSI BAGANMU')}
            </div>
            <div style={S.champName}>{summary.champion.name}</div>
            <div style={S.champMeta}>
              {summary.runnerUp
                ? tx(
                    `Defeats ${summary.runnerUp.name} in Final${summary.finalDetail ? ` (${summary.finalDetail})` : ''} · Max ${summary.maxPoints} pts`,
                    `Mengalahkan ${summary.runnerUp.name} di Final${summary.finalDetail ? ` (${summary.finalDetail})` : ''} · Maks ${summary.maxPoints} poin`
                  )
                : tx(`Max ${summary.maxPoints} pts`, `Maks ${summary.maxPoints} poin`)}
            </div>

            <div style={S.champActions}>
              <button type="button" onClick={handleChallengeGrup} style={S.primaryCta}>
                {tx(
                  'Challenge WA Grup with this Bracket →',
                  'Tantang Grup WA pakai Bagan Ini →'
                )}
              </button>
              <button type="button" onClick={handleShare} style={S.shareBtn}>
                <IconShare size={15} />
                <span>
                  {shareFeedback || tx('Share Champion Card (1080×1080)', 'Bagikan Kartu Juara ke WA')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Interactive 5-Shape Topology Tree */}
        <TopologyTree4a
          topology={topology}
          skin={skin}
          state={state}
          phaseKey="full"
          locked={false}
          lang={lang}
          onPickWinner={handlePickWinner}
          onPickDetail={handlePickDetail}
          onPromoteGroup={handlePromoteGroup}
        />

        {/* Bottom persistent conversion card even before picking champion */}
        {!summary.champion && (
          <div style={S.bottomPrompt}>
            <div style={{ font: '800 15px/1.15 var(--g4-font-display)' }}>
              {tx('Play against friends, all for prestige', 'Adu skenario bareng teman, murni gengsi')}
            </div>
            <p style={S.seedNote}>
              {tx(
                'Pick up to the Final to unlock your 1080×1080 Champion Card, or create your WhatsApp grup right away.',
                'Pilih sampai partai Final buat buka Kartu Juara 1080×1080, atau langsung bikin grup WhatsApp sekarang.'
              )}
            </p>
            <button type="button" onClick={handleChallengeGrup} style={S.primaryCta}>
              {tx('Create WhatsApp Grup →', 'Bikin Grup WhatsApp →')}
            </button>
          </div>
        )}
      </div>

      <SideRail4a lang={lang} />
      <TabBar4a active="main" lang={lang} />
    </div>
  );
}

const S = {
  shell: {
    minHeight: '100dvh',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)',
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 96,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '14px 0 10px',
    borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)',
    margin: '0 var(--g4-gutter)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  backBtn: {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: 'var(--g4-text)',
    padding: 2,
    cursor: 'pointer',
    display: 'flex',
  },
  headerTitle: {
    font: '800 15px/1.1 var(--g4-font-display)',
    letterSpacing: '-0.3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lockSwitchBtn: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    background: 'transparent',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '6px 10px',
    font: '700 11px/1 var(--g4-font-ui)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  body: {
    padding: '12px var(--g4-gutter) 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  compStrip: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 2,
    scrollbarWidth: 'none',
  },
  compPill: {
    appearance: 'none',
    border: '1.5px solid var(--g4-border)',
    background: 'var(--g4-surface)',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '7px 12px',
    font: '700 12px/1 var(--g4-font-ui)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  heroCard: {
    background: 'var(--g4-surface)',
    border: '2px solid var(--g4-text)',
    borderRadius: 'var(--g4-radius-hero)',
    overflow: 'hidden',
  },
  heroStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    padding: '7px 14px',
    font: '800 10px/1.2 var(--g4-font-display)',
    letterSpacing: '0.5px',
  },
  heroBody: { padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  h1: {
    font: '800 20px/1.12 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    margin: 0,
  },
  seedNote: {
    font: '500 12px/1.45 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    margin: 0,
  },
  toolRow: { display: 'flex', gap: 8, marginTop: 2 },
  chaosBtn: {
    appearance: 'none',
    border: 'none',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '8px 14px',
    font: '700 12px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  resetBtn: {
    appearance: 'none',
    border: '1.5px solid var(--g4-border)',
    background: 'transparent',
    color: 'var(--g4-text-muted)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '8px 12px',
    font: '700 12px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  champCard: {
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-hero)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  champEyebrow: {
    font: '700 10px/1 var(--g4-font-ui)',
    letterSpacing: '0.6px',
    color: 'var(--g4-scarlet-soft)',
  },
  champName: {
    font: '800 26px/1.05 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
  },
  champMeta: {
    font: '500 12px/1.4 var(--g4-font-ui)',
    opacity: 0.82,
  },
  champActions: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  primaryCta: {
    appearance: 'none',
    border: 'none',
    width: '100%',
    background: 'var(--g4-scarlet)',
    color: '#fff',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '13px 16px',
    font: '700 13px/1.1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  shareBtn: {
    appearance: 'none',
    border: '1.5px solid rgba(255,255,255,0.35)',
    width: '100%',
    background: 'transparent',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '11px 16px',
    font: '700 12px/1 var(--g4-font-ui)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  bottomPrompt: {
    background: 'var(--g4-surface)',
    border: '1.5px dashed var(--g4-text)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
};
