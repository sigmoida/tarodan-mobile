/**
 * Token yenileme (`POST /auth/refresh`) başarısızlığının SINIFI.
 *
 * Eskiden yenilemenin HER hatası (çevrimdışı, zaman aşımı, DNS, 5xx, 429) zorunlu
 * çıkışa gidiyordu: metroda tünele giren, sunucu dağıtımı sırasında uygulamayı
 * açan ya da hız sınırına takılan kullanıcı sebepsiz yere login ekranına atılıyordu.
 *
 * Kural: yalnız sunucunun refresh token'ı KESİN reddettiği durumlar oturumu bitirir —
 * - HTTP 400 / 401 / 403 (geçersiz gövde, geçersiz/süresi dolmuş/iptal edilmiş token),
 * - ya da durum kodundan bağımsız, refresh yolunun bilinen anahtarları
 *   (`authFailureKind` ölçümü: `invalidRefreshToken`, `refreshTokenExpired`,
 *   `refreshTokenRevoked`).
 * Diğer her şey (yanıtsız ağ hatası, zaman aşımı, 408/429/5xx, beklenmeyen gövde) GEÇİCİDİR:
 * istek hatayla reddedilir, oturum (token'lar + kullanıcı) korunur; sonraki 401 yeniden dener.
 */
export type RefreshFailureKind = 'invalid' | 'transient';

/** Sunucunun refresh token'ı kesin reddettiğini söyleyen katalog anahtarları. */
export const DEFINITIVE_REFRESH_KEYS: readonly string[] = [
  'server.auth.invalidRefreshToken',
  'server.auth.refreshTokenExpired',
  'server.auth.refreshTokenRevoked',
];

const DEFINITIVE_STATUSES = new Set([400, 401, 403]);

type LooseError = {
  response?: { status?: number; data?: { i18nKey?: unknown } };
};

export function refreshFailureKind(error: unknown): RefreshFailureKind {
  const response = (error as LooseError | null | undefined)?.response;
  // Yanıt yok: ağ hatası / zaman aşımı / iptal — sunucu token hakkında bir şey söylemedi.
  if (!response) return 'transient';
  const key = response.data?.i18nKey;
  if (typeof key === 'string' && DEFINITIVE_REFRESH_KEYS.includes(key)) return 'invalid';
  if (typeof response.status === 'number' && DEFINITIVE_STATUSES.has(response.status)) {
    return 'invalid';
  }
  return 'transient';
}
