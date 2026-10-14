import { useTranslation } from 'react-i18next';
import { useHeroSlides } from '@/lib/hero/useHeroSlides';

/**
 * Ana sayfa hero slaytları (admin'den yönetilir, web ile aynı).
 *
 * İkincil içerik: uç hata verirse ya da liste boşsa `[]` döner — ekran hata
 * göstermez; hero statik yedeğe düşer. Metin dili uygulama dilinden seçilir
 * (`pickLocalized`).
 */
export function useHomeHero() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  // Slayt sorgusu auth görseliyle ORTAK (`useHeroSlides`): tek queryKey/şekil.
  const { slides, isLoading: loadingSlides } = useHeroSlides('home');

  return { locale, slides, loadingSlides };
}
