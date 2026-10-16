/**
 * Çevrimdışı diyaloğunun gösterim kuralı — SAF mantık (React / RN enjekte edilir).
 *
 * Girdi `onStatus` zaten karardır (debounce / doğrulama `networkStatus`'ta yapıldı); burada yalnız
 * NE ZAMAN gösterileceği var:
 * - Bir çevrimdışı SÜREÇTE (kesintisiz çevrimdışı dönem) en çok BİR KEZ gösterilir; kullanıcı
 *   kapatsa da aynı süreçte tekrar çıkmaz. Bağlantı dönünce süreç biter: açık diyalog kapatılır,
 *   sayaç sıfırlanır (yeniden kopunca yine gösterilir).
 * - `isBlocked()` doğruyken (açık `@/ui` Modal / sheet ya da kapanış animasyonu, splash, tam ekran
 *   kapı) gösterilmez, ERTELENİR: `reevaluate()` engel kalkınca çağrılır. Ertelenen diyalog bu
 *   sırada bağlantı dönerse hiç gösterilmez. Diyalog `appAlert` kuyruğuna ancak gösterilebilirken
 *   girer, yani başka alert'leri bloklamaz (iOS: modal üstüne modal donması, CLAUDE.md §14).
 * - `present()` kullanıcı isteğiyle (Tekrar dene → hâlâ çevrimdışı) süreç kuralını atlar; yine de
 *   engel varsa ertelenir.
 */
export interface OfflineDialogControllerOptions {
  /** Diyaloğu aç (çağıran `markClosed`'u kapanışta çağırmakla yükümlü). */
  show: () => void;
  /** Açık diyaloğu programatik kapat (bağlantı döndü). */
  hide: () => void;
  /** Şu an diyalog açmak güvensiz mi (açık modal, splash, kapı…). */
  isBlocked: () => boolean;
}

export interface OfflineDialogController {
  /** Bağlantı kararı (`false` = çevrimdışı). Aynı değerin tekrarı zararsız. */
  onStatus: (online: boolean) => void;
  /** Engel durumu değişti (modal kapandı, splash bitti…): bekleyen gösterimi yeniden dene. */
  reevaluate: () => void;
  /** Kullanıcı diyaloğu kapattı (düğme / geri / arka plan). Süreç bitmez: tekrar çıkmaz. */
  markClosed: () => void;
  /** Kullanıcı isteğiyle yeniden göster (hâlâ çevrimdışıysa; engel varsa ertelenir). */
  present: () => void;
  /** Diyalog ekranda mı. */
  isVisible: () => boolean;
  /** Çevrimdışıyız, diyalog gösterilecek ama engel yüzünden bekliyor mu. */
  isDeferred: () => boolean;
  /** Başlangıç durumuna dön (izleyici söküldü). */
  dispose: () => void;
}

export function createOfflineDialogController({
  show,
  hide,
  isBlocked,
}: OfflineDialogControllerOptions): OfflineDialogController {
  let online = true;
  let wanted = false; // bu çevrimdışı süreçte gösterilmesi gereken diyalog henüz gösterilmedi
  let shownThisEpisode = false;
  let visible = false;

  const tryDisplay = () => {
    if (online || !wanted || visible || isBlocked()) return;
    wanted = false;
    visible = true;
    shownThisEpisode = true;
    show();
  };

  return {
    onStatus(next) {
      if (next === online) return;
      online = next;
      if (!next) {
        if (!shownThisEpisode) wanted = true;
        tryDisplay();
        return;
      }
      wanted = false;
      shownThisEpisode = false;
      if (visible) {
        visible = false;
        hide();
      }
    },
    reevaluate: tryDisplay,
    markClosed() {
      visible = false;
    },
    present() {
      if (online) return;
      wanted = true;
      tryDisplay();
    },
    isVisible: () => visible,
    isDeferred: () => wanted && !visible,
    dispose() {
      online = true;
      wanted = false;
      shownThisEpisode = false;
      visible = false;
    },
  };
}
