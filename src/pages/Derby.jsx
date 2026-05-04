import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SEO from '../components/SEO.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ShareButton from '../components/ShareButton.jsx';
import {
  DERBY_SLUG,
  DERBY_NAME,
  DERBY_TAGLINE,
  DERBY_SIDES,
  H2H_PROFESIONAL,
  LAST_FIVE_MEETINGS,
  ICONIC_MOMENTS,
  REACTION_EMOJIS,
  REACTION_LABELS,
  ONELINER_BLOCKLIST,
  ONELINER_MAX_LEN,
  FAQ,
} from '../lib/sports/liga-1-id/derby.js';
import { useDerbyState } from '../hooks/useDerbyState.js';
import { useDerbyNextFixture } from '../hooks/useDerbyNextFixture.js';
import { useSuperLeagueClubSquad } from '../hooks/useSuperLeagueClubSquad.js';

/**
 * /derby/persija-persib — El Clasico Indonesia landing page.
 *
 * v0.15.0. Top-of-funnel SEO + fan-engagement page for the biggest
 * derby in Indonesian football. Built sport-generic (DERBY_SLUG +
 * DERBY_SIDES) so a future Persib-Persija mirror page or, eventually,
 * a Lakers-Celtics version can reuse the same shape.
 *
 * Sections (top to bottom):
 *   1. Hero + countdown to next meeting + side picker
 *   2. Live next-match panel (API-Football)
 *   3. All-time head-to-head card
 *   4. Last-5 meetings strip
 *   5. Polling (4 polls, optimistic UI, anonymous voter_hash)
 *   6. Reaction wall (6 emojis + fan one-liners, profanity-filtered)
 *   7. Side-by-side squad showdown (reuses useSuperLeagueClubSquad)
 *   8. Stadiums + fanbase context
 *   9. Iconic moments timeline
 *  10. Trophies cabinet
 *  11. JSON-LD SportsEvent + FAQ schema
 */

const PERSIJA = DERBY_SIDES.persija;
const PERSIB = DERBY_SIDES.persib;

// ---------------------------------------------------------------------
// Utilities — countdown, formatters
// ---------------------------------------------------------------------
function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { days, hours, mins, secs, expired: false };
}

function fmtDateID(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtTimeID(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}

// ---------------------------------------------------------------------
// SidePicker — sticky-ish toggle that tints accents per allegiance
// ---------------------------------------------------------------------
const SIDE_KEY = 'gibol.derby.side';

function useDerbySide() {
  const [side, setSide] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage.getItem(SIDE_KEY) || null; } catch { return null; }
  });
  const choose = (s) => {
    setSide(s);
    try { window.localStorage.setItem(SIDE_KEY, s); } catch { /* ignore */ }
  };
  return [side, choose];
}

// ---------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------
/**
 * <Hero> — derby landing hero.
 *
 * v0.19.5 Phase 2 Sprint E reshape (per directive §4 + revised
 * task list at §0.5 calling this out as "RESHAPE, not new build —
 * engagement layer OFF-LIMITS"):
 *   1. Countdown is the LEAD element (above eyebrow). Was below
 *      tagline; promoting it to the top makes the urgency the
 *      first thing fans see, which is the entire point of the
 *      page two weeks before the JIS derby.
 *   2. h1 uses the locked .derby-h1 class (32 mobile / 48 tablet /
 *      56 desktop) instead of clamp(28, 6vw, 48). Fixes tablet
 *      undershoot + desktop ceiling.
 *   3. Side-picker chips render with .show-desktop-only inside the
 *      hero on desktop. On mobile they appear BELOW the H2H strip
 *      via a separate <SidePickerMobile> mounted lower in the
 *      page (controlled by .show-mobile-only).
 *
 * Untouched (per protected-surfaces constraint):
 *   - Hook layer (useDerbyState, useDerbyNextFixture) — unchanged
 *   - Supabase engagement schema, /api/derby endpoints — unchanged
 *   - JSON-LD SportsEvent + FAQPage — unchanged
 *   - Polling, reactions, oneliners components — untouched below
 */
