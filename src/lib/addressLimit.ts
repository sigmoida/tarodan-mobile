/**
 * Kayıtlı adres üst sınırı — TEK KAYNAK (istemci). Sunucu tüm katmanlarda en fazla 3 adres kabul eder:
 * tarodan-app `apps/api/src/modules/user/profile/user-address.service.ts` (`existingAddresses >= 3`
 * → `server.user.addressLimitReached`). Sunucu ileride `limits.maxAddresses` döndürürse `authStore`
 * bindirmesi (`mergeLimits`) o değeri kullanır; bu sabit yalnız varsayılandır.
 */
export const SERVER_MAX_ADDRESSES = 3;

/**
 * Ekranın kullanacağı limit: bilinmeyen / sınırsız (`-1`, 0, NaN) değer → `Infinity` (sayaç gizli,
 * ekleme kapısı kapanmaz — sunucu yine reddederse hata toast'ı gelir).
 */
export function resolveMaxAddresses(raw: number | null | undefined): number {
  const value = raw ?? SERVER_MAX_ADDRESSES;
  return Number.isFinite(value) && value > 0 ? value : Infinity;
}
