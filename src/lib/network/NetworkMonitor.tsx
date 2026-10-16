import { useEffect } from 'react';
import { setToastErrorFilter, subscribeModalPresence } from '@/ui';
import { hadRecentNetworkFailure } from './networkFailure';
import { isOfflinePending, isOnline, startNetworkTracking, subscribeOnline } from './networkStatus';
import { offlineDialog, setOfflineDialogExternallyBlocked } from './offlineDialog';

/**
 * Çevrimdışı diyaloğu zaten bildiriyor mu (gösteriliyor, engel yüzünden ertelenmiş ya da çevrimdışı
 * kararı bekleniyor) VE az önce bir ağ hatası oldu mu: o zaman gelen hata toast'ı aynı olayın
 * ikinci bildirimidir. Kullanıcı diyaloğu kapattıktan sonraki istekler (diyalog aktif değil) normal
 * toast'ını gösterir: sessiz kalınmaz.
 */
function suppressNetworkErrorToast(): boolean {
  const notified = offlineDialog.isVisible() || offlineDialog.isDeferred() || isOfflinePending();
  return notified && hadRecentNetworkFailure();
}

/**
 * Global bağlantı izleyicisi — kök düzene TEK satır (`<NetworkMonitor ready={…} />`). Görsel
 * çıktısı yok: bağlantıyı izler (her zaman — `onlineManager` buna bağlı), karar çevrimdışıya
 * dönünce tek diyalog açtırır, bağlantı dönünce kapattırır. `ready` false iken (splash, tam ekran
 * kapı) diyalog ertelenir. Native modül yoksa izleme sessizce kapalıdır (bkz. `netinfo.ts`).
 */
export function NetworkMonitor({ ready = true }: { ready?: boolean }): null {
  useEffect(() => {
    const unsubscribe = subscribeOnline((online) => offlineDialog.onStatus(online));
    // Engel (açık/kapanan modal) kalkınca ertelenen diyalog yeniden denenir.
    const unsubscribeModals = subscribeModalPresence(() => offlineDialog.reevaluate());
    const stopTracking = startNetworkTracking();
    setToastErrorFilter(suppressNetworkErrorToast);
    // İzleme bu bileşenden önce başlamış olabilir: mevcut kararı uygula.
    if (!isOnline()) offlineDialog.onStatus(false);
    return () => {
      unsubscribe();
      unsubscribeModals();
      stopTracking();
      setToastErrorFilter(null);
      offlineDialog.dispose();
    };
  }, []);

  useEffect(() => {
    setOfflineDialogExternallyBlocked(!ready);
    if (ready) offlineDialog.reevaluate();
  }, [ready]);

  return null;
}
