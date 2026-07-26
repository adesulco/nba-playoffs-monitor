/**
 * /g/:code — invite landing · R2 screen 1 (v0.83.0).
 *
 * The top of the growth loop: a WhatsApp link lands here, and the whole
 * job of this screen is to make joining feel like nothing. Public, no
 * auth, no login wall — pixel-faithful to the #t4 invite screen.
 *
 * Exit test for this screen: invite link → first confirmed pick in ≤3
 * taps, ≤60 seconds, no login wall, at 390×844. That's why the primary
 * CTA goes straight to the pick surface (tap 1) rather than to a signup
 * form; guest picks persist in guestStore and get claimed on first login
 * (see mergeGuest / claimGuestPredictions), so auth happens AFTER the
 * user is already invested.
 *
 * Data comes from the public league-detail action via the api.js seam —
 * real grup name, real member count, real standings-grade social proof
 * before signup, per the design's "see grup name + live leaderboard, no
 * signup wall" teach.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leagueDetail, listFixtures } from './api.js';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import Logo4a, { TAGLINE_SUPPORT } from './components/Logo4a.jsx';
import SEO from '../components/SEO.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { evInviteOpen } from '../lib/pickemEvents.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';

// Avatar palette — deterministic per member so a grup looks the same to
// everyone who opens the link.
const AVATAR_COLORS = ['#1E3FBB', '#7A2E8E', '#E07B00', '#1F7A3D', '#D92D1C', '#171310'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function InviteLanding() {
  // AuthProvider so the CTA can tell an existing session from a fresh
  // visitor — but the screen NEVER blocks on auth: a signed-out user sees
  // everything and can pick. Same wrapper pattern as Grup.jsx.
  return (
    <AuthProvider>
      <InviteLandingInner />
    </AuthProvider>
  );
}

function InviteLandingInner() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const [state, setState] = useState({ loading: true, league: null, members: [], error: null });
  // The next unlocked fixture — both the CTA target and the teaser line.
  const [nextFixture, setNextFixture] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // NB: invite codes are case-SENSITIVE mixed case (e.g. "QyAumSpv").
      // Never upper/lower-case them — that was the bug that made every
      // invite link 404 (see the fix commit for Grup/GrupJoin too).
      const res = await leagueDetail({ code: code.trim() });
      if (cancelled) return;
      if (res?.ok) {
        setState({ loading: false, league: res.league, members: res.members || [], error: null });
        evInviteOpen({ competition: res.league?.competition, hasAccount: !!user });
      } else {
        setState({ loading: false, league: null, members: [], error: res?.error || 'not_found' });
      }
    })();
    return () => { cancelled = true; };
  }, [code, user]);

  // Find the soonest fixture still open, so "Gabung grup" can land directly
  // on a pick sheet (tap 1 of 3) instead of a hub the visitor has to parse.
  useEffect(() => {
    const comp = state.league?.competition;
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
  }, [state.league?.competition]);

  const { loading, league, members, error } = state;
  const competition = league?.competition ? COMPETITIONS[league.competition] : null;
  const skin = useMemo(
    () => skinForCompetition(league?.competition, competition),
    [league?.competition, competition]
  );

  // Who's inviting: the owner's display name, which league-detail already
  // returns without exposing emails.
  const inviter = members.find((m) => m.is_owner)?.display_name;

  // Tap 1 of the ≤3-tap budget: straight into the pick sheet for the next
  // pickable match — no auth gate, no intermediate hub. The invite code
  // rides along so the pick surface can send them back here, and so the
  // grup join can be claimed alongside the pick on first login.
  function handleJoin() {
    if (nextFixture) {
      navigate(
        `/pick/${nextFixture.id}?league=${encodeURIComponent(league.competition)}` +
        `&invite=${encodeURIComponent(code)}`
      );
      return;
    }
    // Nothing open to pick (between matchdays) — fall back to the hub.
    navigate(
      league?.competition
        ? `/pickem?competition=${encodeURIComponent(league.competition)}`
        : '/pickem'
    );
  }

  if (loading) {
    return (
      <Shell>
        <Logo4a size={26} />
        <p style={S.muted}>{tx('Opening the invite…', 'Membuka undangan…')}</p>
      </Shell>
    );
  }

  if (error || !league) {
    return (
      <Shell>
        <SEO title="Undangan grup — gibol.co" description="Undangan grup Pick'em gibol.co" noindex />
        <Logo4a size={26} />
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={S.cardTitle}>
            {tx('This invite link is no longer valid', 'Link undangan ini sudah tidak berlaku')}
          </div>
          <p style={{ ...S.muted, marginTop: 8 }}>
            {tx(
              'Ask whoever invited you for a fresh link.',
              'Minta link baru ke yang mengundang kamu.'
            )}
          </p>
        </div>
        <Link to="/pickem" style={{ ...S.cta, textDecoration: 'none', display: 'block' }}>
          {tx('Explore Gibol', 'Lihat Gibol')}
        </Link>
      </Shell>
    );
  }

  const memberCount = league.member_count ?? members.length;
  const shown = members.slice(0, 3);
  const overflow = Math.max(0, memberCount - shown.length);

  return (
    <Shell>
      <SEO
        title={`${league.name} — undangan grup Pick'em | gibol.co`}
        description={
          inviter
            ? `${inviter} mengundang kamu ke ${league.name}. Gratis — semua demi gengsi.`
            : `Gabung ${league.name} di gibol.co. Gratis — semua demi gengsi.`
        }
      />

      <Logo4a size={26} />

      {/* Invite card — white, 2px ink border (canvas #t4) */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {shown.map((m, i) => (
            <span
              key={m.user_id}
              style={{
                ...S.avatar,
                background: avatarColor(m.user_id),
                marginLeft: i === 0 ? 0 : -10,
              }}
            >
              {(m.display_name || '?').charAt(0).toUpperCase()}
            </span>
          ))}
          {overflow > 0 && (
            <span
              style={{
                ...S.avatar,
                background: 'var(--g4-ink)',
                marginLeft: shown.length ? -10 : 0,
                fontSize: 11,
              }}
            >
              +{overflow}
            </span>
          )}
        </div>

        <div style={S.invitedBy}>
          {inviter
            ? tx(`${inviter} is inviting you to`, `${inviter} mengundang kamu ke`)
            : tx('You are invited to', 'Kamu diundang ke')}
        </div>
        <div style={S.grupName}>{league.name}</div>
        <div style={S.meta}>
          {tx(
            // EN pluralises; ID doesn't (anggota is number-neutral).
            `${memberCount} ${memberCount === 1 ? 'member' : 'members'} · ${competition?.labelLong || league.competition}`,
            `${memberCount} anggota · ${competition?.labelLong || league.competition}`
          )}
          {league.current_matchday ? tx(` · week ${league.current_matchday}`, ` · pekan ${league.current_matchday}`) : ''}
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          <span style={{ ...S.sportPill, background: skin.accentHex }}>
            {skin.label.toUpperCase()}
          </span>
        </div>
      </div>

      <button type="button" onClick={handleJoin} style={S.cta}>
        {tx('Join the grup — free', 'Gabung grup — gratis')}
      </button>

      {/* Prestige footer + first-pick teaser (canvas copy deck) */}
      <p style={S.footer}>
        {tx(
          'Win and you get bragging rights for a week. Lose and you are the running joke.',
          'Menang, dibanggakan seminggu. Kalah, jadi bahan bercandaan.'
        )}
        <br />
        {nextFixture ? (
          <span style={{ color: 'var(--g4-text-muted)' }}>
            {tx('Your first pick: ', 'Pick pertamamu: ')}
            {nextFixture.home_team} vs {nextFixture.away_team}
          </span>
        ) : (
          <span style={{ color: 'var(--g4-text-muted)' }}>{TAGLINE_SUPPORT}</span>
        )}
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--g4-bg)',
        color: 'var(--g4-text)',
        fontFamily: 'var(--g4-font-ui)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 28px',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

