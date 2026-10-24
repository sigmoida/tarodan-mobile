import {
  FILTER_COLLAPSED_COUNT,
  FILTER_EXPANDED_MAX,
  visibleFilterOptions,
} from '../FilterOptionList';

const make = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Option ${i}` }));

describe('visibleFilterOptions', () => {
  it('collapsed: the first slice plus every picked row outside it, in list order', () => {
    const { rows, truncated } = visibleFilterOptions(make(20), '', false, ['o15', 'o2', 'o10']);
    expect(rows.map((r) => r.id)).toEqual([
      ...make(FILTER_COLLAPSED_COUNT).map((o) => o.id),
      'o10',
      'o15',
    ]);
    expect(truncated).toBe(false);
  });

  it('expanded: every row up to the cap, with the truncation flag past it', () => {
    expect(visibleFilterOptions(make(20), '', true, []).rows).toHaveLength(20);
    const capped = visibleFilterOptions(make(FILTER_EXPANDED_MAX + 5), '', true, []);
    expect(capped.rows).toHaveLength(FILTER_EXPANDED_MAX);
    expect(capped.truncated).toBe(true);
  });

  it('a query shows the matches only (Turkish case-insensitive)', () => {
    const options = [
      { id: 'a', label: 'İstanbul' },
      { id: 'b', label: 'Ankara' },
    ];
    expect(visibleFilterOptions(options, 'istan', false, ['b']).rows.map((r) => r.id)).toEqual(['a']);
  });
});
