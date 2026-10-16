// Ürün detayı rozet satırı kararı (Satıldı → %İndirim → Takas) — web ile aynı mantık, tek kaynak.
import type { PriceInfo } from './display';
import type { Product } from './types';

export interface ProductBadgeState {
  /** status === 'sold' */
  sold: boolean;
  /** İndirim yüzdesi; rozet yoksa 0. Koşul: indirim gösterimi açık VE yüzde > 0. */
  discountPct: number;
  /** Takasa açık + satın alınabilir (`getOfferTradeAvailability().tradeBadge`); sahip de görür. */
  trade: boolean;
}

/** Rozet sırası ve koşulları: sold → sale → trade. `tradeBadge` engagement.ts'ten gelir. */
export function getProductBadges(product: Product, price: PriceInfo, tradeBadge: boolean): ProductBadgeState {
  return {
    sold: product.status === 'sold',
    discountPct: price.onSale && price.discountPct > 0 ? price.discountPct : 0,
    trade: tradeBadge,
  };
}
