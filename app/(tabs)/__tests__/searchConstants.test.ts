/**
 * getSearchItemLayout — pure function test (no render needed). Guards against
 * regressing the row-vs-item index math for the 2-column search grid: getting
 * this wrong doesn't fix jank, it corrupts scroll position (see task-3-brief.md).
 */
import { SEARCH_NUM_COLUMNS, SEARCH_ROW_HEIGHT, getSearchItemLayout } from '../_lib/searchConstants';

describe('getSearchItemLayout', () => {
  it('returns the same offset for items in the same row (0 and 1)', () => {
    const a = getSearchItemLayout(null, 0);
    const b = getSearchItemLayout(null, 1);
    expect(a.offset).toBe(b.offset);
    expect(a.offset).toBe(0);
  });

  it('returns rowHeight offset for the second row (indices 2 and 3)', () => {
    const c = getSearchItemLayout(null, 2);
    const d = getSearchItemLayout(null, 3);
    expect(c.offset).toBe(SEARCH_ROW_HEIGHT);
    expect(d.offset).toBe(SEARCH_ROW_HEIGHT);
  });

  it('always returns SEARCH_ROW_HEIGHT as length', () => {
    expect(getSearchItemLayout(null, 0).length).toBe(SEARCH_ROW_HEIGHT);
    expect(getSearchItemLayout(null, 5).length).toBe(SEARCH_ROW_HEIGHT);
  });

  it('echoes the given index back unchanged', () => {
    expect(getSearchItemLayout(null, 7).index).toBe(7);
  });

  it('divides offset by SEARCH_NUM_COLUMNS, not the raw index', () => {
    // Row for index 5 with 2 columns is row 2 (floor(5/2)), not row 5.
    const layout = getSearchItemLayout(null, 5);
    expect(layout.offset).toBe(Math.floor(5 / SEARCH_NUM_COLUMNS) * SEARCH_ROW_HEIGHT);
    expect(layout.offset).not.toBe(5 * SEARCH_ROW_HEIGHT);
  });
});
