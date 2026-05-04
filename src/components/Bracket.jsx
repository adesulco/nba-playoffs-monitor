import React, { useMemo } from 'react';
import { TEAM_META, BRACKET_R1, PLAYIN_POOL, COLORS } from '../lib/constants.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

// Given live ESPN games AND historical seriesMap, figure out which play-in
// team is actually sitting at each conference's 8-seed. Rule: whichever team
// from the play-in pool has been matched up against the 1-seed in any R1
// game (today's scoreboard or any historical playoff date) is the advanced
// team. Falls back to null if we can't tell yet.
//
// v0.49.0 hotfix — earlier version only inspected today's `games` array.
// Once R1 progresses past G1 (we're typically at G3-G5 by the time most
// users open the dashboard), today's scoreboard rarely contains the
// specific 1-seed-vs-play-in matchup, so resolution failed and the
// bracket showed "Play-In TBD" indefinitely. Adding seriesMap (which
// spans the full playoff window via /scoreboard?dates=YYYYMMDD per
// useSeriesState) keeps resolution stable across the whole round.
function resolvePlayInWinner(games, seriesMap, oneSeedAbbr, poolNames) {
  const poolAbbrs = new Set(poolNames.map((n) => TEAM_META[n]?.abbr).filter(Boolean));

  // First try: today's live games (fastest signal — shows the matchup
  // before any series result has been logged).
  if (Array.isArray(games)) {
    for (const g of games) {
      const a = g.away?.abbr;
      const h = g.home?.abbr;
      if (!a || !h) continue;
      const pair = [a, h];
      if (!pair.includes(oneSeedAbbr)) continue;
      const other = pair.find((x) => x !== oneSeedAbbr);
      if (poolAbbrs.has(other)) {
        return poolNames.find((n) => TEAM_META[n]?.abbr === other) || null;
      }
    }
  }

  // Second try: historical series — useSeriesState keys are sorted
  // "ABBR1|ABBR2". Any pair containing the 1-seed AND a pool team
  // tells us the play-in winner advanced.
  if (seriesMap && typeof seriesMap === 'object') {
    for (const key of Object.keys(seriesMap)) {
      const [a, b] = key.split('|');
      if (a !== oneSeedAbbr && b !== oneSeedAbbr) continue;
      const other = a === oneSeedAbbr ? b : a;
      if (poolAbbrs.has(other)) {
        return poolNames.find((n) => TEAM_META[n]?.abbr === other) || null;
      }
    }
  }

  return null;
}

function TeamRow({ name, seed, odds, highlight, playInWinner }) {
  // If the raw bracket entry is a TBD placeholder and we've detected a winner,
  // swap it out for the real team. Once R1 tips off the team is no longer "the
  // play-in winner" in any meaningful sense — it's just the 8-seed — so we
  // don't flag the row anymore (was causing confusion for users who thought
  // the team was still in the play-in).
  const isTBD = typeof name === 'string' && name.startsWith('TBD');
  const resolvedName = isTBD && playInWinner ? playInWinner : name;
  const meta = TEAM_META[resolvedName] || { abbr: (resolvedName || '').slice(0, 3).toUpperCase(), color: '#333' };
  const stillTBD = isTBD && !playInWinner;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 20px 1fr auto',
        alignItems: 'center',
        gap: 6,
        padding: '5px 7px',
        background: highlight ? 'rgba(255,179,71,0.08)' : COLORS.panelRow,
        borderLeft: highlight ? `2px solid ${COLORS.amber}` : '2px solid transparent',
        fontSize: 10,
      }}
    >
      <span style={{ color: COLORS.muted, fontSize: 9 }}>{seed}</span>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          background: stillTBD ? '#333' : meta.color,
          fontSize: 7.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {stillTBD ? '?' : meta.abbr}
      </div>
      <span style={{ color: stillTBD ? COLORS.muted : COLORS.text }}>
        {stillTBD ? 'Play-In TBD' : (resolvedName || '').split(' ').slice(-1)[0]}
      </span>
      {odds && !stillTBD && (
        <span style={{ color: COLORS.amberBright, fontSize: 9.5, fontWeight: 600 }}>{odds}%</span>
      )}
    </div>
  );
}

function SeriesWatermark({ a, b, aAbbr, bAbbr, seriesMap }) {
  if (!aAbbr || !bAbbr || !seriesMap) return null;
  const key = [aAbbr, bAbbr].sort().join('|');
  const rec = seriesMap[key];
  if (!rec) return null;
  const aW = rec[aAbbr] || 0;
  const bW = rec[bAbbr] || 0;
  if (aW + bW === 0) return null;

  let label;
  if (aW + bW >= 4 && (aW === 4 || bW === 4)) {
    label = `${aW > bW ? aAbbr : bAbbr} WINS ${Math.max(aW, bW)}-${Math.min(aW, bW)}`;
  } else if (aW === bW) {
    label = `TIED ${aW}-${bW}`;
  } else {
    label = `${aW > bW ? aAbbr : bAbbr} LEADS ${Math.max(aW, bW)}-${Math.min(aW, bW)}`;
  }

  return (
    <div
      style={{
        fontSize: 8.5,
        letterSpacing: 0.5,
        color: COLORS.amber,
        padding: '2px 7px',
        borderTop: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.panelSoft,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}

function Series({ series, oddsMap, seriesMap, playInWinner }) {
  const [a, b] = series.teams;
  // For watermark + favorite-highlight purposes, use the resolved names.
  const resolvedA = a && a.startsWith('TBD') && playInWinner ? playInWinner : a;
  const resolvedB = b && b.startsWith('TBD') && playInWinner ? playInWinner : b;
  const oA = oddsMap[resolvedA];
  const oB = oddsMap[resolvedB];
  const favorite = (oA || 0) >= (oB || 0) ? resolvedA : resolvedB;
  const aAbbr = TEAM_META[resolvedA]?.abbr;
  const bAbbr = TEAM_META[resolvedB]?.abbr;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.bg,
        marginBottom: 6,
      }}
    >
      <TeamRow name={a} seed={series.seeds[0]} odds={oA} highlight={favorite === resolvedA} playInWinner={playInWinner} />
      <div style={{ height: 1, background: COLORS.lineSoft }} />
      <TeamRow name={b} seed={series.seeds[1]} odds={oB} highlight={favorite === resolvedB} playInWinner={playInWinner} />
      <SeriesWatermark a={resolvedA} b={resolvedB} aAbbr={aAbbr} bAbbr={bAbbr} seriesMap={seriesMap} />
    </div>
  );
}

