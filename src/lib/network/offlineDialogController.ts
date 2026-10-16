/**
 * Çevrimdışı diyaloğunun geçiş kuralı — SAF mantık (React / RN / zamanlayıcı enjekte edilebilir).
 *
 * Kurallar:
 * - Çevrimiçi → çevrimdışı geçişinde `debounceMs` beklenir; bu sürede bağlantı dönerse hiçbir şey
 *   gösterilmez (anlık titreşim).
 * - Bir çevrimdışı SÜREÇTE (kesintisiz çevrimdışı dönem) en çok BİR KEZ gösterilir; kullanıcı
 *   kapatsa da aynı süreçte tekrar çıkmaz.
 * - Bağlantı dönünce süreç biter: açık diyalog kapatılır ve sayaç sıfırlanır (yeniden kopunca
 *   yine gösterilir).
 * - Açılışta çevrimdışıysa ilk ölçüm de bir geçiş sayılır (`onStatus(false)`).
 * - `present()` kullanıcı isteğiyle (Tekrar dene → hâlâ çevrimdışı) kuralı atlayıp yeniden gösterir.
 */
export interface OfflineDialogControllerOptions {
  /** Diyaloğu aç (çağıran `markClosed`'u kapanışta çağırmakla yükümlü). */
  show: () => void;
  /** Açık/bekleyen diyaloğu programatik kapat (bağlantı döndü). */
  hide: () => void;
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

export const OFFLINE_DIALOG_DEBOUNCE_MS = 1800;

export interface OfflineDialogController {
  /** Bağlantı durumu bildirimi (`false` = çevrimdışı). Aynı değerin tekrarı zararsız. */
  onStatus: (online: boolean) => void;
  /** Kullanıcı diyaloğu kapattı (düğme / geri / arka plan). Süreç bitmez: tekrar çıkmaz. */
  markClosed: () => void;
  /** Kuralı atlayıp göster (kullanıcının "Tekrar dene"si hâlâ çevrimdışı çıktı). */
  present: () => void;
  /** Gösterim bekliyor (debounce) ya da diyalog ekranda mı. */
  isActive: () => boolean;
  dispose: () => void;
}

export function createOfflineDialogController({
  show,
  hide,
  debounceMs = OFFLINE_DIALOG_DEBOUNCE_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
}: OfflineDialogControllerOptions): OfflineDialogController {
  let online = true;
  let timer: unknown = null;
  let shownThisEpisode = false;
  let visible = false;

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const display = () => {
    if (visible) return;
    visible = true;
    shownThisEpisode = true;
    show();
  };

  return {
    onStatus(next) {
      if (next === online) return;
      online = next;
      if (!next) {
        if (shownThisEpisode || timer !== null) return;
        timer = setTimer(() => {
          timer = null;
          if (!online) display();
        }, debounceMs);
        return;
      }
      cancelTimer();
      shownThisEpisode = false;
      if (visible) {
        visible = false;
        hide();
      }
    },
    markClosed() {
      visible = false;
    },
    present() {
      display();
    },
    isActive: () => visible || timer !== null,
    dispose() {
      // Başlangıç durumuna dön: izleyici yeniden bağlanırsa (dev yeniden bağlama) ilk ölçüm yine
      // bir geçiş sayılsın.
      cancelTimer();
      online = true;
      shownThisEpisode = false;
      visible = false;
    },
  };
}
