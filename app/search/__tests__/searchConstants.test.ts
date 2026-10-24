import { SEARCH_DRAW_DISTANCE } from '../_lib/searchConstants';

describe('arama listesi sabitleri (FlashList)', () => {
  it('geri dönüşüm penceresi makul: en az bir kart satırı, en çok birkaç ekran', () => {
    // Izgarada ≈ 290pt/satır → en az ~1 satır, aşırı büyük pencere JS turunu şişirir.
    expect(SEARCH_DRAW_DISTANCE).toBeGreaterThanOrEqual(290);
    expect(SEARCH_DRAW_DISTANCE).toBeLessThanOrEqual(1200);
  });
});