export default function Bracket({ championOdds, seriesMap, games }) {
  const oddsMap = Object.fromEntries((championOdds || []).map((o) => [o.name, o.pct]));
  const isMobile = useIsMobile();

  // Auto-resolve the two 8-seeds. v0.49.0 hotfix — also inspects
  // seriesMap so resolution stays correct after Round 1 G1 (when
  // today's scoreboard no longer carries the specific 1-seed-vs-
  // play-in matchup).
  const playInWinners = useMemo(() => ({
    east: resolvePlayInWinner(games, seriesMap, 'DET', PLAYIN_POOL.east),
    west: resolvePlayInWinner(games, seriesMap, 'OKC', PLAYIN_POOL.west),
  }), [games, seriesMap]);

  const ConfHeader = ({ label }) => (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 1.2,
        color: COLORS.dim,
        marginBottom: 6,
        borderBottom: `1px solid ${COLORS.lineSoft}`,
        paddingBottom: 3,
      }}
    >
      {label}
    </div>
  );

  // v0.13.5 Sprint 2 Theme C, Ship D — mobile bracket carousel.
  //
  // Pre-fix: 8 series stacked vertically = ~520 px tall in the
  // col-1 sidebar. After Ship C's mobile reflow, bracket is pushed
  // below the live ticker and odds, but it still consumes 520 px
  // of vertical scroll for what is, on mobile, lookup-only content.
  //
  // Now: ≤720 px renders 8 series as a horizontal scroll-snap
  // carousel (one card per snap point, swipe between). Conference
  // is shown as a tag on each card. Total height drops from ~520 px
  // to ~140 px. Desktop behaviour is unchanged.
  if (isMobile) {
    const cards = [
      ...BRACKET_R1.east.map((s, i) => ({
        s, key: `e-${i}`, conf: 'EAST',
        playInWinner: s.seeds.includes(8) ? playInWinners.east : null,
      })),
      ...BRACKET_R1.west.map((s, i) => ({
        s, key: `w-${i}`, conf: 'WEST',
        playInWinner: s.seeds.includes(8) ? playInWinners.west : null,
      })),
    ];
    return (
      <div style={{ padding: '10px 0 4px' }}>
        <div
          className="day-strip-scroll"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            padding: '0 12px 8px',
            scrollPadding: '0 12px',
          }}
        >
          {cards.map(({ s, key, conf, playInWinner }) => (
            <div
              key={key}
              style={{
                flex: '0 0 calc(100vw - 56px)',
                maxWidth: 360,
                scrollSnapAlign: 'start',
                background: COLORS.panel,
                border: `1px solid ${COLORS.lineSoft}`,
                borderRadius: 4,
                padding: '8px 10px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: 8.5,
                  letterSpacing: 1.2,
                  color: COLORS.muted,
                  marginBottom: 6,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                {conf}
              </div>
              <Series
                series={s}
                oddsMap={oddsMap}
                seriesMap={seriesMap}
                playInWinner={playInWinner}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: COLORS.muted,
            textAlign: 'center',
            letterSpacing: 0.5,
            padding: '0 12px',
          }}
        >
          Geser ← → · Highlighted = title favorite (Polymarket)
        </div>
      </div>
    );
  }

  // Desktop: original vertical stack.
  return (
    <div style={{ padding: '10px 12px' }}>
      <ConfHeader label="EASTERN CONFERENCE" />
      {BRACKET_R1.east.map((s, i) => (
        <Series
          key={`e-${i}`}
          series={s}
          oddsMap={oddsMap}
          seriesMap={seriesMap}
          playInWinner={s.seeds.includes(8) ? playInWinners.east : null}
        />
      ))}
      <div style={{ height: 10 }} />
      <ConfHeader label="WESTERN CONFERENCE" />
      {BRACKET_R1.west.map((s, i) => (
        <Series
          key={`w-${i}`}
          series={s}
          oddsMap={oddsMap}
          seriesMap={seriesMap}
          playInWinner={s.seeds.includes(8) ? playInWinners.west : null}
        />
      ))}
      <div
        style={{
          marginTop: 10,
          fontSize: 9,
          color: COLORS.muted,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        Highlighted = title favorite per Polymarket
      </div>
    </div>
  );
}
