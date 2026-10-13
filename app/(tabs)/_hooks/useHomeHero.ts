import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { heroApi, type TrustBadge } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { resolveTrustBadges, type ResolvedTrustBadge } from '@/lib/hero/heroView';
import { useHeroSlides } from '@/lib/hero/useHeroSlides';

/** Sunucu `Cache-Control: max-age=60` — zamanlanmış slayt en geç bir dakikada görünür. */
const STALE_MS = 60_000;

/** Veri yokken sabit referans — her render'da yeni `[]` dönmesin. */
const NONE: ResolvedTrustBadge[] = [];

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

  // Slayt sorgusu auth görseliyle ORTAK (`useHeroSlides`): tek queryKey/şekil.
  const { slides, isLoading: loadingSlides } = useHeroSlides('home');

  // `select` yalnız veri ya da dil değişince yeniden çalışır; sonuç render'lar
  // arasında AYNI referanstır (rozet şeridi gereksiz yeniden çizilmez).
  const selectBadges = useCallback((list: TrustBadge[]) => resolveTrustBadges(list, locale), [locale]);

  const badgesQuery = useQuery({
    queryKey: qk.hero.trustBadges,
    staleTime: STALE_MS,
    select: selectBadges,
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
    slides,
    loadingSlides,
    badges: badgesQuery.data ?? NONE,
  };
}
