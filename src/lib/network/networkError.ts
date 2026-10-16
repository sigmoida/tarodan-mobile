import { isOnline } from './networkStatus';
import { isOfflineDialogActive } from './offlineDialog';

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

/**
 * Global çevrimdışı diyaloğu zaten bildiriyor mu: ağ hatası + cihaz çevrimdışı + diyalog bekliyor
 * ya da ekranda. Doğruysa istek bazlı hata toast'ı basılmaz (çift bildirim olmasın). Kullanıcı
 * diyaloğu kapattıktan sonraki istekler (diyalog aktif değil) normal toast'ını gösterir: sessiz
 * kalmaz.
 */
export function shouldSuppressNetworkErrorToast(e: unknown): boolean {
  return isNoResponseNetworkError(e) && !isOnline() && isOfflineDialogActive();
}
