/**
 * Izgara içi (inline) reklam yerleşimi: liste başına EN ÇOK 1 afiş, 8. kartın
 * ardından bir kez (ürün sahibi kararı; sunucu da konum başına en çok 1 reklam döndürür).
 */

/** Satır içi afiş 8. kartın ardından (bir kez) gelir. */
export const INLINE_AD_FIRST_AFTER = 8;

/**
 * Bu kartın (0 tabanlı sıra) hemen ardına satır içi afiş girer mi? Döndürülen
 * sayı yuvanın sırası (tek yuva: `0`) — yuva anahtarına girer. Girmezse `null`.
 */
export function inlineAdSlotAfter(cardIndex: number): number | null {
  return cardIndex + 1 === INLINE_AD_FIRST_AFTER ? 0 : null;
}

/** Izgara satırı: `columns` karta kadar kart ya da tam genişlikte bir afiş yuvası. */
export type GridRow<T> =
  | { kind: 'row'; key: string; items: T[] }
  | { kind: 'ad'; key: string; slot: number };

/**
 * Kartları `columns` sütunlu satırlara böler ve `inlineAdSlotAfter` kuralına
 * göre tam genişlikte afiş satırları araya girer. Afiş satırı, o ana kadar
 * dolmamış bir kart satırı varsa onu kapatıp ardından gelir (kart sırası ve
 * "N. karttan sonra" kuralı bozulmaz).
 */
export function withInlineAds<T>(items: readonly T[], columns: number): Array<GridRow<T>> {
  const cols = Math.max(1, Math.floor(columns));
  const rows: Array<GridRow<T>> = [];
  let current: T[] = [];
  let rowNo = 0;
  const flush = () => {
    if (current.length === 0) return;
    rows.push({ kind: 'row', key: `row-${rowNo}`, items: current });
    rowNo += 1;
    current = [];
  };
  items.forEach((item, index) => {
    current.push(item);
    if (current.length === cols) flush();
    const slot = inlineAdSlotAfter(index);
    if (slot !== null) {
      flush();
      rows.push({ kind: 'ad', key: `ad-${slot}`, slot });
    }
  });
  flush();
  return rows;
}
