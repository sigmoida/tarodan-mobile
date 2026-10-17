/**
 * #215: i18next kurulumu — katalog @/i18n/lib'den (tek kaynak), ICU postprocessor,
 * cihaz dili Hermes Intl ile (expo-localization native modül gerektirdiği için onun
 * yerine — aynı sonuç, dev-client rebuild yok). Kalıcılık AsyncStorage ('locale'
 * anahtarı) provider tarafında yönetilir.
 *
 * Katalog {count} (tek süslü) interpolation kullanıyor — i18next-icu bunu ICU simple
 * argument olarak çözer, mevcut hand-rolled davranışa parite.
 *
 * Çoğul: sayıya bağlı metinler i18next kalıbıyla (`key_one` / `key_other` +
 * `t(key, { count })`); adlı parametreli süre metinleri (returnWindowDays vb., web'le aynı
 * ICU) için Hermes'te eksik Intl.PluralRules ./pluralRules ile tamamlanır.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ICU from "i18next-icu";
import {
  defaultLocale,
  resolveLocale,
  type Locale,
} from "@/i18n/lib";
import { ensurePluralRules } from "./pluralRules";

// Hermes'te Intl.PluralRules yok → ICU plural ham metin basardı; init'ten ÖNCE kur.
ensurePluralRules();

/** Cihaz dilini Hermes Intl'den çöz (tr-TR → 'tr'); bilinmeyen → defaultLocale. */
export function getDeviceLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale; // 'tr-TR' | 'en-US' ...
    return resolveLocale(tag.split("-")[0]);
  } catch {
    return defaultLocale;
  }
}

/**
 * Katalog yükleme (açılış maliyeti): iki JSON (~780 KB) modül kapsamında import EDİLMEZ —
 * `require` fonksiyon içinde, yalnız o dil gerektiğinde çalışır (Metro inlineRequires'ta modül
 * ilk require'da değerlendirilir; kullanılmayan dilin JSON ayrıştırması açılışta yapılmaz).
 * Not: Metro iki JSON'u da bundle'a koyar (bundle boyutu değişmez); kazanç açılışta
 * ayrıştırma/bellek. Kayıt senkron → ilk render flicker yok.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
function requireCatalog(locale: Locale): Record<string, unknown> {
  return locale === "en"
    ? require("./lib/catalog/en.json")
    : require("./lib/catalog/tr.json");
}
/* eslint-enable @typescript-eslint/no-var-requires */

/** Dil paketini (yoksa) i18n'e ekler; `changeLanguage`'dan ÖNCE çağrılır. Senkron. */
export function ensureLocaleLoaded(locale: Locale): void {
  if (i18n.hasResourceBundle(locale, "translation")) return;
  i18n.addResourceBundle(locale, "translation", requireCatalog(locale), true, false);
}

const initialLocale = getDeviceLocale();

i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    // Yalnız cihaz dili yüklenir; diğeri dil değişiminde `ensureLocaleLoaded` ile gelir.
    resources: { [initialLocale]: { translation: requireCatalog(initialLocale) } },
    lng: initialLocale,
    fallbackLng: defaultLocale,
    keySeparator: ".",
    nsSeparator: false, // tek namespace; 'common.login' gibi key'ler ns sanılmasın
    interpolation: { escapeValue: false }, // RN'de XSS yok
    returnNull: false,
    react: { useSuspense: false }, // senkron init (inline resources) → ilk render flicker yok
  });

export default i18n;
