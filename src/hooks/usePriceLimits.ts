import { useQuery } from '@tanstack/react-query';
import { publicSettingsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { NO_PRICE_LIMITS, parsePriceLimits, type PriceLimits } from '@/lib/shared/priceLimits';

const SETTINGS_STALE_MS = 5 * 60_000;

/**
 * Admin'in ilan fiyat sınırları (`min_product_price` / `max_product_price`) —
 * ilan formu ve teklif ekranlarının TEK okuması. Ham gövde `qk.publicSettings.all`
 * altında önbelleğe alınır (diğer herkese açık ayarlar aynı önbelleği paylaşabilir),
 * sınırlar `select` ile ayrıştırılır. Sınır yoksa ya da istek düşerse `null`:
 * form asla bloklanmaz (sunucu zaten reddeder).
 */
export function usePriceLimits(): PriceLimits {
  const { data } = useQuery({
    queryKey: qk.publicSettings.all,
    queryFn: async () => (await publicSettingsApi.getPublicSettings()).data,
    select: parsePriceLimits,
    staleTime: SETTINGS_STALE_MS,
    retry: 1,
  });
  return data ?? NO_PRICE_LIMITS;
}
