import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { heroApi, type HeroPlacement, type HeroSlide } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { visibleSlides } from './heroView';

/** Sunucu `Cache-Control: max-age=60` — zamanlanmış slayt en geç bir dakikada görünür. */
const STALE_MS = 60_000;

/** Veri yokken sabit referans — her render'da yeni `[]` dönmesin. */
const NONE: HeroSlide[] = [];

/**
 * Bir yerleşimin (`home`, `auth_default`, `auth_register`) hero slaytları —
 * TEK sorgu kaynağı: ana sayfa ve auth görseli aynı `qk.hero.slides(placement)`
 * anahtarını, aynı queryFn'i ve AYNI önbellek şeklini (düz `HeroSlide[]`)
 * paylaşır. Süzme (`visibleSlides`: hideOnIos, satın alma hedefli CTA, dile
 * göre başlık) `select`'te yapılır: önbellekte ham liste kalır, dönen dizi
 * veri/dil değişmedikçe AYNI referanstır.
 *
 * İkincil içerik: uç hata verirse ya da gövde liste değilse `[]` — hata
 * gösterilmez; çağıran statik yedeğe düşer / hiçbir şey çizmez.
 */
export function useHeroSlides(placement: HeroPlacement) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const select = useCallback((list: HeroSlide[]) => visibleSlides(list, locale), [locale]);

  const query = useQuery({
    queryKey: qk.hero.slides(placement),
    staleTime: STALE_MS,
    select,
    queryFn: async () => {
      try {
        const res = await heroApi.getSlides(placement);
        return unwrapList<HeroSlide>(res.data);
      } catch {
        return [];
      }
    },
  });

  return { locale, slides: query.data ?? NONE, isLoading: query.isLoading };
}
