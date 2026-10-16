import { ProductPriceFields, getProductDiscountPercent, isProductOnSaleDisplay } from '@/utils/productPrice';
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
}

/**
 * İndirim yüzdesi: API `discountPercent` (> 0 ise) yoksa eski/yeni fiyattan yuvarlanmış hesap.
 * İndirim yoksa ya da yüzde < 1 ise 0 — rozet çizilmez (asla "%0").
 */
export function getProductSalePercent(p: ProductCardBadgeSource): number {
  if (!isProductOnSaleDisplay(p)) return 0;
  const percent = p.discountPercent != null && p.discountPercent > 0 ? p.discountPercent : getProductDiscountPercent(p);
  return percent >= 1 ? percent : 0;
}

export function selectProductCardBadges(p: ProductCardBadgeSource, max: number = MAX_CARD_BADGES): ProductCardBadge[] {
  const badges: ProductCardBadge[] = [];
  const percent = getProductSalePercent(p);
  if (percent >= 1) badges.push({ kind: 'sale', percent });
  // Backend `isBoosted`'ı hesaplar (süresi dolmuş boost false); `boostedUntil`'e bakılmaz.
  if (p.isBoosted === true) badges.push({ kind: 'sponsored' });
  if (isProductTradeOpen(p)) badges.push({ kind: 'trade' });
  // Bedel kampanyaları fiyatı değiştirmez; vitrinde yalnız rozetle görünür, kartta yalnız ilki.
  const campaign = (p.feeCampaigns ?? []).find((c) => typeof c === 'string' && c.trim() !== '');
  if (campaign) badges.push({ kind: 'campaign', label: campaign });
  return badges.slice(0, max);
}
