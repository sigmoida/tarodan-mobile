// Teklif / takas girişlerinin görünürlük kuralı — alt bardaki satır ve takas rozeti TEK kaynak.
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import type { Product } from './types';

export interface OfferTradeAvailability {
  /** "Teklif Ver": ilan satılabilir ve izleyen sahip değil. */
  offer: boolean;
  /** "Takas Teklifi": yukarıdakine ek olarak ilan takasa açık ve takas girişi platformda açık (iOS feature gate). */
  trade: boolean;
  /**
   * Fiyat altı "Takas" rozeti: ilan takasa açık ve satılabilir. Sahip de görür (kendi ilanının
   * durumu); satılmış/rezerve/stoksuz ilanda yok. iOS feature gate YALNIZ aksiyonu (`trade`) kapatır,
   * etiketi değil (web ile aynı).
   */
  tradeBadge: boolean;
}

/** İlan satılabilir mi: aktif statü + stok var (null = sınırsız) + dışarıdan "stokta yok" değil. */
export function isPurchasable(product: Product, isOutOfStock: boolean): boolean {
  const available = product.availableQuantity ?? product.quantity;
  return !isOutOfStock && product.status === 'active' && (available == null || available > 0);
}

/**
 * Web `ProductInfo`: teklif ve takas yalnız aktif ilanda çalışır (sunucu stoksuz ilana teklifi de
 * reddeder). Web pasif düğme gösterir; burada satılamayan ilanda giriş hiç çizilmez ki alt bar
 * pasif düğmelerle dolmasın. Sahip kendi ilanına teklif/takas veremez.
 */
export function getOfferTradeAvailability(
  product: Product,
  { isOwner, isOutOfStock, showTradeEntry }: { isOwner: boolean; isOutOfStock: boolean; showTradeEntry: boolean },
): OfferTradeAvailability {
  const purchasable = isPurchasable(product, isOutOfStock);
  const tradeBadge = purchasable && isProductTradeOpen(product);
  return { offer: purchasable && !isOwner, trade: tradeBadge && showTradeEntry && !isOwner, tradeBadge };
}
