/**
 * entriesCsv.js — D5 (08-teardown-deltas): commissioner CSV export,
 * client-side from league-detail data (their commissioners demonstrably
 * use this; sponsor prerequisite). No new endpoint.
 *
 * buildEntriesCsv(members, opts) → CSV string. The Track B commissioner
 * panel triggers a download via downloadCsv().
 */

/** Escape one CSV cell (quotes, commas, newlines). */
function cell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {Array<{display_name:string, points:number, exact_count:number,
 *                status:string, picked_current_matchday?:boolean,
 *                is_managed?:boolean}>} members  (league-detail shape)
 * @param {{competition?:string, currentMatchday?:number|null}} [opts]
 * @returns {string} CSV with header row, sorted as given (points desc upstream)
 */
export function buildEntriesCsv(members, opts = {}) {
  const md = opts.currentMatchday != null ? `MD${opts.currentMatchday}` : 'current';
  const header = ['Rank', 'Entry', 'Status', `Picked ${md}`, 'Exact scores', 'Total points'];
  const lines = [header.map(cell).join(',')];
  (members || []).forEach((m, i) => {
    lines.push([
      i + 1,
      m.display_name + (m.is_managed ? ' (manual)' : ''),
      m.status || 'active',
      m.picked_current_matchday ? 'yes' : 'no',
      m.exact_count ?? 0,
      m.points ?? 0,
    ].map(cell).join(','));
  });
  return lines.join('\n');
}

/** Trigger a browser download of the CSV (no-op server-side). */
export function downloadCsv(csv, filename = 'gibol-pickem-entries.csv') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
