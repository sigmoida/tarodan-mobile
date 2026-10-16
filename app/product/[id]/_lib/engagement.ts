// Teklif / takas girişlerinin görünürlük kuralı — alt bardaki satır ve takas rozeti TEK kaynak.
import { isProductTradeBadgeVisible } from '@/components/product/productCardBadges';
import { offerPriceFloor } from '@/lib/shared/priceLimits';
import type { Product } from './types';

export interface OfferTradeAvailability {
  /** "Teklif Ver": ilan satılabilir, izleyen sahip değil ve geçerli bir teklif aralığı var (admin fiyat tabanı). */
  offer: boolean;
  /**
   * "Takas Teklifi": ilan takasa açık + satılabilir ve izleyen sahip değil. Üyelik/platform kapısı
   * YOK (web ile aynı): yetkisizlik düğmeye basınca dialog ile bildirilir (`useProductActions`).
   */
  trade: boolean;
  /**
   * Fiyat altı "Takas" rozeti: ilan takasa açık ve satılabilir. Sahip de görür (kendi ilanının
   * durumu); satılmış/rezerve/stoksuz ilanda yok. Üyelik kapısına bağlı değil.
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
  {
    isOwner,
    isOutOfStock,
    minPrice = null,
  }: { isOwner: boolean; isOutOfStock: boolean; minPrice?: number | null },
): OfferTradeAvailability {
  const purchasable = isPurchasable(product, isOutOfStock);
  const tradeBadge = purchasable && isProductTradeBadgeVisible(product);
  // Etkin fiyat tam tabana eşitse teklif liste fiyatının ALTINDA ve tabanın ÜSTÜNDE olmak zorunda:
  // geçerli teklif yok → giriş çizilmez (modal da açılamaz).
  const listPrice = Number(product.price) || 0;
  const floor = offerPriceFloor(minPrice, listPrice);
  const offerRangeExists = floor == null || floor < listPrice;
  return { offer: purchasable && !isOwner && offerRangeExists, trade: tradeBadge && !isOwner, tradeBadge };
}
