import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { heroApi, type HeroSlide, type TrustBadge } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { resolveTrustBadges, visibleSlides } from '@/lib/hero/heroView';

/** Sunucu `Cache-Control: max-age=60` — zamanlanmış slayt en geç bir dakikada görünür. */
const STALE_MS = 60_000;

/**
 * Ana sayfa hero slaytları + güven rozetleri (admin'den yönetilir, web ile aynı).
 *
 * İkisi de ikincil içerik: uç hata verirse ya da liste boşsa `[]` döner —
 * ekran hata göstermez; hero statik yedeğe düşer, rozet şeridi hiç çizilmez.
 * Metin dili uygulama dilinden seçilir (`pickLocalized`).
 */
export function useHomeHero() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const slidesQuery = useQuery({
    queryKey: qk.hero.slides('home'),
    staleTime: STALE_MS,
    queryFn: async () => {
      try {
        const res = await heroApi.getSlides('home');
        return unwrapList<HeroSlide>(res.data);
      } catch {
        return [];
      }
    },
  });

  const badgesQuery = useQuery({
    queryKey: qk.hero.trustBadges,
    staleTime: STALE_MS,
    queryFn: async () => {
      try {
        const res = await heroApi.getTrustBadges();
        return unwrapList<TrustBadge>(res.data);
      } catch {
        return [];
      }
    },
  });

  return {
    locale,
    slides: visibleSlides(slidesQuery.data, locale),
    loadingSlides: slidesQuery.isLoading,
    badges: resolveTrustBadges(badgesQuery.data, locale),
  };
}
