/**
 * Maestro e2e test kapısı — TEK KAYNAK. Uygulamadaki her Maestro baypası
 * (auto-login, NO_AUTOLOGIN, maskesiz şifre alanları, login fallback'i, kayıt
 * doğum tarihi ön doldurması) bu modülden okur; `process.env.EXPO_PUBLIC_MAESTRO`
 * başka bir yerde doğrudan okunmaz.
 *
 * Neden `__DEV__`'e bağlı DEĞİL: Maestro staging (preview) RELEASE build'ine
 * karşı da koşturulacak (Faz 6); `__DEV__` orada false ve kapıyı sessizce
 * kapatıyordu. Koruma bunun yerine derleme anındadır:
 * - `EXPO_PUBLIC_*` değerleri Expo'nun Babel dönüşümüyle derlemede literal'e
 *   çevrilir. Production EAS profili bu değişkenleri set ETMEZ (bkz.
 *   `src/config/__tests__/maestro.test.ts` — `eas.json` testle çivili), yani
 *   production bundle'da `IS_MAESTRO` sabit `false`'tur.
 * - Kimlik bilgileri yalnız env'den gelir; kodda gömülü varsayılan YOK.
 *
 * `process.env.EXPO_PUBLIC_*` erişimleri DOĞRUDAN kalmalı (değişkene/parametreye
 * almak inline'ı bozar).
 */
export const IS_MAESTRO = process.env.EXPO_PUBLIC_MAESTRO === '1';

/**
 * Kayıt/misafir yolculukları: auto-login yapılmaz ve açılışta kayıtlı token
 * temizlenir (keychain `clearState`'ten sağ çıkabiliyor). Yalnız Maestro
 * build'inde anlamlı — `IS_MAESTRO` kapalıyken tek başına hiçbir şey yapmaz.
 */
export const IS_MAESTRO_NO_AUTOLOGIN =
  IS_MAESTRO && process.env.EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN === '1';

export type MaestroCredentials = { email: string; password: string };

/**
 * Maestro auto-login kimliği — yalnız `EXPO_PUBLIC_MAESTRO=1` build'inde ve
 * `EXPO_PUBLIC_MAESTRO_EMAIL` + `EXPO_PUBLIC_MAESTRO_PASSWORD` ikisi de
 * verilmişse. Kapı açık ama kimlik eksikse sessizce geçmez: `console.warn`
 * basar (yoksa akışlar login ekranında anlaşılmaz biçimde takılır).
 */
export function getMaestroAutoLoginCredentials(): MaestroCredentials | null {
  if (!IS_MAESTRO || IS_MAESTRO_NO_AUTOLOGIN) return null;
  const email = process.env.EXPO_PUBLIC_MAESTRO_EMAIL;
  const password = process.env.EXPO_PUBLIC_MAESTRO_PASSWORD;
  if (!email || !password) {
    console.warn(
      '[maestro] EXPO_PUBLIC_MAESTRO=1 ama EXPO_PUBLIC_MAESTRO_EMAIL / ' +
        'EXPO_PUBLIC_MAESTRO_PASSWORD eksik — auto-login YAPILMAYACAK. ' +
        'İkisini de build/Metro env\'ine ekleyin (bkz. maestro/README.md).',
    );
    return null;
  }
  return { email, password };
}
