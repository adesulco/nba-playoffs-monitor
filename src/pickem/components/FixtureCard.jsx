import React, { useEffect, useMemo, useState } from 'react';
import Flag from '../Flag.jsx';
import { LockIcon } from '../icons.jsx';
import {
  StatePill,
  ProbabilityChip,
  LockCountdown,
  ScoreStepper,
  JagoanToggle,
  OutcomePicker,
  PointsPill,
  ScoreBreakdown,
} from './primitives.jsx';
import { previewScoring, DEFAULT_MATCH_RULES } from '../../lib/pickemScoring.js';
import { usePickemT } from '../i18n.js';

// ============================================================================
// v0.67.0 — <FixtureCard /> (Pick'em P2 match-predictor spine).
//
// One card, five body variants, derived from (fixture.status + prediction +
// now() vs lock_at). Anatomy from design-handoff-pickem/js/components.jsx#8.
// Controlled component — parent owns the prediction; the card calls
// onPredictionChange(partial) on every edit and the parent persists
// (debouncing where useful).
//
//   open    — fixture.status='scheduled' AND lock_at > now()
//   locked  — fixture.status='scheduled' AND lock_at <= now()
//   live    — fixture.status='live'
//   scored  — fixture.status='final' AND prediction.scored_at set
//   missed  — fixture.status='final' AND no prediction for the user
//
// `compact` (default false) renders just the scoreboard — no body — for
// dense lists where the user clicks through to the Fixture Detail screen.
// ============================================================================

export function deriveCardState(fixture, prediction, now = Date.now()) {
  if (!fixture) return 'open';
  if (fixture.status === 'final') {
    return prediction && prediction.scored_at ? 'scored' : 'missed';
  }
  if (fixture.status === 'live') return 'live';
  const lock = new Date(fixture.lock_at || 0).getTime();
  if (lock && lock <= now) return 'locked';
  return 'open';
}

/**
 * Format an absolute lock_at timestamp into the "Xj Ym" / "Xm Ys" string
 * shown on open cards. < 60s → "lock!"; < 1h flags urgent.
 */
export function formatLockCountdown(lockAt, now = Date.now()) {
  if (!lockAt) return { value: '—', urgent: false };
  const ms = new Date(lockAt).getTime() - now;
  if (ms <= 0) return { value: 'LOCKED', urgent: true };
  const totalMin = Math.floor(ms / 60000);
  const totalHr = Math.floor(totalMin / 60);
  const totalDay = Math.floor(totalHr / 24);
  if (totalDay >= 1) {
    return { value: `${totalDay}d ${totalHr % 24}h`, urgent: false };
  }
  if (totalHr >= 1) {
    return { value: `${totalHr}h ${totalMin % 60}m`, urgent: totalHr < 3 };
  }
  if (totalMin >= 1) {
    return { value: `${totalMin}m`, urgent: true };
  }
  return { value: `${Math.max(0, Math.ceil(ms / 1000))}s`, urgent: true };
}

