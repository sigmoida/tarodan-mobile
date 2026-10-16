import { useCallback } from 'react';
import {
  canPromptFor,
  notificationPermission,
  openAppSettings,
  usePermissionStatus,
} from '@/lib/permissions';
import { ensureNotificationChannels, syncPushRegistration } from '@/services/push';

/**
 * Ayarlar → Bildirimler: cihaz bildirim izni durumu + eylemleri. Durum ön plana her dönüşte
 * yenilenir (kullanıcı Ayarlar'dan izin verip döndüğünde); izin VERİLDİĞİ anda push kaydı
 * yapılır (token sunucuya yazılır) — yeniden açılış beklenmez.
 */
export function useDeviceNotificationPermission() {
  const { state, request } = usePermissionStatus(notificationPermission, {
    onChange: (next, prev) => {
      if (next.status === 'granted' && prev && prev.status !== 'granted') {
        void syncPushRegistration();
      }
    },
  });

  const allow = useCallback(async () => {
    // Android 13: kanal yoksa sistem izin diyaloğu gösterilmez.
    await ensureNotificationChannels();
    await request();
  }, [request]);

  const openSettings = useCallback(() => {
    void openAppSettings();
  }, []);

  return {
    state,
    canRequest: state ? canPromptFor(state) : false,
    allow,
    openSettings,
  };
}
