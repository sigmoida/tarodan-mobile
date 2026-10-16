// Ürün detayı rozet satırı kararı (%İndirim → Takas) — web ile aynı mantık, tek kaynak.
// "Satıldı" rozeti YOK: satılmış ilanda hemen altındaki durum uyarısı (`ProductNotice`) söylüyor.
import type { PriceInfo } from './display';

export interface ProductBadgeState {
  /** İndirim yüzdesi (`getProductSalePercent`, >= 1); rozet yoksa 0. */
  discountPct: number;
  /** Takasa açık + satın alınabilir (`getOfferTradeAvailability().tradeBadge`); sahip de görür. */
  trade: boolean;
}

/** Rozet sırası ve koşulları: sale → trade. `tradeBadge` engagement.ts'ten gelir. */
export function getProductBadges(price: PriceInfo, tradeBadge: boolean): ProductBadgeState {
  return {
    discountPct: price.onSale && price.discountPct > 0 ? price.discountPct : 0,
    trade: tradeBadge,
  };
}
