import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { formatFixtureDate } from '../lib/sports/epl/clubs.js';
import ShareButton from './ShareButton.jsx';

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

  const timeLabel = post
    ? (lang === 'id' ? 'FULL TIME' : 'FULL TIME')
    : live
      ? (m.statusDetail || 'LIVE')
      : formatFixtureDate(m.kickoffUtc, lang).split('·')[1]?.trim() || '';

  const shareUrl = `https://www.gibol.co/premier-league-2025-26#${m.id || ''}`;

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${live ? C.red : C.lineSoft}`,
        borderLeft: `3px solid ${live ? C.red : EPL_PURPLE}`,
        borderRadius: 3,
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
            <Link to={`/premier-league-2025-26/club/${m.home.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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

      {/* Center: score or clock */}
      <div style={{ textAlign: 'center', minWidth: 84 }}>
        {hasScore ? (
          <>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                fontWeight: 800,
                color: C.text,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {(live ? m.home.score : m.homeScore) ?? '-'}
              <span style={{ color: C.dim, margin: '0 6px' }}>–</span>
              {(live ? m.away.score : m.awayScore) ?? '-'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: live ? C.red : C.muted,
                letterSpacing: 0.8,
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
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
                fontSize: 17,
                fontWeight: 700,
                color: C.text,
                lineHeight: 1,
              }}
            >
              {timeLabel || 'TBC'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: C.muted,
                letterSpacing: 0.6,
                marginTop: 4,
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
            <Link to={`/premier-league-2025-26/club/${m.away.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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

      {/* Right: odds + share */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          analyticsEvent="epl_share_day"
        />
      </div>
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

    for (const [, arr] of buckets) {
      arr.sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc));
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
        className="sponsor-items"
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
              style={{
                flex: '1 0 90px',
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
                  fontSize: 9,
                  letterSpacing: 1,
                  color: active ? EPL_PURPLE : C.muted,
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
                  fontSize: 9,
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
