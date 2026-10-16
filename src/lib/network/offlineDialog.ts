import i18n from '@/i18n/config';
import { appAlert, dismissAlert } from '@/ui';
import { createOfflineDialogController } from './offlineDialogController';
import { recheckNetwork } from './networkStatus';

/** `appAlert` tekilleştirme / programatik kapatma anahtarı. */
export const OFFLINE_ALERT_KEY = 'network-offline';

/**
 * Uygulama çapındaki TEK çevrimdışı diyaloğu (geçiş kuralı: `offlineDialogController`).
 *
 * Standart `appAlert` kullanılır: bu bir `@/ui` JS katmanı + RN `Modal`; iOS'ta açık başka bir
 * `@/ui` Modal / BottomSheet varken sunum UIKit'ce reddedilebilir. `AlertDialogHost` bunu zaten
 * karşılar (sunum watchdog'u: `onShow` gelmezse yeniden bağlanıp dener), yani diyalog engelleyen
 * modal kapanınca görünür ve donma olmaz; ayrıca kapı (zorunlu güncelleme vb.) açıkken host
 * askıdadır, uyarı kuyrukta bekler. "Tekrar dene" `onPress`'i diyalog TAM kapandıktan sonra çalışır
 * (aynı tick'te yeni sunum yok).
 */
function showOfflineAlert(): void {
  appAlert(
    i18n.t('error.networkError'),
    i18n.t('error.offlineMessage'),
    [
      // `cancel` stilli düğme solda; geri tuşu / arka plan da buna basmak sayılır.
      { text: i18n.t('common.ok'), style: 'cancel', onSelect: () => offlineDialog.markClosed() },
      {
        text: i18n.t('common.tryAgain'),
        onSelect: () => offlineDialog.markClosed(),
        onPress: () => {
          void recheckNetwork().then((online) => {
            // Çevrimiçi ise durum aboneliği süreci zaten bitirdi; hâlâ çevrimdışıysa kullanıcıya
            // isteği üzerine bir kez daha söyle.
            if (!online) offlineDialog.present();
          });
        },
      },
    ],
    { key: OFFLINE_ALERT_KEY },
  );
}

export const offlineDialog = createOfflineDialogController({
  show: showOfflineAlert,
  hide: () => dismissAlert(OFFLINE_ALERT_KEY),
});

/** Çevrimdışı diyaloğu bekliyor ya da ekranda mı (istek bazlı ağ-hatası bildirimlerini bastırmak için). */
export function isOfflineDialogActive(): boolean {
  return offlineDialog.isActive();
}
