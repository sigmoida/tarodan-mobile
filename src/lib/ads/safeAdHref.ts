/**
 * Reklam bağlantı güvenliği — web `lib/ads/safeAdHref.ts` ile aynı kural.
 *
 * Bağlantıyı admin yazar; `javascript:`, `data:`, özel şema ya da `//evil`
 * (protokol-göreli) tıklamada çalışmasın. Yalnız `http(s)://` ve site-içi `/…`
 * yolu geçer; diğerleri `null` döner ve bağlantı HİÇ çizilmez / açılmaz.
 */
export function safeAdHref(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) {
    // Ters bölü bazı motorlarda `/` sayılır: `/\evil.com` → `//evil.com`.
    return value.startsWith('/\\') ? null : value;
  }
  return null;
}
