import { type HeroSlide } from '@/lib/api';
import { heroImageUrl, pickLocalized } from '@/lib/hero/heroView';
import { useHeroSlides } from '@/lib/hero/useHeroSlides';

/** Giriş/kayıt ekranı görsel yerleşimleri (`auth_register`: kayıt, `auth_default`: diğer auth ekranları). */
export type AuthHeroPlacement = 'auth_default' | 'auth_register';

export interface AuthHero {
  id: string;
  imageUrl: string;
  /** Erişilebilirlik etiketi: `imageAlt`, yoksa başlık. */
  alt: string;
  title: string;
  subtitle: string;
}

/**
 * Saf: GÖRÜNÜR (süzülmüş) slayt listesinden gösterilecek ilk slayt (web gibi
 * tek görsel). Yoksa `null`. Süzme `useHeroSlides`'ta yapılır.
 */
export function authHeroFrom(slides: readonly HeroSlide[], locale: string): AuthHero | null {
  const slide = slides[0];
  if (!slide) return null;
  const title = pickLocalized(slide.title, locale);
  return {
    id: slide.id,
    imageUrl: heroImageUrl(slide),
    alt: pickLocalized(slide.imageAlt, locale) || title,
    title,
    subtitle: pickLocalized(slide.subtitle, locale),
  };
}

/**
 * Giriş/kayıt ekranı görseli (admin'den yönetilir, web `AuthHeroFrame` ile aynı).
 * Sorgu ana sayfayla ORTAK (`useHeroSlides`). Ikincil içerik: uç hata verirse,
 * liste boşsa ya da slayt bu istemcide gizliyse (`hideOnIos`, satın alma
 * hedefli CTA) `null` döner — ekran görselsiz çizilir, hata/yükleme göstergesi yok.
 */
export function useAuthHero(placement: AuthHeroPlacement): AuthHero | null {
  const { slides, locale } = useHeroSlides(placement);
  return authHeroFrom(slides, locale);
}
