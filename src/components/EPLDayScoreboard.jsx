import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { formatFixtureDate } from '../lib/sports/epl/clubs.js';
import ShareButton from './ShareButton.jsx';
import { useEPLMatchDetail } from '../hooks/useEPLMatchDetail.js';
// v0.14.1 — possession + xG + shots from API-Football, layered on
// top of ESPN's goals/cards/subs.
import { useEPLMatchStatistics } from '../hooks/useEPLMatchStatistics.js';
// v0.14.4 — formation + starting XI + bench from API-Football.
import { useEPLMatchLineups } from '../hooks/useEPLMatchLineups.js';
import { readableOnDark } from '../lib/contrast.js';

// v0.11.26 NEW-4 — pre-compute readable EPL purple for foreground text.
// EPL_PURPLE #37003C raw is 1.02:1 on the dark navy page bg. The
// brightened variant lands at ≥4.5:1 while staying visually purple.
const EPL_PURPLE_TEXT = readableOnDark('#37003C');

/**
 * EPL day-swipe scoreboard — the NBA DayScoreboard pattern ported to soccer.
 *
 * Anatomy:
 *   [ Day tabs · horizontal scroll-snap · 7 days ]
 *   [ Cards for matches on the active day ]
 *
 * A card shows:
 *   - Home team (crest + name + accent bar)
 *   - Score (live / final) OR kickoff time (upcoming)
 *   - Away team
 *   - Per-match Polymarket odds chip (when market exists)
 *   - Share button
 *
 * Live match: LIVE pulse dot, red accent border, status detail ("67'").
 * Final: "FULL TIME" label, winner bolded.
 * Upcoming: WIB kickoff time, "HOME" / "AWAY" venue badge.
 */

const EPL_PURPLE = '#37003C';

// Build a [-7, +7] day window (15 days total) anchored today. Premier
// League matches happen on weekends, so a ±3 window loses the next
// weekend's fixtures if today is Mon–Tue — covering two full weekends
// is the minimum useful range. useEPLFixtures already fetches ±7 days
// of data, so widening here is free.
function buildDayWindow(anchor = new Date()) {
  const days = [];
  const a = new Date(anchor);
  a.setHours(0, 0, 0, 0);
  for (let i = -7; i <= 7; i++) {
    const d = new Date(a);
    d.setDate(a.getDate() + i);
    days.push(d);
  }
  return days;
}

function localYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function matchLocalYMD(iso) {
  const d = new Date(iso);
  return localYMD(d);
}

function diffDays(a, b) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aa - bb) / 86400000);
}

function dayTabLabel(d, lang) {
  const today = new Date();
  const delta = diffDays(d, today);
  if (delta === 0) return lang === 'id' ? 'HARI INI' : 'TODAY';
  if (delta === 1) return lang === 'id' ? 'BESOK' : 'TOMORROW';
  if (delta === -1) return lang === 'id' ? 'KEMARIN' : 'YESTERDAY';
  const dow = lang === 'id'
    ? ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'][d.getDay()]
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  return dow;
}

