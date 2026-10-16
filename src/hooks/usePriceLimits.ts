import { useQuery } from '@tanstack/react-query';
import { publicSettingsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { parsePriceLimits, type PriceLimits } from '@/lib/shared/priceLimits';

const LIMITS_STALE_MS = 5 * 60_000;

/**
 * Admin'in ilan fiyat sınırları (`min_product_price` / `max_product_price`) —
 * ilan formu ve teklif ekranlarının TEK okuması. Sınır yoksa ya da istek
 * düşerse `null`: form asla bloklanmaz (sunucu zaten reddeder).
 */
export function usePriceLimits(): PriceLimits & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: qk.publicSettings.all,
    queryFn: async () => parsePriceLimits((await publicSettingsApi.getPublicSettings()).data),
    staleTime: LIMITS_STALE_MS,
    retry: 1,
  });
  return { minPrice: data?.minPrice ?? null, maxPrice: data?.maxPrice ?? null, isLoading };
}
