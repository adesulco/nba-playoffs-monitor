/**
 * /main — the Main root shell · R2 screen 4 (v0.83.0).
 *
 * Behind VITE_FLAG_PICKEM_HOME. R3 flips the flag so gibol.co root =
 * Main; until then this lives at /main and the SEO gateway keeps serving
 * /, so the traffic asset is untouched either way.
 *
 * Pixel-faithful to the #t4 beranda: header (logo block + Edisi Malam
 * date + avatar over a 2px ink rule), the "utang pick" hero, a "Malam
 * Ini" section of match cards, the grup summary card, and the bottom tab
 * bar.
 *
 * The hero is the whole point of this screen. It answers one question —
 * "what do I owe right now?" — - counted from real open fixtures against
 * real picks (server when signed in, guestStore otherwise), so it is
 * never a decorative number. Zero debts flips it to a calm confirmation
 * rather than hiding, because "you're all caught up" is also worth
 * knowing.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFixtures, listPredictions, listMyGrups } from './api.js';
import { listGuestPredictions } from './guestStore.js';
import { COMPETITIONS, defaultCompetitionKey } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { MatchCard, LockBadge } from './components/primitives4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { IconChevronRight } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { scheduledTheme } from '../lib/theme4a.js';
import SEO from '../components/SEO.jsx';

const AVATAR_COLORS = ['#1E3FBB', '#7A2E8E', '#E07B00', '#1F7A3D', '#D92D1C'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function MainShell() {
  return (
    <AuthProvider>
      <MainShellInner />
    </AuthProvider>
  );
}

function MainShellInner() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const competitionKey = defaultCompetitionKey();
  const competition = COMPETITIONS[competitionKey];
  const skin = useMemo(
    () => skinForCompetition(competitionKey, competition),
    [competitionKey, competition]
  );

  const [openFixtures, setOpenFixtures] = useState([]);
  const [pickedIds, setPickedIds] = useState(() => new Set());
  const [grups, setGrups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listFixtures({ league: competitionKey, status: 'scheduled', limit: 500 });
      if (cancelled) return;
      const nowMs = Date.now();
      const open = (res?.fixtures || [])
        .filter((f) => new Date(f.lock_at || f.kickoff_at).getTime() > nowMs)
        .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
      setOpenFixtures(open);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [competitionKey]);

  // What have I already picked? Server when signed in, device otherwise —
  // the hero count has to be true for guests too, since a guest is exactly
  // who lands here first from an invite.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        const res = await listPredictions({ competition: competitionKey, limit: 500 });
        if (cancelled) return;
        setPickedIds(new Set((res?.predictions || []).map((p) => p.fixture_id)));
      } else {
        setPickedIds(new Set(listGuestPredictions(competitionKey).map((p) => p.fixture_id)));
      }
    })();
    return () => { cancelled = true; };
  }, [user, competitionKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await listMyGrups();
      if (!cancelled && res?.ok) setGrups(res.grups || []);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const nextFixture = openFixtures[0] || null;

  // "Utang pick" is a DEBT DUE NOW, so it counts only the earliest open
  // matchday — not every unpicked fixture left in the season. Counting the
  // whole tournament produced "16 picks still missing" on day one of AFF,
  // which is both unachievable-feeling and unchanged for weeks; the design's
  // "3 pick belum masuk" is a matchday-sized number you can actually clear.
  const currentMatchday = nextFixture?.matchday ?? null;
  const unpicked = openFixtures.filter(
    (f) => f.matchday === currentMatchday && !pickedIds.has(f.id)
  );
  const lockMs = nextFixture?.lock_at ? new Date(nextFixture.lock_at).getTime() : null;
  const secondsLeft = lockMs != null ? Math.max(0, Math.floor((lockMs - now) / 1000)) : null;

  // "Malam Ini" — everything locking inside the next 24h. Falls back to the
  // soonest few so the section is never empty between matchdays.
  const tonight = useMemo(() => {
    const cutoff = now + 24 * 3600 * 1000;
    const soon = openFixtures.filter((f) => new Date(f.kickoff_at).getTime() <= cutoff);
    return (soon.length ? soon : openFixtures).slice(0, 4);
  }, [openFixtures, now]);

  const primaryGrup = grups[0] || null;
  const isNight = scheduledTheme() === 'dark';
  const dateLabel = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta',
  });

  function goPick(f) {
    navigate(`/pick/${f.id}?league=${encodeURIComponent(competitionKey)}`);
  }

  return (
    <div style={S.shell}>
      <SEO
        title="Main — Pick'em | gibol.co"
        description="Pick pertandingan, lihat klasemen grupmu, semua demi gengsi."
        noindex
      />

      {/* Header — logo + Edisi Malam · date + avatar, over a 2px ink rule */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <Logo4a size={12} />
          <span style={S.headerTitle}>
            {isNight ? tx('Edisi Malam', 'Edisi Malam') : tx('Today', 'Hari ini')} · {dateLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(user ? '/pickem/profile' : '/login?next=/main')}
          aria-label={tx('Your profile', 'Profilmu')}
          style={S.avatar}
        >
          {user ? (user.email || 'A').charAt(0).toUpperCase() : '?'}
        </button>
      </header>

      <div style={S.body}>
        {/* Utang-pick hero */}
        {loading ? (
          <div style={{ ...S.hero, padding: 18 }}>
            <p style={S.muted}>{tx('Loading…', 'Memuat…')}</p>
          </div>
        ) : unpicked.length > 0 ? (
          <div style={S.hero}>
            <div style={{ ...S.heroStrip, background: skin.accent }}>
              <span>
                {tx('PICKS DUE', 'UTANG PICK')} · {(competition?.label || competitionKey).toUpperCase()}
              </span>
              {secondsLeft != null && <LockBadge secondsLeft={secondsLeft} style={S.heroLock} />}
            </div>
            <div style={S.heroBody}>
              <div style={S.heroLine}>
                {tx(
                  `${unpicked.length} pick${unpicked.length === 1 ? '' : 's'}\nstill missing`,
                  `${unpicked.length} pick\nbelum masuk`
                )}
              </div>
              {nextFixture && (
                <p style={S.heroMeta}>
                  {nextFixture.home_team} vs {nextFixture.away_team}
                  {primaryGrup ? ` — ${primaryGrup.name}` : ''}
                </p>
              )}
              <button type="button" onClick={() => goPick(unpicked[0])} style={S.heroCta}>
                {tx('Pick now →', 'Pick sekarang →')}
              </button>
            </div>
          </div>
        ) : (
          <div style={S.heroCalm}>
            <div style={S.heroCalmTitle}>
              {openFixtures.length === 0
                ? tx('Nothing to pick yet', 'Belum ada yang bisa dipick')
                : tx('All picks are in', 'Semua pick udah masuk')}
            </div>
            <p style={S.heroCalmMeta}>
              {openFixtures.length === 0
                ? tx('The next matchday will show up here.', 'Matchday berikutnya muncul di sini.')
                : tx('Nice. Now go trash-talk the group.', 'Mantap. Sekarang saatnya nyindir grup.')}
            </p>
          </div>
        )}

        {/* Malam Ini */}
        {tonight.length > 0 && (
          <>
            <div style={S.sectionRule}>
              <span style={S.sectionTitle}>
                {isNight ? tx('Tonight', 'Malam Ini') : tx('Coming up', 'Berikutnya')}
              </span>
              <span style={S.sectionMeta}>
                {tx(
                  `${tonight.length} event${tonight.length === 1 ? '' : 's'}`,
                  `${tonight.length} event`
                )}
              </span>
            </div>
            {tonight.map((f) => (
              <MatchCard
                key={f.id}
                skin={skin}
                eyebrow={`● ${(competition?.label || '').toUpperCase()} · MD${f.matchday}`}
                timeLabel={new Date(f.kickoff_at).toLocaleTimeString(
                  lang === 'id' ? 'id-ID' : 'en-GB',
                  { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }
                ) + ' WIB'}
                homeTeam={f.home_team}
                awayTeam={f.away_team}
                separator={skin.key === 'basket' ? '@' : 'vs'}
                options={skin.primaryLabels}
                selected={null}
                // Tapping any option opens the sheet with the full question
                // set rather than saving a half-pick from the feed.
                onSelect={() => goPick(f)}
                onToggleStar={() => goPick(f)}
                style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
              />
            ))}
          </>
        )}

        {/* Grup summary */}
        {primaryGrup && (
          <button
            type="button"
            onClick={() => navigate(`/grup/${primaryGrup.invite_code}`)}
            style={S.grupCard}
          >
            <span
              style={{
                ...S.grupAvatar,
                background: avatarColor(primaryGrup.id || primaryGrup.name),
              }}
            >
              {(primaryGrup.name || '?').charAt(0).toUpperCase()}
            </span>
            <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <span style={S.grupName}>{primaryGrup.name}</span>
              <span style={S.grupMeta}>
                {primaryGrup.my_rank
                  ? tx(`Rank #${primaryGrup.my_rank}`, `Peringkat #${primaryGrup.my_rank}`)
                  : tx('View standings', 'Lihat klasemen')}
                {primaryGrup.member_count
                  ? tx(` · ${primaryGrup.member_count} members`, ` · ${primaryGrup.member_count} anggota`)
                  : ''}
              </span>
            </span>
            <IconChevronRight size={18} />
          </button>
        )}

        {!user && (
          <p style={S.guestNote}>
            {tx(
              'Picking works without an account — sign in when you want to join a grup.',
              'Pick bisa tanpa akun — masuk kalau mau gabung grup.'
            )}
          </p>
        )}
      </div>

      <TabBar4a active="main" grupCode={primaryGrup?.invite_code} lang={lang} />
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
    padding: '14px var(--g4-gutter) 10px',
    borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)',
    margin: '0 var(--g4-gutter)',
    paddingLeft: 0,
    paddingRight: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: {
    font: '800 14px/1.2 var(--g4-font-display)',
    letterSpacing: '-0.3px',
  },
  avatar: {
    appearance: 'none',
    border: 'none',
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    font: '700 12px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  body: {
    padding: '12px var(--g4-gutter) 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--g4-gap-card)',
  },
  hero: {
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
    font: '800 11px/1.2 var(--g4-font-display)',
    letterSpacing: '0.5px',
  },
  heroLock: { background: 'var(--g4-ink)', color: 'var(--g4-paper)' },
  heroBody: { padding: '14px 14px 12px' },
  heroLine: {
    font: '800 28px/1.02 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    whiteSpace: 'pre-line',
  },
  heroMeta: {
    font: '500 12px/1.4 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    margin: '6px 0 0',
  },
  heroCta: {
    appearance: 'none',
    border: 'none',
    display: 'block',
    width: '100%',
    marginTop: 12,
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)',
    padding: 13,
    font: '700 14px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  heroCalm: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-hero)',
    padding: '16px 16px 14px',
  },
  heroCalmTitle: {
    font: '800 20px/1.1 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
  },
  heroCalmMeta: {
    font: '500 12px/1.45 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    margin: '6px 0 0',
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
  grupCard: {
    appearance: 'none',
    border: 'none',
    width: '100%',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-card)',
    padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  grupAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    color: '#fff',
    font: '700 10px/1 var(--g4-font-ui)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
  },
  grupName: { display: 'block', font: '700 13px/1.2 var(--g4-font-ui)' },
  grupMeta: { display: 'block', font: '500 10px/1.3 var(--g4-font-ui)', opacity: 0.7, marginTop: 2 },
  guestNote: {
    font: '500 11px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    textAlign: 'center',
    margin: 0,
  },
  muted: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
};