function dayTabSub(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function buildShareText(m, lang) {
  const h = m.home?.shortName || m.home?.name || '—';
  const a = m.away?.shortName || m.away?.name || '—';
  if (m.statusState === 'in') {
    const hs = m.home?.score ?? '0';
    const as = m.away?.score ?? '0';
    const clock = m.statusDetail ? ` · ${m.statusDetail}` : '';
    return lang === 'id'
      ? `${h} ${hs} – ${as} ${a}${clock} · live-update-nya di gibol.co ⚽`
      : `${h} ${hs} – ${as} ${a}${clock} · live on gibol.co ⚽`;
  }
  if (m.homeScore != null && m.awayScore != null) {
    return lang === 'id'
      ? `FINAL · ${h} ${m.homeScore} – ${m.awayScore} ${a} · recap di gibol.co ⚽`
      : `FINAL · ${h} ${m.homeScore} – ${m.awayScore} ${a} · recap on gibol.co ⚽`;
  }
  return lang === 'id'
    ? `${h} vs ${a} · ${formatFixtureDate(m.kickoffUtc, lang)} · jadwal di gibol.co ⚽`
    : `${h} vs ${a} · ${formatFixtureDate(m.kickoffUtc, lang)} · schedule on gibol.co ⚽`;
}

function OddsChip({ odds, homeAccent, awayAccent }) {
  if (!odds) return null;
  const cell = (bg, label) => (
    <span
      style={{
        padding: '3px 8px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        background: bg,
        color: C.text,
        textAlign: 'center',
        minWidth: 40,
      }}
    >
      {label}%
    </span>
  );
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${C.lineSoft}`,
        borderRadius: 3,
        overflow: 'hidden',
        alignSelf: 'center',
      }}
    >
      {cell(`${homeAccent}22`, odds.home)}
      <span style={{ width: 1, background: C.lineSoft }} />
      <span style={{ padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, background: C.panel2, color: C.dim, minWidth: 40, textAlign: 'center' }}>
        {odds.draw}%
      </span>
      <span style={{ width: 1, background: C.lineSoft }} />
      {cell(`${awayAccent}22`, odds.away)}
    </div>
  );
}

function MatchCard({ m, odds, lang }) {
  const live = m.statusState === 'in';
  const post = m.statusState === 'post';
  const homeWon = post && m.home.score > m.away.score;
  const awayWon = post && m.away.score > m.home.score;
  const hasScore = live || post || m.home.score != null;
  // v0.11.25 — expand-on-click. Clicking the card toggles a detail
  // panel below with goal scorers + assists + minute. Only fetches
  // ESPN /summary when expanded (lazy) and only polls every 30s
  // while live. Pre-game cards have nothing to expand into so the
  // expand affordance is hidden when there's no score yet.
  const [expanded, setExpanded] = useState(false);
  const canExpand = hasScore;
  const { goals, cards, subs, events, loading: detailLoading, error: detailError } = useEPLMatchDetail({
    eventId: m.id,
    isLive: live,
    enabled: expanded,
  });
  // v0.14.1 — API-Football statistics (possession, xG, shots,
  // corners, fouls). Resolves the cross-API fixture id by
  // home/away/date. Errors surface as `unauthorized` if the
  // API_FOOTBALL_KEY env var isn't set on the server — the panel
  // gracefully omits the stats row in that case.
  const { home: statsHome, away: statsAway, error: statsError } = useEPLMatchStatistics({
    homeName: m.home?.name,
    awayName: m.away?.name,
    dateISO: m.kickoffUtc,
    isLive: live,
    enabled: expanded,
  });
  const { home: lineupsHome, away: lineupsAway } = useEPLMatchLineups({
    homeName: m.home?.name,
    awayName: m.away?.name,
    dateISO: m.kickoffUtc,
    isLive: live,
    enabled: expanded,
  });

  // v0.11.10 — score-change flash + haptic. Same pattern as the
  // NBA DayScoreboard: prev refs, delta detect on live games only,
  // 600ms animation. EPL uses a single combined score line so one
  // flag drives both halves.
  const currentHome = live ? m.home.score : m.homeScore;
  const currentAway = live ? m.away.score : m.awayScore;
  const prevHome = useRef(currentHome);
  const prevAway = useRef(currentAway);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!live) {
      prevHome.current = currentHome;
      prevAway.current = currentAway;
      return;
    }
    const homeChanged = prevHome.current != null && prevHome.current !== currentHome;
    const awayChanged = prevAway.current != null && prevAway.current !== currentAway;
    if (homeChanged || awayChanged) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(40); } catch {}
      }
      prevHome.current = currentHome;
      prevAway.current = currentAway;
      return () => clearTimeout(t);
    }
    prevHome.current = currentHome;
    prevAway.current = currentAway;
  }, [currentHome, currentAway, live]);

  const timeLabel = post
    ? (lang === 'id' ? 'FULL TIME' : 'FULL TIME')
    : live
      ? (m.statusDetail || 'LIVE')
      : formatFixtureDate(m.kickoffUtc, lang).split('·')[1]?.trim() || '';

  const shareUrl = `https://www.gibol.co/premier-league-2025-26#${m.id || ''}`;

  // v0.12.7 — whole-card click toggles expand, mobile-friendly. Replaces
  // the chevron-only target (44×44 button at the far right) which was
  // unreachable on cramped mobile rows. Click-through is preserved for
  // nested team-name <Link>s and the inner <ShareButton>: the card's
  // onClick checks event.target.closest('a, button') and bails if the
  // click landed on any child interactive. The chevron stays visible
  // as an affordance but is no longer the only target.
  //
  // Why not <button>: the card grid contains <a> + <button>
  // descendants. A button-as-parent would re-introduce the nested-
  // interactive axe violation that v0.11.26 fixed. role="button" on
  // a div + keyboard handler keeps the row keyboard-actionable
  // without nesting.
  const handleCardClick = (e) => {
    if (!canExpand) return;
    const t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('a, button')) return;
    setExpanded((v) => !v);
  };
  const handleCardKeyDown = (e) => {
    if (!canExpand) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const t = e.target;
      if (t && typeof t.closest === 'function' && t.closest('a, button')) return;
      e.preventDefault();
      setExpanded((v) => !v);
    }
  };

  return (
    <div
      role={canExpand ? 'button' : undefined}
      tabIndex={canExpand ? 0 : undefined}
      aria-expanded={canExpand ? expanded : undefined}
      aria-label={canExpand ? (expanded
        ? (lang === 'id' ? `Tutup detail ${m.home.name} vs ${m.away.name}` : `Collapse ${m.home.name} vs ${m.away.name} detail`)
        : (lang === 'id' ? `Lihat detail ${m.home.name} vs ${m.away.name}` : `Show ${m.home.name} vs ${m.away.name} detail`)) : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={{
        background: C.panel,
        border: `1px solid ${live ? C.red : C.lineSoft}`,
        borderLeft: `3px solid ${live ? C.red : EPL_PURPLE}`,
        borderRadius: 3,
        cursor: canExpand ? 'pointer' : 'default',
        // v0.12.7 follow-up — kill iOS Safari's gray tap-highlight that
        // flashed the whole card on tap (the "moves on click" Ade
        // reported) now that the outer div is role="button". Also
        // disable text selection on long-press so a slow tap doesn't
        // open the iOS share sheet on a team name.
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      {/* v0.12.3 M-4 — `.epl-match-card-grid` collapses the 4-col
          desktop layout (home / score / away / actions) to a 3-col
          row + actions row below 540 px. Pre-fix, mobile clipped
          team names to "Sunderla" + "Nottingha" and the SHARE
          button rendered off-screen. */}
      <div
        className="epl-match-card-grid"
        style={{
          padding: 12,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr auto',
          alignItems: 'center',
          gap: 12,
        }}
      >
      {/* Home */}
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: homeWon ? C.text : post ? C.dim : C.text,
            fontWeight: homeWon ? 700 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {m.home.slug ? (
            // v0.11.26 NEW-6 — inline-block + padding bumps target size
            // from 17.5 px (line-height) to ≥24 px tall, clearing WCAG
            // 2.5.8 minimum. Padding stays asymmetric (right-only) so the
            // visual whitespace between team name and score doesn't grow.
            <Link
              to={`/premier-league-2025-26/club/${m.home.slug}`}
              style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', padding: '6px 0 6px 6px', minHeight: 24 }}
            >
              {m.home.name}
            </Link>
          ) : m.home.name}
        </div>
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 3,
            background: m.home.accent,
            marginTop: 4,
          }}
        />
      </div>

      {/* Center: score or clock — v0.12.7 follow-up. Pre-fix: 20px
          mono "0 – 5" with 6px dash margin sat smaller than the
          13px team names, and the 84px min-width column got
          squeezed below 540px (mobile grid drops to 72px). Score
          read as the smallest thing on the row instead of the
          point of the row. Now: 26px score, tight 2px dash margin
          + dim dash color so the digits read as one number not
          three glyphs, 11px status row, and 100px min-width keeps
          even "10 – 12" (a Carabao penalty shootout) from
          wrapping. The .epl-match-card-score class widens the
          mobile track to match (was 72 → now 96). */}
      <div className="epl-match-card-score" style={{ textAlign: 'center', minWidth: 100 }}>
        {hasScore ? (
          <>
            <div
              className={flash ? 'score-flash' : undefined}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 800,
                color: C.text,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                letterSpacing: -0.5,
              }}
            >
              {currentHome ?? '-'}
              <span style={{ color: C.muted, margin: '0 4px', fontWeight: 500 }}>–</span>
              {currentAway ?? '-'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: live ? C.red : C.muted,
                letterSpacing: 0.8,
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 700,
              }}
            >
              {live && <span className="live-dot" aria-hidden="true" style={{ width: 6, height: 6, margin: 0 }} />}
              {timeLabel.toUpperCase()}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 19,
                fontWeight: 700,
                color: C.text,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {timeLabel || 'TBC'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: C.muted,
                letterSpacing: 0.6,
                marginTop: 6,
              }}
            >
              WIB
            </div>
          </>
        )}
      </div>

      {/* Away */}
      <div style={{ textAlign: 'left', minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: awayWon ? C.text : post ? C.dim : C.text,
            fontWeight: awayWon ? 700 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {m.away.slug ? (
            <Link
              to={`/premier-league-2025-26/club/${m.away.slug}`}
              style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', padding: '6px 6px 6px 0', minHeight: 24 }}
            >
              {m.away.name}
            </Link>
          ) : m.away.name}
        </div>
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 3,
            background: m.away.accent,
            marginTop: 4,
          }}
        />
      </div>

      {/* Right: odds + share + expand chevron — v0.12.3 M-4: spans full
          width as second row on mobile via .epl-match-card-actions. */}
      <div className="epl-match-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {odds && (
          <OddsChip odds={odds} homeAccent={m.home.accent} awayAccent={m.away.accent} />
        )}
        <ShareButton
          url={shareUrl}
          title={`${m.home.name} vs ${m.away.name}`}
          text={buildShareText(m, lang)}
          accent={EPL_PURPLE}
          size="sm"
          label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
          ariaLabel={lang === 'id'
            ? `Bagikan ${m.home.name} vs ${m.away.name}, ${timeLabel}`
            : `Share ${m.home.name} vs ${m.away.name}, ${timeLabel}`}
          analyticsEvent="epl_share_day"
        />
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded
              ? (lang === 'id' ? 'Tutup detail laga' : 'Collapse match detail')
              : (lang === 'id' ? 'Lihat detail laga, pencetak gol + assist' : 'Show match detail with goal scorers and assists')}
            style={{
              // v0.11.26 NEW-5 + NEW-6 — dedicated expand button replaces
              // the old card-level role="button" pattern. ≥44 px target
              // size cleans GIB-012 + new EPL target-size violations.
              minWidth: 44,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: C.dim,
              background: 'transparent',
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              userSelect: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                lineHeight: 1,
              }}
            >
              ▾
            </span>
          </button>
        )}
      </div>
      </div>

      {/* v0.12.7 — Expanded match detail: per-side event timeline
          covering goals, cards, and substitutions. Lazy-loaded via
          useEPLMatchDetail (hits ESPN /summary on first expand;
          polls 30s while live). */}
      {expanded && canExpand && (
        <MatchDetailPanel
          match={m}
          events={events}
          goals={goals}
          cards={cards}
          subs={subs}
          loading={detailLoading}
          error={detailError}
          statsHome={statsHome}
          statsAway={statsAway}
          statsError={statsError}
          lineupsHome={lineupsHome}
          lineupsAway={lineupsAway}
          lang={lang}
        />
      )}
    </div>
  );
}

