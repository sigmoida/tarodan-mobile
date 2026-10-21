import type { TradeItem } from './types';

/** A product row in the counter-offer pickers. */
export interface CounterProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  isOnSale?: boolean;
  images?: Array<{ url?: string; cardUrl?: string; detailUrl?: string }> | string[];
  isTradeEnabled?: boolean;
  status?: string;
}

/** A picker row built from an item that is already in the trade. */
function fromTradeItem(item: TradeItem): CounterProduct {
  return {
    id: item.productId,
    title: item.productTitle ?? '',
    // Value at trade time, not the current price.
    price: item.valueAtTrade ?? 0,
    images: item.productImages?.length ? item.productImages : item.productImage ? [item.productImage] : [],
    // In a trade, so reserved on the server and necessarily trade-enabled. The row stays
    // `active` here: `ProductCard` draws any other status as "out of stock", and these are the
    // items the user is editing.
    status: 'active',
    isTradeEnabled: true,
  };
}

/**
 * The picker list: the items already in the trade first (they stay pickable whatever their
 * status), then the loaded pages minus those items and minus `excludeId`. Same rule as web
 * `mergeTradeItems`.
 */
export function mergeTradeItems(
  tradeItems: readonly TradeItem[],
  loaded: readonly CounterProduct[],
  excludeId?: string,
): CounterProduct[] {
  const inTrade = new Set(tradeItems.map((i) => i.productId));
  return [
    ...tradeItems.map(fromTradeItem),
    ...loaded.filter((p) => !inTrade.has(p.id) && p.id !== excludeId),
  ];
}