export default function FixtureCard({
  fixture,
  homeTeam,
  awayTeam,
  prediction,
  onPredictionChange,
  onOpenDetail,
  rules = DEFAULT_MATCH_RULES,
  compact = false,
  // v0.79.7 — false for competitions whose shape rules out draws
  // (NBA Playoffs best-of-7 series). Passed down to BodyOpen which
  // forwards to OutcomePicker.
  allowDraw = true,
}) {
  const state = useDerivedState(fixture, prediction);
  const lockInfo = useLockCountdown(fixture?.lock_at);

  if (!fixture) return null;

  const home = homeTeam || { name: '—', short: '—', code: 'XXX' };
  const away = awayTeam || { name: '—', short: '—', code: 'XXX' };

  const odds = useMemo(() => probsToPercent(fixture), [fixture.p_home, fixture.p_draw, fixture.p_away]);

  return (
    <article
      role={onOpenDetail ? 'button' : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (onOpenDetail && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      data-pickem-fixture-id={fixture.id}
      style={{
        background: 'var(--bg-raised)',
        borderRadius: 14,
        border: '1px solid var(--line-1)',
        fontFamily: 'var(--font-ui-pickem)',
        color: 'var(--ink-1)',
        overflow: 'hidden',
        cursor: onOpenDetail ? 'pointer' : 'default',
        transition: 'border-color 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      <header
        style={{
          padding: '12px 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="p-eyebrow">{fixture.stage || ''}</div>
        <StatePill
          state={state === 'open' ? 'open' : state}
          kickoff={state === 'open' ? formatKickoff(fixture.kickoff_at) : undefined}
        />
      </header>

      <Scoreboard fixture={fixture} home={home} away={away} state={state} />

      {!compact && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--line-1)' }}>
          {state === 'open' && (
            <BodyOpen
              fixture={fixture}
              homeTeam={home}
              awayTeam={away}
              prediction={prediction}
              odds={odds}
              lockInfo={lockInfo}
              onPredictionChange={onPredictionChange}
              rules={rules}
              allowDraw={allowDraw}
            />
          )}
          {state === 'locked' && (
            <BodyLocked
              fixture={fixture}
              home={home}
              away={away}
              prediction={prediction}
              rules={rules}
            />
          )}
          {state === 'live' && (
            <BodyLive fixture={fixture} home={home} away={away} prediction={prediction} />
          )}
          {state === 'scored' && (
            <BodyScored fixture={fixture} home={home} away={away} prediction={prediction} />
          )}
          {state === 'missed' && (
            <BodyMissed fixture={fixture} home={home} away={away} prediction={prediction} />
          )}
        </div>
      )}
    </article>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function useDerivedState(fixture, prediction) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!fixture || fixture.status === 'final') return undefined;
    // Tick once a minute so the open → locked transition is reflected
    // without an explicit page reload.
    const tm = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tm);
  }, [fixture?.id, fixture?.status]);
  return deriveCardState(fixture, prediction, now);
}

function useLockCountdown(lockAt) {
  const [info, setInfo] = useState(() => formatLockCountdown(lockAt));
  useEffect(() => {
    if (!lockAt) return undefined;
    setInfo(formatLockCountdown(lockAt));
    const ms = new Date(lockAt).getTime() - Date.now();
    if (ms <= 0) return undefined;
    // Tick every 30s while open, every 5s in the final minute.
    const tick = ms > 60_000 ? 30_000 : 5_000;
    const tm = setInterval(() => setInfo(formatLockCountdown(lockAt)), tick);
    return () => clearInterval(tm);
  }, [lockAt]);
  return info;
}

function probsToPercent(fixture) {
  if (!fixture || fixture.p_home == null) return {};
  return {
    home: Math.round(Number(fixture.p_home) * 100),
    draw: Math.round(Number(fixture.p_draw) * 100),
    away: Math.round(Number(fixture.p_away) * 100),
  };
}

function formatKickoff(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso)) + ' WIB';
  } catch {
    return null;
  }
}

// ── Scoreboard (shared across all 5 states) ────────────────────────────────

function Scoreboard({ fixture, home, away, state }) {
  return (
    <div
      style={{
        padding: '14px 16px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <TeamColumn team={home} align="flex-start" />
      <ScoreSlot fixture={fixture} state={state} />
      <TeamColumn team={away} align="flex-end" />
    </div>
  );
}

function TeamColumn({ team, align }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 6 }}>
      <Flag code={team.code} w={32} h={22} round={3} />
      <span
        style={{
          fontFamily: 'var(--font-ui-pickem)',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--ink-2)',
          textAlign: align === 'flex-end' ? 'right' : 'left',
        }}
      >
        {team.name}
      </span>
    </div>
  );
}

function ScoreSlot({ fixture, state }) {
  // v0.81.0 — show the real scoreline for ANY game that has one, not just
  // live/scored. Previously a finished game the user didn't predict
  // ('missed') — or a started game still flagged 'locked' by a lagging feed
  // — rendered "– : –", so past results looked blank. Now: if the fixture
  // carries a score, we display it (FULL TIME unless it's live).
  const hasScore = fixture.home_score != null && fixture.away_score != null;
  const showResult =
    hasScore && (state === 'live' || state === 'scored' || state === 'missed' || state === 'locked');
  if (showResult) {
    const h = fixture.home_score ?? 0;
    const a = fixture.away_score ?? 0;
    const isLive = state === 'live';
    return (
      <div style={{ textAlign: 'center', minWidth: 100 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 44,
            color: isLive ? 'var(--p-live)' : 'var(--ink-1)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {h} : {a}
        </div>
        {isLive ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <span className="p-live-dot" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--p-live)',
                letterSpacing: '0.08em',
              }}
            >
              LIVE
            </span>
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
              marginTop: 6,
            }}
          >
            FULL TIME
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', minWidth: 100 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 36,
          color: state === 'open' ? 'var(--ink-4)' : 'var(--ink-3)',
          letterSpacing: '0.04em',
        }}
      >
        – : –
      </div>
    </div>
  );
}

