/**
 * Ağ hatası (sunucudan yanıt gelmeden düşen istek) kaydı — bağımlılıksız: axios interceptor'ı
 * (`@/lib/api/client`) bunu import eder, döngü oluşmasın diye hiçbir şey import etmez.
 */

/** Bu süre içinde bir ağ hatası olduysa gelen hata toast'ı onun sonucu sayılır (ms). */
export const RECENT_NETWORK_FAILURE_MS = 3000;

let lastFailureAt = 0;

/**
 * Axios'ta SUNUCUDAN YANIT GELMEDEN düşen istek (`ERR_NETWORK`, bağlantı kesik, DNS, zaman aşımı).
 * Kullanıcının kendi iptali (`ERR_CANCELED`) ağ hatası sayılmaz.
 */
export function isNoResponseNetworkError(e: unknown): boolean {
  const ax = e as { isAxiosError?: unknown; response?: unknown; code?: unknown } | null | undefined;
  if (!ax || ax.isAxiosError !== true) return false;
  if (ax.response) return false;
  return ax.code !== 'ERR_CANCELED';
}

/** Axios yanıt interceptor'ı çağırır: ağ hatasıysa zamanını kaydeder (hatayı değiştirmez). */
export function noteNetworkFailure(e: unknown): void {
  if (isNoResponseNetworkError(e)) lastFailureAt = Date.now();
}

/** Son `RECENT_NETWORK_FAILURE_MS` içinde bir ağ hatası oldu mu. */
export function hadRecentNetworkFailure(): boolean {
  return lastFailureAt > 0 && Date.now() - lastFailureAt <= RECENT_NETWORK_FAILURE_MS;
}

/** YALNIZ TEST. */
export function resetNetworkFailureForTests(): void {
  lastFailureAt = 0;
}
