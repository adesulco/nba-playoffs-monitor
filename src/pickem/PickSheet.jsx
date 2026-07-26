/**
 * /pick/:fixtureId — pick sheet · R2 screen 2 (v0.83.0).
 *
 * The screen the whole loop is measured on: invite link → first confirmed
 * pick in ≤3 taps, ≤60 seconds, NO login wall, at 390×844. Pixel-faithful
 * to the #t4 pick sheet.
 *
 * How the tap budget is spent (from a /g/:code landing):
 *   tap 1 — "Gabung grup" on the invite landing lands here
 *   tap 2 — choose the winner (1 / X / 2)
 *   tap 3 — "Kunci pick"  → confirmed
 * Exact score and the ★ are deliberately OPTIONAL extras layered on top,
 * never gates: the winner alone is a complete, scoreable pick. That's what
 * keeps the floor at 3 taps while leaving depth for people who want it.
 *
 * Auth: none required. A signed-out visitor's picks go to guestStore
 * (device-keyed) and are claimed on first login via claimGuestPredictions.
 * The footer says so plainly rather than bouncing anyone to /login.
 *
 * Mechanics are frozen (handover 14 §3.6): ★ ×2 IS the existing jagoan
 * flag — the server clears any other jagoan on the same
 * (competition, matchday), so the client just sets the boolean. Exact
 * score is the existing Tebak Skor fields (picked_home / picked_away).
 * First-scorer and other prop picks are R6-parked: the question-card
 * pattern below leaves room for them without a redesign.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { listFixtures, upsertPrediction, listPredictions } from './api.js';
import { saveGuestPrediction, getGuestPrediction } from './guestStore.js';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { PickChip, LockBadge, formatCountdown } from './components/primitives4a.jsx';
import { IconChevronLeft, IconStar, IconCheck } from './components/icons4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';
import { evPick, evLockComplete, evFirstPick } from '../lib/pickemEvents.js';

/** Common football scorelines, home-perspective. Design shows 4 + "lainnya…". */
const QUICK_SCORES = [
  [2, 1], [1, 0], [2, 0], [1, 1],
];

export default function PickSheet() {
  return (
    <AuthProvider>
      <PickSheetInner />
    </AuthProvider>
  );
}

