/**
 * /api/derby — single dispatcher for derby engagement primitives.
 *
 * v0.15.0. Consolidated from four separate endpoints (state/vote/react/
 * oneliner) into one to stay under Vercel Hobby's 12-function limit.
 * Routing is by HTTP method + a body `action` field on POSTs:
 *
 *   GET  /api/derby?slug=persija-persib                    → state
 *   POST /api/derby  { action: 'vote',     pollId, optionId }
 *   POST /api/derby  { action: 'react',    slug, emoji }
 *   POST /api/derby  { action: 'oneliner', slug, side, text }
 *
 * Each handler degrades gracefully if the migration hasn't run yet:
 * GET returns schemaReady=false + empty arrays; POSTs return 503.
 */

import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getVoterHash } from './_lib/voterHash.js';

const REACTION_ALLOWED = new Set(['fire', 'heart', 'broken', 'cry', 'clap', 'trophy']);
const ONELINER_BLOCKLIST = [
  'anjing', 'asu', 'bangsat', 'bajingan', 'kontol', 'memek', 'pelacur',
  'jancok', 'cok', 'tolol', 'goblok', 'idiot', 'fuck', 'shit', 'bitch',
  'monyet', 'babi', 'kafir',
];
const ONELINER_RATE_WINDOW_MS = 60_000;
const ONELINER_SIDES = new Set(['persija', 'persib', 'neutral']);