function Hero({ next, nextLoading, side, onPickSide }) {
  const cd = useCountdown(next?.fixture?.date || null);
  return (
    <section style={{
      borderRadius: 16,
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${PERSIJA.accent}33 0%, ${PERSIB.accent}33 100%)`,
      border: `1px solid ${C.line}`,
      padding: '28px 20px',
      marginBottom: 16,
    }}>
      {/* 1. Countdown — leads the hero. */}
      {next && cd && !cd.expired && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'hari', value: cd.days },
            { label: 'jam', value: cd.hours },
            { label: 'menit', value: cd.mins },
            { label: 'detik', value: cd.secs },
          ].map((c) => (
            <div key={c.label} style={{
              minWidth: 64,
              padding: '10px 12px',
              background: C.panel2,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {String(c.value).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Eyebrow — sits BELOW the countdown now (was above). */}
      <div style={{ fontSize: 11, letterSpacing: 1.4, fontWeight: 700, color: C.amber, textTransform: 'uppercase' }}>
        Derby No. 1 Indonesia
      </div>

      {/* 3. h1 — locked Display token via .derby-h1 (32/48/56). */}
      <h1
        className="derby-h1"
        style={{
          margin: '6px 0 8px',
          color: C.text,
        }}
      >
        {DERBY_NAME}
      </h1>

      {/* 4. Tagline. */}
      <div style={{ fontSize: 14, color: C.dim, marginBottom: 18, maxWidth: 640 }}>
        {DERBY_TAGLINE}. Sejak 1933, dua klub paling bersejarah Indonesia ini ketemu lagi 10 Mei 2026 di JIS.
      </div>

      {nextLoading && (
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 18 }}>Mencari jadwal derby berikutnya…</div>
      )}

      {/* 5. Side-picker — DESKTOP ONLY inside the hero. Mobile copy
             lives below the H2H section (see <SidePickerMobile/>). */}
      <div className="show-desktop-only">
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 8, fontWeight: 600 }}>
          Pilih sisi kamu — tampilan jadi sesuai warna klub:
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SideButton side={PERSIJA} active={side === 'persija'} onClick={() => onPickSide('persija')} />
          <SideButton side={PERSIB} active={side === 'persib'} onClick={() => onPickSide('persib')} />
          <button
            type="button"
            onClick={() => onPickSide('neutral')}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: side === 'neutral' ? C.text : 'transparent',
              color: side === 'neutral' ? C.bg : C.dim,
              border: `1px solid ${C.line}`,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Netral
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * <SidePickerMobile> — derby side-picker rendered BELOW the H2H
 * strip on mobile only (per directive §4: "Side-picker chips
 * become a horizontal scroll below the H2H strip on mobile").
 *
 * v0.19.5 Phase 2 Sprint E. Same buttons + state + side accents
 * as the desktop copy in <Hero>; just a different parent + a
 * horizontal-scroll affordance to fit narrow viewports.
 */
function SidePickerMobile({ side, onPickSide }) {
  return (
    <section
      className="show-mobile-only"
      style={{
        marginBottom: 12,
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8, fontWeight: 600 }}>
        Pilih sisi kamu — tampilan jadi sesuai warna klub:
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
          scrollSnapType: 'x mandatory',
        }}
      >
        <SideButton side={PERSIJA} active={side === 'persija'} onClick={() => onPickSide('persija')} />
        <SideButton side={PERSIB} active={side === 'persib'} onClick={() => onPickSide('persib')} />
        <button
          type="button"
          onClick={() => onPickSide('neutral')}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            background: side === 'neutral' ? C.text : 'transparent',
            color: side === 'neutral' ? C.bg : C.dim,
            border: `1px solid ${C.line}`,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flex: '0 0 auto',
            scrollSnapAlign: 'start',
          }}
        >
          Netral
        </button>
      </div>
    </section>
  );
}

function SideButton({ side, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        background: active ? side.accent : 'transparent',
        color: active ? '#fff' : C.text,
        border: `1px solid ${active ? side.accent : C.line}`,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: active ? `0 0 0 4px ${side.accent}33` : 'none',
        transition: 'background 120ms, box-shadow 120ms',
      }}
    >
      {side.nickname}
    </button>
  );
}

// ---------------------------------------------------------------------
// Next match panel
// ---------------------------------------------------------------------
function NextMatchPanel({ next }) {
  if (!next) return null;
  const date = next.fixture.date;
  const venue = next.fixture?.venue?.name || '—';
  const city = next.fixture?.venue?.city || '';
  return (
    <Card title="Pertandingan berikutnya">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <TeamCrest name={next.teams.home.name} logo={next.teams.home.logo} accent={accentForTeam(next.teams.home.name)} />
        <div style={{ flex: 1, textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, letterSpacing: 1.2 }}>VS</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 6 }}>{fmtDateID(date)}</div>
          <div style={{ fontSize: 12, color: C.dim }}>{fmtTimeID(date)}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{venue}{city ? `, ${city}` : ''}</div>
        </div>
        <TeamCrest name={next.teams.away.name} logo={next.teams.away.logo} accent={accentForTeam(next.teams.away.name)} align="right" />
      </div>
    </Card>
  );
}

function accentForTeam(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('persija')) return PERSIJA.accent;
  if (n.includes('persib')) return PERSIB.accent;
  return C.dim;
}

function TeamCrest({ name, logo, accent, align = 'left' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
      {logo ? (
        <img src={logo} alt={name} width={48} height={48} style={{ objectFit: 'contain' }} loading="lazy" />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          background: accent, display: 'grid', placeItems: 'center',
          fontWeight: 800, color: '#fff', fontSize: 18,
        }}>
          {name?.[0] || '?'}
        </div>
      )}
      <div style={{ fontWeight: 700, color: C.text, fontSize: 14, textAlign: align }}>{name}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// H2H card + last-5 strip
// ---------------------------------------------------------------------
function HeadToHead() {
  const h = H2H_PROFESIONAL;
  const total = h.totalMatches;
  const pct = (n) => Math.round((n / total) * 100);
  return (
    <Card title="Head-to-head sepanjang masa (era profesional)" footer={`Diperbaharui ${fmtDateID(h.lastUpdated)}. Mencakup Liga Indonesia, Liga 1, Piala Indonesia, dan Piala Menpora.`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <Stat label={PERSIJA.nickname} value={h.persijaWins} suffix={`menang • ${pct(h.persijaWins)}%`} accent={PERSIJA.accent} />
        <Stat label="Imbang" value={h.draws} suffix={`${pct(h.draws)}%`} accent={C.dim} center />
        <Stat label={PERSIB.nickname} value={h.persibWins} suffix={`menang • ${pct(h.persibWins)}%`} accent={PERSIB.accent} alignRight />
      </div>

      {/* visual W/D/L bar */}
      <div style={{
        display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden',
        border: `1px solid ${C.line}`, marginBottom: 12,
      }}>
        <div style={{ flex: h.persijaWins, background: PERSIJA.accent }} />
        <div style={{ flex: h.draws, background: C.lineSoft }} />
        <div style={{ flex: h.persibWins, background: PERSIB.accent }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, marginBottom: 8 }}>
        <MiniMetric label="Total laga" value={total} />
        <MiniMetric label={`Gol ${PERSIJA.nickname}`} value={h.persijaGoals} />
        <MiniMetric label={`Gol ${PERSIB.nickname}`} value={h.persibGoals} />
      </div>

      <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: '4px 0 0', color: C.dim, fontSize: 13, lineHeight: 1.55 }}>
        {h.notableStreaks.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </Card>
  );
}

function Stat({ label, value, suffix, accent, alignRight, center }) {
  return (
    <div style={{ textAlign: center ? 'center' : alignRight ? 'right' : 'left' }}>
      <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: accent, lineHeight: 1, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{suffix}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 8, background: C.panel2, border: `1px solid ${C.line}`,
    }}>
      <div style={{ fontSize: 10, color: C.dim, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function LastFiveMeetings() {
  return (
    <Card title="5 pertemuan terakhir">
      <div style={{ display: 'grid', gap: 8 }}>
        {LAST_FIVE_MEETINGS.map((m, i) => {
          const winner = m.homeGoals > m.awayGoals ? m.home : m.awayGoals > m.homeGoals ? m.away : null;
          const accent = winner ? DERBY_SIDES[winner].accent : C.line;
          return (
            <div key={m.date + i} style={{
              padding: 10, borderRadius: 10,
              background: C.panel2,
              borderLeft: `3px solid ${accent}`,
              border: `1px solid ${C.line}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {DERBY_SIDES[m.home].name} <span style={{ color: C.amber, margin: '0 6px' }}>{m.homeGoals}–{m.awayGoals}</span> {DERBY_SIDES[m.away].name}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>{fmtDateID(m.date)} • {m.venue}</div>
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{m.competition} — {m.note}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------
function PollsSection({ polls, myPicks, onVote, schemaReady, side }) {
  if (!schemaReady) {
    return (
      <Card title="Polling">
        <div style={{ fontSize: 13, color: C.dim }}>
          Polling fan segera dibuka. Lagi nyiapin tabelnya — cek lagi nanti.
        </div>
      </Card>
    );
  }
  if (!polls.length) {
    return (
      <Card title="Polling">
        <div style={{ fontSize: 13, color: C.dim }}>Belum ada polling aktif.</div>
      </Card>
    );
  }
  return (
    <Card title="Polling — siapa menang? skor berapa? GOAT siapa?">
      <div style={{ display: 'grid', gap: 16 }}>
        {polls.map((p) => (
          <Poll key={p.id} poll={p} mine={myPicks[p.id]} onVote={onVote} side={side} />
        ))}
      </div>
    </Card>
  );
}

function Poll({ poll, mine, onVote, side }) {
  const total = Object.values(poll.votes || {}).reduce((s, n) => s + (n || 0), 0);
  // v0.21.0 — the score poll gets a share-prediction CTA when the
  // user has voted. The share-card OG endpoint at /api/og-derby
  // takes ?score= directly from the option id (e.g. "2-1") so the
  // unfurl on WhatsApp / X / IG shows their pick. Other polls
  // don't get the CTA — only the score poll yields a share-able
  // prediction card.
  const isScorePoll = /-score-/.test(poll.id);
  const showSharePrediction = isScorePoll && mine && /^[0-9]-[0-9]$/.test(mine);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{poll.question}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {poll.options.map((opt) => {
          const v = poll.votes?.[opt.id] || 0;
          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
          const isMine = mine === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(poll.id, opt.id)}
              style={{
                position: 'relative', overflow: 'hidden',
                padding: '10px 12px', borderRadius: 10,
                background: C.panel2, border: `1px solid ${isMine ? C.amber : C.line}`,
                color: C.text, fontSize: 13, fontWeight: 600, textAlign: 'left',
                cursor: 'pointer', transition: 'border-color 120ms',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, width: `${pct}%`,
                background: isMine ? `${C.amber}33` : `${C.lineSoft}77`, transition: 'width 220ms',
              }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{isMine ? '✓ ' : ''}{opt.label}</span>
                <span style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{pct}% • {v}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
        Total {total} suara. {poll.expiresAt ? `Polling tutup ${fmtDateID(poll.expiresAt)}.` : 'Polling abadi.'}
      </div>
      {showSharePrediction && <SharePredictionButton score={mine} side={side} />}
    </div>
  );
}

/**
 * <SharePredictionButton> — appears below the score poll once the
 * user has picked a score. Builds an OG-image-baked share URL,
 * triggers `navigator.share` (or clipboard fallback), and tracks
 * the event for the growth-track analytics.
 *
 * v0.21.0. The OG URL points at /api/og-derby with the user's
 * score + side baked in. WhatsApp / X / IG / FB unfurl will
 * fetch the OG image, which means the recipient sees the
 * prediction card in the share preview — that's the entire
 * virality lever.
 */
function SharePredictionButton({ score, side }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const ogUrl = useMemo(() => {
    const params = new URLSearchParams({ score });
    if (side && side !== 'neutral') params.set('side', side);
    return `https://www.gibol.co/api/og-derby?${params.toString()}`;
  }, [score, side]);

  // The deep-link URL — when shared, this is what the recipient
  // clicks. We pass ?prediction= so the destination page can
  // render the same OG image in its <meta og:image> if the
  // recipient unfurls it again.
  const shareUrl = useMemo(() => {
    const params = new URLSearchParams({ prediction: score });
    if (side && side !== 'neutral') params.set('side', side);
    return `https://www.gibol.co/derby/persija-persib?${params.toString()}`;
  }, [score, side]);

  const sideLabel = side === 'persija' ? 'Jakmania'
                  : side === 'persib'  ? 'Bobotoh'
                  : null;
  const text = sideLabel
    ? `${sideLabel} family — Persija ${score.replace('-', '–')} Persib. Prediksi gue derby 10 Mei 2026 di JIS.`
    : `Prediksi gue derby Persija vs Persib 10 Mei 2026 di JIS — ${score.replace('-', '–')}.`;

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'El Clasico Indonesia — Prediksi gue',
          text,
          url: shareUrl,
        });
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'derby_share_prediction', { method: 'native', score, side: side || 'neutral' });
        }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'derby_share_prediction', { method: 'clipboard', score, side: side || 'neutral' });
        }
      }
    } catch {
      /* user cancelled native share — not an error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${PERSIJA.accent}1A 0%, ${PERSIB.accent}1A 100%)`,
        border: `1px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.2 }}>
          🎯 Prediksi gue: <span style={{ color: C.amber }}>Persija {score.replace('-', '–')} Persib</span>
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
          Tap "Bagikan" — share card otomatis muncul di WhatsApp / X / IG.
        </div>
      </div>
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          background: done ? C.green : C.amber,
          color: '#000',
          border: 'none',
          fontWeight: 800,
          fontSize: 13,
          cursor: busy ? 'wait' : 'pointer',
          letterSpacing: 0.2,
          flexShrink: 0,
          transition: 'background 160ms',
        }}
      >
        {done ? '✓ Tersalin' : busy ? '...' : '↗ Bagikan'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Reactions + oneliner wall
// ---------------------------------------------------------------------
function ReactionWall({ reactions, myReactions, oneliners, onReact, onPostOneliner, side, schemaReady }) {
  return (
    <Card title="Wall reaksi & teriakan suporter">
      {!schemaReady && (
        <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>
          Wall reaksi segera dibuka.
        </div>
      )}

      {/* emoji bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {REACTION_EMOJIS.map((e) => {
          const c = reactions[e] || 0;
          const mine = myReactions.includes(e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => onReact(e)}
              disabled={!schemaReady}
              style={{
                padding: '8px 12px', borderRadius: 999,
                background: mine ? `${C.amber}22` : C.panel2,
                border: `1px solid ${mine ? C.amber : C.line}`,
                color: C.text, fontSize: 14, fontWeight: 700,
                cursor: schemaReady ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>{REACTION_LABELS[e]}</span>
              <span style={{ color: C.dim, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{c}</span>
            </button>
          );
        })}
      </div>

      <OnelinerComposer onPost={onPostOneliner} side={side} disabled={!schemaReady} />

      {/* visible oneliners */}
      <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
        {oneliners.length === 0 && schemaReady && (
          <div style={{ fontSize: 12, color: C.dim }}>Belum ada teriakan. Jadi yang pertama.</div>
        )}
        {oneliners.map((o) => {
          const accent = o.side === 'persija' ? PERSIJA.accent : o.side === 'persib' ? PERSIB.accent : C.dim;
          const label = o.side === 'persija' ? 'Jakmania' : o.side === 'persib' ? 'Bobotoh' : 'Netral';
          return (
            <div key={o.id} style={{
              padding: '8px 10px', borderRadius: 8,
              background: C.panel2, border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${accent}`,
              fontSize: 13, color: C.text,
              display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline',
            }}>
              <div style={{ flex: 1, wordBreak: 'break-word' }}>{o.text}</div>
              <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', flexShrink: 0 }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OnelinerComposer({ onPost, side, disabled }) {
  const [text, setText] = useState('');
  const [postedSide, setPostedSide] = useState(side === 'persija' || side === 'persib' ? side : 'neutral');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Sync default side with global picker.
  useEffect(() => {
    if (side === 'persija' || side === 'persib') setPostedSide(side);
  }, [side]);

  const localBlocked = useMemo(() => {
    const lower = text.toLowerCase();
    return ONELINER_BLOCKLIST.some((bad) => new RegExp(`(^|[^a-z])${bad}([^a-z]|$)`, 'i').test(lower));
  }, [text]);

  async function submit(e) {
    e?.preventDefault?.();
    if (!text.trim() || busy || disabled) return;
    if (localBlocked) { setErr('Ada kata yang ga lolos filter. Coba ganti.'); return; }
    setBusy(true); setErr(null);
    const r = await onPost({ side: postedSide, text: text.trim() });
    setBusy(false);
    if (r.ok) {
      setText('');
    } else if (r.error === 'rate_limited') {
      setErr('Tunggu 60 detik sebelum kirim teriakan lagi.');
    } else if (r.error === 'blocked_profanity') {
      setErr('Ada kata yang ga lolos filter. Coba ganti.');
    } else {
      setErr('Gagal kirim. Coba lagi.');
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        {[
          { id: 'persija', label: 'Jakmania', color: PERSIJA.accent },
          { id: 'persib', label: 'Bobotoh', color: PERSIB.accent },
          { id: 'neutral', label: 'Netral', color: C.dim },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPostedSide(s.id)}
            disabled={disabled}
            style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: postedSide === s.id ? s.color : 'transparent',
              color: postedSide === s.id ? '#fff' : C.dim,
              border: `1px solid ${postedSide === s.id ? s.color : C.line}`,
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, ONELINER_MAX_LEN))}
          placeholder='Kirim teriakan singkat (maks 80 karakter, no toxic)…'
          disabled={disabled || busy}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            background: C.bg, color: C.text, border: `1px solid ${C.line}`,
            fontSize: 13, fontFamily: 'inherit',
          }}
          maxLength={ONELINER_MAX_LEN}
        />
        <button
          type="submit"
          disabled={disabled || busy || !text.trim() || localBlocked}
          style={{
            padding: '10px 14px', borderRadius: 8,
            background: text.trim() && !localBlocked ? C.amber : C.panel2,
            color: text.trim() && !localBlocked ? '#000' : C.dim,
            border: 'none', fontWeight: 800, fontSize: 13,
            cursor: text.trim() && !localBlocked ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? '…' : 'Kirim'}
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: err ? C.red : C.dim, marginTop: 4 }}>
        <span>{err || `${ONELINER_MAX_LEN - text.length} karakter`}</span>
        <span>1 teriakan / 60 detik</span>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Squad showdown (reuses useSuperLeagueClubSquad)
// ---------------------------------------------------------------------
function SquadShowdown() {
  const persija = useSuperLeagueClubSquad('persija');
  const persib = useSuperLeagueClubSquad('persib');
  return (
    <Card title="Skuad saat ini — adu kekuatan" footer="Sumber: API-Football. Cuma menampilkan starting XI / pemain inti yang terdaftar.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <SquadColumn name={PERSIJA.name} accent={PERSIJA.accent} state={persija} />
        <SquadColumn name={PERSIB.name} accent={PERSIB.accent} state={persib} />
      </div>
    </Card>
  );
}

function SquadColumn({ name, accent, state }) {
  const top = (state.players || []).slice(0, 11);
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 6 }}>{name}</div>
      {state.loading && <div style={{ fontSize: 12, color: C.dim }}>Loading…</div>}
      {!state.loading && top.length === 0 && (
        <div style={{ fontSize: 12, color: C.dim }}>Skuad belum tersedia.</div>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {top.map((p) => (
          <li key={p.id} style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${C.lineSoft}`,
            color: C.text,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.number ? <span style={{ color: C.dim, marginRight: 6 }}>{String(p.number).padStart(2, '0')}</span> : null}
              {p.name}
            </span>
            <span style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {p.position?.slice(0, 3)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------
// Stadiums + fanbase
// ---------------------------------------------------------------------
function StadiumFanbase() {
  return (
    <Card title="Stadion & basis suporter">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[PERSIJA, PERSIB].map((s) => (
          <div key={s.slug} style={{
            padding: 10, borderRadius: 10,
            background: C.panel2, border: `1px solid ${C.line}`,
            borderLeft: `3px solid ${s.accent}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{s.nameLong}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{s.nickname} • Berdiri {s.founded}</div>
            <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${C.lineSoft}` }} />
            <div style={{ fontSize: 12, color: C.text }}>{s.home}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{s.homeCapacity.toLocaleString('id-ID')} tempat duduk</div>
            <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${C.lineSoft}` }} />
            <div style={{ fontSize: 12, color: C.text }}>{s.fanbase}</div>
            <div style={{ fontSize: 11, color: C.dim }}>Berdiri {s.fanbaseFounded} • Warna {s.fanColor}</div>
            <p style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>{s.knownFor}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Iconic moments timeline + trophies
// ---------------------------------------------------------------------
function IconicTimeline() {
  return (
    <Card title="Momen ikonik — 90 tahun rivalitas">
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {ICONIC_MOMENTS.map((m) => {
          const accent = m.side === 'persija' ? PERSIJA.accent : m.side === 'persib' ? PERSIB.accent : C.amber;
          return (
            <li key={m.year + m.title} style={{
              padding: 10, borderRadius: 10, background: C.panel2,
              border: `1px solid ${C.line}`, borderLeft: `3px solid ${accent}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums' }}>{m.year}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.title}</span>
              </div>
              <p style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.55 }}>{m.body}</p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function TrophiesCabinet() {
  const totalsP = (s) =>
    s.titlesPerserikatan + s.titlesGalatama + s.titlesLigaIndonesia + s.titlesLiga1;
  return (
    <Card title="Lemari trofi liga">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[PERSIJA, PERSIB].map((s) => (
          <div key={s.slug} style={{
            padding: 12, borderRadius: 10, background: C.panel2,
            border: `1px solid ${C.line}`, borderLeft: `3px solid ${s.accent}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: C.dim, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {s.nickname}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.accent, lineHeight: 1, margin: '6px 0' }}>
              {totalsP(s)}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>total trofi liga</div>
            <hr style={{ margin: '10px 0', border: 'none', borderTop: `1px solid ${C.lineSoft}` }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 11, color: C.text, textAlign: 'left' }}>
              <TrophyRow label="Perserikatan" n={s.titlesPerserikatan} />
              <TrophyRow label="Galatama" n={s.titlesGalatama} />
              <TrophyRow label="Liga Indonesia" n={s.titlesLigaIndonesia} />
              <TrophyRow label="Liga 1 / Super League" n={s.titlesLiga1} />
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrophyRow({ label, n }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: C.dim }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
    </li>
  );
}

// ---------------------------------------------------------------------
// Reusable card wrapper
// ---------------------------------------------------------------------
function Card({ title, footer, children }) {
  return (
    <section style={{
      borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`,
      padding: 14, marginBottom: 12,
    }}>
      <h2 style={{
        fontSize: 14, fontWeight: 800, color: C.text,
        margin: '0 0 10px', letterSpacing: -0.1,
      }}>{title}</h2>
      {children}
      {footer && (
        <div style={{ fontSize: 11, color: C.dim, marginTop: 10 }}>{footer}</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// JSON-LD builders
// ---------------------------------------------------------------------
function buildJsonLd(next) {
  const events = next ? [{
    '@type': 'SportsEvent',
    'name': `${next.teams.home.name} vs ${next.teams.away.name} — ${DERBY_NAME}`,
    'startDate': next.fixture.date,
    'sport': 'Football',
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'Place',
      'name': next.fixture?.venue?.name || 'Jakarta International Stadium',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': next.fixture?.venue?.city || 'Jakarta',
        'addressCountry': 'ID',
      },
    },
    'homeTeam': { '@type': 'SportsTeam', 'name': next.teams.home.name },
    'awayTeam': { '@type': 'SportsTeam', 'name': next.teams.away.name },
  }] : [];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `https://www.gibol.co/derby/${DERBY_SLUG}`,
        'name': `${DERBY_NAME} — Persija vs Persib`,
        'inLanguage': 'id-ID',
        'isPartOf': { '@type': 'WebSite', 'name': 'Gibol', 'url': 'https://www.gibol.co' },
        'mainEntity': {
          '@type': 'FAQPage',
          'mainEntity': FAQ.map((f) => ({
            '@type': 'Question',
            'name': f.q,
            'acceptedAnswer': { '@type': 'Answer', 'text': f.a },
          })),
        },
      },
      ...events,
    ],
  };
}

// ---------------------------------------------------------------------
// FAQ section (visible — backs up the JSON-LD with on-page content)
// ---------------------------------------------------------------------
function FAQSection() {
  return (
    <Card title="Tanya jawab cepat">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {FAQ.map((f) => (
          <li key={f.q}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.q}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2, lineHeight: 1.55 }}>{f.a}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
export default function Derby() {
  const [side, setSide] = useDerbySide();
  const location = useLocation();
  const { next, last, loading: fxLoading } = useDerbyNextFixture({ season: 2025 });
  const {
    polls, reactions, myReactions, myPicks, oneliners, schemaReady,
    vote, react, postOneliner,
  } = useDerbyState(DERBY_SLUG);

  const jsonLd = useMemo(() => buildJsonLd(next), [next]);

  // v0.21.0 — read ?prediction= + ?side= from the URL so deep-link
  // shares unfurl with the prediction-baked OG card. When a fan
  // shares "Persib 2-1 Persija" via the SharePredictionButton, the
  // resulting URL is /derby/persija-persib?prediction=2-1&side=persib.
  // Recipients clicking the link land here; the SEO meta below
  // routes their unfurl previewer to the per-prediction OG endpoint.
  const predictionParams = useMemo(() => {
    if (typeof window === 'undefined') return null; // SSR / prerender
    try {
      const sp = new URLSearchParams(location.search);
      const score = sp.get('prediction') || '';
      const sharedSide = (sp.get('side') || '').toLowerCase();
      if (!/^[0-9]-[0-9]$/.test(score)) return null;
      const safeSide = ['persija', 'persib', 'neutral'].includes(sharedSide) ? sharedSide : 'neutral';
      return { score, side: safeSide };
    } catch {
      return null;
    }
  }, [location.search]);

  const seoTitle = 'El Clasico Indonesia — Persija vs Persib: H2H, Polling, Skuad, Sejarah';
  const seoDesc = 'Persija vs Persib derby El Clasico Indonesia: head-to-head sepanjang masa, jadwal pertemuan berikutnya, polling fan, momen ikonik, dan skuad saat ini. Update terus.';
  const seoImage = predictionParams
    ? `https://www.gibol.co/api/og-derby?score=${encodeURIComponent(predictionParams.score)}&side=${predictionParams.side}`
    : 'https://www.gibol.co/api/og-derby?score=1-1&size=og';

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 12 }}>
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/derby/${DERBY_SLUG}`}
        image={seoImage}
        keywords="persija persib, el clasico indonesia, derby indonesia, persija vs persib, jakmania, bobotoh, viking, super league indonesia, liga 1"
        jsonLd={jsonLd}
      />
      <Breadcrumbs
        items={[
          { name: 'Beranda', to: '/' },
          { name: 'Super League', to: '/super-league-2025-26' },
          { name: 'Derby Persija vs Persib' },
        ]}
      />

      <Hero next={next} nextLoading={fxLoading} side={side} onPickSide={setSide} />

      <NextMatchPanel next={next} />

      <HeadToHead />

      {/* v0.19.5 Phase 2 Sprint E — mobile-only side-picker below the
          H2H strip. Desktop copy is inside <Hero>; .show-mobile-only
          on this section flips it on at ≤540px. */}
      <SidePickerMobile side={side} onPickSide={setSide} />

      <LastFiveMeetings />

      <PollsSection polls={polls} myPicks={myPicks} onVote={vote} schemaReady={schemaReady} side={side} />

      <ReactionWall
        reactions={reactions}
        myReactions={myReactions}
        oneliners={oneliners}
        onReact={react}
        onPostOneliner={postOneliner}
        side={side}
        schemaReady={schemaReady}
      />

      <SquadShowdown />

      <StadiumFanbase />

      <IconicTimeline />

      <TrophiesCabinet />

      <FAQSection />

      {/* link out to club pages so juice flows back to per-club SEO */}
      <Card title="Pelajari lebih dalam">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/super-league-2025-26/club/persija" style={{
            padding: '8px 14px', borderRadius: 999, background: PERSIJA.accent, color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Halaman Persija →
          </Link>
          <Link to="/super-league-2025-26/club/persib" style={{
            padding: '8px 14px', borderRadius: 999, background: PERSIB.accent, color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Halaman Persib →
          </Link>
          <Link to="/super-league-2025-26" style={{
            padding: '8px 14px', borderRadius: 999, background: 'transparent',
            color: C.text, border: `1px solid ${C.line}`,
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Klasemen Super League →
          </Link>
          <ShareButton
            url={`https://www.gibol.co/derby/${DERBY_SLUG}`}
            title={seoTitle}
            text="Cek halaman El Clasico Indonesia di Gibol — H2H, polling, sejarah, skuad."
          />
        </div>
      </Card>

      <div style={{ fontSize: 10, color: C.dim, textAlign: 'center', padding: '20px 0 40px' }}>
        Data live via API-Football. H2H + sejarah dikurasi dari Wikipedia, Transfermarkt, mediaindonesia, ANTARA.
      </div>
    </main>
  );
}
