/**
 * `Accept-Language` — sunucu hata mesajlarının dilini seçen TEK kaynak.
 *
 * Backend (#224) artık servislerinden sabit Türkçe metin değil bir katalog
 * anahtarı fırlatıyor; `AllExceptionsFilter` mesajı **isteğin `accept-language`
 * başlığına göre** render edip gövdeye ayrıca `i18nKey` koyuyor. Staging'de
 * ölçüldü (2026-08-26):
 *
 *   POST /auth/login (hatalı) + `accept-language: tr`
 *     → {"message":"Email veya şifre hatalı","i18nKey":"server.auth.invalidCredentials"}
 *   aynı istek + `accept-language: en`
 *     → {"message":"Invalid email or password","i18nKey":"server.auth.invalidCredentials"}
 *
 * Başlık gönderilmezse sunucu varsayılana (tr) düşer. Mobilde
 * `settings/language` ekranı var, yani İngilizce'ye geçen kullanıcı arayüzü
 * İngilizce, sunucu hatalarını Türkçe görüyordu.
 *
 * ## Neden i18next'ten okunuyor, ayrı bir kopya tutulmuyor
 *
 * Dil seçiminin tek sahibi `LocaleProvider` (AsyncStorage `'locale'`) ve onun
 * yazdığı yer i18next instance'ı. Burada ikinci bir "şu an seçili dil" değişkeni
 * tutmak, dilin iki yerde saklandığı ve birinin bayatladığı klasik ayrışmayı
 * doğurur. `i18n.language` her `changeLanguage`'ten sonra güncel olduğu için
 * interceptor'ın her istekte okuması yeterli.
 *
 * ## Sınır (ölçüldü — beklenti yaratmasın)
 *
 * Çeviri yalnız `i18nMessage()` ile fırlatılan hataları kapsıyor. class-validator
 * ALAN doğrulama mesajları dekoratörde sabit Türkçe metin taşıyor ve
 * `accept-language: en` ile de Türkçe dönüyor ("Başlık en az 5 karakter
 * olmalıdır"). Bu istemcide kapatılamaz.
 */
import { resolveLocale, type Locale } from "@/i18n/lib";

/**
 * O anki arayüz dilini çözer. i18next henüz kurulmadıysa (çok erken bir istek,
 * ya da i18n'i mount etmeyen bir test) varsayılana düşer — istek dilsiz kalmaz.
 */
export function currentLocale(): Locale {
  try {
    // Lazy `require`: `client.ts` → i18next → katalog zincirini modül yükleme
    // sırasına bağlamamak için (aynı desen `syncStoreAccessToken`'da da var).
    const i18n = require("@/i18n/config").default;
    return resolveLocale(i18n?.language);
  } catch {
    return resolveLocale(undefined);
  }
}

/** Interceptor'ın yazdığı başlık değeri. */
export function acceptLanguageHeader(): string {
  return currentLocale();
}
