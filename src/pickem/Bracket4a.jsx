/**
 * /bagan & /bagan/:competition — Official Playoff Bracket Lock & Babak Baru
 * (Playoff Pick'em v3, Decision D4 Layer 2).
 *
 * Connects the 5-shape Playoff Topology engine to authenticated bracket saving
 * (`upsertBracket` / `getPlayoffBracket` via `src/pickem/api.js`) with seamless
 * guest-first local persistence (`guestStore.js` + `claimGuestAndJoin`).
 *
 * Includes `Babak Baru` (Second Chance 0.75x) phase switching so players whose
 * early round bracket busted can re-enter at Quarterfinals/Semifinals!
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
  summarizeTopologyState,
  encodeTopologyToSlots,
  decodeSlotsToTopology,
} from './playoffTopology.js';
import { getPlayoffBracket, upsertBracket, listMyGrups } from './api.js';
import { saveGuestBracket, getGuestBracket, saveGuestInvite } from './guestStore.js';
import { shareCard } from './share.js';
import TopologyTree4a from './components/TopologyTree4a.jsx';
import Countdown4a from './components/Countdown4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import SideRail4a from './components/SideRail4a.jsx';
import { IconChevronLeft, IconLock, IconShare, IconCheck } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Bracket4a() {
  return (
    <AuthProvider>
      <Bracket4aInner />
    </AuthProvider>
  );
}

function Bracket4aInner() {
  const { competition: paramComp } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const grupInvite = searchParams.get('grup') || '';

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

  const [phaseKey, setPhaseKey] = useState('full');
  const [state, setState] = useState(() => createEmptyTopologyState(topology));
  const [bracketMeta, setBracketMeta] = useState(null);
  const [grups, setGrups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    if (topology && !topology.phases?.some((p) => p.key === phaseKey)) {
      setPhaseKey('full');
    }
  }, [topology, phaseKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await listMyGrups();
      if (!cancelled && res?.ok) setGrups(res.grups || []);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!topology) return undefined;
    let cancelled = false;
    setLoading(true);
    setErrMsg(null);

    (async () => {
      const guest = getGuestBracket(compKey, phaseKey) || (phaseKey === 'full' ? getGuestBracket(compKey, 'full') : null);
      if (user) {
        const res = await getPlayoffBracket({
          competition: compKey,
          season: competition?.season || '2027',
          entry_phase: phaseKey,
        });
        if (cancelled) return;
        if (res?.ok && res.bracket) {
          setBracketMeta(res.bracket);
          setState(decodeSlotsToTopology(topology, res.slots || []));
          setLoading(false);
          return;
        }
      }
      if (cancelled) return;
      setBracketMeta(null);
      setState(guest?.state || createEmptyTopologyState(topology));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [compKey, phaseKey, topology, user, competition?.season]);

  const deadlinePassed = topology?.lockAt ? Date.now() >= new Date(topology.lockAt).getTime() : false;
  const isLocked = bracketMeta?.status === 'locked' || (phaseKey === 'full' && deadlinePassed);

  const summary = useMemo(
    () => summarizeTopologyState(topology, state, phaseKey),
    [topology, state, phaseKey]
  );

  const updateLocal = (nextState) => {
    setState(nextState);
    if (!topology) return;
    saveGuestBracket({
      competition: compKey,
      season: competition?.season || '2027',
      entryPhase: phaseKey,
      state: nextState,
      slots: encodeTopologyToSlots(topology, nextState),
    });
  };

  const handleSave = async (lockNow = false) => {
    if (!topology || saving || isLocked) return;
    const slots = encodeTopologyToSlots(topology, state);
    saveGuestBracket({
      competition: compKey,
      season: competition?.season || '2027',
      entryPhase: phaseKey,
      state,
      slots,
    });

    if (!user) {
      if (grupInvite) saveGuestInvite(grupInvite);
      const returnPath = `/bagan/${encodeURIComponent(compKey)}${grupInvite ? `?grup=${encodeURIComponent(grupInvite)}` : ''}`;
      navigate(`/masuk?next=${encodeURIComponent(returnPath)}`);
      return;
    }

    setSaving(true);
    setErrMsg(null);
    const res = await upsertBracket({
      bracket_id: bracketMeta?.id,
      competition: compKey,
      season: competition?.season || '2027',
      entry_phase: phaseKey,
      slots,
      lock: lockNow,
    });
    setSaving(false);

    if (!res?.ok) {
      setErrMsg(String(res?.error || tx('Could not save bracket', 'Gagal menyimpan bagan')));
      return;
    }

    setBracketMeta((prev) => ({
      ...(prev || {}),
      id: res.bracket_id || prev?.id,
      status: res.status || (lockNow ? 'locked' : 'open'),
      locked_at: res.locked_at || prev?.locked_at,
    }));
    setToast(
      lockNow
        ? tx('Bracket locked!', 'Bagan resmi terkunci!')
        : tx('Draft saved!', 'Draf bagan tersimpan!')
    );
    setTimeout(() => setToast(null), 2600);
  };

  const handleShare = async () => {
    const activeCode = grupInvite || grups[0]?.invite_code || '';
    const compLabel = lang === 'id' ? competition?.labelI18n?.id : competition?.labelI18n?.en;
    await shareCard({
      type: 'bracket',
      params: {
        context: isLocked ? 'BAGAN TERKUNCI' : 'BAGAN PLAYOFF',
        champ: summary.champion?.name || compLabel || 'Playoff',
        runnerUp: summary.runnerUp?.name || '',
        comp: compLabel || compKey,
        code: activeCode,
        slug: compKey,
        sub: phaseKey !== 'full'
          ? tx('Babak Baru (0.75×) entry', 'Tiket Babak Baru (0,75×)')
          : tx('Locked for grup bragging rights', 'Siap adu gengsi satu grup'),
      },
      title: `${compLabel || compKey} — Gibol`,
      text: tx(
        `My ${compLabel || compKey} bracket is in${summary.champion ? ` (${summary.champion.name} champion)` : ''}!`,
        `Bagan ${compLabel || compKey} punyaku sudah siap${summary.champion ? ` (Juara: ${summary.champion.name})` : ''}!`
      ),
      url: activeCode
        ? `https://www.gibol.co/g/${activeCode}`
        : `https://www.gibol.co/bagan/${encodeURIComponent(compKey)}`,
    });
  };

  return (
    <div className="g4-shell g4-has-rail" style={S.shell}>
      <SEO
        title={tx(
          `${competition?.labelI18n?.en || 'Playoff'} Bracket — gibol.co`,
          `Bagan ${competition?.labelI18n?.id || 'Playoff'} — gibol.co`
        )}
        description={tx(
          'Lock your playoff bracket and compete on your WhatsApp grup standings.',
          'Kunci bagan playoff kamu dan adu poin di klasemen grup WhatsApp.'
        )}
      />

      <header style={S.header}>
        <div style={S.headerLeft}>
          <button
            type="button"
            onClick={() => navigate(grupInvite ? `/grup/${grupInvite}` : '/')}
            aria-label={tx('Back', 'Kembali')}
            style={S.backBtn}
          >
            <IconChevronLeft size={20} />
          </button>
          <span style={S.headerTitle}>{tx('Playoff Bracket', 'Bagan Playoff')}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/simulasi/${encodeURIComponent(compKey)}`)}
          style={S.simSwitchBtn}
        >
          {tx('Sandbox →', 'Simulasi →')}
        </button>
      </header>

      <div className="g4-body" style={S.body}>
        {/* Competition switcher */}
        <div style={S.compStrip}>
          {BRACKET_COMPETITION_ORDER.map((k) => {
            const c = COMPETITIONS[k];
            if (!c) return null;
            const active = k === compKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => navigate(`/bagan/${encodeURIComponent(k)}${grupInvite ? `?grup=${encodeURIComponent(grupInvite)}` : ''}`)}
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

        {/* Bracket Status & Babak Baru (Second Chance) Phase Switcher */}
        <div style={S.heroCard}>
          <div style={{ ...S.heroStrip, background: skin.accent }}>
            <span>
              {isLocked
                ? tx('BRACKET LOCKED', 'BAGAN TERKUNCI')
                : tx('OFFICIAL BRACKET', 'BAGAN RESMI')}
            </span>
            {topology?.lockAt && !isLocked && (
              <Countdown4a lockAt={topology.lockAt} style={S.lockPill} lang={lang} />
            )}
          </div>

          <div style={S.heroBody}>
            <h1 style={S.h1}>
              {lang === 'id' ? competition?.labelLongI18n?.id : competition?.labelLongI18n?.en}
            </h1>

            {/* Babak Baru (Second Chance) pills */}
            {Array.isArray(topology?.phases) && topology.phases.length > 1 && (
              <div style={S.phaseRow}>
                {topology.phases.map((ph) => {
                  const active = ph.key === phaseKey;
                  return (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => setPhaseKey(ph.key)}
                      style={{
                        ...S.phasePill,
                        ...(active
                          ? { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'var(--g4-ink-block)' }
                          : {}),
                      }}
                    >
                      {lang === 'id' ? ph.label.id : ph.label.en}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={S.progressRow}>
              <span style={S.progressText}>
                {tx(
                  `${summary.pickedCount} of ${summary.totalNodes} matchups picked`,
                  `${summary.pickedCount} dari ${summary.totalNodes} laga dipilih`
                )}
              </span>
              <span style={S.maxPtsText}>
                {tx(`Max ${summary.maxPoints} pts`, `Maks ${summary.maxPoints} poin`)}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={S.muted}>{tx('Loading your bracket…', 'Memuat baganmu…')}</p>
        ) : (
          <TopologyTree4a
            topology={topology}
            skin={skin}
            state={state}
            phaseKey={phaseKey}
            locked={isLocked}
            lang={lang}
            onPickWinner={(nodeId, w) => updateLocal(applyTopologyPick(topology, state, nodeId, w))}
            onPickDetail={(nodeId, d) => updateLocal(applyTopologyDetail(topology, state, nodeId, d))}
            onPromoteGroup={(g, c, r) => updateLocal(promoteGroupTeam(topology, state, g, c, r))}
          />
        )}

        {/* Save / Lock / Share Action Card */}
        <div style={S.actionCard}>
          {summary.champion && (
            <div style={S.champSummary}>
              <span style={S.champBadge}>{tx('CHAMPION PICK', 'JAGOAN JUARA')}</span>
              <span style={S.champTitle}>{summary.champion.name}</span>
            </div>
          )}

          {errMsg && <p style={S.errText}>{errMsg}</p>}
          {toast && (
            <div style={S.toastRow}>
              <IconCheck size={15} />
              <span>{toast}</span>
            </div>
          )}

          {isLocked ? (
            <div style={S.lockedNote}>
              <IconLock size={15} />
              <span>
                {tx(
                  'This bracket is locked. Points update automatically as each round finishes.',
                  'Bagan ini sudah dikunci. Poin dihitung otomatis setiap babak selesai.'
                )}
              </span>
            </div>
          ) : !user ? (
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={summary.pickedCount === 0}
              style={{ ...S.primaryCta, opacity: summary.pickedCount === 0 ? 0.5 : 1 }}
            >
              {tx('Sign in & Save Bracket →', 'Masuk & Simpan Bagan →')}
            </button>
          ) : (
            <div style={S.btnStack}>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving || summary.pickedCount === 0}
                style={{ ...S.secondaryCta, opacity: saving || summary.pickedCount === 0 ? 0.5 : 1 }}
              >
                {saving ? tx('Saving…', 'Menyimpan…') : tx('Save Draft', 'Simpan Draf Bagan')}
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving || !summary.complete}
                style={{ ...S.primaryCta, opacity: saving || !summary.complete ? 0.45 : 1 }}
              >
                {tx('Lock Official Bracket →', 'Kunci Bagan Resmi →')}
              </button>
              {!summary.complete && (
                <span style={S.lockHint}>
                  {tx(
                    'Complete every round up to the Final before locking.',
                    'Lengkapi semua pilihan sampai Final sebelum mengunci bagan.'
                  )}
                </span>
              )}
            </div>
          )}

          {summary.pickedCount > 0 && (
            <button type="button" onClick={handleShare} style={S.shareGhost}>
              <IconShare size={15} />
              <span>{tx('Share Bracket Card to Grup', 'Bagikan Kartu Bagan ke Grup')}</span>
            </button>
          )}
        </div>
      </div>

      <SideRail4a grups={grups} lang={lang} />
      <TabBar4a active="main" grupCode={grupInvite || grups[0]?.invite_code} lang={lang} />
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
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
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
    font: '800 17px/1.1 var(--g4-font-display)',
    letterSpacing: '-0.3px',
  },
  simSwitchBtn: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    background: 'transparent',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '6px 10px',
    font: '700 11px/1 var(--g4-font-ui)',
    cursor: 'pointer',
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
    border: '1.5px solid var(--g4-text)',
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
  lockPill: { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)' },
  heroBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  h1: {
    font: '800 19px/1.12 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    margin: 0,
  },
  phaseRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  phasePill: {
    appearance: 'none',
    border: '1px solid var(--g4-text)',
    background: 'transparent',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '6px 10px',
    font: '700 11px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--g4-border-soft)',
    paddingTop: 8,
  },
  progressText: { font: '600 12px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  maxPtsText: { font: '800 12px/1 var(--g4-font-display)', color: 'var(--g4-text)' },
  actionCard: {
    background: 'var(--g4-surface)',
    border: '1.5px solid var(--g4-text)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  champSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottom: '1px solid var(--g4-border-soft)',
  },
  champBadge: { font: '700 10px/1 var(--g4-font-ui)', color: 'var(--g4-accent)', letterSpacing: '0.5px' },
  champTitle: { font: '800 16px/1.1 var(--g4-font-display)' },
  btnStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  primaryCta: {
    appearance: 'none',
    border: 'none',
    width: '100%',
    background: 'var(--g4-scarlet)',
    color: '#fff',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '13px 16px',
    font: '700 14px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  secondaryCta: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    width: '100%',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '12px 16px',
    font: '700 13px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  shareGhost: {
    appearance: 'none',
    border: '1px solid var(--g4-border)',
    width: '100%',
    background: 'transparent',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '10px 14px',
    font: '700 12px/1 var(--g4-font-ui)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  lockHint: { font: '500 11px/1.35 var(--g4-font-ui)', color: 'var(--g4-text-muted)', textAlign: 'center' },
  lockedNote: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    font: '600 12px/1.4 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
  },
  toastRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    font: '700 12px/1 var(--g4-font-ui)',
    color: 'var(--g4-win)',
  },
  errText: { font: '600 12px/1.3 var(--g4-font-ui)', color: 'var(--g4-scarlet)', margin: 0 },
  muted: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', textAlign: 'center', padding: 24 },
};
