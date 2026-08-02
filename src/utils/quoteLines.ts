import { serverAmount } from './format';
import type { OrderQuoteItem } from '@/lib/api';

/**
 * Bir quote satırının EKRANDA basılabilir para alanları — hepsi sunucudan aynen,
 * sayı olmayan alan `null` (bkz. `serverAmount`).
 */
export type QuoteLineAmounts = {
  /** Satırın birim fiyatı (`items[].unitPrice`). */
  unitPrice: number | null;
  /** Satırın ADET DAHİL tutarı (`items[].subtotal`) — istemcide çarpma yok. */
  subtotal: number | null;
};

/**
 * `POST /orders/quote` yanıtının satır kırılımını `productId` ile indeksler.
 *
 * NEDEN: sepet satırının `price` alanı sepete EKLEME anında donuyor ve 24 saat
 * saklanıyor; ürünlerde kampanya penceresi var (`isOnSale` / `saleEndDate`).
 * Kampanya sepette beklerken biterse yerel `price × quantity` ile sunucunun
 * `summary.productAmount`'ı ayrışır ve kullanıcı satırlar toplamı tutmayan bir
 * özet görür. Satır tutarı da bu yüzden sunucudan gelir (canlı ölçüm:
 * `items[] = { productId, sellerId, quantity, unitPrice, subtotal, ... }`).
 *
 * Eşleşme bulunamazsa çağıran YER TUTUCU basar — yerel çarpıma DÜŞMEZ.
 */
export function indexQuoteLines(
  items: readonly OrderQuoteItem[] | undefined,
): Map<string, QuoteLineAmounts> {
  const index = new Map<string, QuoteLineAmounts>();
  for (const line of items ?? []) {
    const productId = line?.productId;
    if (typeof productId !== 'string' || productId === '') continue;
    index.set(productId, {
      unitPrice: serverAmount(line.unitPrice),
      subtotal: serverAmount(line.subtotal),
    });
  }
  return index;
}
