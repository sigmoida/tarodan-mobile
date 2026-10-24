import { splitMenuColumns } from '../MenuGroupList';

const g = (key: string, rows: number) => ({ key, items: Array.from({ length: rows }) });

describe('splitMenuColumns', () => {
  it('keeps the order and puts each group in the shorter column', () => {
    const [left, right] = splitMenuColumns([g('a', 4), g('b', 2), g('c', 1), g('d', 3)]);
    expect(left.map((x) => x.key)).toEqual(['a', 'd']);
    expect(right.map((x) => x.key)).toEqual(['b', 'c']);
  });
  it('one group stays left; none -> two empty columns', () => {
    expect(splitMenuColumns([g('a', 3)])).toEqual([[g('a', 3)], []]);
    expect(splitMenuColumns([])).toEqual([[], []]);
  });
});
