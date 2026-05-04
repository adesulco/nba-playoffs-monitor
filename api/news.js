/**
 * /api/news — single dispatcher for sport-specific news feeds.
 *
 * v0.15.0. Consolidated from /api/{epl,f1,tennis}-news.js to stay under
 * Vercel Hobby's 12-function limit. Dispatches by ?sport=epl|f1|tennis.
 *
 * Backward-compatible URL surface: vercel.json rewrites
 *   /api/epl-news    → /api/news?sport=epl
 *   /api/f1-news     → /api/news?sport=f1
 *   /api/tennis-news → /api/news?sport=tennis
 * so the existing client hooks (useEPLNews, useF1News, useTennisNews)
 * keep working unchanged.
 *
 * Each handler still lives in api/_lib/news/{epl,f1,tennis}.js — they
 * were moved there (underscore prefix → not deployed as a function) and
 * imported here. Same logic, just one fewer function on the meter.
 */

import eplHandler from './_lib/news/epl.js';
import f1Handler from './_lib/news/f1.js';
import tennisHandler from './_lib/news/tennis.js';

export default async function handler(req, res) {
  const sport = String(req.query?.sport || '').trim().toLowerCase();
  switch (sport) {
    case 'epl':    return eplHandler(req, res);
    case 'f1':     return f1Handler(req, res);
    case 'tennis': return tennisHandler(req, res);
    default:
      return res.status(400).json({ error: 'unknown_sport', allowed: ['epl', 'f1', 'tennis'] });
  }
}
