// D5 — CSV export tests.
import { describe, it, expect } from 'vitest';
import { buildEntriesCsv } from './entriesCsv.js';

const M = (over = {}) => ({
  display_name: 'Budi', points: 42, exact_count: 3, status: 'active',
  picked_current_matchday: true, is_managed: false, ...over,
});

describe('buildEntriesCsv', () => {
  it('header + rows with rank, manual marker, picked flag', () => {
    const csv = buildEntriesCsv(
      [M(), M({ display_name: 'Rina', is_managed: true, picked_current_matchday: false, points: 7 })],
      { currentMatchday: 2 },
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Rank,Entry,Status,Picked MD2,Exact scores,Total points');
    expect(lines[1]).toBe('1,Budi,active,yes,3,42');
    expect(lines[2]).toBe('2,Rina (manual),active,no,3,7');
  });
  it('escapes commas + quotes in names', () => {
    const csv = buildEntriesCsv([M({ display_name: 'Si "Raja", Grup' })]);
    expect(csv.split('\n')[1]).toContain('"Si ""Raja"", Grup"');
  });
  it('empty members → header only; null matchday → generic label', () => {
    expect(buildEntriesCsv([])).toBe('Rank,Entry,Status,Picked current,Exact scores,Total points');
  });
});
