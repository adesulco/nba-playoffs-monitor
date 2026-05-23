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
    default:
      return res.status(400).json({
        error: 'unknown_action',
        allowed: [
          'create', 'create-league', 'join-league', 'pick', 'score',
          'list-fixtures', 'upsert-prediction', 'list-leaderboard', 'score-fixture',
          'list-grups',
        ],
      });
  }
}
