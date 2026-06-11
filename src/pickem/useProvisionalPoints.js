/**
 * useProvisionalPoints — live "what-if" points (A9 · R2-3).
 *
 * THE moat mechanic: during a live match the leaderboard shows poin-
 * sementara ("+10 if it stays like this") computed from the live feed ×
 * my predictions × the league's effective scoring config.
 *
 * HARD RULES (05 §3 R2-3):
 *   - Client-side ONLY. Never persisted, never written to the DB.
 *   - Zero new polling loops — consumes feeds the page already polls.
 *   - Presentation-only: the cron remains the single scoring writer;
 *     every rendered value carries the "sementara" label.
 *
 * The math lives in computeProvisional() (pure, tested); the hook is a
 * thin useMemo over it.
 */
import { useMemo } from 'react';
import {
  resolveScoringConfig,
  scoreMatchPrediction,
} from '../../api/_lib/pickem/scoring-core.js';

/**
 * Pure: provisional points if every live fixture ended at its CURRENT
 * score. Final fixtures are skipped (the cron already scored them —
 * provisional must never double-count).
 *
 * @param {Array} liveFixtures [{ id, stage, statusState|status_short,
 *   home_score, away_score }] — live feed shape; anything not clearly
 *   LIVE is ignored.
 * @param {Array} myPredictions [{ fixture_id, picked_outcome,
 *   picked_home, picked_away, is_jagoan, consensus_at_lock, scored_at }]
 * @param {object|null} scoringConfig league.scoring_config (new shape) or null
 * @param {object|null} pickemRules   pickem_rules row (legacy fallback)
 * @returns {{ total:number, perFixture:Array<{fixture_id, awarded, penalty,
 *             base, capped}> }}
 */
export function computeProvisional(liveFixtures, myPredictions, scoringConfig, pickemRules) {
  const cfg = resolveScoringConfig(scoringConfig, pickemRules);
  const live = new Map();
  for (const f of liveFixtures || []) {
    const s = String(f.statusState || f.status_short || f.status || '').toUpperCase();
    const isLive = s === 'IN' || ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(s);
    if (isLive && f.home_score != null && f.away_score != null) live.set(f.id, f);
  }

  const perFixture = [];
  let total = 0;
  for (const p of myPredictions || []) {
    if (p.scored_at) continue;             // cron already scored — skip
    const fx = live.get(p.fixture_id);
    if (!fx) continue;
    const s = scoreMatchPrediction(
      {
        pickedOutcome: p.picked_outcome,
        pickedHome: p.picked_home,
        pickedAway: p.picked_away,
        isJagoan: p.is_jagoan,
        consensusAtLock: p.consensus_at_lock,
      },
      { stage: fx.stage, homeScore: fx.home_score, awayScore: fx.away_score },
      cfg,
    );
    perFixture.push({ fixture_id: p.fixture_id, ...s });
    total += s.awarded - s.penalty;
  }
  return { total: Math.max(0, total), perFixture };
}

/**
 * Hook wrapper. All inputs come from polls the page already runs
 * (fixtures via the 30s hub poll, predictions via list-predictions,
 * config via league-detail). Memoized per input tick.
 */
export default function useProvisionalPoints({ liveFixtures, myPredictions, scoringConfig, pickemRules }) {
  return useMemo(
    () => computeProvisional(liveFixtures, myPredictions, scoringConfig, pickemRules),
    [liveFixtures, myPredictions, scoringConfig, pickemRules],
  );
}
