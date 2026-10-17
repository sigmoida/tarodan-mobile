/**
 * AsyncStorage'ın GEVŞEK yüklenmesi — modül içe aktarıldığında native modüle dokunulmaz.
 *
 * Push/bildirim modülleri (`@/services/push`, ön-izin) çok sayıda ekran ve test zincirine
 * giriyor; paketi üst düzeyde içe aktarmak, native modülü olmayan ortamda (testler) yüklemeyi
 * kırardı. Erişim ilk kullanımda; modül yoksa `null` (çağıran en iyi çabayla devam eder).
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function lazyAsyncStorage(): KeyValueStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- native modüle içe aktarmada dokunulmasın
    const mod = require('@react-native-async-storage/async-storage');
    return (mod?.default ?? mod) as KeyValueStore;
  } catch {
    return null;
  }
}

/** Okur; depo yoksa / hata verirse `null`. Fırlatmaz. */
export async function readStoredValue(key: string): Promise<string | null> {
  try {
    return (await lazyAsyncStorage()?.getItem(key)) ?? null;
  } catch {
    return null;
  }
}

/** Yazar; depo yoksa / hata verirse sessizce geçer. Fırlatmaz. */
export async function writeStoredValue(key: string, value: string): Promise<void> {
  try {
    await lazyAsyncStorage()?.setItem(key, value);
  } catch {
    /* en iyi çaba */
  }
}
