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

  it('admin fiyat tabanının altındaki çipler düşer', () => {
    // 390: 371 / 351 / 332 → taban 340 ile yalnız 371 ve 351 kalır.
    expect(offerPresets(390, 340).map((p) => p.amount)).toEqual([371, 351]);
    expect(offerPresets(390, null).map((p) => p.amount)).toEqual([371, 351, 332]);
  });

  it('geçersiz fiyat → boş', () => {
    expect(offerPresets(0)).toEqual([]);
    expect(offerPresets(NaN)).toEqual([]);
  });
});

describe("offerPresets and the API's ceiling of an agreed amount", () => {
  it('drops a chip above the ceiling', () => {
    // 11,000,000: -5% is 10,450,000 (above, dropped); -10% 9,900,000 and -15% 9,350,000 stay.
    expect(offerPresets(11_000_000).map((p) => p.amount)).toEqual([9_900_000, 9_350_000]);
  });
});
