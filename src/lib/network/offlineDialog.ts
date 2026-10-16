import i18n from '@/i18n/config';
import { appAlert, dismissAlert, isModalPresent } from '@/ui';
import { createOfflineDialogController } from './offlineDialogController';
import { recheckNetwork } from './networkStatus';

/** `appAlert` tekilleştirme / programatik kapatma anahtarı. */
export const OFFLINE_ALERT_KEY = 'network-offline';

/**
 * Diyaloğu şimdi açmak güvensiz olan DIŞ engeller (splash, tam ekran kapı): `NetworkMonitor`
 * `ready` prop'undan besler. Açık `@/ui` Modal / sheet ayrıca `isModalPresent()` ile denetlenir.
 */
let externallyBlocked = true;
export function setOfflineDialogExternallyBlocked(blocked: boolean): void {
  externallyBlocked = blocked;
}

/**
 * Uygulama çapındaki TEK çevrimdışı diyaloğu (gösterim kuralı: `offlineDialogController`).
 *
 * Standart `appAlert` kullanılır: JS katmanı + RN `Modal`. iOS'ta başka bir modal sunuluyor ya da
 * kapanıyorken sunum reddedilir; bu yüzden diyalog ancak `isModalPresent()` yanlışken (açık/kapanan
 * `@/ui` Modal / BottomSheet / SelectSheet / ActionSheet yok) `appAlert`'e verilir, aksi halde
 * ertelenir — `appAlert` kuyruğunda bekleyip diğer alert'leri bloklamaz, bağlantı bu sırada dönerse
 * hiç gösterilmez. "Tekrar dene" `onPress`'i diyalog TAM kapandıktan sonra çalışır.
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
  isBlocked: () => externallyBlocked || isModalPresent(),
});
