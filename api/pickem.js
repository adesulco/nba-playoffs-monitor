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

export default async function handler(req, res) {
  const action = String(req.query?._action || req.query?.action || '').trim().toLowerCase();
  switch (action) {
    case 'create':        return createHandler(req, res);
    case 'create-league': return createLeagueHandler(req, res);
    case 'join-league':   return joinLeagueHandler(req, res);
    case 'pick':          return pickHandler(req, res);
    case 'score':         return scoreHandler(req, res);
    default:
      return res.status(400).json({
        error: 'unknown_action',
        allowed: ['create', 'create-league', 'join-league', 'pick', 'score'],
      });
  }
}
