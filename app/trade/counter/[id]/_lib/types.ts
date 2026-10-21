export interface TradeItem {
  id: string;
  productId: string;
  quantity: number;
  /** Flat fields the API returns for an item of a trade (`TradeItemResponseDto`). */
  productTitle?: string;
  productImage?: string;
  productImages?: Array<{ cardUrl?: string; detailUrl?: string }>;
  /** Value at trade time, not the current price. */
  valueAtTrade?: number;
}

export interface Trade {
  id: string;
  status: string;
  cashAmount?: number;
  cashPayerId?: string | null;
  message?: string;
  initiatorId: string;
  receiverId: string;
  initiatorName?: string;
  receiverName?: string;
  initiator?: { id: string; displayName: string };
  receiver?: { id: string; displayName: string };
  initiatorItems?: TradeItem[];
  receiverItems?: TradeItem[];
}

/** The product id of a trade item (`productId`) or of a picker row (`id`). */
export const itemId = (p: { productId?: string; id?: string } | null | undefined) => p?.productId ?? p?.id;

// Signature to detect whether the offer changed (item sets + cash direction/amount).
export function offerSignature(
  mine: ReadonlyArray<{ productId?: string; id?: string }>,
  theirs: ReadonlyArray<{ productId?: string; id?: string }>,
  dir: string,
  cash: string,
): string {
  const cashVal = parseFloat(cash) || 0;
  const m = mine.map(itemId).filter(Boolean).sort().join(',');
  const t = theirs.map(itemId).filter(Boolean).sort().join(',');
  return `${m}|${t}|${dir}:${cashVal}`;
}
