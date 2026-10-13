import { getSearchListTuning } from '../_lib/searchConstants';

describe('getSearchListTuning', () => {
  it('ızgarada (2 sütun) satır bazlı küçük batch; liste görünümünde kart bazlı', () => {
    const grid = getSearchListTuning(2);
    const list = getSearchListTuning(1);
    expect(grid.initialNumToRender).toBe(4); // 4 satır = 8 kart
    expect(grid.maxToRenderPerBatch).toBe(3); // 3 satır = 6 kart
    expect(list.initialNumToRender).toBeGreaterThan(grid.initialNumToRender);
    expect(grid.updateCellsBatchingPeriod).toBe(50);
    expect(grid.windowSize).toBe(7);
  });

  it('removeClippedSubviews iOS testinde kapalı', () => {
    expect(getSearchListTuning(2).removeClippedSubviews).toBe(false); // jest-expo platform: ios
  });
});
