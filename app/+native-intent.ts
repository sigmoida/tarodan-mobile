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
import { isNeverNavigatePath, pathFromUrl } from '@/lib/deeplinks';
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

    // Ödeme dönüşü uygulamaya ÇEKİLMEZ. PayTR 3DS turu ödeme WebView'i içinde
    // yakalanır; kullanıcıyı akışın ortasında dışarı alan bir link ödemeyi
    // bozar. `toMobileRoute` bu yollara zaten null döner, ama null "eşleme yok"
    // demek — fallback girdiyi olduğu gibi geçirir ve `app/payment/success`
    // GERÇEKTEN var. Bu yüzden ayrıca ve önce kontrol edilir.
    //
    // Yalnız `neverNavigate` satırları: `include: false` olan `/checkout*`,
    // `/admin/*`, `/api/*` burada engellenmez. Onlar "AASA'da talep etme"
    // kararı; kullanıcı `tarodan://checkout` ile uygulamayı açıkça çağırdığında
    // engellemek için bir sebep yok.
    if (isNeverNavigatePath(normalized)) return NO_NAVIGATION;

    // Eşleşme yoksa GİRDİYİ OLDUĞU GİBİ döndür — `normalized`'ı değil. İkisi
    // aynı şey değil: `normalized` bizim türetimimiz, expo-router'ın kendi URL
    // çıkarımıyla örtüşmek zorunda değil. Onu döndürmek, eşlemediğimiz HER
    // bağlantı için expo-router'ın çıkarımını sessizce eziyordu — dev client'ın
    // açılış URL'i (`tarodan://expo-development-client/?url=…`) dahil, ki
    // uygulama splash'te kilitleniyordu. `path` dönmek "kanca yokmuş gibi
    // davran" demek; `tarodan://cart` gibi örtüşen yollar yine çalışır.
    return toMobileRoute(normalized) ?? path;
  } catch {
    // Kancada atılan hata uygulamayı çökertebilir — girdiyi olduğu gibi bırak.
    return path;
  }
}
