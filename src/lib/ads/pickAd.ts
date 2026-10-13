/**
 * Yuva başına TEK reklam seçimi — web `lib/ads/pickAd.ts` ile aynı algoritma.
 *
 * Web "sayfa yüklemesi başına" tohum kullanır; mobilde karşılığı yuva bileşeninin
 * bağlanışı (ekran açılışı) başına yeni tohumdur: aynı ekran görünümü boyunca
 * seçim sabit kalır (yeniden çizimde afiş sıçramaz), ekran yeniden açılınca
 * dönüşüm başlar.
 */

export function newRotationSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/** Yuva anahtarından kararlı küçük bir sayı (FNV-1a). */
function hashKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Saf: aynı (liste, yuva, tohum) her zaman aynı sonucu verir. Liste boşsa `null`. */
export function pickAd<T>(ads: readonly T[], slotKey: string, seed: number): T | null {
  if (ads.length === 0) return null;
  return ads[(seed + hashKey(slotKey)) % ads.length] ?? null;
}
