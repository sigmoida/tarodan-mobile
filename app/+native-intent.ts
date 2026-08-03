/**
 * Derin bağlantı yönlendirmesi — expo-router'ın `+native-intent` kancası.
 *
 * NEDEN BURADA: expo-router gelen URL'yi kendi rota ağacında arar; web yolları
 * (`/listings/123`, `/trades/5`, `/track-order`) mobil rota adlarıyla aynı
 * DEĞİL. Eşleme sonradan yapılırsa önce "sayfa bulunamadı" açılır, sonra doğru
 * ekrana atlanır (ya da eşleşen yollar iki kez açılır). `redirectSystemPath`
 * hem soğuk başlatmada hem uygulama açıkken **rotalamadan ÖNCE** çalışır
 * (expo-router `getLinkingConfig` → `getInitialURL` + `subscribe`), o yüzden
 * çeviri tek doğru yerde burada yapılır.
 *
 * Yol → mobil rota eşlemesi push bildirimleriyle PAYLAŞILIR (`toMobileRoute`);
 * ikinci bir kopya tutulmaz. Push tap'leri bu kancadan geçmez
 * (`src/services/push.ts` ayrı akış), eşleyici ortaktır.
 */
import { isExcludedWebPath, pathFromUrl } from '@/lib/deeplinks';
import { toMobileRoute } from '@/utils/notificationRoute';

/**
 * Boş string = "gezinme yok". expo-router boş yolu, uygulamanın bağlantısız
 * açılmasıyla aynı şekilde ele alır: `subscribe` dinleyiciyi hiç çağırmaz
 * (`if (href)`), soğuk başlatmada `getStateFromURL('')` undefined döner.
 */
const NO_NAVIGATION = '';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const normalized = pathFromUrl(path);
    // Kök URL (`tarodan:///` — bağlantısız açılış) ya da boş: dokunma.
    if (!normalized) return path;

    // Ödeme/checkout dönüşü uygulamaya ÇEKİLMEZ. PayTR 3DS turu ödeme
    // WebView'i içinde yakalanır; uygulama dışından gelen bir link kullanıcıyı
    // akışın ortasında dışarı alırsa ödeme kopar. `toMobileRoute` bu yollara
    // zaten null döner, ama null "eşleme yok" demek — aşağıdaki fallback yolu
    // olduğu gibi geçirir ve `app/payment/success` GERÇEKTEN var. Bu yüzden
    // dışlama ayrıca ve önce kontrol edilir. Tek kaynak: paths.json
    // `include: false` satırları.
    if (isExcludedWebPath(normalized)) return NO_NAVIGATION;

    // Eşleşmeyen yol olduğu gibi geçer: `tarodan://cart` gibi mobil rotayla
    // birebir örtüşen custom scheme bağlantıları expo-router'ın kendi
    // eşleşmesiyle çalışmaya devam etsin.
    return toMobileRoute(normalized) ?? normalized;
  } catch {
    // Kancada atılan hata uygulamayı çökertebilir — girdiyi olduğu gibi bırak.
    return path;
  }
}
