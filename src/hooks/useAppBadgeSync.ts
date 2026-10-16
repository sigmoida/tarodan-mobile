import { useEffect } from 'react';
import { AppState } from 'react-native';
import { hashKey, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { setAppBadgeCount } from '@/services/push';

/**
 * Uygulama simgesi rozeti = okunmamış zil bildirimi sayısı — sunucunun push'a koyduğu `badge`
 * ile AYNI tanım. Eskiden rozet hiç düşmüyordu (bildirimler okunsa da simgede kalıyordu).
 *
 * Kaynak `qk.notifications.unread` önbelleğidir (ana sayfa / marka barı rozetiyle aynı sorgu):
 * sayı değişince (okundu, "tümünü okundu", yeni bildirim) rozet güncellenir. Ön plana dönüşte
 * sorgu tazelenir — arka plandayken gelen push'lar ve başka cihazda okunanlar yansır. Veri henüz
 * yokken rozete dokunulmaz (açılışta sıfıra çekip geri yükseltmesin).
 *
 * Oturum yokken dokunulmaz: çıkış rozeti zaten sıfırlar (`clearLocalPushState`).
 */
export function useAppBadgeSync(isAuthenticated: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const hash = hashKey(qk.notifications.unread);
    const apply = () => {
      const count = qc.getQueryData<number>(qk.notifications.unread);
      if (typeof count === 'number') void setAppBadgeCount(count);
    };
    apply();
    const unsubscribeCache = qc.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryHash === hash) apply();
    });
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Gözlemcisi olmasa da (ör. rozetsiz bir ekrandayken) tazelenir.
      void qc.invalidateQueries({ queryKey: qk.notifications.unread, refetchType: 'all' });
    });
    return () => {
      unsubscribeCache();
      appStateSub.remove();
    };
  }, [qc, isAuthenticated]);
}