export default async function handler(req, res) {
  if (req.method === 'GET') return handleState(req, res);
  if (req.method === 'POST') {
    const body = parseBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON' });
    switch (body.action) {
      case 'vote':     return handleVote(req, res, body);
      case 'react':    return handleReact(req, res, body);
      case 'oneliner': return handleOneliner(req, res, body);
      default:         return res.status(400).json({ error: 'unknown_action' });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

// ---------------------------------------------------------------------
// GET /api/derby?slug=...   → state
// ---------------------------------------------------------------------
async function handleState(req, res) {
  const slug = String(req.query?.slug || '').trim();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  let admin;
  try { admin = getSupabaseAdmin(); }
  catch {
    return res.status(200).json({
      polls: [], reactions: {}, myReactions: [], myPicks: {}, oneliners: [], schemaReady: false,
    });
  }

  const voterHash = getVoterHash(req);
  let schemaReady = true;

  let polls = [];
  let myPicks = {};
  try {
    const { data: pollRows, error } = await admin
      .from('derby_polls')
      .select('id, page_slug, question, options, expires_at')
      .eq('page_slug', slug);
    if (error) throw error;
    if (pollRows?.length) {
      const pollIds = pollRows.map((p) => p.id);
      const { data: results } = await admin
        .from('v_derby_poll_results')
        .select('poll_id, option_id, votes')
        .in('poll_id', pollIds);
      const { data: mine } = await admin
        .from('derby_poll_votes')
        .select('poll_id, option_id')
        .in('poll_id', pollIds)
        .eq('voter_hash', voterHash);
      const tally = {};
      for (const r of results || []) {
        if (!tally[r.poll_id]) tally[r.poll_id] = {};
        tally[r.poll_id][r.option_id] = r.votes ?? 0;
      }
      myPicks = Object.fromEntries((mine || []).map((m) => [m.poll_id, m.option_id]));
      polls = pollRows.map((p) => ({
        id: p.id,
        question: p.question,
        options: Array.isArray(p.options) ? p.options : [],
        expiresAt: p.expires_at,
        votes: tally[p.id] || {},
      }));
    }
  } catch { schemaReady = false; }

  let reactions = {};
  try {
    const { data: rows, error } = await admin
      .from('v_derby_reaction_counts')
      .select('emoji, cnt')
      .eq('page_slug', slug);
    if (error) throw error;
    for (const r of rows || []) reactions[r.emoji] = r.cnt;
  } catch { schemaReady = false; }

  let myReactions = [];
  try {
    const { data: mine } = await admin
      .from('derby_reactions')
      .select('emoji')
      .eq('page_slug', slug)
      .eq('voter_hash', voterHash);
    myReactions = (mine || []).map((r) => r.emoji);
  } catch { /* ignore */ }

  let oneliners = [];
  try {
    const { data: rows, error } = await admin
      .from('derby_oneliners')
      .select('id, side, text, upvotes, created_at')
      .eq('page_slug', slug)
      .eq('status', 'visible')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    oneliners = rows || [];
  } catch { schemaReady = false; }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return res.status(200).json({
    polls, reactions, myReactions, myPicks, oneliners, schemaReady,
  });
}

// ---------------------------------------------------------------------
// POST { action:'vote', pollId, optionId }
// ---------------------------------------------------------------------
async function handleVote(req, res, body) {
  const pollId = String(body.pollId || '').trim();
  const optionId = String(body.optionId || '').trim();
  if (!pollId || !optionId) return res.status(400).json({ error: 'Missing pollId or optionId' });

  let admin;
  try { admin = getSupabaseAdmin(); }
  catch { return res.status(503).json({ error: 'engagement_unavailable' }); }

  const { data: poll, error: pollErr } = await admin
    .from('derby_polls')
    .select('id, options, expires_at')
    .eq('id', pollId)
    .maybeSingle();
  if (pollErr) return res.status(500).json({ error: pollErr.message });
  if (!poll) return res.status(404).json({ error: 'poll_not_found' });

  const validIds = (Array.isArray(poll.options) ? poll.options : []).map((o) => o.id);
  if (!validIds.includes(optionId)) return res.status(400).json({ error: 'invalid_option' });
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return res.status(409).json({ error: 'poll_closed' });
  }

  const voterHash = getVoterHash(req);
  await admin.from('derby_poll_votes').delete().eq('poll_id', pollId).eq('voter_hash', voterHash);
  const { error: insertErr } = await admin
    .from('derby_poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, voter_hash: voterHash });
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  const { data: results } = await admin
    .from('v_derby_poll_results')
    .select('option_id, votes')
    .eq('poll_id', pollId);
  const votes = {};
  for (const r of results || []) votes[r.option_id] = r.votes ?? 0;

  return res.status(200).json({ pollId, votes, mine: optionId });
}

// ---------------------------------------------------------------------
// POST { action:'react', slug, emoji }
// ---------------------------------------------------------------------
async function handleReact(req, res, body) {
  const slug = String(body.slug || '').trim();
  const emoji = String(body.emoji || '').trim();
  if (!slug || !emoji) return res.status(400).json({ error: 'Missing slug or emoji' });
  if (!REACTION_ALLOWED.has(emoji)) return res.status(400).json({ error: 'invalid_emoji' });

  let admin;
  try { admin = getSupabaseAdmin(); }
  catch { return res.status(503).json({ error: 'engagement_unavailable' }); }

  const voterHash = getVoterHash(req);
  const { error: insertErr } = await admin
    .from('derby_reactions')
    .insert({ page_slug: slug, emoji, voter_hash: voterHash });

  let mine;
  if (insertErr) {
    if (String(insertErr.code) === '23505' || /duplicate|unique/i.test(insertErr.message || '')) {
      await admin
        .from('derby_reactions')
        .delete()
        .eq('page_slug', slug)
        .eq('emoji', emoji)
        .eq('voter_hash', voterHash);
      mine = false;
    } else {
      return res.status(500).json({ error: insertErr.message });
    }
  } else {
    mine = true;
  }

  const { data: rows } = await admin
    .from('v_derby_reaction_counts')
    .select('emoji, cnt')
    .eq('page_slug', slug);
  const counts = {};
  for (const r of rows || []) counts[r.emoji] = r.cnt;
  return res.status(200).json({ slug, emoji, mine, counts });
}

// ---------------------------------------------------------------------
// POST { action:'oneliner', slug, side, text }
// ---------------------------------------------------------------------
async function handleOneliner(req, res, body) {
  const slug = String(body.slug || '').trim();
  const side = String(body.side || '').trim();
  let text = String(body.text || '').trim();
  if (!slug || !ONELINER_SIDES.has(side) === false) {
    if (!ONELINER_SIDES.has(side)) return res.status(400).json({ error: 'invalid_side' });
  }
  if (!slug) return res.status(400).json({ error: 'missing_slug' });
  if (!text) return res.status(400).json({ error: 'empty_text' });
  if (text.length > 80) text = text.slice(0, 80);

  const lower = text.toLowerCase();
  for (const bad of ONELINER_BLOCKLIST) {
    const re = new RegExp(`(^|[^a-z])${bad}([^a-z]|$)`, 'i');
    if (re.test(lower)) return res.status(422).json({ error: 'blocked_profanity' });
  }

  let admin;
  try { admin = getSupabaseAdmin(); }
  catch { return res.status(503).json({ error: 'engagement_unavailable' }); }

  const voterHash = getVoterHash(req);
  const since = new Date(Date.now() - ONELINER_RATE_WINDOW_MS).toISOString();
  const { count } = await admin
    .from('derby_oneliners')
    .select('*', { count: 'exact', head: true })
    .eq('page_slug', slug)
    .eq('voter_hash', voterHash)
    .gte('created_at', since);
  if ((count ?? 0) > 0) return res.status(429).json({ error: 'rate_limited' });

  const { data: inserted, error: insertErr } = await admin
    .from('derby_oneliners')
    .insert({ page_slug: slug, side, text, voter_hash: voterHash })
    .select('id, side, text, upvotes, created_at')
    .single();
  if (insertErr) return res.status(500).json({ error: insertErr.message });
  return res.status(200).json(inserted);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return null; }
}
