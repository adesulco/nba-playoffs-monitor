/**
 * /api/pickem — single dispatcher for Pick'em endpoints.
 *
 * v0.15.0. Consolidated from /api/pickem/{create,create-league,
 * join-league,pick,score}.js to stay under Vercel Hobby's 12-function
 * limit. Dispatches by ?_action=...
 *
 * Backward-compatible URL surface: vercel.json rewrites
 *   /api/pickem/create        → /api/pickem?_action=create
 *   /api/pickem/create-league → /api/pickem?_action=create-league
 *   /api/pickem/join-league   → /api/pickem?_action=join-league
 *   /api/pickem/pick          → /api/pickem?_action=pick
 *   /api/pickem/score         → /api/pickem?_action=score
 * Existing clients (BracketEditor, BracketNew, LeagueNew, LeagueJoin)
 * continue to POST to the original URLs unchanged.
 *
 * Each handler still lives in api/_lib/pickem/*.js — moved there
 * (underscore prefix → not deployed as a function) and imported here.
 * Same logic, no behavior change.
 */

import createHandler from './_lib/pickem/create.js';
import createLeagueHandler from './_lib/pickem/create-league.js';
import joinLeagueHandler from './_lib/pickem/join-league.js';
import pickHandler from './_lib/pickem/pick.js';
import scoreHandler from './_lib/pickem/score.js';

// v0.66.0 — Pick'em P1 match-prediction endpoints. Live in the same
// dispatcher to stay under Vercel Hobby's 12-function limit (still 11/12).
import fixturesHandler from './_lib/pickem/fixtures.js';
import predictHandler from './_lib/pickem/predict.js';
import leaderboardHandler from './_lib/pickem/leaderboard.js';
import scoreFixtureHandler from './_lib/pickem/score-fixture.js';

// v0.68.0 — Pick'em P3 grup endpoint (still 11/12 functions).
import listGrupsHandler from './_lib/pickem/list-grups.js';

// v0.70.0 — Pick'em P5 profile endpoint (still 11/12 functions).
import listProfileHandler from './_lib/pickem/list-profile.js';

// v0.72.0 — Pick'em P4.5 server-side bracket scoring (still 11/12).
import upsertBracketHandler from './_lib/pickem/upsert-bracket.js';
import scoreBracketHandler  from './_lib/pickem/score-bracket.js';

// v0.73.0 — Pick'em P5.5 Survivor server-side persistence (still 11/12).
import upsertSurvivorHandler from './_lib/pickem/upsert-survivor.js';
import listSurvivorHandler   from './_lib/pickem/list-survivor.js';

// v0.79.9 — closes the rehydration gap. Returns the authenticated
// user's predictions so PredictingHub can re-mark them as selected on
// page reload + competition switch.
import listPredictionsHandler from './_lib/pickem/list-predictions.js';

// v0.80.1 — Flagship Track A ticket A3: pool-first commissioner layer
// (still 11/12 functions; everything dispatches here per handover §4.1).
import leagueSettingsHandler   from './_lib/pickem/league-settings.js';
import leagueDetailHandler     from './_lib/pickem/league-detail.js';
import mergeGuestHandler       from './_lib/pickem/merge-guest.js';
import approveMemberHandler    from './_lib/pickem/approve-member.js';
import grantEntitlementHandler from './_lib/pickem/grant-entitlement.js';

export default async function handler(req, res) {
  const action = String(req.query?._action || req.query?.action || '').trim().toLowerCase();
  switch (action) {
    // Legacy NBA-series Pick'em (bracket + league + pick + score).
    case 'create':            return createHandler(req, res);
    case 'create-league':     return createLeagueHandler(req, res);
    case 'join-league':       return joinLeagueHandler(req, res);
    case 'pick':              return pickHandler(req, res);
    case 'score':             return scoreHandler(req, res);
    // v0.66.0 match-prediction layer (Pickem-Gamification-Spec §5–§7).
    case 'list-fixtures':     return fixturesHandler(req, res);
    case 'upsert-prediction': return predictHandler(req, res);
    case 'list-leaderboard':  return leaderboardHandler(req, res);
    case 'score-fixture':     return scoreFixtureHandler(req, res);
    // v0.68.0 P3 — grup endpoints (create-league extended in place).
    case 'list-grups':        return listGrupsHandler(req, res);
    // v0.70.0 P5 — profile aggregator (stats + streak + badges + history).
    case 'list-profile':      return listProfileHandler(req, res);
    // v0.72.0 P4.5 — server-side WC bracket lifecycle (save + lock + score).
    case 'upsert-bracket':       return upsertBracketHandler(req, res);
    case 'score-bracket':        return scoreBracketHandler(req, res);
    // v0.73.0 P5.5 — server-side Survivor persistence.
    case 'upsert-survivor-pick': return upsertSurvivorHandler(req, res);
    case 'list-survivor':        return listSurvivorHandler(req, res);
    // v0.79.9 — read user's predictions for rehydration on reload.
    case 'list-predictions':     return listPredictionsHandler(req, res);
    // v0.80.1 A3 — pool-first commissioner layer (flagship R1).
    case 'update-league-settings': return leagueSettingsHandler(req, res);
    case 'league-detail':          return leagueDetailHandler(req, res);
    case 'merge-guest':            return mergeGuestHandler(req, res);
    case 'approve-member':         return approveMemberHandler(req, res);
    case 'grant-entitlement':      return grantEntitlementHandler(req, res);
    default:
      return res.status(400).json({
        error: 'unknown_action',
        allowed: [
          'create', 'create-league', 'join-league', 'pick', 'score',
          'list-fixtures', 'upsert-prediction', 'list-leaderboard', 'score-fixture',
          'list-grups', 'list-profile',
          'upsert-bracket', 'score-bracket',
          'upsert-survivor-pick', 'list-survivor',
          'list-predictions',
          'update-league-settings', 'league-detail', 'merge-guest',
          'approve-member', 'grant-entitlement',
        ],
      });
  }
}
