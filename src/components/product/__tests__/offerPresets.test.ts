import { MIN_OFFER_RATIO, offerPresets } from '../offerPresets';

describe('offerPresets (hızlı teklif)', () => {
  it('−%5 / −%10 / −%15, tam TL', () => {
    expect(offerPresets(1000)).toEqual([
      { percent: 5, amount: 950 },
      { percent: 10, amount: 900 },
      { percent: 15, amount: 850 },
    ]);
    expect(offerPresets(390).map((p) => p.amount)).toEqual([371, 351, 332]);
  });

  it('liste fiyatına yuvarlanan düşer; aynı tutara yuvarlanan tekrarlanmaz', () => {
    // 10 TL: %5 → 9,5 → 10 (= liste, düşer); %10 → 9; %15 → 8,5 → 9 (tekrar, düşer).
    expect(offerPresets(10)).toEqual([{ percent: 10, amount: 9 }]);
    expect(offerPresets(2)).toEqual([]);
    for (const p of offerPresets(1234.5)) expect(p.amount).toBeGreaterThanOrEqual(1234.5 * MIN_OFFER_RATIO);
  });

  it('geçersiz fiyat → boş', () => {
    expect(offerPresets(0)).toEqual([]);
    expect(offerPresets(NaN)).toEqual([]);
  });
});
