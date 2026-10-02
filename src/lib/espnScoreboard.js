/**
 * ESPN soccer scoreboard over a date window.
 *
 * ESPN stopped accepting `dates=YYYYMMDD-YYYYMMDD` ranges on soccer
 * scoreboards (HTTP 400 "Failed to get events endpoint", seen 2026-10-02);
 * single dates still work. This fetches each day in parallel through the
 * edge-cached proxy and merges events by id. Throws only when every day
 * failed, so one bad day never blanks the whole strip.
 */
function ymd(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function fetchSoccerEvents(code, from, to) {
  const days = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (d <= end && days.length < 45) {
    days.push(ymd(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const results = await Promise.all(days.map(async (day) => {
    try {
      const res = await fetch(`/api/proxy/espn/soccer/${code}/scoreboard?dates=${day}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.events || [];
    } catch {
      return null;
    }
  }));
  if (results.every((r) => r === null)) throw new Error(`scoreboard ${code}: every day failed`);
  const byId = new Map();
  for (const list of results) for (const ev of list || []) byId.set(ev.id, ev);
  return [...byId.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
