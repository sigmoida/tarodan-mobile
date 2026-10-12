import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { heroApi, type HeroSlide } from '@/lib/api';
import { qk } from '@/lib/query';
import { heroImageUrl, pickLocalized, visibleSlides } from '@/lib/hero/heroView';

/** Giriş/kayıt ekranı görsel yerleşimleri (`auth_register`: kayıt, `auth_default`: diğer auth ekranları). */
export type AuthHeroPlacement = 'auth_default' | 'auth_register';

/** Sunucu `Cache-Control: max-age=60`. */
const STALE_MS = 60_000;

export interface AuthHero {
  id: string;
  imageUrl: string;
  /** Erişilebilirlik etiketi: `imageAlt`, yoksa başlık. */
  alt: string;
  title: string;
  subtitle: string;
}

/** Saf: API gövdesinden gösterilecek ilk slayt (web gibi tek görsel). Yoksa `null`. */
export function pickAuthHero(body: unknown, locale: string): AuthHero | null {
  const data = (body as { data?: unknown })?.data ?? body;
  const slide = visibleSlides(Array.isArray(data) ? (data as HeroSlide[]) : [], locale)[0];
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
 * Ikincil içerik: uç hata verirse, liste boşsa ya da slayt bu istemcide gizliyse
 * (`hideOnIos`, satın alma hedefli CTA) `null` döner — ekran görselsiz çizilir,
 * hata/yükleme göstergesi yok.
 */
export function useAuthHero(placement: AuthHeroPlacement): AuthHero | null {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const { data } = useQuery({
    queryKey: qk.hero.slides(placement),
    staleTime: STALE_MS,
    queryFn: async () => {
      try {
        const res = await heroApi.getSlides(placement);
        return res.data;
      } catch {
        return [];
      }
    },
  });
  return pickAuthHero(data, locale);
}
