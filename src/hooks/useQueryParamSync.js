import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Two-way sync between a URL query param and a piece of state.
 *
 * Usage:
 *   const [club, setClub] = useState(null);
 *   useQueryParamSync('club', club, setClub);
 *
 * Reads the param on first mount — if present and different from
 * current state, calls the setter so the page hydrates from URL.
 * Writes to the URL whenever state changes (via history.replaceState,
 * no navigation, no scroll jump). Removes the param when state becomes
 * null/undefined/empty string.
 *
 * Designed for picker state that lives in AppContext (EPL club, F1
 * constructor, Tennis player, NBA fav team) so share links like
 *   gibol.co/premier-league-2025-26?club=arsenal
 * restore the full dashboard view on the recipient's side. Audit
 * §04 Diandra moment 05 ("filter state not in URL" = share gap).
 *
 * Notes:
 * - Mount effect uses an empty dep array so it reads the URL once.
 *   If another component writes to the same param, this hook won't
 *   pick it up — that's fine for pickers (one owner per param).
 * - Write effect is dep'd on [value] only; re-computing URLSearchParams
 *   from stale closures is safer than hot-binding to searchParams.
 * - `replace: true` avoids polluting history with every pick.
 */
export function useQueryParamSync(key, value, setter) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Keep the latest searchParams in a ref so the write effect's
  // dep array can stay [value]-only without going stale.
  const spRef = useRef(searchParams);
  spRef.current = searchParams;

  // URL → state (once on mount).
  useEffect(() => {
    const fromUrl = searchParams.get(key);
    if (fromUrl && fromUrl !== value) {
      setter(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State → URL (on every change).
  useEffect(() => {
    const current = spRef.current.get(key);
    const next = value || null;
    if (next === current) return;
    const nextParams = new URLSearchParams(spRef.current);
    if (next) nextParams.set(key, next);
    else nextParams.delete(key);
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key]);
}

export default useQueryParamSync;
