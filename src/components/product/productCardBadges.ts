import {
  ProductPriceFields,
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
  isProductOutOfStock,
} from '@/utils/productPrice';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';

/**
 * Grid kartının görsel sol-üst rozet yığınının TEK seçim kuralı (web `productCardBadges.ts` ile
 * birebir). Sıra sabit: %İndirim -> Sponsorlu -> Takas -> Kampanya adı; uygun olanların ilk `max`
 * tanesi gösterilir.
 */
export const MAX_CARD_BADGES = 2;

export type ProductCardBadge =
  | { kind: 'sale'; percent: number }
  | { kind: 'sponsored' }
  | { kind: 'trade' }
  | { kind: 'campaign'; label: string };

export interface ProductCardBadgeSource extends ProductPriceFields {
  discountPercent?: number | null;
  isBoosted?: boolean | null;
  feeCampaigns?: string[] | null;
  /** Takas rozeti satın alınabilirliğe bağlı: active dışı statü / müsait adet <= 0 → rozet yok. */
  status?: string | null;
  availableQuantity?: number | null;
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
export function isProductTradeBadgeVisible(p: ProductCardBadgeSource): boolean {
  return isProductTradeOpen(p) && !isProductOutOfStock(p);
}

export function selectProductCardBadges(p: ProductCardBadgeSource, max: number = MAX_CARD_BADGES): ProductCardBadge[] {
  const badges: ProductCardBadge[] = [];
  const percent = getProductSalePercent(p);
  if (percent >= 1) badges.push({ kind: 'sale', percent });
  // Backend `isBoosted`'ı hesaplar (süresi dolmuş boost false); `boostedUntil`'e bakılmaz.
  if (p.isBoosted === true) badges.push({ kind: 'sponsored' });
  if (isProductTradeBadgeVisible(p)) badges.push({ kind: 'trade' });
  // Bedel kampanyaları fiyatı değiştirmez; vitrinde yalnız rozetle görünür, kartta yalnız ilki.
  const campaign = (p.feeCampaigns ?? []).find((c) => typeof c === 'string' && c.trim() !== '');
  if (campaign) badges.push({ kind: 'campaign', label: campaign });
  return badges.slice(0, max);
}
