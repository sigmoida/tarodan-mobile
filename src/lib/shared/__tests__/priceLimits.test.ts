import { offerPriceFloor, parsePriceLimits } from '../priceLimits';

describe('parsePriceLimits', () => {
  it('okur: min ve max', () => {
    expect(parsePriceLimits({ min_product_price: 250, max_product_price: 100000, max_message_length: 500 })).toEqual({
      minPrice: 250,
      maxPrice: 100000,
    });
  });

  it('boş bırakılan (yanıtta olmayan) ayar = sınır yok', () => {
    expect(parsePriceLimits({ max_message_length: 500 })).toEqual({ minPrice: null, maxPrice: null });
    expect(parsePriceLimits({ min_product_price: 250 })).toEqual({ minPrice: 250, maxPrice: null });
  });

  it('sayı olmayan / sonlu olmayan / pozitif olmayan değer = sınır yok', () => {
    for (const bad of [null, undefined, '', ' ', 'abc', NaN, Infinity, 0, -5, {}, []]) {
      expect(parsePriceLimits({ min_product_price: bad, max_product_price: bad })).toEqual({
        minPrice: null,
        maxPrice: null,
      });
    }
  });

  it('sayısal metni tolere eder', () => {
    expect(parsePriceLimits({ min_product_price: '250' }).minPrice).toBe(250);
  });

  it('bozuk gövde (null / dizi / metin) = sınır yok', () => {
    for (const raw of [null, undefined, 'x', 5]) {
      expect(parsePriceLimits(raw)).toEqual({ minPrice: null, maxPrice: null });
    }
  });

  it('çelişkili ayar (min > max) formu kilitlemez', () => {
    expect(parsePriceLimits({ min_product_price: 500, max_product_price: 100 })).toEqual({
      minPrice: null,
      maxPrice: null,
    });
  });
});

describe('offerPriceFloor', () => {
  it('etkin fiyat tabana eşit/üstüyse taban uygulanır (tam tabandaki ilan dahil)', () => {
    expect(offerPriceFloor(250, 400)).toBe(250);
    expect(offerPriceFloor(250, 250)).toBe(250);
  });

  it('etkin fiyat tabanın altındaysa (eski ucuz ilan) taban yok', () => {
    expect(offerPriceFloor(250, 249)).toBeNull();
    expect(offerPriceFloor(250, 200)).toBeNull();
  });

  it('taban yok / fiyat bilinmiyor → null', () => {
    expect(offerPriceFloor(null, 400)).toBeNull();
    expect(offerPriceFloor(250, 0)).toBeNull();
    expect(offerPriceFloor(250, NaN)).toBeNull();
  });
});
