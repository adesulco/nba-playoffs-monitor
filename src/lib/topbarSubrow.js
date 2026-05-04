import { useSyncExternalStore } from 'react';

/**
 * Tiny module-level store for the V2 TopBar sub-row content.
 *
 * Why: V2TopBar renders once at the App root so it persists across route
 * changes (no chunk-fallback blanking, no full re-mount). Pages that need
 * to inject content under the masthead (pickers, status strips) call
 * `setTopbarSubrow(node)` from an effect, and the TopBar re-renders only
 * the sub-row. No cascading context re-renders into every useApp consumer.
 *
 * Usage in a page:
 *
 *   useEffect(() => {
 *     setTopbarSubrow(<TeamPicker selectedTeam={favTeam} onSelect={setFav} />);
 *     return () => setTopbarSubrow(null);
 *   }, [favTeam]);
 *
 * The TopBar subscribes once via `useTopbarSubrow()` and renders whatever
 * the current node is (or nothing when null).
 */

let current = null;
const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return current;
}

export function setTopbarSubrow(node) {
  current = node ?? null;
  listeners.forEach((fn) => fn());
}

export function useTopbarSubrow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
