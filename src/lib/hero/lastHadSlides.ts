import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Son BAŞARILI `home` cevabında görünür slayt var mıydı (`'1'` / `'0'`). */
export const HERO_HOME_LAST_HAD_SLIDES_KEY = 'hero.home.lastHadSlides';

/** Oturum içi önbellek: depo bir kez okunur, yazma anında güncellenir. */
let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

/** Okunamaz / yoksa `false` (yer tutma yok). */
export function readLastHadSlides(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  pending ??= AsyncStorage.getItem(HERO_HOME_LAST_HAD_SLIDES_KEY)
    .then((raw) => {
      cached ??= raw === '1';
      return cached;
    })
    .catch(() => false)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Başarılı cevaptan sonra bayrağı günceller; yazılamazsa sessizce geçer. */
export async function writeLastHadSlides(hadSlides: boolean): Promise<void> {
  cached = hadSlides;
  try {
    await AsyncStorage.setItem(HERO_HOME_LAST_HAD_SLIDES_KEY, hadSlides ? '1' : '0');
  } catch {
    // bir sonraki açılışta yer tutulmayabilir; sessizce geç
  }
}

/** Yalnız testler için. */
export function resetLastHadSlidesCache(): void {
  cached = null;
  pending = null;
}

/**
 * Soğuk açılışta son bilinen durum: `true` ise yükleme süresince hero'ya yer
 * tutulur (slaytlar geç gelince içerik zıplamasın); `false`/bilinmiyorsa tutulmaz
 * (hero'su kapalı kullanıcıda boşluk oluşmasın).
 */
export function useLastHadSlides(): boolean {
  const [value, setValue] = useState<boolean>(cached ?? false);
  useEffect(() => {
    let alive = true;
    readLastHadSlides().then((v) => {
      if (alive) setValue(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return value;
}
