// Ürün detayı adet seçici tavanı — sepet store'unun kuralıyla TEK kaynak.
import { maxAllowedQty } from '@/stores/cartLimits';
import type { Product } from './types';

/** Web `ProductInfo` sipariş-cap'i: seçici 20'yi geçmez (store tavanı 99'dur). */
const WEB_ORDER_CAP = 20;

/**
 * Sepete bir seferde eklenebilecek azami adet: `maxAllowedQty({ stock, maxQuantityPerOrder })`
 * (store'un kırptığı tavan) ∧ web'in 20'si. Seçici yalnız satılabilir, stoğu 1'den fazla ilanda
 * gösterilir; diğer durumlarda `null`.
 */
export function cartQuantityLimit(product: Product, isOwner: boolean): number | null {
  const available = product.availableQuantity ?? product.quantity;
  if (isOwner || product.status !== 'active' || available == null || available <= 1) return null;
  return Math.min(WEB_ORDER_CAP, maxAllowedQty({ stock: available, maxQuantityPerOrder: product.maxQuantityPerOrder }));
}

/** Seçili adedi tavana (ve en az 1'e) kırpar; tavan yoksa 1. */
export function clampCartQuantity(quantity: number, product: Product, isOwner: boolean): number {
  const max = cartQuantityLimit(product, isOwner);
  return Math.max(1, max == null ? 1 : Math.min(quantity, max));
}
