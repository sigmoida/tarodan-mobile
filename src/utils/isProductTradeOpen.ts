/**
 * Tek kaynak: API / arama / eski mobil store farklı alan adlarıyla
 * "takas açık" bilgisini döndürebilir.
 */
const truthy = (v: unknown): boolean => {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    return (
      s === 'true' ||
      s === '1' ||
      s === 'yes' ||
      s === 'open' ||
      s === 'available' ||
      s === 'enabled'
    );
  }
  return false;
};

/**
 * Parametre `unknown`: çağıranlar hem gevşek `any` DTO'lar hem de index
 * signature'ı olmayan tipli arayüzler (`ProductCardProduct`) — daraltma zaten
 * içeride yapılıyor, tek kaynağın önüne tip engeli konmasın.
 */
export function isProductTradeOpen(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;

  if (truthy(record.isTradeEnabled)) return true;
  if (truthy(record.tradeAvailable)) return true;
  if (truthy(record.trade_available)) return true;
  if (truthy(record.trade_enabled)) return true;

  const trade = record.trade as Record<string, unknown> | undefined;
  if (trade && typeof trade === 'object') {
    if (truthy(trade.available)) return true;
    if (truthy(trade.isEnabled)) return true;
    if (truthy(trade.enabled)) return true;
  }

  const status = record.tradeStatus;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    if (s === 'open' || s === 'available' || s === 'enabled') return true;
  }

  return false;
}
