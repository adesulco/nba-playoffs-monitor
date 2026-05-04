import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useDerbyState — single source of truth for the derby page's engagement
 * primitives. Fetches /api/derby/state on mount + every 30s while the
 * tab is visible. Exposes optimistic vote/react/oneliner mutators that
 * patch local state immediately and reconcile against the server reply.
 *
 * v0.15.0. Bundling the three engagement reads into one endpoint keeps
 * the polling cost bounded — at peak (kick-off day) the page can refresh
 * the live tally without spamming Supabase.
 */
export function useDerbyState(slug, { intervalMs = 30_000 } = {}) {
  const [state, setState] = useState({
    polls: [],
    reactions: {},
    myReactions: [],
    myPicks: {},
    oneliners: [],
    schemaReady: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/derby?slug=${encodeURIComponent(slug)}`, {
        credentials: 'same-origin',
      });
      if (!r.ok) throw new Error(`state ${r.status}`);
      const json = await r.json();
      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, ...json }));
        setError(null);
      }
    } catch (e) {
      if (!cancelledRef.current) setError(String(e?.message || e));
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    cancelledRef.current = false;
    refresh();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        refresh();
      }
    }, intervalMs);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [refresh, intervalMs]);

  const vote = useCallback(async (pollId, optionId) => {
    // Optimistic: bump local count + flip own pick.
    setState((prev) => {
      const polls = prev.polls.map((p) => {
        if (p.id !== pollId) return p;
        const prevPick = prev.myPicks[pollId];
        const nextVotes = { ...p.votes };
        if (prevPick && prevPick !== optionId) {
          nextVotes[prevPick] = Math.max(0, (nextVotes[prevPick] || 0) - 1);
        }
        if (prevPick !== optionId) {
          nextVotes[optionId] = (nextVotes[optionId] || 0) + 1;
        }
        return { ...p, votes: nextVotes };
      });
      return { ...prev, polls, myPicks: { ...prev.myPicks, [pollId]: optionId } };
    });
    try {
      const r = await fetch('/api/derby', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'vote', pollId, optionId }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `vote ${r.status}`);
      // Reconcile with server tally.
      setState((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => (p.id === pollId ? { ...p, votes: json.votes } : p)),
        myPicks: { ...prev.myPicks, [pollId]: json.mine },
      }));
      return { ok: true };
    } catch (e) {
      // Roll back by re-fetching truth.
      refresh();
      return { ok: false, error: String(e?.message || e) };
    }
  }, [refresh]);

  const react = useCallback(async (emoji) => {
    setState((prev) => {
      const had = prev.myReactions.includes(emoji);
      const myReactions = had
        ? prev.myReactions.filter((e) => e !== emoji)
        : [...prev.myReactions, emoji];
      const reactions = {
        ...prev.reactions,
        [emoji]: Math.max(0, (prev.reactions[emoji] || 0) + (had ? -1 : 1)),
      };
      return { ...prev, myReactions, reactions };
    });
    try {
      const r = await fetch('/api/derby', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'react', slug, emoji }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `react ${r.status}`);
      setState((prev) => ({
        ...prev,
        reactions: json.counts || prev.reactions,
        myReactions: json.mine
          ? Array.from(new Set([...prev.myReactions, emoji]))
          : prev.myReactions.filter((e) => e !== emoji),
      }));
      return { ok: true };
    } catch (e) {
      refresh();
      return { ok: false, error: String(e?.message || e) };
    }
  }, [slug, refresh]);

  const postOneliner = useCallback(async ({ side, text }) => {
    try {
      const r = await fetch('/api/derby', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'oneliner', slug, side, text }),
      });
      const json = await r.json();
      if (!r.ok) {
        return { ok: false, error: json.error || `post ${r.status}` };
      }
      setState((prev) => ({ ...prev, oneliners: [json, ...prev.oneliners].slice(0, 60) }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }, [slug]);

  return { ...state, loading, error, refresh, vote, react, postOneliner };
}
