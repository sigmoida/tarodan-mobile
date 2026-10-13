/**
 * Izgara içi (inline) reklam yerleşimi — web `lib/ads/inlinePlacement.ts` ile
 * aynı kural: ilk afiş 8. kartın ardından, sonrakiler her 16 kartta bir, ilkine
 * ek olarak en çok 1 tekrar (toplam en çok 2 afiş).
 */

/** İlk satır içi afiş 8. kartın ardından gelir. */
export const INLINE_AD_FIRST_AFTER = 8;
/** Sonrakiler her 16 kartta bir… */
export const INLINE_AD_EVERY = 16;
/** …ve ilkine ek olarak en çok bu kadar tekrar edilir. */
export const INLINE_AD_MAX_REPEATS = 1;

/**
 * Bu kartın (0 tabanlı sıra) hemen ardına satır içi afiş girer mi? Döndürülen
 * sayı yuvanın sırası (0 = ilk) — yuva anahtarına girer ki her yuva farklı
 * afiş seçebilsin. Girmezse `null`.
 */
export function inlineAdSlotAfter(cardIndex: number): number | null {
  const cardNumber = cardIndex + 1;
  if (cardNumber < INLINE_AD_FIRST_AFTER) return null;
  const offset = cardNumber - INLINE_AD_FIRST_AFTER;
  if (offset % INLINE_AD_EVERY !== 0) return null;
  const slot = offset / INLINE_AD_EVERY;
  return slot <= INLINE_AD_MAX_REPEATS ? slot : null;
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