function PickSheetInner() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const inviteCode = params.get('invite') || '';

  const [fixture, setFixture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState(null);
  const [score, setScore] = useState(null); // [home, away] | null
  const [showAllScores, setShowAllScores] = useState(false);
  const [star, setStar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const landedAt = useRef(Date.now());
  const tapsRef = useRef(0);

  const competition = fixture?.league ? COMPETITIONS[fixture.league] : null;
  const skin = useMemo(
    () => skinForCompetition(fixture?.league, competition),
    [fixture?.league, competition]
  );

  // ─── Load the fixture + any prediction already made ───────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // No single-fixture read action exists and the seam rule forbids
      // adding one, so we pull a competition's fixture list (a cached GET,
      // usually already warm from the hub) and pick ours out. Callers pass
      // ?league= so that's ONE request; the sweep is only a fallback for a
      // bare deep link.
      const hint = params.get('league');
      const order = hint && COMPETITIONS[hint]
        ? [hint, ...Object.keys(COMPETITIONS).filter((k) => k !== hint)]
        : Object.keys(COMPETITIONS);
      let found = null;
      for (const key of order) {
        const res = await listFixtures({ league: key, limit: 500 });
        if (cancelled) return;
        const hit = (res?.fixtures || []).find((f) => f.id === fixtureId);
        if (hit) { found = hit; break; }
      }
      if (cancelled) return;
      setFixture(found);
      setLoading(false);

      if (!found) return;

      // Prefill: server prediction when signed in, guest store otherwise.
      if (user) {
        const res = await listPredictions({ competition: found.league, limit: 500 });
        const mine = (res?.predictions || []).find((p) => p.fixture_id === fixtureId);
        if (mine && !cancelled) {
          setOutcome(mine.picked_outcome ?? null);
          if (mine.picked_home != null && mine.picked_away != null) {
            setScore([mine.picked_home, mine.picked_away]);
          }
          setStar(!!mine.is_jagoan);
        }
      } else {
        const g = getGuestPrediction(fixtureId);
        if (g && !cancelled) {
          setOutcome(g.picked_outcome ?? null);
          if (g.picked_home != null && g.picked_away != null) setScore([g.picked_home, g.picked_away]);
          setStar(!!g.is_jagoan);
        }
      }
    })();
    return () => { cancelled = true; };
    // `params` is intentionally omitted: the league hint only matters on
    // first load, and including it would refetch on unrelated query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId, user]);

  // ─── Live lock countdown ──────────────────────────────────────────────
  const lockAtMs = fixture?.lock_at ? new Date(fixture.lock_at).getTime() : null;
  const secondsLeft = lockAtMs != null ? Math.max(0, Math.floor((lockAtMs - now) / 1000)) : null;
  const locked = fixture ? (fixture.status !== 'scheduled' || (secondsLeft != null && secondsLeft <= 0)) : false;

  useEffect(() => {
    if (locked || lockAtMs == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked, lockAtMs]);

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!fixture || !outcome || locked) return;
    setSaving(true);
    setError(null);

    const payload = {
      fixture_id: fixture.id,
      league: fixture.league,
      matchday: fixture.matchday,
      picked_outcome: outcome,
      is_jagoan: star,
      ...(score ? { picked_home: score[0], picked_away: score[1] } : {}),
    };

    if (user) {
      const res = await upsertPrediction(payload);
      setSaving(false);
      if (!res?.ok) {
        setError(
          res?.error === 'not_authenticated'
            ? tx('Please sign in again', 'Coba masuk lagi')
            : String(res?.error || tx('Could not save your pick', 'Gagal menyimpan pick'))
        );
        return;
      }
    } else {
      // No login wall: persist locally, claim on first sign-in.
      saveGuestPrediction(payload);
      setSaving(false);
    }

    setSaved(true);
    evPick({
      competition: fixture.league,
      format: score ? 'outcome+score' : 'outcome',
      hasJagoan: star,
    });
    // The funnel metric the R2 exit test is scored on.
    evFirstPick({
      tapsFromLanding: tapsRef.current,
      isGuest: !user,
      competition: fixture.league,
    });
    if (score) evLockComplete({ pickedN: 2, totalN: 2, competition: fixture.league });
  }, [fixture, outcome, score, star, locked, user, tx]);

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return <Shell><p style={S.muted}>{tx('Loading the match…', 'Memuat pertandingan…')}</p></Shell>;
  }

  if (!fixture) {
    return (
      <Shell>
        <p style={S.muted}>{tx('That match is no longer available.', 'Pertandingan itu sudah tidak tersedia.')}</p>
        <button type="button" onClick={() => navigate('/pickem')} style={S.ctaInk}>
          {tx('See all matches', 'Lihat semua pertandingan')}
        </button>
      </Shell>
    );
  }

  const home = fixture.home_team;
  const away = fixture.away_team;
  const kickoff = fixture.kickoff_at ? new Date(fixture.kickoff_at) : null;
  const kickoffLabel = kickoff
    ? kickoff.toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB', {
        weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      }).toUpperCase() + ' WIB'
    : '';

  // Options come from the skin, so Basket renders two and Bola three.
  const options = (skin.primaryLabels || []).map((o) => ({
    ...o,
    label: o.value === 'H' ? home : o.value === 'A' ? away : tx('Draw', 'Seri'),
  }));

  const scoresToShow = showAllScores
    ? [...QUICK_SCORES, [3, 0], [3, 1], [2, 2], [0, 0], [1, 2], [0, 1]]
    : QUICK_SCORES;

  const answered = (outcome ? 1 : 0) + (score ? 1 : 0);
  const totalQuestions = 2; // winner + exact score. Props are R6-parked.

  return (
    <Shell>
      <SEO
        title={`${home} vs ${away} — pick | gibol.co`}
        description={`Pick ${home} vs ${away} di gibol.co. Gratis — semua demi gengsi.`}
        noindex
      />

      {/* Header: back · title · live lock countdown */}
      <header style={S.header}>
        <button
          type="button"
          onClick={() => navigate(inviteCode ? `/g/${inviteCode}` : '/pickem')}
          aria-label={tx('Back', 'Kembali')}
          style={S.iconBtn}
        >
          <IconChevronLeft size={20} />
        </button>
        <span style={S.headerTitle}>
          {tx('Pick', 'Pick')} · {competition?.label || fixture.league}
        </span>
        <LockBadge secondsLeft={secondsLeft} locked={locked} />
      </header>

      {/* Match banner — 2px ink border, scarlet strip */}
      <div style={S.banner}>
        <div style={{ ...S.bannerStrip, background: skin.accent }}>
          <span>{stageLabel(fixture, lang)}</span>
          <span>{kickoffLabel}</span>
        </div>
        <div style={S.bannerTeams}>
          <span>{home}</span>
          <span style={S.vs}>{skin.key === 'basket' ? '@' : 'vs'}</span>
          <span>{away}</span>
        </div>
      </div>

      {/* Progress */}
      <div style={S.progressRow}>
        <span style={S.progressLabel}>
          {tx(`Pick ${answered} of ${totalQuestions}`, `Pick ${answered} dari ${totalQuestions}`)}
        </span>
        <div style={S.progressTrack}>
          <div
            style={{
              ...S.progressFill,
              width: `${(answered / totalQuestions) * 100}%`,
              background: skin.accent,
            }}
          />
        </div>
      </div>

      <div style={S.body}>
        {/* Q1 — winner. The only required answer. */}
        <section style={S.card}>
          <h2 style={S.q}>1 · {tx('Who wins?', 'Siapa yang menang?')}</h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={locked}
                aria-pressed={outcome === o.value}
                onClick={() => { tapsRef.current += 1; setOutcome(o.value); setSaved(false); }}
                style={{
                  ...S.outcomeBtn,
                  ...(locked
                    ? S.outcomeLocked
                    : outcome === o.value
                      ? { background: skin.accent, color: '#fff', border: `1.5px solid ${skin.accent}` }
                      : {}),
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* Q2 — exact score (Tebak Skor). Optional: opt-in, never a gate. */}
        <section style={S.card}>
          <h2 style={S.q}>
            2 · {tx('Exact score?', 'Skor akhir?')}{' '}
            <span style={S.optional}>{tx('optional', 'opsional')}</span>
          </h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {scoresToShow.map(([h, a]) => {
              const isSel = score && score[0] === h && score[1] === a;
              return (
                <PickChip
                  key={`${h}-${a}`}
                  state={locked ? 'locked' : isSel ? 'selected' : 'default'}
                  onClick={locked ? undefined : () => {
                    tapsRef.current += 1;
                    setScore(isSel ? null : [h, a]);
                    setSaved(false);
                  }}
                >
                  {h}–{a}
                </PickChip>
              );
            })}
            {!showAllScores && !locked && (
              <button type="button" onClick={() => setShowAllScores(true)} style={S.moreChip}>
                {tx('more…', 'lainnya…')}
              </button>
            )}
          </div>
          {score && !locked && (
            <p style={S.hint}>
              {tx(
                `${home} ${score[0]}–${score[1]} ${away}`,
                `${home} ${score[0]}–${score[1]} ${away}`
              )}
            </p>
          )}
        </section>

        {/* ★ card — the existing jagoan mechanic, new presentation. */}
        <section style={{ ...S.card, ...S.starCard }}>
          <div>
            <div style={S.starTitle}>
              <IconStar size={15} filled={star} /> {tx('Add your star?', 'Pasang bintang?')}
            </div>
            <div style={S.starMeta}>
              {tx(
                'Double points · one star per matchday',
                'Poin ×2 · satu bintang per matchday'
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={star}
            aria-label={tx('Add your star', 'Pasang bintang')}
            disabled={locked}
            onClick={() => { setStar((v) => !v); setSaved(false); }}
            style={{
              ...S.switch,
              background: star ? 'var(--g4-scarlet)' : 'rgba(255,255,255,.25)',
              cursor: locked ? 'default' : 'pointer',
            }}
          >
            <span style={{ ...S.switchKnob, left: star ? 23 : 3 }} />
          </button>
        </section>

        {error && <p style={S.error}>{error}</p>}
      </div>

      {/* Sticky footer CTA */}
      <footer style={S.footer}>
        {locked ? (
          <div style={{ ...S.cta, background: 'var(--g4-locked-chip-bg)', color: 'var(--g4-locked-chip-fg)' }}>
            {tx('Picks are locked', 'Pick sudah terkunci')}
          </div>
        ) : saved ? (
          <button
            type="button"
            // After a confirmed pick the payoff is seeing where you stand,
            // so land on the grup home rather than back on the invite.
            onClick={() => navigate(inviteCode ? `/grup/${inviteCode}` : '/pickem')}
            style={{ ...S.cta, background: 'var(--g4-win)' }}
          >
            <IconCheck size={17} /> {tx('Pick locked in', 'Pick kamu tersimpan')}
          </button>
        ) : (
          <button
            type="button"
            disabled={!outcome || saving}
            onClick={handleConfirm}
            style={{
              ...S.cta,
              background: outcome ? 'var(--g4-scarlet)' : 'var(--g4-locked-chip-bg)',
              color: outcome ? '#fff' : 'var(--g4-locked-chip-fg)',
              cursor: outcome && !saving ? 'pointer' : 'default',
            }}
          >
            {saving
              ? tx('Saving…', 'Menyimpan…')
              : !outcome
                ? tx('Choose a winner first', 'Pilih pemenang dulu')
                : score
                  ? tx('Lock my pick', 'Kunci pick')
                  : tx('Lock my pick → add a score?', 'Kunci pick → tambah skor?')}
          </button>
        )}
        {!user && (
          <p style={S.guestNote}>
            {tx(
              'No sign-up needed — your pick saves on this device and follows you when you join.',
              'Tanpa daftar — pickmu tersimpan di perangkat ini dan ikut waktu kamu gabung.'
            )}
          </p>
        )}
      </footer>
    </Shell>
  );
}

/** "SEMIFINAL 1" / "MATCHWEEK 3" / "GROUP · MD2" from the fixture row. */
function stageLabel(fixture, lang) {
  const s = String(fixture.stage || '').toLowerCase();
  const md = fixture.matchday;
  if (s === 'final') return lang === 'id' ? 'FINAL' : 'FINAL';
  if (s.startsWith('sf')) return lang === 'id' ? 'SEMIFINAL' : 'SEMIFINAL';
  if (s.startsWith('f-l')) return `FINAL ${s.slice(-2).toUpperCase()}`;
  if (s === 'qf') return lang === 'id' ? 'PEREMPAT FINAL' : 'QUARTERFINAL';
  if (s === 'r16') return lang === 'id' ? '16 BESAR' : 'ROUND OF 16';
  if (s === 'r32') return lang === 'id' ? '32 BESAR' : 'ROUND OF 32';
  if (s === '3rd') return lang === 'id' ? 'PEREBUTAN TEMPAT 3' : 'THIRD PLACE';
  if (s === 'regular') return lang === 'id' ? `PEKAN ${md}` : `MATCHWEEK ${md}`;
  return lang === 'id' ? `GRUP · MD${md}` : `GROUP · MD${md}`;
}

function Shell({ children }) {
  return (
    <div style={S.shell}>{children}</div>
  );
}

const S = {
  shell: {
    minHeight: '100dvh',
    background: 'var(--g4-bg)',
    color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 110, // room for the sticky footer
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '18px var(--g4-gutter) 10px',
  },
  iconBtn: {
    appearance: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--g4-text)',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
  },
  headerTitle: {
    font: '800 16px/1.2 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    flex: 1,
    textAlign: 'center',
  },
  banner: {
    margin: '4px var(--g4-gutter) 0',
    background: 'var(--g4-surface)',
    border: '2px solid var(--g4-text)',
    borderRadius: 'var(--g4-radius-card)',
    overflow: 'hidden',
  },
  bannerStrip: {
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 14px',
    font: '700 10px/1.3 var(--g4-font-ui)',
    letterSpacing: '0.3px',
  },
  bannerTeams: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    font: '800 21px/1.1 var(--g4-font-display)',
    letterSpacing: 'var(--g4-track-display)',
    gap: 8,
  },
  vs: { font: '600 11px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)', flex: 'none' },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px var(--g4-gutter) 4px',
  },
  progressLabel: { font: '700 11px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)', flex: 'none' },
  progressTrack: {
    flex: 1,
    height: 6,
    background: 'var(--g4-locked-chip-bg)',
    borderRadius: 'var(--g4-radius-pill)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 'var(--g4-radius-pill)', transition: 'width .18s ease' },
  body: {
    padding: '8px var(--g4-gutter) 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--g4-gap-card-sm)',
  },
  card: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)',
    padding: 'var(--g4-pad-card-sm) var(--g4-pad-card)',
  },
  q: {
    font: '800 14px/1.25 var(--g4-font-display)',
    color: 'var(--g4-text)',
    margin: 0,
  },
  optional: {
    font: '600 9px/1 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  outcomeBtn: {
    appearance: 'none',
    flex: 1,
    textAlign: 'center',
    padding: '11px 4px',
    borderRadius: 10,
    border: '1.5px solid var(--g4-text)',
    background: 'transparent',
    color: 'var(--g4-text)',
    font: '700 13px/1.2 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  outcomeLocked: {
    background: 'var(--g4-locked-chip-bg)',
    color: 'var(--g4-locked-chip-fg)',
    border: '1.5px solid transparent',
    cursor: 'default',
  },
  moreChip: {
    appearance: 'none',
    padding: '8px 14px',
    borderRadius: 'var(--g4-radius-pill)',
    border: '1.5px solid var(--g4-border)',
    background: 'transparent',
    color: 'var(--g4-text-muted)',
    font: '700 12px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  hint: { font: '600 10px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '7px 0 0' },
  starCard: {
    background: 'var(--g4-ink)',
    border: '1px solid var(--g4-ink)',
    color: 'var(--g4-paper)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  starTitle: {
    font: '800 14px/1.2 var(--g4-font-display)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  starMeta: { font: '500 11px/1.4 var(--g4-font-ui)', opacity: 0.7, marginTop: 2 },
  switch: {
    appearance: 'none',
    border: 'none',
    position: 'relative',
    width: 48,
    height: 28,
    borderRadius: 'var(--g4-radius-pill)',
    flex: 'none',
    transition: 'background .15s ease',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'var(--g4-paper)',
    transition: 'left .15s ease',
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 480,
    margin: '0 auto',
    padding: '12px var(--g4-gutter) 20px',
    background: 'var(--g4-bg)',
    borderTop: '1px solid var(--g4-border)',
    boxSizing: 'border-box',
  },
  cta: {
    appearance: 'none',
    border: 'none',
    width: '100%',
    borderRadius: 'var(--g4-radius-cta-lg)',
    padding: 15,
    font: '700 15px/1.2 var(--g4-font-ui)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    boxSizing: 'border-box',
  },
  ctaInk: {
    appearance: 'none',
    border: 'none',
    marginTop: 14,
    background: 'var(--g4-ink)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)',
    padding: '13px 22px',
    font: '700 14px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  guestNote: {
    font: '500 10px/1.4 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    textAlign: 'center',
    margin: '8px 0 0',
  },
  error: { font: '600 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-lose)', margin: 0 },
  muted: {
    font: '500 13px/1.5 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    padding: '40px var(--g4-gutter)',
    textAlign: 'center',
  },
};
