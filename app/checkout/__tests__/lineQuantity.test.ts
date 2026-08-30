/**
 * Checkout satırında adet — sunucu satırıyla yerel satır yan yana.
 *
 * Satır TUTARI Plan 4'te sunucuya bağlandı (`quote.items[].subtotal`), ama
 * yanındaki `x{quantity}` hâlâ yerel sepet satırından geliyordu. Sunucu bir
 * satırı stok yüzünden azaltırsa kullanıcı "x3" yazan bir satırın altında iki
 * adetlik tutar görür ve hangisinin doğru olduğunu anlayamaz. Adet de tutarla
 * aynı kaynaktan okunmalı; sunucu satırı yoksa yerel adet gösterilmeye devam
 * eder (tutar zaten yer tutucuya düşüyor).
 */
import { indexQuoteLines } from '@/utils/quoteLines';

describe('quote line quantity', () => {
  it('exposes the quantity the server priced, not just the amount', () => {
    const lines = indexQuoteLines([
      { productId: 'p1', quantity: 2, subtotal: 200, unitPrice: 100 },
    ]);

    expect(lines.get('p1')?.quantity).toBe(2);
    expect(lines.get('p1')?.subtotal).toBe(200);
  });

  it('leaves the quantity undefined when the server omits it', () => {
    const lines = indexQuoteLines([{ productId: 'p1', subtotal: 200 }]);

    expect(lines.get('p1')?.quantity).toBeUndefined();
  });

  it('has no entry for a product the quote did not price', () => {
    const lines = indexQuoteLines([{ productId: 'p1', subtotal: 200 }]);

    expect(lines.get('p2')).toBeUndefined();
  });
});
