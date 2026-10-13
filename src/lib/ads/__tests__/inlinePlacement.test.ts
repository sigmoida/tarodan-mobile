import { inlineAdSlotAfter, withInlineAds } from '../inlinePlacement';

describe('inlineAdSlotAfter (web ile aynı kural)', () => {
  it('8. karttan sonra, sonra 16 kartta bir, en çok 2 yuva', () => {
    const slots: Record<number, number> = {};
    for (let i = 0; i < 200; i += 1) {
      const s = inlineAdSlotAfter(i);
      if (s !== null) slots[i + 1] = s; // kart numarası -> yuva sırası
    }
    expect(slots).toEqual({ 8: 0, 24: 1 });
  });
});

describe('withInlineAds', () => {
  const cards = (n: number) => Array.from({ length: n }, (_, i) => i);
  const itemsOf = (rows: ReturnType<typeof withInlineAds<number>>) =>
    rows.flatMap((r) => (r.kind === 'row' ? r.items : []));

  it('8 karttan azında afiş satırı yok', () => {
    const rows = withInlineAds(cards(7), 2);
    expect(rows.every((r) => r.kind === 'row')).toBe(true);
    expect(rows.map((r) => (r.kind === 'row' ? r.items.length : 0))).toEqual([2, 2, 2, 1]);
  });

  it('2 sütunda 8. kartın ardından tam genişlikte afiş satırı girer', () => {
    const rows = withInlineAds(cards(12), 2);
    expect(rows.map((r) => r.kind)).toEqual(['row', 'row', 'row', 'row', 'ad', 'row', 'row']);
    expect(rows[4]).toMatchObject({ kind: 'ad', slot: 0, key: 'ad-0' });
  });

  it('en çok iki afiş; 24. karttan sonra ikinci yuva, kart sırası bozulmaz', () => {
    const rows = withInlineAds(cards(60), 2);
    const slots = rows.filter((r) => r.kind === 'ad').map((r) => (r.kind === 'ad' ? r.slot : -1));
    expect(slots).toEqual([0, 1]);
    expect(itemsOf(rows)).toEqual(cards(60));
    const idx = rows.findIndex((r) => r.kind === 'ad' && r.slot === 1);
    expect(itemsOf(rows.slice(0, idx)).length).toBe(24);
  });

  it('dolmamış satırı kapatıp afişi ardına koyar (3 sütunda 8. kart satır ortasında)', () => {
    const rows = withInlineAds(cards(10), 3);
    const adAt = rows.findIndex((r) => r.kind === 'ad');
    expect(itemsOf(rows.slice(0, adAt))).toEqual(cards(8));
    expect(itemsOf(rows)).toEqual(cards(10));
  });

  it('boş listede satır yok', () => {
    expect(withInlineAds([], 2)).toEqual([]);
  });
});
