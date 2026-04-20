import { useEffect, useState } from 'react';

/**
 * Bilingual F1 news — hits /api/f1-news?lang={lang}. The endpoint aggregates
 * reputable RSS feeds natively in each language (no machine translation).
 *
 * Bahasa sources: detikSport, Bola.com, CNN Indonesia, Kompas.
 * English sources: Autosport, Motorsport.com, BBC Sport, Formula1.com.
 *
 * Refresh cadence: 15 min matches the endpoint's s-maxage so we don't burn
 * bandwidth for users sitting on the dashboard for an afternoon.
 */
export function useF1News(lang = 'id') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/f1-news?lang=${lang}&limit=15`);
        if (!r.ok) throw new Error(`f1-news ${r.status}`);
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
