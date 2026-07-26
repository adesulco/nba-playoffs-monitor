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
import { leagueDetail, listFixtures } from './api.js';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { LeaderboardRow, LockBadge } from './components/primitives4a.jsx';
import { IconChevronLeft, IconWhatsApp, IconCopy, IconCheck } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
    return <Shell><p style={S.muted}>{tx('Loading your grup…', 'Memuat grupmu…')}</p></Shell>;
  }
  if (!league) {
    return (
      <Shell>
        <p style={S.muted}>{tx('That grup no longer exists.', 'Grup itu sudah tidak ada.')}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SEO title={`${league.name} — grup Pick'em | gibol.co`} description={`Klasemen ${league.name} di gibol.co.`} noindex />

      {/* Ink header block */}
      <header style={S.inkHeader}>
        <div style={S.inkTop}>
          <button type="button" onClick={() => navigate('/pickem')} aria-label={tx('Back', 'Kembali')} style={S.iconBtnLight}>
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
          <Tile value={me ? me.points : '—'} label={tx('your points', 'poinmu')} />
          <Tile
            value={me ? me.exact_count ?? 0 : '—'}
            label={tx('exact scores', 'skor tepat')}
            accent="#6FCF8B"
          />
        </div>
      </header>

      <div style={S.body}>
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
              <LockBadge secondsLeft={secondsLeft} />
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

function Tile({ value, label, accent }) {
  return (
    <div style={S.tile}>
      <div style={{ ...S.tileValue, ...(accent ? { color: accent } : {}) }}>{value}</div>
      <div style={S.tileLabel}>{label}</div>
    </div>
  );
}

function Shell({ children }) {
  return <div style={S.shell}>{children}</div>;
}

const S = {
  shell: {
    minHeight: '100dvh',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)',
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 28,
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
