import { indexQuoteLines } from '../quoteLines';

/**
 * indexQuoteLines — satır tutarlarının SUNUCUDAN gelmesini sağlayan eşleme
 * (bulgu N1). Ekran satırı eskiden `item.price * item.quantity` ile çarpılıyordu;
 * sepetteki `price` ekleme anında donuyor (24 saat) ve ürünlerde kampanya
 * penceresi var, pencere sepette beklerken kapanınca satır ile özet ayrışıyordu.
 */
describe('indexQuoteLines', () => {
  it('productId ile eşler; subtotal adedi ZATEN içerir (istemcide çarpma yok)', () => {
    // Canlı ölçüm şekli (staging): quantity 3 → subtotal = 3 × unitPrice.
    const index = indexQuoteLines([
      { productId: 'p1', quantity: 3, unitPrice: 619.92, subtotal: 1859.76 },
      { productId: 'p2', quantity: 1, unitPrice: 100, subtotal: 100 },
    ]);
    // Adet de indeksleniyor: ekran adedi tutarla AYNI kaynaktan okuyor.
    expect(index.get('p1')).toEqual({ unitPrice: 619.92, subtotal: 1859.76, quantity: 3 });
    expect(index.get('p2')).toEqual({ unitPrice: 100, subtotal: 100, quantity: 1 });
    expect(index.get('yok')).toBeUndefined();
  });

  it('sayı olmayan tutarlar null olur (Number(null)=0 tuzağı satırda da kapalı)', () => {
    const index = indexQuoteLines([
      { productId: 'p1', unitPrice: null as any, subtotal: undefined },
      { productId: 'p2', unitPrice: 'abc' as any, subtotal: NaN },
    ]);
    expect(index.get('p1')).toEqual({ unitPrice: null, subtotal: null });
    expect(index.get('p2')).toEqual({ unitPrice: null, subtotal: null });
  });

  it('items yoksa/boşsa boş eşleme döner (çağıran yer tutucu basar)', () => {
    expect(indexQuoteLines(undefined).size).toBe(0);
    expect(indexQuoteLines([]).size).toBe(0);
  });

  it('items dizi DEĞİLSE atmaz — sepet ve checkout beyaz ekrana düşmez', () => {
    // Alan bazında `serverAmount` kapısı var ama kabın kendisi de korunmalı:
    // `for...of` bir objeyle patlasa hata render sırasında (useMemo içinde)
    // atılır ve iki ekranı birden beyaz ekrana çevirirdi.
    for (const notAnArray of [{}, 'items', 42, true, null]) {
      expect(() => indexQuoteLines(notAnArray as never)).not.toThrow();
      expect(indexQuoteLines(notAnArray as never).size).toBe(0);
    }
  });

  it('productId si olmayan satırları atlar', () => {
    const index = indexQuoteLines([
      { subtotal: 50 } as any,
      { productId: '', subtotal: 50 } as any,
      { productId: 'p1', subtotal: 50 },
    ]);
    expect(index.size).toBe(1);
    expect(index.get('p1')?.subtotal).toBe(50);
  });
});
