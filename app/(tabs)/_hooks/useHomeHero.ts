import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { HeroSlide } from '@/lib/api';
import { visibleSlides } from '@/lib/hero/heroView';
import { useLastHadSlides, writeLastHadSlides } from '@/lib/hero/lastHadSlides';
import { useHeroSlides } from '@/lib/hero/useHeroSlides';

/**
 * Ana sayfa hero slaytları (admin'den yönetilir, web ile aynı; `platform=app`).
 *
 * İkincil içerik: uç hata verirse ya da liste boşsa `[]` döner — ekran hata
 * göstermez ve hero hiç çizilmez (statik yedek yok). Metin dili uygulama dilinden
 * seçilir (`pickLocalized`).
 *
 * `reserveSpace`: yükleniyor VE son başarılı cevapta görünür slayt vardı
 * (`hero.home.lastHadSlides`, AsyncStorage) → ekran hero kadar yer tutar, slaytlar
 * geç gelince içerik zıplamaz. Hero'su kapalı/boş olanlarda yer tutulmaz.
 */
export function useHomeHero() {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const lastHadSlides = useLastHadSlides();

  // Bayrak yalnız başarılı cevapta güncellenir (hatada `[]` bayrağı bozmasın).
  const onFetched = useCallback(
    (list: HeroSlide[]) => {
      void writeLastHadSlides(visibleSlides(list, locale).length > 0);
    },
    [locale],
  );

  // Slayt sorgusu auth görseliyle ORTAK (`useHeroSlides`): tek queryKey/şekil.
  const { slides, isLoading: loadingSlides, refetch } = useHeroSlides('home', { onFetched });

  return { locale, slides, loadingSlides, reserveSpace: loadingSlides && lastHadSlides, refetch };
}