// ── Body: open (predict mode) ──────────────────────────────────────────────

function BodyOpen({ fixture, homeTeam, awayTeam, prediction, odds, lockInfo, onPredictionChange, rules, allowDraw = true }) {
  const tx = usePickemT();
  const outcome = prediction?.picked_outcome || null;
  const pickedHome = prediction?.picked_home;
  const pickedAway = prediction?.picked_away;
  const isJagoan = !!prediction?.is_jagoan;
  const hasExactScore = pickedHome != null && pickedAway != null;

  // v0.81.0 — NO auto 1-0. The exact score is OPT-IN: steppers stay hidden
  // (and picked_home/away stay null → an outcome-only prediction) until the
  // user taps "Add exact score". Once shown, the steppers start at 0-0, not
  // a fabricated 1-0. Per Ade: "for new games don't automatic put 1-0, and
  // choosing score should be easier."
  const [showScore, setShowScore] = useState(hasExactScore);
  const [draftHome, setDraftHome] = useState(pickedHome ?? 0);
  const [draftAway, setDraftAway] = useState(pickedAway ?? 0);

  useEffect(() => {
    if (pickedHome != null) setDraftHome(pickedHome);
    if (pickedAway != null) setDraftAway(pickedAway);
    if (pickedHome != null && pickedAway != null) setShowScore(true);
  }, [pickedHome, pickedAway]);

  const setOutcome = (next) => {
    // Picking the winner is the primary action — saves outcome-only. The
    // exact score (if the user opens it) is layered on separately via setScore.
    onPredictionChange?.({ picked_outcome: next });
  };
  const setScore = (h, a) => {
    setDraftHome(h);
    setDraftAway(a);
    // The score the user enters defines the outcome too (no contradictions).
    // A level score under a draw-less competition keeps the prior outcome.
    const derived = h > a ? 'H' : h < a ? 'A' : (allowDraw ? 'D' : outcome || null);
    onPredictionChange?.({ picked_home: h, picked_away: a, picked_outcome: derived });
  };
  const openScore = () => {
    setShowScore(true);
    // Seed from the picked outcome so the first step is in the right direction
    // WITHOUT inventing a scoreline: decisive picks start 1-0 in the favored
    // team's column ONLY after the user explicitly asks for the score row.
    if (outcome === 'H') setScore(1, 0);
    else if (outcome === 'A') setScore(0, 1);
    // draw / no-outcome → leave at 0-0.
  };
  const clearScore = () => {
    setShowScore(false);
    setDraftHome(0);
    setDraftAway(0);
    onPredictionChange?.({ picked_home: null, picked_away: null });
  };
  const toggleJagoan = () => onPredictionChange?.({ is_jagoan: !isJagoan });

  const preview = previewScoring({
    pickedOutcome: outcome,
    pickedHome: outcome && showScore ? draftHome : null,
    pickedAway: outcome && showScore ? draftAway : null,
    isJagoan,
    stage: fixture.stage,
    fixture,
    rules,
  });

  const koMult = (rules.ko_stages || DEFAULT_MATCH_RULES.ko_stages).includes(fixture.stage)
    ? rules.jagoan_mult_ko
    : rules.jagoan_mult_group;

  // Team codes for the picker + steppers so the user knows WHICH team.
  const homeCode = homeTeam?.code || fixture.home?.tricode || fixture.home_team || tx('Home', 'Tuan rumah');
  const awayCode = awayTeam?.code || fixture.away?.tricode || fixture.away_team || tx('Away', 'Tamu');
  const outcomeHint = `${tx('Predict result', 'Prediksi hasil')}: ${homeCode} vs ${awayCode}`;
  const outcomeLabels = { H: homeCode, D: tx('Draw', 'Seri'), A: awayCode };

  return (
    <div style={{ paddingTop: 14 }}>
      <OutcomePicker
        odds={odds}
        value={outcome}
        onChange={setOutcome}
        allowDraw={allowDraw}
        hint={outcomeHint}
        labels={outcomeLabels}
      />

      {/* Exact score — opt-in. Collapsed by default so a "new" card never
          looks like a 1-0 prediction was already made. */}
      <div style={{ marginTop: 12 }}>
        {!showScore ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openScore}
              disabled={!outcome}
              style={{
                appearance: 'none',
                cursor: outcome ? 'pointer' : 'not-allowed',
                opacity: outcome ? 1 : 0.5,
                background: 'transparent',
                border: '1px dashed var(--line-2)',
                borderRadius: 8,
                padding: '8px 12px',
                minHeight: 40,
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-ui-pickem)',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              + {tx('Add exact score', 'Tebak skor pas')}
              <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {tx('optional, bonus', 'opsional, bonus')}</span>
            </button>
            <JagoanToggle active={isJagoan} onClick={toggleJagoan} koMult={koMult} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{homeCode}</span>
                <ScoreStepper value={draftHome} onChange={(n) => setScore(n, draftAway)} ariaLabel={`${homeCode} score`} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--ink-3)', marginTop: 14 }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{awayCode}</span>
                <ScoreStepper value={draftAway} onChange={(n) => setScore(draftHome, n)} ariaLabel={`${awayCode} score`} />
              </div>
              <button
                type="button"
                onClick={clearScore}
                aria-label={tx('Remove exact score', 'Hapus skor pas')}
                style={{
                  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-3)', fontSize: 12, marginTop: 14, textDecoration: 'underline', textUnderlineOffset: 2,
                  fontFamily: 'var(--font-ui-pickem)',
                }}
              >
                {tx('clear', 'hapus')}
              </button>
            </div>
            <JagoanToggle active={isJagoan} onClick={toggleJagoan} koMult={koMult} />
          </div>
        )}
      </div>

      {outcome && preview.bestCasePoints != null && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 10px',
            background: 'var(--bg-base)',
            border: '1px solid var(--line-1)',
            borderRadius: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui-pickem)',
              fontSize: 12,
              color: 'var(--ink-3)',
            }}
          >
            {tx('Max points', 'Maks. poin')}
          </span>
          <ScoreBreakdown
            base={preview.bestCaseLabel === 'exact' ? rules.pts_exact : rules.pts_outcome}
            jagoan={preview.jagoanMult}
            upset={preview.upsetMult}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--ink-1)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            +{preview.bestCasePoints}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--line-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {odds.home != null && (
            <>
              <ProbabilityChip value={odds.home} label={homeCode} />
              {allowDraw && <ProbabilityChip value={odds.draw} label={tx('Draw', 'Seri')} />}
              <ProbabilityChip value={odds.away} label={awayCode} />
            </>
          )}
        </div>
        <LockCountdown value={lockInfo.value} urgent={lockInfo.urgent} />
      </div>
    </div>
  );
}

