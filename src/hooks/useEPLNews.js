import { useEffect, useState } from 'react';

/**
 * Bilingual EPL news — hits /api/epl-news?lang={lang}.
 *
 * Bahasa sources: detikSport, CNN Indonesia, Antara (keyword-filtered).
 * English sources: BBC Sport Premier League, Guardian Premier League
 * (both already EPL-scoped, no keyword filter).
 *
 * 15-min client refresh matches the endpoint's s-maxage.
 */
export function useEPLNews(lang = 'id') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/epl-news?lang=${lang}&limit=15`);
        if (!r.ok) throw new Error(`epl-news ${r.status}`);
        const json = await r.json();
        if (!cancelled) {
          setItems(Array.isArray(json.items) ? json.items : []);
          setUpdatedAt(json.updatedAt || null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [lang]);

  return { items, loading, error, updatedAt };
}
