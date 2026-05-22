import { useEffect, useState } from 'react';

/**
 * Content-engine publish manifest — shared, cached, read-once.
 *
 * v0.62.3 ship — audit FUNC-002. ProfileLink (and any future
 * content-linking CTA) needs to know whether a given generated article
 * is actually published before it links to it. Without that check the
 * CTA links blindly, and an unpublished target makes GeneratedArticle
 * silently `Navigate('/')` — a bounce-to-home the user can't explain.
 *
 * The prerender step emits `dist/content/index.json` (served at
 * `/content/index.json`) listing every generated article with its
 * approval state. This module fetches that manifest exactly once per
 * session, caches it at module scope, and exposes a hook so any
 * component can ask "is {type}:{slug} published?" synchronously after
 * the first load.
 *
 * "Published" mirrors the NewsroomSlice rule: `approved === true` OR
 * `manual_review === false` (legacy / hand-edited articles bypass the
 * ledger via the explicit flag).
 *
 * Failure mode: if the manifest fetch fails, the published set is
 * empty — callers that gate on it render nothing. Hiding a CTA is the
 * correct degradation; showing one that bounces is not.
 */

let _promise = null;
let _data = null; // { published: Set<string> } once resolved

function buildIndex(articles) {
  const published = new Set();
  for (const a of articles || []) {
    if (!a || !a.type || !a.slug) continue;
    if (a.approved === true || a.manual_review === false) {
      published.add(`${a.type}:${a.slug}`);
    }
  }
  return { published };
}

function load() {
  if (_data) return Promise.resolve(_data);
  if (_promise) return _promise;
  _promise = fetch('/content/index.json', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : { articles: [] }))
    .then((d) => {
      _data = buildIndex(d.articles);
      return _data;
    })
    .catch(() => {
      // Network / parse failure — treat as "nothing published" so
      // gated CTAs hide rather than link into a bounce.
      _data = buildIndex([]);
      return _data;
    });
  return _promise;
}

/**
 * Hook: returns { ready, isPublished(type, slug) }.
 *
 * `ready` is false until the manifest resolves; `isPublished` returns
 * false until then. Components gating a CTA should render nothing while
 * `!ready` — a brief absence of a secondary CTA is invisible; a flash
 * of a broken link is not.
 *
 * `type` is the content-engine type ('team' for profiles, 'preview',
 * 'recap', 'standings', 'h2h'). For a /profile/{slug} page the type is
 * 'team' (the on-disk folder), even though the URL says /profile.
 */
export function useContentManifest() {
  const [ready, setReady] = useState(() => _data !== null);

  useEffect(() => {
    if (_data) { setReady(true); return undefined; }
    let cancelled = false;
    load().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  return {
    ready,
    isPublished(type, slug) {
      if (!_data || !type || !slug) return false;
      return _data.published.has(`${type}:${slug}`);
    },
  };
}
