import { useEffect, useId } from 'react';
import { Platform } from 'react-native';

/**
 * Hassas ekran koruması — ekran görüntüsü / kayıt ve uygulama değiştirici önizlemesi.
 *
 * Kart girişi + 3DS, 2FA kurulumu (gizli anahtar, QR, yedek kodlar), IBAN / banka hesabı ve
 * TCKN girişi bu korumayla açılır. Platform davranışı (`expo-screen-capture`):
 *  - Android: `FLAG_SECURE` — ekran görüntüsü/kayıt siyah, "son uygulamalar" önizlemesi boş.
 *  - iOS: ekran görüntüsü/kayıtta içerik gizlenir; uygulama değiştirici önizlemesi ayrıca
 *    bulanıklaştırılır (`enableAppSwitcherProtectionAsync` — iOS'ta küresel, burada sayaçla
 *    yalnız korunan ekran açıkken etkin).
 *
 * Modül TEMBEL yüklenir: native modül yoksa (Expo Go, modülü içermeyen eski binary, test)
 * `requireNativeModule` import anında fırlatır — koruma sessizce devre dışı kalır, ekran
 * çalışmaya devam eder. Hiçbir çağrı fırlatmaz.
 */

type ScreenCaptureModule = typeof import('expo-screen-capture');

let cached: ScreenCaptureModule | null | undefined;

function screenCaptureModule(): ScreenCaptureModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cached = require('expo-screen-capture') as ScreenCaptureModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/** iOS uygulama değiştirici bulanıklığı küresel: son korunan ekran kapanınca kalkar. */
let appSwitcherUsers = 0;
/** iOS bulanıklık yoğunluğu (0–1): hassas veri okunamasın diye en yüksek. */
const APP_SWITCHER_BLUR = 1;

const ignore = () => undefined;

/**
 * Korumayı `key` adına açar; dönen fonksiyon kapatır (tekrar çağrılması zararsız). Aynı anda
 * birden çok korunan ekran olabilir: yakalama izni ancak hepsi kapanınca geri gelir.
 */
export function protectSensitiveScreen(key: string): () => void {
  const sc = screenCaptureModule();
  if (!sc) return ignore;
  const ios = Platform.OS === 'ios';
  try {
    sc.preventScreenCaptureAsync(key).catch(ignore);
    if (ios && ++appSwitcherUsers === 1) sc.enableAppSwitcherProtectionAsync(APP_SWITCHER_BLUR).catch(ignore);
  } catch {
    /* native modül eksik/uyumsuz: koruma yok, ekran çalışır */
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      sc.allowScreenCaptureAsync(key).catch(ignore);
      if (ios && --appSwitcherUsers === 0) sc.disableAppSwitcherProtectionAsync().catch(ignore);
    } catch {
      /* yukarıdakiyle aynı */
    }
  };
}

/**
 * Bileşen bağlı kaldıkça (ve `enabled` iken) hassas ekran korumasını açık tutar. Ekranın
 * kökünde, erken `return`'lerden ÖNCE çağrılır.
 */
export function useScreenCaptureProtection(enabled: boolean = true): void {
  const key = `sensitive-screen${useId()}`;
  useEffect(() => (enabled ? protectSensitiveScreen(key) : undefined), [enabled, key]);
}

/** Yalnız testler için: modül önbelleğini ve iOS sayacını sıfırlar. */
export function __resetScreenCaptureProtection(): void {
  cached = undefined;
  appSwitcherUsers = 0;
}