// v0.14.1 — Match statistics row (possession + xG + shots).
// Renders a compact horizontal block above the events timeline with
// the most actionable advanced stats: possession (as a split bar),
// xG (decimal), shots on target, and corners. Each metric shows
// home value · split · away value so the eye scans home-to-away.
function StatsRow({ home, away, homeAccent, awayAccent, homeShort, awayShort, lang }) {
  // Possession bar — split full-width band tinted with team accents.
  const homePoss = home?.possession;
  const awayPoss = away?.possession;
  const haveBar = homePoss !== null && awayPoss !== null;

  const items = [
    { key: 'shots', label: lang === 'id' ? 'Tembakan' : 'Shots',
      h: home?.shots, a: away?.shots },
    { key: 'sot', label: lang === 'id' ? 'Tepat sasaran' : 'On target',
      h: home?.shotsOnTarget, a: away?.shotsOnTarget },
    { key: 'xg', label: 'xG',
      h: fmtFloat(home?.xG), a: fmtFloat(away?.xG) },
    { key: 'corners', label: lang === 'id' ? 'Sepak pojok' : 'Corners',
      h: home?.corners, a: away?.corners },
    { key: 'fouls', label: lang === 'id' ? 'Pelanggaran' : 'Fouls',
      h: home?.fouls, a: away?.fouls },
  ].filter((it) => it.h != null || it.a != null);

  if (!haveBar && items.length === 0) return null;

  return (
    <div style={{
      marginBottom: 12,
      paddingBottom: 12,
      borderBottom: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: 1.2,
        color: C.dim,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}>
        <span>{lang === 'id' ? 'Statistik laga' : 'Match stats'}</span>
        <span style={{ color: C.muted, fontSize: 9, fontWeight: 400 }}>
          API-Football
        </span>
      </div>

      {/* Possession — split bar */}
      {haveBar && (
        <div style={{ marginBottom: 10 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: C.dim, marginBottom: 4,
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ color: C.text, fontWeight: 700 }}>{homePoss}%</span>
            <span style={{ letterSpacing: 1, color: C.muted }}>
              {lang === 'id' ? 'Penguasaan bola' : 'Possession'}
            </span>
            <span style={{ color: C.text, fontWeight: 700 }}>{awayPoss}%</span>
          </div>
          <div style={{
            display: 'flex', height: 6, borderRadius: 3,
            overflow: 'hidden', background: C.panel2,
          }}>
            <div style={{
              width: `${homePoss}%`, background: homeAccent,
              transition: 'width 400ms ease-out',
            }} />
            <div style={{
              width: `${awayPoss}%`, background: awayAccent,
              transition: 'width 400ms ease-out',
            }} />
          </div>
        </div>
      )}

      {/* Counter stats — home / label / away rows */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          {items.map((it) => (
            <div
              key={it.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'center',
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ textAlign: 'right', color: C.text, fontWeight: 600 }}>
                {it.h != null ? it.h : '—'}
              </span>
              <span style={{
                color: C.muted,
                fontSize: 9.5,
                letterSpacing: 0.6,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {it.label.toUpperCase()}
              </span>
              <span style={{ textAlign: 'left', color: C.text, fontWeight: 600 }}>
                {it.a != null ? it.a : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtFloat(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function MatchDetailPanel({ match, events, loading, error, statsHome, statsAway, statsError, lineupsHome, lineupsAway, lang }) {
  const list = Array.isArray(events) ? events : [];
  const homeEvents = list.filter((e) => e.side === 'home');
  const awayEvents = list.filter((e) => e.side === 'away');
  const isEmpty = !loading && list.length === 0 && !error;
  const hasStats = !!(statsHome || statsAway);
  const hasLineups = !!(lineupsHome?.startXI?.length || lineupsAway?.startXI?.length);

  return (
    <div
      style={{
        borderTop: `1px solid ${C.lineSoft}`,
        background: C.panelSoft,
        padding: '12px 14px',
        fontSize: 11,
        lineHeight: 1.45,
        // v0.12.7 follow-up — stable minHeight so the panel doesn't
        // grow from ~30px (loading) to ~140px (loaded) in a second
        // pass. Eliminates the "page jumps after I tap" feel.
        minHeight: 96,
      }}
    >
      {/* v0.14.1 — possession / xG / shots row from API-Football.
          Renders only when statistics resolve (returns null when
          API_FOOTBALL_KEY not set yet, leaving the goals/cards/subs
          panel intact). */}
      {hasStats && (
        <StatsRow
          home={statsHome}
          away={statsAway}
          homeAccent={match.home.accent}
          awayAccent={match.away.accent}
          homeShort={match.home.short || match.home.name}
          awayShort={match.away.short || match.away.name}
          lang={lang}
        />
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <EventsColumn
          title={match.home.short || match.home.name}
          accent={match.home.accent}
          events={homeEvents}
          loading={loading}
          lang={lang}
        />
        <EventsColumn
          title={match.away.short || match.away.name}
          accent={match.away.accent}
          events={awayEvents}
          loading={loading}
          lang={lang}
        />
      </div>
      {error && (
        <div style={{ marginTop: 8, color: C.muted, fontSize: 10 }}>
          {lang === 'id' ? 'Detail tidak tersedia.' : 'Match detail unavailable.'}
        </div>
      )}
      {isEmpty && (
        <div style={{ marginTop: 4, color: C.muted, fontSize: 10.5 }}>
          {match.statusState === 'in'
            ? (lang === 'id' ? 'Belum ada kejadian di laga ini.' : 'No events in this match yet.')
            : (lang === 'id' ? 'Laga selesai tanpa kejadian penting.' : 'Match ended with no recorded events.')}
        </div>
      )}
      {/* v0.14.4 — formation + starting XI from API-Football. Sits
          beneath events so the timeline stays the eye's first stop;
          users who want the line-up scroll once. */}
      {hasLineups && (
        <LineupsRow
          home={lineupsHome}
          away={lineupsAway}
          homeAccent={match.home.accent}
          awayAccent={match.away.accent}
          lang={lang}
        />
      )}
    </div>
  );
}

function LineupsRow({ home, away, homeAccent, awayAccent, lang }) {
  return (
    <div style={{
      marginTop: 14,
      paddingTop: 12,
      borderTop: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: 1.2,
        color: C.dim,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}>
        <span>{lang === 'id' ? 'Susunan pemain' : 'Lineups'}</span>
        <span style={{ color: C.muted, fontSize: 9, fontWeight: 400 }}>
          API-Football
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
      }}>
        <LineupColumn data={home} accent={homeAccent} lang={lang} />
        <LineupColumn data={away} accent={awayAccent} lang={lang} />
      </div>
    </div>
  );
}

function LineupColumn({ data, accent, lang }) {
  if (!data) {
    return (
      <div style={{ fontSize: 10.5, color: C.muted }}>—</div>
    );
  }
  return (
    <div>
      {/* Formation tag */}
      {data.formation && (
        <div style={{
          display: 'inline-block',
          padding: '2px 7px',
          marginBottom: 6,
          background: `${accent}22`,
          border: `1px solid ${accent}`,
          borderRadius: 3,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6,
          color: C.text,
          fontWeight: 700,
        }}>
          {data.formation}
        </div>
      )}
      {/* Starting XI list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 3 }}>
        {data.startXI.map((p, i) => (
          <li
            key={`${p.number ?? 'n'}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 18px',
              gap: 6,
              fontSize: 10.5,
              alignItems: 'baseline',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              color: C.dim,
              fontWeight: 700,
              textAlign: 'right',
            }}>
              {p.number ?? '·'}
            </span>
            <span style={{ color: C.text }}>{p.name}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: C.muted,
              textAlign: 'right',
            }}>
              {p.pos}
            </span>
          </li>
        ))}
      </ul>
      {/* Coach */}
      {data.coach?.name && (
        <div style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: `1px solid ${C.lineSoft}`,
          fontSize: 10,
          color: C.muted,
        }}>
          <span style={{ letterSpacing: 0.5 }}>
            {lang === 'id' ? 'Pelatih' : 'Coach'}:
          </span>{' '}
          <span style={{ color: C.text, fontWeight: 600 }}>{data.coach.name}</span>
        </div>
      )}
    </div>
  );
}

// Per-side event row. `e.kind` switches the icon + descriptive text.
// Goals show scorer + (PEN/OG) + assists. Cards show player + color
// chip. Subs show "▲ on / ▼ off" pair.
function EventRow({ e, lang }) {
  return (
    <li style={{ display: 'grid', gridTemplateColumns: '40px 18px 1fr', gap: 8, alignItems: 'baseline' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          color: C.dim,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        {e.clock}
      </span>
      <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1, marginTop: 1 }}>
        {e.kind === 'goal' && '⚽'}
        {e.kind === 'card' && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 11,
              background: e.color === 'red' ? '#dc2626' : '#fbbf24',
              borderRadius: 1.5,
              verticalAlign: 'middle',
            }}
          />
        )}
        {e.kind === 'sub' && '⇄'}
      </span>
      <span>
        {e.kind === 'goal' && (
          <>
            <span style={{ color: C.text, fontWeight: 600 }}>
              {e.scorer || (lang === 'id' ? 'Tidak diketahui' : 'Unknown')}
            </span>
            {e.penalty && (
              <span style={{ marginLeft: 6, fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>
                (PEN)
              </span>
            )}
            {e.ownGoal && (
              <span style={{ marginLeft: 6, fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>
                (OG)
              </span>
            )}
            {e.assists && e.assists.length > 0 && (
              <span style={{ display: 'block', fontSize: 10, color: C.muted, marginTop: 1 }}>
                {lang === 'id' ? 'Assist: ' : 'Assist: '}{e.assists.join(', ')}
              </span>
            )}
          </>
        )}
        {e.kind === 'card' && (
          <span style={{ color: C.text, fontWeight: 600 }}>
            {e.player || (lang === 'id' ? 'Tidak diketahui' : 'Unknown')}
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                color: C.muted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {e.color === 'red'
                ? (lang === 'id' ? 'kartu merah' : 'red card')
                : (lang === 'id' ? 'kartu kuning' : 'yellow card')}
            </span>
          </span>
        )}
        {e.kind === 'sub' && (
          <>
            {e.on && (
              <span style={{ color: C.text, fontWeight: 600 }}>
                ▲ {e.on}
              </span>
            )}
            {e.off && (
              <span style={{ display: 'block', fontSize: 10, color: C.muted, marginTop: 1 }}>
                ▼ {e.off}
              </span>
            )}
          </>
        )}
      </span>
    </li>
  );
}

function EventsColumn({ title, accent, events, loading, lang }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1.2,
          color: C.dim,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, background: accent, borderRadius: 2 }}
        />
        {title}
        <span style={{ color: C.muted, fontWeight: 400 }}>
          · {lang === 'id' ? 'Kejadian' : 'Events'}
        </span>
      </div>
      {loading && (
        <div style={{ color: C.muted, fontSize: 10.5 }}>
          {lang === 'id' ? 'memuat…' : 'loading…'}
        </div>
      )}
      {!loading && (!events || events.length === 0) && (
        <div style={{ color: C.muted, fontSize: 10.5 }}>—</div>
      )}
      {!loading && events && events.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 5 }}>
          {events.map((e, i) => (
            <EventRow key={`${e.kind}-${i}-${e.clock}`} e={e} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EPLDayScoreboard({ upcoming, recent, oddsByMatchId, loading, error, lang }) {
  const days = useMemo(() => buildDayWindow(), []);

  // Bucket matches by local YMD
  const { bucketsByDay, initialDayIdx } = useMemo(() => {
    const buckets = new Map();
    for (const d of days) buckets.set(localYMD(d), []);

    for (const m of upcoming || []) {
      const key = matchLocalYMD(m.kickoffUtc);
      if (buckets.has(key)) buckets.get(key).push(m);
    }
    for (const r of recent || []) {
      const key = matchLocalYMD(r.kickoffUtc);
      if (buckets.has(key)) buckets.get(key).push({ ...r, statusState: 'post' });
    }

    // v0.12.7 — sort priority within a day:
    //   1. live (statusState === 'in')
    //   2. upcoming (pre-game), chronological
    //   3. final (post-game), chronological
    // Was a flat kickoff-time sort, which buried a 90'+5' live match
    // beneath a 19:30 final the user already knew about. Live now
    // always rises to the top of the active day.
    const orderRank = (m) => (m.statusState === 'in' ? 0 : m.statusState === 'pre' ? 1 : 2);
    for (const [, arr] of buckets) {
      arr.sort((a, b) => {
        const r = orderRank(a) - orderRank(b);
        if (r !== 0) return r;
        return new Date(a.kickoffUtc) - new Date(b.kickoffUtc);
      });
    }

    // Default active day: prefer today if it has matches, else first day that does, else today.
    const todayIdx = days.findIndex((d) => diffDays(d, new Date()) === 0);
    let activeIdx = todayIdx;
    if ((buckets.get(localYMD(days[todayIdx])) || []).length === 0) {
      const firstWithMatches = days.findIndex((d) => (buckets.get(localYMD(d)) || []).length > 0);
      if (firstWithMatches >= 0) activeIdx = firstWithMatches;
    }
    return { bucketsByDay: buckets, initialDayIdx: activeIdx };
  }, [days, upcoming, recent]);

  const [activeIdx, setActiveIdx] = useState(initialDayIdx);
  useEffect(() => { setActiveIdx(initialDayIdx); }, [initialDayIdx]);

  const activeDay = days[activeIdx];
  const activeMatches = bucketsByDay.get(localYMD(activeDay)) || [];
  const liveCount = activeMatches.filter((m) => m.statusState === 'in').length;

  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${EPL_PURPLE}`,
        borderRadius: 3,
        // v0.11.28 — viewport-fit: the day-tab strip uses
        // flex+overflow-x:auto with `flex: 1 0 96px` per tab × 14 days
        // = ~1344 px of intrinsic content. Without `min-width: 0` +
        // `overflow: hidden` here, the section's natural width grew
        // past the dashboard-wrap (1280 px) and pushed match cards +
        // odds chips off the right edge. Now the section clips at its
        // parent's width and the strip scrolls inside.
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '14px 14px 8px',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            color: C.text,
            letterSpacing: -0.2,
          }}
        >
          {lang === 'id' ? 'Skor & Jadwal' : 'Scores & Schedule'}
        </h2>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
          {liveCount > 0 && (
            <span style={{ color: C.red, marginRight: 10 }}>
              ● {liveCount} {lang === 'id' ? 'LIVE' : 'LIVE'}
            </span>
          )}
          {lang === 'id' ? 'GESER ← →' : 'SWIPE ← →'}
        </div>
      </div>

      {/* Day tabs */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 2,
          padding: '0 10px',
          borderBottom: `1px solid ${C.lineSoft}`,
          scrollSnapType: 'x mandatory',
        }}
        className="sponsor-items day-strip-scroll"
      >
        {days.map((d, i) => {
          const dayMatches = bucketsByDay.get(localYMD(d)) || [];
          const active = i === activeIdx;
          const hasLive = dayMatches.some((m) => m.statusState === 'in');
          return (
            <button
              key={localYMD(d)}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-current={active ? 'date' : undefined}
              aria-label={`${dayTabLabel(d, lang)} ${dayTabSub(d)} — ${dayMatches.length} ${lang === 'id' ? 'laga' : 'matches'}${hasLive ? (lang === 'id' ? ', ada live' : ', live') : ''}`}
              style={{
                // v0.11.4 a11y — WCAG 2.5.8 (target 24×24 min, 44×44
                // enhanced). Was 9/13/9 px labels on ~38px tiles. Type
                // bumped to 11/13/11 + 56 px min-height matches NBA
                // DayScoreboard treatment for cross-sport consistency.
                flex: '1 0 96px',
                minHeight: 56,
                scrollSnapAlign: 'start',
                padding: '10px 8px',
                border: 'none',
                background: active ? C.panelRow : 'transparent',
                borderBottom: active ? `2px solid ${EPL_PURPLE}` : '2px solid transparent',
                cursor: 'pointer',
                color: active ? C.text : C.dim,
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: 1,
                  color: active ? EPL_PURPLE_TEXT : C.muted,
                  fontWeight: 700,
                }}
              >
                {dayTabLabel(d, lang)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 2,
                  color: active ? C.text : C.dim,
                }}
              >
                {dayTabSub(d)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: hasLive ? C.red : C.muted,
                  marginTop: 2,
                  fontWeight: hasLive ? 700 : 400,
                  letterSpacing: 0.3,
                }}
              >
                {dayMatches.length === 0
                  ? (lang === 'id' ? '—' : '—')
                  : hasLive
                    ? `● ${dayMatches.length}`
                    : `${dayMatches.length} ${lang === 'id' ? 'laga' : 'games'}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Matches for active day */}
      <div style={{ padding: '12px 14px 14px' }}>
        {error && (
          <div style={{ fontSize: 11, color: C.muted, padding: '8px 0' }}>
            {lang === 'id' ? 'Data ESPN lagi lambat. Muncul lagi otomatis.' : 'ESPN data slow — will refresh.'}
          </div>
        )}
        {loading && activeMatches.length === 0 && (
          <div style={{ fontSize: 11, color: C.dim, padding: '8px 0' }}>
            {lang === 'id' ? 'Memuat…' : 'Loading…'}
          </div>
        )}
        {!loading && activeMatches.length === 0 && (
          <div
            style={{
              fontSize: 11,
              color: C.dim,
              padding: '18px 0',
              textAlign: 'center',
            }}
          >
            {lang === 'id'
              ? 'Tidak ada laga di hari ini. Geser ke tanggal lain.'
              : 'No matches on this day. Swipe to another date.'}
          </div>
        )}
        {activeMatches.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {activeMatches.map((m) => (
              <MatchCard
                key={m.id}
                m={m}
                odds={oddsByMatchId?.[m.id]}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
