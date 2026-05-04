import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { formatFixtureDate } from '../lib/sports/liga-1-id/clubs.js';
import ShareButton from './ShareButton.jsx';
// v0.14.5 — match-detail enrichment via API-Football (league=274).
// Stats (possession + xG + shots) and lineups (formation + XI +
// bench + coach) populate when the user expands a match card.
import { useSuperLeagueMatchStatistics } from '../hooks/useSuperLeagueMatchStatistics.js';
import { useSuperLeagueMatchLineups } from '../hooks/useSuperLeagueMatchLineups.js';

/**
 * Super League day-swipe scoreboard — minimal port of EPLDayScoreboard
 * without Polymarket odds (no IDN markets exist as of 2026-04).
 *
 * Anatomy:
 *   [ Day tabs · horizontal scroll-snap · ±7 days ]
 *   [ Cards for matches on the active day ]
 *
 * Each card shows: home, away, score (FT) or kickoff time (WIB), match
 * status, and a ShareButton. Live matches get a red pulse dot.
 */

const SL_RED = '#E2231A'; // mirrors Persija accent — used as Super League accent

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

function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bucketByDay(fixtures) {
  const buckets = new Map();
  for (const fx of fixtures) {
    const d = new Date(fx.kickoffUtc);
    if (Number.isNaN(d.getTime())) continue;
    // Bucket by WIB calendar day (UTC+7) so cards align with what fans see locally.
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const key = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}-${String(wib.getUTCDate()).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(fx);
  }
  // Sort each bucket: live first, then by kickoff time.
  for (const arr of buckets.values()) {
    arr.sort((a, b) => {
      if (a.statusState === 'in' && b.statusState !== 'in') return -1;
      if (b.statusState === 'in' && a.statusState !== 'in') return 1;
      return new Date(a.kickoffUtc) - new Date(b.kickoffUtc);
    });
  }
  return buckets;
}

