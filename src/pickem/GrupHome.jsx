/**
 * /grup/:code — grup home · R2 screen 3 (v0.83.0).
 *
 * Where the prestige actually lives: your rank among people you know.
 * Pixel-faithful to the #t4 grup home — ink header block with stat tiles,
 * klasemen with the kamu row tinted and "belum pick" badges on
 * delinquents, a scarlet nudge banner that opens WhatsApp, and the dashed
 * invite card.
 *
 * Code-addressable like the invite landing so one link works for members
 * and newcomers alike, and it reads the same public league-detail action
 * (no auth needed to look; the kamu row only lights up once we know who
 * you are).
 *
 * The nudge is the loop's flywheel: league-detail returns
 * picked_current_matchday per member (D4), so "who hasn't picked yet"
 * costs zero extra queries, and "colek via WA" turns it into a message
 * someone actually sends.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueDetail, listFixtures, listPredictions, updateLeagueSettings, joinGrup, approveMember } from './api.js';
import Countdown4a from './components/Countdown4a.jsx';
import UpgradeSheet4a from './components/UpgradeSheet4a.jsx';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { LeaderboardRow, LockBadge } from './components/primitives4a.jsx';
import NicknameNudge4a from './components/NicknameNudge4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import { IconChevronLeft, IconWhatsApp, IconCopy, IconCheck } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';
import { saveGuestInvite } from './guestStore.js';
import { computeProvisional } from './useProvisionalPoints.js';

const AVATAR_COLORS = ['#1E3FBB', '#7A2E8E', '#E07B00', '#1F7A3D', '#D92D1C', '#171310'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function GrupHome() {
  return (
    <AuthProvider>
      <GrupHomeInner />
    </AuthProvider>
  );
}

function GrupHomeInner() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextFixture, setNextFixture] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gugurToggling, setGugurToggling] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  // Commissioner: pending members (cap paywall) and the upgrade sheet.
  const [approving, setApproving] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const approve = async (userId) => {
    if (!league || approving) return;
    setApproving(userId);
    const res = await approveMember({ league_id: league.id, user_id: userId });
    setApproving(null);
    if (res?.ok) { reloadDetail(); return; }
    if (res?.needs_upgrade || /402|upgrade/i.test(String(res?.error || ''))) setUpgradeOpen(true);
  };
  // Provisional points (doc 17 S1-6): live fixtures × my unscored picks ×
  // this grup's config. Presentation only; the cron owns real points.
  const [liveFixtures, setLiveFixtures] = useState([]);
  const [myPredictions, setMyPredictions] = useState([]);

  const reloadDetail = async () => {
    const res = await leagueDetail({ code: code.trim() });
    if (res?.ok) { setLeague(res.league); setMembers(res.members || []); }
  };

  // Logged-in non-member: one tap joins (the invite code is in the URL,
  // and league-detail by code already proved we hold it).
  const handleJoin = async () => {
    if (!league || joining) return;
    setJoining(true);
    setJoinError(null);
    const res = await joinGrup({ leagueId: league.id, inviteCode: league.invite_code });
    setJoining(false);
    if (!res?.ok && !/already|member/i.test(String(res?.error || ''))) {
      setJoinError(String(res?.error || tx('Could not join', 'Gagal gabung')));
      return;
    }
    reloadDetail();
  };

  // Guest: remember the invite, sign in, and AuthCallback claims + joins.
  const handleClaimAndJoin = () => {
    if (!league) return;
    saveGuestInvite(league.invite_code);
    navigate(`/masuk?next=${encodeURIComponent(`/grup/${league.invite_code}`)}`);
  };

  // R4a-1 — commissioner switches survivor on. One-way from this strip on
  // purpose: turning it OFF mid-run would erase a living game; that
  // (rare) admin action can live in settings later.
  const enableGugur = async () => {
    if (!league || gugurToggling) return;
    setGugurToggling(true);
    const res = await updateLeagueSettings({
      league_id: league.id,
      enabled_modes: { survivor: true },
    });
    setGugurToggling(false);
    if (res?.ok) {
      setLeague((prev) => (prev ? { ...prev, enabled_modes: res.league.enabled_modes } : prev));
      navigate(`/gugur/${league.invite_code}`);
    }
  };
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await leagueDetail({ code: code.trim() });
      if (cancelled) return;
      if (res?.ok) { setLeague(res.league); setMembers(res.members || []); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  // Next lock — drives both the nudge urgency line and the pick CTA.
  useEffect(() => {
    const comp = league?.competition;
    if (!comp) return;
    let cancelled = false;
    (async () => {
      const res = await listFixtures({ league: comp, status: 'scheduled', limit: 500 });
      if (cancelled || !res?.ok) return;
      const nowMs = Date.now();
      const open = (res.fixtures || [])
        .filter((f) => new Date(f.lock_at || f.kickoff_at).getTime() > nowMs)
        .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
      setNextFixture(open[0] || null);
    })();
    return () => { cancelled = true; };
  }, [league?.competition]);

  // 30 s is enough for the urgency copy; the lock badge ticks on its own
  // (Countdown4a), so the whole screen no longer re-renders every second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Live fixtures + my picks for the provisional strip. 60 s poll, paused
  // while the tab is hidden; nothing runs for guests.
  useEffect(() => {
    const comp = league?.competition;
    if (!comp || !user) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const [fx, pr] = await Promise.all([
        listFixtures({ league: comp, status: 'live', limit: 100 }),
        listPredictions({ competition: comp, limit: 500 }),
      ]);
      if (cancelled) return;
      if (fx?.ok) setLiveFixtures(fx.fixtures || []);
      if (pr?.ok) setMyPredictions(pr.predictions || []);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [league?.competition, user]);

  const provisional = useMemo(
    () => (liveFixtures.length && myPredictions.length
      ? computeProvisional(liveFixtures, myPredictions, league?.scoring_config || null, null)
      : { total: 0, perFixture: [] }),
    [liveFixtures, myPredictions, league?.scoring_config]
  );

  const competition = league?.competition ? COMPETITIONS[league.competition] : null;
  const skin = useMemo(
    () => skinForCompetition(league?.competition, competition),
    [league?.competition, competition]
  );

  const inviteUrl = league ? `https://www.gibol.co/g/${league.invite_code}` : '';
  const active = members.filter((m) => m.status !== 'pending');
  const me = user ? active.find((m) => m.user_id === user.id) : null;
  const myRank = me ? active.findIndex((m) => m.user_id === user.id) + 1 : null;
  const notPicked = active.filter((m) => !m.picked_current_matchday);

  const lockMs = nextFixture?.lock_at ? new Date(nextFixture.lock_at).getTime() : null;
  const secondsLeft = lockMs != null ? Math.max(0, Math.floor((lockMs - now) / 1000)) : null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied — the URL is visible on the card anyway */ }
  }, [inviteUrl]);

  const waHref = useMemo(() => {
    if (!league) return '';
    const names = notPicked.map((m) => m.display_name).slice(0, 5).join(', ');
    const msg = nextFixture
      ? tx(
          `${names} — you haven't picked ${nextFixture.home_team} vs ${nextFixture.away_team} yet. ${inviteUrl}`,
          `${names} — belum pick ${nextFixture.home_team} vs ${nextFixture.away_team} nih. ${inviteUrl}`
        )
      : tx(`${names} — your picks are missing. ${inviteUrl}`, `${names} — pickmu belum masuk. ${inviteUrl}`);
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, [league, notPicked, nextFixture, inviteUrl, lang]);

  if (loading) {
    return <Shell code={code} lang={lang}><p style={S.muted}>{tx('Loading your grup…', 'Memuat grupmu…')}</p></Shell>;
  }
  if (!league) {
    return (
      <Shell code={code} lang={lang}>
        <p style={S.muted}>{tx('That grup no longer exists.', 'Grup itu sudah tidak ada.')}</p>
      </Shell>
    );
  }

  return (
    <Shell code={code} lang={lang}>
      <SEO title={`${league.name} — grup Pick'em | gibol.co`} description={`Klasemen ${league.name} di gibol.co.`} noindex />

      {/* Ink header block */}
      <header style={S.inkHeader}>
        <div style={S.inkTop}>
          <button type="button" onClick={() => navigate('/')} aria-label={tx('Back', 'Kembali')} style={S.iconBtnLight}>
            <IconChevronLeft size={20} />
          </button>
          <span style={S.codePill}>{tx('code', 'kode')} {league.invite_code}</span>
        </div>
        <h1 style={S.grupName}>{league.name}</h1>
        <p style={S.grupMeta}>
          {tx(
            `${active.length} ${active.length === 1 ? 'member' : 'members'} · ${competition?.labelLong || league.competition}`,
            `${active.length} anggota · ${competition?.labelLong || league.competition}`
          )}
          {league.current_matchday ? tx(` · week ${league.current_matchday}`, ` · pekan ${league.current_matchday}`) : ''}
        </p>

        <div style={S.tiles}>
          <Tile
            value={myRank ? `#${myRank}` : '—'}
            label={tx('your rank', 'peringkatmu')}
            accent="var(--g4-scarlet-soft)"
          />
          <Tile
            value={me ? me.points : '—'}
            label={tx('your points', 'poinmu')}
            hint={me && provisional.total > 0 ? tx(`+${provisional.total} provisional`, `+${provisional.total} sementara`) : null}
          />
          <Tile
            value={me ? me.exact_count ?? 0 : '—'}
            label={tx('exact scores', 'skor tepat')}
            accent="#6FCF8B"
          />
        </div>
      </header>

      <div className="g4-body" style={S.body}>
        {/* Join states (doc 17 S1-5). Guest: claim the device's picks and
            join in one sign-in. Signed in but not a member: one tap. */}
        {!user && (
          <div style={{ ...S.card, marginTop: 10 }}>
            <div style={S.nextEyebrow}>{tx('YOUR PICKS ARE ON THIS DEVICE', 'PICKMU ADA DI PERANGKAT INI')}</div>
            <div style={{ ...S.nextMatch, marginBottom: 10 }}>
              {tx('Sign in once to claim them and join this grup.', 'Masuk sekali buat klaim pick dan gabung grup ini.')}
            </div>
            <button type="button" onClick={handleClaimAndJoin} style={S.pickCta}>
              {tx('Claim picks & join →', 'Klaim pick & gabung →')}
            </button>
          </div>
        )}
        {user && !me && (
          <div style={{ ...S.card, marginTop: 10 }}>
            <div style={S.nextEyebrow}>{tx('NOT A MEMBER YET', 'BELUM JADI ANGGOTA')}</div>
            <div style={{ ...S.nextMatch, marginBottom: 10 }}>
              {tx('Your picks count here once you join.', 'Pickmu dihitung di sini begitu kamu gabung.')}
            </div>
            <button type="button" disabled={joining} onClick={handleJoin} style={S.pickCta}>
              {joining ? tx('Joining…', 'Gabung…') : tx('Join grup →', 'Gabung grup →')}
            </button>
            {joinError && <p style={{ ...S.muted, marginTop: 8 }}>{joinError}</p>}
          </div>
        )}

        {/* Nickname nudge — right above the klasemen, which is exactly where
            showing up as a raw hex id hurts. */}
        {user && (
          <NicknameNudge4a
            user={user}
            competitionKey={league?.competition}
            lang={lang}
            style={{ marginBottom: 'var(--g4-gap-card)' }}
          />
        )}

        {/* Klasemen */}
        <div style={S.sectionRule}>
          <span style={S.sectionTitle}>{tx('Standings', 'Klasemen')}</span>
          <span style={S.sectionMeta}>
            {league.current_matchday
              ? tx(`week ${league.current_matchday}`, `pekan ${league.current_matchday}`)
              : ''}
          </span>
        </div>

        <div style={S.card}>
          {active.length === 0 ? (
            <p style={{ ...S.muted, padding: 18 }}>
              {tx('No members yet.', 'Belum ada anggota.')}
            </p>
          ) : (
            active.map((m, i) => (
              <LeaderboardRow
                key={m.user_id}
                rank={i + 1}
                name={m.display_name}
                avatarColor={avatarColor(m.user_id)}
                points={m.points}
                isYou={!!user && m.user_id === user.id}
                hasNotPicked={!m.picked_current_matchday}
                last={i === active.length - 1}
              />
            ))
          )}
        </div>

        {/* Nudge banner — the flywheel */}
        {notPicked.length > 0 && (
          <div style={{ ...S.nudge, background: skin.accent }}>
            <div>
              <div style={S.nudgeTitle}>
                {tx(
                  `${notPicked.length} ${notPicked.length === 1 ? 'member has' : 'members have'} not picked`,
                  `${notPicked.length} anggota belum pick`
                )}
              </div>
              <div style={S.nudgeMeta}>
                {secondsLeft != null
                  ? tx('remind them before the lock', 'ingatkan sebelum terkunci')
                  : tx('remind them', 'ingatkan mereka')}
              </div>
            </div>
            <a href={waHref} target="_blank" rel="noopener noreferrer" style={S.waPill}>
              <IconWhatsApp size={14} /> {tx('via WA', 'via WA')}
            </a>
          </div>
        )}

        {/* Commissioner: members waiting at the cap (doc 17 §2.2). Approval
            succeeds under the cap or on a paid tier; a 402 opens the
            upgrade sheet. */}
        {user?.id === league?.owner_id && members.some((m) => m.status === 'pending') && (
          <div style={S.card}>
            <div style={S.nextEyebrow}>{tx('WAITING TO JOIN', 'MENUNGGU DISETUJUI')}</div>
            {members.filter((m) => m.status === 'pending').map((m) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{ ...S.nextMatch, flex: 1, minWidth: 0 }}>{m.display_name}</span>
                <button type="button" disabled={!!approving} onClick={() => approve(m.user_id)} style={S.copyPill}>
                  {approving === m.user_id ? '…' : tx('Approve', 'Setujui')}
                </button>
              </div>
            ))}
          </div>
        )}
        <UpgradeSheet4a open={upgradeOpen} onClose={() => setUpgradeOpen(false)} grupName={league?.name} lang={lang} />

        {/* Next lock + pick CTA */}
        {nextFixture && (
          <div style={S.card}>
            <div style={S.nextRow}>
              <div>
                <div style={S.nextEyebrow}>{tx('NEXT LOCK', 'LOCK BERIKUTNYA')}</div>
                <div style={S.nextMatch}>
                  {nextFixture.home_team} vs {nextFixture.away_team}
                </div>
              </div>
              <Countdown4a lockAt={nextFixture.lock_at || nextFixture.kickoff_at} lang={lang} />
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/pick/${nextFixture.id}?league=${encodeURIComponent(league.competition)}&invite=${encodeURIComponent(league.invite_code)}`)
              }
              style={S.pickCta}
            >
              {tx('Pick now →', 'Pick sekarang →')}
            </button>
          </div>
        )}

        {/* R4a-1 — Gugur strip (survivor). Enabled: entry into the sheet.
            Owner + disabled: the switch-on CTA, one tap via
            updateLeagueSettings. Everyone else + disabled: nothing. */}
        {league?.enabled_modes?.survivor ? (
          <button
            type="button"
            onClick={() => navigate(`/gugur/${league.invite_code}`)}
            style={S.gugurStrip}
          >
            <span style={{ minWidth: 0, textAlign: 'left' }}>
              <span style={S.gugurTitle}>Gugur</span>
              <span style={S.gugurMeta}>
                {tx('One team a week. Wrong once — out.', 'Satu tim per pekan. Salah sekali — gugur.')}
              </span>
            </span>
            <span style={S.gugurGo}>→</span>
          </button>
        ) : user?.id === league?.owner_id ? (
          <button
            type="button"
            disabled={gugurToggling}
            onClick={enableGugur}
            style={{ ...S.gugurStrip, background: 'var(--g4-surface)', color: 'var(--g4-text)', border: '1.5px dashed var(--g4-text)' }}
          >
            <span style={{ minWidth: 0, textAlign: 'left' }}>
              <span style={S.gugurTitle}>{tx('Turn on Gugur?', 'Nyalain Gugur?')}</span>
              <span style={{ ...S.gugurMeta, opacity: 0.7 }}>
                {tx('Survivor mode — last one standing wins the grup.', 'Mode survivor — yang terakhir bertahan juara grup.')}
              </span>
            </span>
            <span style={S.gugurGo}>{gugurToggling ? '…' : '+'}</span>
          </button>
        ) : null}

        {/* Dashed invite card */}
        <div style={S.inviteCard}>
          <div style={{ minWidth: 0 }}>
            <div style={S.inviteTitle}>{tx('Invite a friend', 'Ajak teman baru')}</div>
            <div style={S.inviteUrl}>{inviteUrl.replace('https://www.', '')}</div>
          </div>
          <button type="button" onClick={handleCopy} style={S.copyPill}>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? tx('Copied', 'Tersalin') : tx('Copy link', 'Salin link')}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Tile({ value, label, accent, hint }) {
  return (
    <div style={S.tile}>
      <div style={{ ...S.tileValue, ...(accent ? { color: accent } : {}) }}>{value}</div>
      <div style={S.tileLabel}>{label}</div>
      {hint && <div style={{ ...S.tileLabel, color: 'var(--g4-win)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/**
 * GrupHome is a DESTINATION, not a focus surface — it had no tab bar, so
 * landing here (which is exactly where a confirmed pick sends you) was a
 * navigation dead end with no way back to Main or Skor. PickSheet and
 * InviteLanding stay bar-less on purpose: those are single-task flows with
 * their own sticky CTA.
 */
function Shell({ children, code, lang = 'en' }) {
  return (
    <div className="g4-shell" style={S.shell}>
      {children}
      <TabBar4a active="grup" grupCode={code} lang={lang} />
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
    paddingBottom: 96,  // clears the fixed TabBar4a
    boxSizing: 'border-box',
  },
  inkHeader: {
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    padding: '22px 20px 16px',
    borderRadius: '0 0 22px 22px',
    borderBottom: '1px solid var(--g4-ink-block-border)',
  },
  inkTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  iconBtnLight: {
    appearance: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--g4-paper)',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
  },
  codePill: {
    background: 'var(--g4-scarlet)',
    color: '#fff',
    font: '700 10px/1 var(--g4-font-ui)',
    padding: '5px 10px',
    borderRadius: 'var(--g4-radius-pill)',
  },
  grupName: {
    font: '800 27px/1.05 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    margin: '10px 0 0',
  },
  grupMeta: { font: '500 12px/1.4 var(--g4-font-ui)', opacity: 0.7, margin: '4px 0 0' },
  tiles: { display: 'flex', gap: 8, marginTop: 12 },
  tile: { flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: '8px 10px' },
  tileValue: { font: '800 18px/1.1 var(--g4-font-display)' },
  tileLabel: { font: '500 9px/1.2 var(--g4-font-ui)', opacity: 0.7, marginTop: 2 },
  body: {
    padding: '14px var(--g4-gutter) 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--g4-gap-card-sm)',
  },
  sectionRule: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottom: '1px solid var(--g4-text)',
    paddingBottom: 4,
  },
  sectionTitle: { font: '800 16px/1.1 var(--g4-font-display)' },
  sectionMeta: { font: '600 10px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  card: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)',
    overflow: 'hidden',
  },
  nudge: {
    color: '#fff',
    borderRadius: 'var(--g4-radius-card)',
    padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nudgeTitle: { font: '800 14px/1.2 var(--g4-font-display)' },
  nudgeMeta: { font: '500 11px/1.3 var(--g4-font-ui)', opacity: 0.9, marginTop: 2 },
  waPill: {
    background: '#fff',
    color: 'var(--g4-ink)',
    font: '700 11px/1 var(--g4-font-ui)',
    padding: '8px 12px',
    borderRadius: 'var(--g4-radius-pill)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    flex: 'none',
  },
  nextRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 'var(--g4-pad-card-sm) var(--g4-pad-card) 0',
  },
  nextEyebrow: {
    font: '700 9px/1 var(--g4-font-ui)',
    letterSpacing: '0.5px',
    color: 'var(--g4-text-muted)',
  },
  nextMatch: { font: '700 14px/1.3 var(--g4-font-ui)', marginTop: 3 },
  pickCta: {
    appearance: 'none',
    border: 'none',
    display: 'block',
    width: 'calc(100% - 28px)',
    margin: '12px 14px 14px',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)',
    padding: 13,
    font: '700 14px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  gugurStrip: {
    appearance: 'none',
    border: 'none',
    width: '100%',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  gugurTitle: { display: 'block', font: '800 14px/1.2 var(--g4-font-display)', letterSpacing: '-0.2px' },
  gugurMeta: { display: 'block', font: '500 11px/1.4 var(--g4-font-ui)', opacity: 0.75, marginTop: 2 },
  gugurGo: { font: '800 18px/1 var(--g4-font-display)', flex: 'none' },
  inviteCard: {
    background: 'var(--g4-surface)',
    border: '1.5px dashed var(--g4-text)',
    borderRadius: 'var(--g4-radius-card)',
    padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inviteTitle: { font: '700 13px/1.2 var(--g4-font-ui)' },
  inviteUrl: {
    font: '500 10px/1.3 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyPill: {
    appearance: 'none',
    border: 'none',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    font: '700 11px/1 var(--g4-font-ui)',
    padding: '8px 12px',
    borderRadius: 'var(--g4-radius-pill)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    flex: 'none',
  },
  muted: {
    font: '500 13px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    padding: '40px var(--g4-gutter)',
    textAlign: 'center',
  },
};