const S = {
  card: {
    marginTop: 26,
    background: 'var(--g4-surface)',
    border: '2px solid var(--g4-text)',
    borderRadius: 20,
    padding: '22px 20px',
    width: '100%',
    maxWidth: 420,
    boxSizing: 'border-box',
  },
  cardTitle: {
    font: '800 20px/1.15 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    color: 'var(--g4-text)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: '2px solid var(--g4-surface)',
    color: '#fff',
    font: '700 13px/1 var(--g4-font-ui)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
  },
  invitedBy: {
    font: '500 12px/1.4 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    marginTop: 14,
  },
  grupName: {
    font: '800 27px/1.05 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    color: 'var(--g4-text)',
    marginTop: 2,
  },
  meta: {
    font: '500 12px/1.4 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    marginTop: 4,
  },
  sportPill: {
    color: '#fff',
    font: '700 10px/1 var(--g4-font-ui)',
    padding: '5px 10px',
    borderRadius: 'var(--g4-radius-pill)',
  },
  cta: {
    appearance: 'none',
    border: 'none',
    marginTop: 22,
    width: '100%',
    maxWidth: 420,
    background: 'var(--g4-scarlet)',
    color: '#fff',
    borderRadius: 'var(--g4-radius-cta-lg)',
    padding: 16,
    font: '700 16px/1 var(--g4-font-ui)',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  footer: {
    marginTop: 10,
    font: '500 11px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    maxWidth: 420,
  },
  muted: {
    font: '500 13px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    marginTop: 16,
  },
};