function dayLabel(date, lang) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return lang === 'id' ? 'HARI INI' : 'TODAY';
  if (diff === -1) return lang === 'id' ? 'KEMARIN' : 'YESTERDAY';
  if (diff === 1) return lang === 'id' ? 'BESOK' : 'TOMORROW';
  const dow = lang === 'id'
    ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()]
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${dow.toUpperCase()} ${d.getDate()}`;
}

function MatchCard({ fx, lang }) {
  const isLive = fx.statusState === 'in';
  const isFinal = fx.statusState === 'post';
  const homeWin = isFinal && fx.home.winner;
  const awayWin = isFinal && fx.away.winner;
  const draw = isFinal && !homeWin && !awayWin;

  const accentTop = isLive
    ? '#EF4444'
    : isFinal
    ? '#1F2937'
    : SL_RED;

  // v0.14.5 — whole-card expand to reveal stats + lineups. Same
  // pattern as EPL MatchCard (Sprint 2 Theme C Ship E): role="button"
  // on the outer wrapper, click handler bails if the click landed on
  // a nested <a> or <button> so team-name links + share button still
  // work. Pre-game cards (no stats yet) skip the expand affordance.
  const [expanded, setExpanded] = useState(false);
  const canExpand = isLive || isFinal;

  const { home: statsHome, away: statsAway } = useSuperLeagueMatchStatistics({
    homeName: fx.home?.name,
    awayName: fx.away?.name,
    dateISO: fx.kickoffUtc,
    isLive,
    enabled: expanded,
  });
  const { home: lineupsHome, away: lineupsAway } = useSuperLeagueMatchLineups({
    homeName: fx.home?.name,
    awayName: fx.away?.name,
    dateISO: fx.kickoffUtc,
    isLive,
    enabled: expanded,
  });

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
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderTop: `2px solid ${accentTop}`,
        borderRadius: 4,
        cursor: canExpand ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 10,
        padding: '14px 14px 12px',
        position: 'relative',
        minHeight: 88,
      }}
    >
      {/* Status row */}
      <div style={{
        position: 'absolute', top: 6, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 9, letterSpacing: 1.1, color: C.muted, textTransform: 'uppercase',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isLive && (
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: '#EF4444', boxShadow: '0 0 0 0 rgba(239,68,68,0.7)',
              animation: 'pulse 1.6s infinite',
            }} />
          )}
          <span style={{ color: isLive ? '#EF4444' : C.muted, fontWeight: 600 }}>
            {isLive ? (lang === 'id' ? 'LIVE' : 'LIVE')
              : isFinal ? (lang === 'id' ? 'FT' : 'FT')
              : formatFixtureDate(fx.kickoffUtc, lang).split('·')[1]?.trim() || ''}
          </span>
        </span>
        <ShareButton
          title={`${fx.home.name} vs ${fx.away.name} · Super League ${
            isFinal ? `${fx.homeScore ?? 0}–${fx.awayScore ?? 0}` : ''
          }`}
          url={`/super-league-2025-26`}
          accent={SL_RED}
          size="sm"
          label=""
          analyticsEvent="superleague_share_match"
        />
      </div>

      {/* Home */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingTop: 14 }}>
        {fx.home.slug ? (
          <Link to={`/super-league-2025-26/club/${fx.home.slug}`} style={{
            color: C.text, textDecoration: 'none',
            fontWeight: homeWin ? 700 : isFinal ? 400 : 600,
            opacity: isFinal && !homeWin && !draw ? 0.6 : 1,
            fontSize: 13, lineHeight: 1.2,
          }}>
            {fx.home.name}
          </Link>
        ) : (
          <span style={{
            color: C.text, fontWeight: homeWin ? 700 : 500, fontSize: 13, lineHeight: 1.2,
          }}>{fx.home.name}</span>
        )}
        <span style={{ fontSize: 9, color: C.muted, marginTop: 2, letterSpacing: 0.5 }}>
          {lang === 'id' ? 'TUAN RUMAH' : 'HOME'}
        </span>
      </div>

      {/* Score / vs */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        paddingTop: 14, minWidth: 64,
      }}>
        {isFinal || isLive ? (
          <div style={{
            fontSize: 22, fontWeight: 700, color: C.text,
            fontFamily: 'var(--font-mono)', letterSpacing: -0.5,
          }}>
            {fx.homeScore ?? fx.home.score ?? 0}
            <span style={{ color: C.muted, margin: '0 6px' }}>–</span>
            {fx.awayScore ?? fx.away.score ?? 0}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>VS</div>
        )}
        {isLive && fx.statusDetail && (
          <div style={{ fontSize: 9, color: '#EF4444', fontWeight: 600 }}>
            {fx.statusDetail}
          </div>
        )}
      </div>

      {/* Away */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 14 }}>
        {fx.away.slug ? (
          <Link to={`/super-league-2025-26/club/${fx.away.slug}`} style={{
            color: C.text, textDecoration: 'none',
            fontWeight: awayWin ? 700 : isFinal ? 400 : 600,
            opacity: isFinal && !awayWin && !draw ? 0.6 : 1,
            fontSize: 13, lineHeight: 1.2, textAlign: 'right',
          }}>
            {fx.away.name}
          </Link>
        ) : (
          <span style={{
            color: C.text, fontWeight: awayWin ? 700 : 500, fontSize: 13, lineHeight: 1.2, textAlign: 'right',
          }}>{fx.away.name}</span>
        )}
        <span style={{ fontSize: 9, color: C.muted, marginTop: 2, letterSpacing: 0.5 }}>
          {lang === 'id' ? 'TANDANG' : 'AWAY'}
        </span>
      </div>
    </div>

    {/* v0.14.5 — Match detail panel (stats + lineups). Lazy-loaded:
        the API-Football fetches only fire when `expanded` flips true.
        Renders nothing if neither stats nor lineups returned data
        (some Liga 1 matches have partial coverage on API-Football). */}
    {expanded && canExpand && (
      <SLMatchDetailPanel
        statsHome={statsHome}
        statsAway={statsAway}
        lineupsHome={lineupsHome}
        lineupsAway={lineupsAway}
        homeAccent={fx.home.accent || SL_RED}
        awayAccent={fx.away.accent || SL_RED}
        lang={lang}
      />
    )}
    </div>
  );
}

// v0.14.5 — Match detail panel for Super League. Renders possession
// + xG + shots + corners + fouls (when API-Football provides them)
// and formation + starting XI + bench + coach. Both halves are
// optional — the panel renders only the sections that have data.
function SLMatchDetailPanel({
  statsHome, statsAway, lineupsHome, lineupsAway, homeAccent, awayAccent, lang,
}) {
  const hasStats = !!(statsHome || statsAway);
  const hasLineups = !!(lineupsHome?.startXI?.length || lineupsAway?.startXI?.length);
  if (!hasStats && !hasLineups) {
    return (
      <div style={{
        borderTop: `1px solid ${C.lineSoft}`,
        padding: '10px 14px',
        background: C.panelSoft,
        fontSize: 10.5, color: C.muted,
      }}>
        {lang === 'id'
          ? 'Statistik & susunan pemain belum tersedia untuk laga ini.'
          : 'Stats & lineups not available for this match yet.'}
      </div>
    );
  }
  return (
    <div style={{
      borderTop: `1px solid ${C.lineSoft}`,
      background: C.panelSoft,
      padding: '12px 14px',
      fontSize: 11,
      lineHeight: 1.45,
    }}>
      {hasStats && (
        <SLStatsRow
          home={statsHome}
          away={statsAway}
          homeAccent={homeAccent}
          awayAccent={awayAccent}
          lang={lang}
        />
      )}
      {hasLineups && (
        <SLLineupsRow
          home={lineupsHome}
          away={lineupsAway}
          homeAccent={homeAccent}
          awayAccent={awayAccent}
          lang={lang}
          marginTop={hasStats ? 14 : 0}
        />
      )}
    </div>
  );
}

function SLStatsRow({ home, away, homeAccent, awayAccent, lang }) {
  const homePoss = home?.possession;
  const awayPoss = away?.possession;
  const haveBar = homePoss !== null && awayPoss !== null;

  const items = [
    { key: 'shots',    label: lang === 'id' ? 'Tembakan'   : 'Shots',     h: home?.shots,         a: away?.shots },
    { key: 'sot',      label: lang === 'id' ? 'Tepat sasaran' : 'On target', h: home?.shotsOnTarget, a: away?.shotsOnTarget },
    { key: 'xg',       label: 'xG',                                       h: fmtFloat(home?.xG),   a: fmtFloat(away?.xG) },
    { key: 'corners',  label: lang === 'id' ? 'Sepak pojok' : 'Corners',  h: home?.corners,       a: away?.corners },
    { key: 'fouls',    label: lang === 'id' ? 'Pelanggaran' : 'Fouls',    h: home?.fouls,         a: away?.fouls },
  ].filter((it) => it.h != null || it.a != null);

  if (!haveBar && items.length === 0) return null;
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: 1.2, color: C.dim, fontWeight: 700, textTransform: 'uppercase',
      }}>
        <span>{lang === 'id' ? 'Statistik laga' : 'Match stats'}</span>
        <span style={{ color: C.muted, fontSize: 9, fontWeight: 400 }}>API-Football</span>
      </div>
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
            overflow: 'hidden', background: '#1c2840',
          }}>
            <div style={{ width: `${homePoss}%`, background: homeAccent, transition: 'width 400ms ease-out' }} />
            <div style={{ width: `${awayPoss}%`, background: awayAccent, transition: 'width 400ms ease-out' }} />
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          {items.map((it) => (
            <div
              key={it.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10, alignItems: 'center',
                fontSize: 10.5, fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ textAlign: 'right', color: C.text, fontWeight: 600 }}>
                {it.h != null ? it.h : '—'}
              </span>
              <span style={{
                color: C.muted, fontSize: 9.5, letterSpacing: 0.6,
                textAlign: 'center', whiteSpace: 'nowrap',
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

function SLLineupsRow({ home, away, homeAccent, awayAccent, lang, marginTop }) {
  return (
    <div style={{
      marginTop,
      paddingTop: marginTop > 0 ? 12 : 0,
      borderTop: marginTop > 0 ? `1px solid ${C.lineSoft}` : 'none',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: 1.2, color: C.dim, fontWeight: 700, textTransform: 'uppercase',
      }}>
        <span>{lang === 'id' ? 'Susunan pemain' : 'Lineups'}</span>
        <span style={{ color: C.muted, fontSize: 9, fontWeight: 400 }}>API-Football</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SLLineupColumn data={home} accent={homeAccent} lang={lang} />
        <SLLineupColumn data={away} accent={awayAccent} lang={lang} />
      </div>
    </div>
  );
}

function SLLineupColumn({ data, accent, lang }) {
  if (!data) return <div style={{ fontSize: 10.5, color: C.muted }}>—</div>;
  return (
    <div>
      {data.formation && (
        <div style={{
          display: 'inline-block', padding: '2px 7px', marginBottom: 6,
          background: `${accent}22`, border: `1px solid ${accent}`,
          borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6, color: C.text, fontWeight: 700,
        }}>
          {data.formation}
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 3 }}>
        {data.startXI.map((p, i) => (
          <li key={`${p.number ?? 'n'}-${i}`} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 18px',
            gap: 6, fontSize: 10.5, alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: C.dim, fontWeight: 700, textAlign: 'right' }}>
              {p.number ?? '·'}
            </span>
            <span style={{ color: C.text }}>{p.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.muted, textAlign: 'right' }}>
              {p.pos}
            </span>
          </li>
        ))}
      </ul>
      {data.coach?.name && (
        <div style={{
          marginTop: 8, paddingTop: 6,
          borderTop: `1px solid ${C.lineSoft}`,
          fontSize: 10, color: C.muted,
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

function fmtFloat(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export default function SuperLeagueDayScoreboard({ fixtures, lang = 'id' }) {
  const [activeKey, setActiveKey] = useState(() => ymdLocal(new Date()));
  const tabsRef = useRef(null);

  const days = useMemo(() => buildDayWindow(new Date()), []);
  const buckets = useMemo(() => bucketByDay(fixtures || []), [fixtures]);

  // Auto-snap to today on first mount.
  useEffect(() => {
    const todayKey = ymdLocal(new Date());
    setActiveKey(todayKey);
    const el = tabsRef.current?.querySelector(`[data-day="${todayKey}"]`);
    el?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
  }, []);

  const activeMatches = buckets.get(activeKey) || [];

  return (
    <div>
      <div
        ref={tabsRef}
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 0 8px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          borderBottom: `1px solid ${C.lineSoft}`,
          marginBottom: 14,
        }}
      >
        {days.map((d) => {
          const key = ymdLocal(d);
          const isActive = key === activeKey;
          const count = buckets.get(key)?.length || 0;
          return (
            <button
              key={key}
              data-day={key}
              onClick={() => setActiveKey(key)}
              style={{
                flex: '0 0 auto',
                scrollSnapAlign: 'center',
                padding: '6px 12px',
                background: isActive ? SL_RED : 'transparent',
                color: isActive ? '#fff' : count > 0 ? C.text : C.muted,
                border: `1px solid ${isActive ? SL_RED : C.line}`,
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: 0.6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {dayLabel(d, lang)}
              {count > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 9, opacity: 0.85,
                  background: 'rgba(0,0,0,0.18)', padding: '1px 5px', borderRadius: 8,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeMatches.length === 0 ? (
        <div style={{
          padding: '24px 16px', textAlign: 'center', color: C.dim,
          background: C.panelSoft, border: `1px dashed ${C.lineSoft}`,
          borderRadius: 4, fontSize: 12,
        }}>
          {lang === 'id'
            ? 'Belum ada laga di tanggal ini. Cek hari lain di bar atas.'
            : 'No matches on this day. Try another day above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {activeMatches.map((fx) => (
            <MatchCard key={fx.id} fx={fx} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
