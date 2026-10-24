import {
  ProductPriceFields,
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
  isProductOutOfStock,
} from '@/utils/productPrice';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';

/**
 * The one selection rule for the badge stack at the top left of a grid card's image (the same as
 * web `productCardBadges.ts`). The order is fixed: discount, boosted ("Öne Çıkan"), trade, campaign
 * name; the first `max` that apply are shown. "Sponsorlu" (`product.sponsored`) is the ads' text and
 * never a listing badge.
 */
export const MAX_CARD_BADGES = 2;

export type ProductCardBadge =
  | { kind: 'sale'; percent: number }
  | { kind: 'boosted' }
  | { kind: 'trade' }
  | { kind: 'campaign'; label: string };

export interface ProductCardBadgeSource extends ProductPriceFields {
  discountPercent?: number | null;
  isBoosted?: boolean | null;
  feeCampaigns?: string[] | null;
  /** Takas rozeti satın alınabilirliğe bağlı: active dışı statü / müsait adet <= 0 → rozet yok. */
  status?: string | null;
  availableQuantity?: number | null;
  /** `availableQuantity` yoksa stok bu alandan okunur (web ile aynı). */
  quantity?: number | null;
}

/**
 * İndirim yüzdesi — kart + detay TEK kaynak (web ile aynı). Eski ve yeni fiyat İKİSİ de varsa yüzde
 * HER ZAMAN fiyatlardan hesaplanır (API `discountPercent` ezilir); hesaplanamıyorsa (eski fiyat yok)
 * `discountPercent > 0` kullanılır. Sonuç yuvarlanır; < 1 ise 0 — rozet çizilmez (asla "%0").
 */
export function getProductSalePercent(p: ProductCardBadgeSource): number {
  if (!isProductOnSaleDisplay(p)) return 0;
  const hasOld = p.oldPrice != null || p.originalPrice != null;
  let percent = 0;
  if (hasOld) {
    const original = getProductOriginalPriceForDisplay(p);
    const current = getProductEffectivePrice(p);
    if (original > 0 && Number.isFinite(current)) percent = ((original - current) / original) * 100;
  }
  if (!(percent > 0) && p.discountPercent != null && Number(p.discountPercent) > 0) {
    percent = Number(p.discountPercent);
  }
  const rounded = Math.round(percent);
  return rounded >= 1 ? rounded : 0;
}

/**
 * "Takas" rozeti kuralı — kart yığını, liste takas ikonu ve ürün detayı TEK kaynak: takasa açık
 * (`isProductTradeOpen`) VE ilan satın alınabilir (aktif; sold/reserved/inactive değil, stok > 0).
 */
export function isProductTradeBadgeVisible(
  p: Pick<ProductCardBadgeSource, 'status' | 'availableQuantity' | 'quantity'>,
): boolean {
  return (
    isProductTradeOpen(p) &&
    !isProductOutOfStock({ status: p.status, availableQuantity: p.availableQuantity ?? p.quantity })
  );
}

export function selectProductCardBadges(p: ProductCardBadgeSource, max: number = MAX_CARD_BADGES): ProductCardBadge[] {
  const badges: ProductCardBadge[] = [];
  const percent = getProductSalePercent(p);
  if (percent >= 1) badges.push({ kind: 'sale', percent });
  // The API derives `isBoosted` (an ended boost is false); `boostedUntil` is not read here.
  if (p.isBoosted === true) badges.push({ kind: 'boosted' });
  if (isProductTradeBadgeVisible(p)) badges.push({ kind: 'trade' });
  // Bedel kampanyaları fiyatı değiştirmez; vitrinde yalnız rozetle görünür, kartta yalnız ilki.
  const campaign = (p.feeCampaigns ?? []).find((c) => typeof c === 'string' && c.trim() !== '');
  if (campaign) badges.push({ kind: 'campaign', label: campaign });
  return badges.slice(0, max);
}
