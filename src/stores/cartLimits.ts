// Sepet adet tavanı — saf (store/persist bağımsız); cartStore ve ürün detayı aynı kuralı kullanır.

/** API tavanı: sunucu DTO'su sepet/sipariş adedini 99 ile sınırlar. */
export const CART_MAX_QTY = 99;

/**
 * Bir sepet satırının çıkabileceği azami adet: yakalanan stok ile sipariş-başı
 * limitin küçüğü, API tavanı (99) ile sınırlı. Bilgi yoksa 99'a düşer
 * (eski davranış; gerçek doğrulama yine checkout'ta yapılır).
 */
export function maxAllowedQty(item: {
  stock?: number | null;
  maxQuantityPerOrder?: number | null;
}): number {
  const caps = [item.stock, item.maxQuantityPerOrder].filter(
    (n): n is number => typeof n === 'number' && n > 0,
  );
  return caps.length ? Math.min(CART_MAX_QTY, ...caps) : CART_MAX_QTY;
}