// ── Body: locked ──────────────────────────────────────────────────────────

function BodyLocked({ fixture, home, away, prediction, rules }) {
  const tx = usePickemT();
  if (!prediction) {
    return (
      <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <LockIcon size={13} />
        <span style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-ui-pickem)' }}>
          {tx("Match locked — you didn't predict this one.", 'Pertandingan terkunci — kamu nggak prediksi laga ini.')}
        </span>
      </div>
    );
  }
  const teamLabel =
    prediction.picked_outcome === 'H'
      ? `${home.short} ${tx('win', 'menang')}`
      : prediction.picked_outcome === 'A'
      ? `${away.short} ${tx('win', 'menang')}`
      : tx('Draw', 'Seri');
  const score =
    prediction.picked_home != null && prediction.picked_away != null
      ? `${prediction.picked_home}–${prediction.picked_away}`
      : null;
  const koMult = (rules.ko_stages || DEFAULT_MATCH_RULES.ko_stages).includes(fixture.stage)
    ? rules.jagoan_mult_ko
    : rules.jagoan_mult_group;
  return (
    <div
      style={{
        paddingTop: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LockIcon size={13} />
        <div>
          <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
            {tx('YOUR PICK', 'PREDIKSIMU')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {teamLabel}
            {score && (
              <>
                {' · '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{score}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <JagoanToggle active={prediction.is_jagoan} compact koMult={koMult} />
    </div>
  );
}

// ── Body: live ─────────────────────────────────────────────────────────────

function BodyLive({ fixture, home, away, prediction }) {
  const tx = usePickemT();
  if (!prediction) {
    return (
      <div
        style={{
          paddingTop: 14,
          color: 'var(--ink-3)',
          fontSize: 12,
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        {tx("In progress. You didn't predict this match.", 'Sedang berlangsung. Kamu nggak prediksi laga ini.')}
      </div>
    );
  }
  const onTrack = isPredictionOnTrack(prediction, fixture);
  const teamLabel =
    prediction.picked_outcome === 'H'
      ? `${home.short} ${tx('win', 'menang')}`
      : prediction.picked_outcome === 'A'
      ? `${away.short} ${tx('win', 'menang')}`
      : tx('Draw', 'Seri');
  const score =
    prediction.picked_home != null && prediction.picked_away != null
      ? `${prediction.picked_home}–${prediction.picked_away}`
      : null;
  return (
    <div
      style={{
        paddingTop: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div
          className="p-eyebrow"
          style={{
            fontSize: 9,
            color: onTrack ? 'var(--p-up)' : 'var(--p-down)',
            marginBottom: 2,
          }}
        >
          {onTrack ? tx('ON TRACK', 'ON TRACK') : tx('OFF TRACK', 'BELUM KENA')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {teamLabel}
          {score && (
            <>
              {' · '}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{score}</span>
            </>
          )}
        </div>
      </div>
      {onTrack && score && (
        <span style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-ui-pickem)' }}>
          {tx('Exact score still possible', 'Skor pas masih mungkin')}
        </span>
      )}
    </div>
  );
}

function isPredictionOnTrack(prediction, fixture) {
  const h = fixture.home_score ?? 0;
  const a = fixture.away_score ?? 0;
  const currentOutcome = h > a ? 'H' : h < a ? 'A' : 'D';
  return prediction.picked_outcome === currentOutcome;
}

// ── Body: scored ──────────────────────────────────────────────────────────

function BodyScored({ fixture, prediction }) {
  const tx = usePickemT();
  const correct = prediction.base_points != null && prediction.base_points > 0;
  const total =
    (prediction.awarded_points ?? 0) + (prediction.grup_bonus_points ?? 0);
  const score =
    prediction.picked_home != null && prediction.picked_away != null
      ? `${prediction.picked_home}–${prediction.picked_away}`
      : null;
  return (
    <div style={{ paddingTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: correct ? 'var(--p-up)' : 'var(--p-down)',
            }}
          >
            {correct ? tx('Got it right', 'Hasil kena') : tx('Missed', 'Belum kena')}
          </div>
          {score && (
            <div
              style={{
                color: 'var(--ink-3)',
                fontSize: 11,
                marginTop: 2,
                fontFamily: 'var(--font-ui-pickem)',
              }}
            >
              {tx('Pick', 'Prediksi')} <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{score}</span>
            </div>
          )}
        </div>
        <PointsPill value={total} tone={correct ? 'up' : 'down'} />
      </div>
      <ScoreBreakdown
        base={prediction.base_points ?? 0}
        jagoan={prediction.jagoan_mult_applied ?? 1}
        upset={prediction.upset_mult_applied ?? 1}
      />
    </div>
  );
}

// ── Body: missed (final — no prediction, OR a prediction not yet scored) ───

function BodyMissed({ fixture, home, away, prediction }) {
  const tx = usePickemT();
  // v0.81.0 — a final game where the user DID predict but scoring hasn't run
  // yet (scored_at null) also lands here. Show their pick + "awaiting result"
  // instead of falsely claiming they didn't predict. The real scoreline is
  // shown by ScoreSlot above.
  if (prediction && prediction.picked_outcome) {
    const teamLabel =
      prediction.picked_outcome === 'H'
        ? `${home.short} ${tx('win', 'menang')}`
        : prediction.picked_outcome === 'A'
        ? `${away.short} ${tx('win', 'menang')}`
        : tx('Draw', 'Seri');
    const score =
      prediction.picked_home != null && prediction.picked_away != null
        ? `${prediction.picked_home}–${prediction.picked_away}`
        : null;
    return (
      <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
            {tx('YOUR PICK', 'PREDIKSIMU')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {teamLabel}
            {score && (
              <>
                {' · '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{score}</span>
              </>
            )}
          </div>
        </div>
        <span style={{ color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-ui-pickem)' }}>
          {tx('Awaiting result', 'Menunggu hasil')}
        </span>
      </div>
    );
  }
  return (
    <div
      style={{
        paddingTop: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          color: 'var(--ink-3)',
          fontSize: 12,
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        {tx("You didn't predict this match.", 'Kamu nggak prediksi laga ini.')}
      </div>
      <span
        style={{
          color: 'var(--ink-3)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
        }}
      >
        +0
      </span>
    </div>
  );
}
