import { getProductSalePercent, isProductTradeBadgeVisible, selectProductCardBadges, type ProductCardBadgeSource } from '../productCardBadges';

// Web `productCardBadges.test.ts` vakalarının mobil portu: aynı girdiler -> aynı çıktılar.
const base: ProductCardBadgeSource & { id: string } = { id: 'p1', price: 100 };
const sale = { oldPrice: 150, discountPercent: 33 };
const kinds = (p: ProductCardBadgeSource) => selectProductCardBadges(p).map((b) => b.kind);

describe('selectProductCardBadges', () => {
  it('uygun rozet yoksa boş döner', () => {
    expect(selectProductCardBadges(base)).toEqual([]);
  });

  it('tek rozeti olduğu gibi döner', () => {
    expect(kinds({ ...base, isBoosted: true })).toEqual(['boosted']);
    expect(kinds({ ...base, tradeAvailable: true } as never)).toEqual(['trade']);
    expect(kinds({ ...base, feeCampaigns: ['Komisyonsuz'] })).toEqual(['campaign']);
  });

  it('indirim varsa her zaman ilktir ve yüzdeyi taşır', () => {
    const p = { ...base, ...sale, isBoosted: true, tradeAvailable: true };
    expect(selectProductCardBadges(p as never)[0]).toEqual({ kind: 'sale', percent: 33 });
  });

  it('discountPercent yoksa yüzde eski/yeni fiyattan hesaplanır (yuvarlanmış)', () => {
    expect(selectProductCardBadges({ ...base, oldPrice: 150 })[0]).toEqual({ kind: 'sale', percent: 33 });
  });

  it('eski+yeni fiyat varsa yüzde HER ZAMAN fiyattan hesaplanır (API discountPercent ezilir)', () => {
    expect(getProductSalePercent({ ...base, oldPrice: 150, discountPercent: 50 })).toBe(33);
    expect(getProductSalePercent({ ...base, oldPrice: 150, discountPercent: 0 })).toBe(33);
  });

  it('eski fiyat yoksa discountPercent yuvarlanır (19.6 -> 20); 0.4 -> rozet yok', () => {
    expect(getProductSalePercent({ ...base, isOnSale: true, discountPercent: 19.6 })).toBe(20);
    expect(getProductSalePercent({ ...base, isOnSale: true, discountPercent: 0.4 })).toBe(0);
  });

  it('takas rozeti yalnız satın alınabilir ilanda: sold/reserved/stok 0 -> yok', () => {
    expect(kinds({ ...base, tradeAvailable: true, status: 'active', availableQuantity: 2 } as never)).toEqual(['trade']);
    expect(kinds({ ...base, tradeAvailable: true, status: 'sold' } as never)).toEqual([]);
    expect(kinds({ ...base, tradeAvailable: true, status: 'reserved' } as never)).toEqual([]);
    expect(kinds({ ...base, tradeAvailable: true, availableQuantity: 0 } as never)).toEqual([]);
    expect(isProductTradeBadgeVisible({ ...base, tradeAvailable: true, status: 'sold' } as never)).toBe(false);
  });

  it('takas rozeti: availableQuantity yoksa quantity okunur (web ile aynı)', () => {
    const trade = { ...base, tradeAvailable: true, status: 'active' } as never as ProductCardBadgeSource;
    expect(isProductTradeBadgeVisible({ ...trade, quantity: 0 })).toBe(false);
    expect(isProductTradeBadgeVisible({ ...trade, quantity: 2 })).toBe(true);
    expect(isProductTradeBadgeVisible({ ...trade, availableQuantity: 1, quantity: 0 })).toBe(true);
  });

  it('yüzde < 1 ise indirim rozeti hiç çıkmaz (asla "%0")', () => {
    expect(selectProductCardBadges({ ...base, price: 99.9, oldPrice: 100 })).toEqual([]);
    expect(getProductSalePercent({ ...base, price: 99.9, oldPrice: 100 })).toBe(0);
    // İndirim işaretli ama fiyat farkı ve yüzde yok.
    expect(selectProductCardBadges({ ...base, isOnSale: true })).toEqual([]);
  });

  it('order: discount -> boosted -> trade -> campaign; first 2 only', () => {
    const all = { ...base, ...sale, isBoosted: true, tradeAvailable: true, feeCampaigns: ['Komisyonsuz'] };
    expect(kinds(all as never)).toEqual(['sale', 'boosted']);
    expect(kinds({ ...all, isBoosted: false } as never)).toEqual(['sale', 'trade']);
    expect(kinds({ ...all, isBoosted: false, tradeAvailable: false } as never)).toEqual(['sale', 'campaign']);
    expect(kinds({ ...all, oldPrice: null } as never)).toEqual(['boosted', 'trade']);
    expect(kinds({ ...all, oldPrice: null, isBoosted: false } as never)).toEqual(['trade', 'campaign']);
  });

  it('max parametresi sınırı değiştirir', () => {
    const all = { ...base, ...sale, isBoosted: true, tradeAvailable: true, feeCampaigns: ['K'] };
    expect(selectProductCardBadges(all as never, 4).map((b) => b.kind)).toEqual(['sale', 'boosted', 'trade', 'campaign']);
  });

  it('yalnız ilk kampanya adı alınır, boş adlar atlanır', () => {
    expect(selectProductCardBadges({ ...base, feeCampaigns: ['', 'A', 'B'] })).toEqual([{ kind: 'campaign', label: 'A' }]);
  });

  it('boosted only when isBoosted === true (boostedUntil is not read)', () => {
    expect(kinds({ ...base, boostedUntil: '2099-01-01' } as never)).toEqual([]);
  });

  it('tradeAvailable eski alanlara baskındır', () => {
    expect(kinds({ ...base, tradeAvailable: false, isTradeEnabled: true } as never)).toEqual([]);
    expect(kinds({ ...base, trade_available: true } as never)).toEqual(['trade']);
  });
});
