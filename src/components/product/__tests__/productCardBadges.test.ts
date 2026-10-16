import { getProductSalePercent, selectProductCardBadges, type ProductCardBadgeSource } from '../productCardBadges';

// Web `productCardBadges.test.ts` vakalarının mobil portu: aynı girdiler -> aynı çıktılar.
const base: ProductCardBadgeSource & { id: string } = { id: 'p1', price: 100 };
const sale = { oldPrice: 150, discountPercent: 33 };
const kinds = (p: ProductCardBadgeSource) => selectProductCardBadges(p).map((b) => b.kind);

describe('selectProductCardBadges', () => {
  it('uygun rozet yoksa boş döner', () => {
    expect(selectProductCardBadges(base)).toEqual([]);
  });

  it('tek rozeti olduğu gibi döner', () => {
    expect(kinds({ ...base, isBoosted: true })).toEqual(['sponsored']);
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

  it('yüzde < 1 ise indirim rozeti hiç çıkmaz (asla "%0")', () => {
    expect(selectProductCardBadges({ ...base, price: 99.9, oldPrice: 100 })).toEqual([]);
    expect(getProductSalePercent({ ...base, price: 99.9, oldPrice: 100 })).toBe(0);
    // İndirim işaretli ama fiyat farkı ve yüzde yok.
    expect(selectProductCardBadges({ ...base, isOnSale: true })).toEqual([]);
  });

  it('sıra: indirim -> sponsorlu -> takas -> kampanya; ilk 2 ile sınırlı', () => {
    const all = { ...base, ...sale, isBoosted: true, tradeAvailable: true, feeCampaigns: ['Komisyonsuz'] };
    expect(kinds(all as never)).toEqual(['sale', 'sponsored']);
    expect(kinds({ ...all, isBoosted: false } as never)).toEqual(['sale', 'trade']);
    expect(kinds({ ...all, isBoosted: false, tradeAvailable: false } as never)).toEqual(['sale', 'campaign']);
    expect(kinds({ ...all, oldPrice: null } as never)).toEqual(['sponsored', 'trade']);
    expect(kinds({ ...all, oldPrice: null, isBoosted: false } as never)).toEqual(['trade', 'campaign']);
  });

  it('max parametresi sınırı değiştirir', () => {
    const all = { ...base, ...sale, isBoosted: true, tradeAvailable: true, feeCampaigns: ['K'] };
    expect(selectProductCardBadges(all as never, 4).map((b) => b.kind)).toEqual(['sale', 'sponsored', 'trade', 'campaign']);
  });

  it('yalnız ilk kampanya adı alınır, boş adlar atlanır', () => {
    expect(selectProductCardBadges({ ...base, feeCampaigns: ['', 'A', 'B'] })).toEqual([{ kind: 'campaign', label: 'A' }]);
  });

  it('sponsorlu yalnız isBoosted === true (boostedUntil bakılmaz)', () => {
    expect(kinds({ ...base, boostedUntil: '2099-01-01' } as never)).toEqual([]);
  });

  it('tradeAvailable eski alanlara baskındır', () => {
    expect(kinds({ ...base, tradeAvailable: false, isTradeEnabled: true } as never)).toEqual([]);
    expect(kinds({ ...base, trade_available: true } as never)).toEqual(['trade']);
  });
});
