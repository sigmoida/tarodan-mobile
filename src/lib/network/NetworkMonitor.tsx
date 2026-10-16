import { useEffect } from 'react';
import { startNetworkTracking, isOnline, subscribeOnline } from './networkStatus';
import { offlineDialog } from './offlineDialog';

/**
 * Global bağlantı izleyicisi — kök düzene TEK satır (`<NetworkMonitor />`). Görsel çıktısı yok:
 * bağlantıyı izler, çevrimiçi → çevrimdışı geçişinde (debounce'lu) tek diyalog açtırır, bağlantı
 * dönünce kapattırır. Native modül yoksa izleme sessizce kapalıdır (bkz. `netinfo.ts`).
 */
export function NetworkMonitor(): null {
  useEffect(() => {
    const unsubscribe = subscribeOnline((online) => offlineDialog.onStatus(online));
    const stopTracking = startNetworkTracking();
    // İzleme bu bileşenden önce başlamış olabilir (ölçüm geldi): mevcut durumu uygula.
    if (!isOnline()) offlineDialog.onStatus(false);
    return () => {
      unsubscribe();
      stopTracking();
      offlineDialog.dispose();
    };
  }, []);
  return null;
}
