import { useQuery } from '@tanstack/react-query';
import { adsApi, type ActiveAd } from '@/lib/api';
import { qk } from '@/lib/query';
import { useMembershipLimits } from './useMembershipLimits';

/** Çizilebilir reklam: görselli ya da (metin reklam) başlıklı. */
const hasCreative = (ad: ActiveAd) => !!ad.imageUrl?.trim() || !!ad.title?.trim();

/** Bu istemcide gösterilebilecek cihaz hedefleri. */
const DEVICE_TARGETS = ['all', 'mobile'];

/**
 * Belirli bir konumdaki reklam bannerları.
 *
 * Uç `position`/`device` query parametrelerini opsiyonel kabul ediyor ama
 * geçerli değerleri sözleşmede yazılı değil; yanlış bir değer sessizce boş
 * liste döndürürdü. Bu yüzden tüm aktif reklamlar tek sorguda çekilip filtre
 * istemcide yapılır (liste küçük, tek query tüm ekranlarda paylaşılır).
 *
 * Reklamsızlık: `GET /membership/me/limits` boolean `isAdFree` döndürürse (admin
 * kutusu) ONA uyulur — `mapServerLimits` bunu authStore'daki `limits`e bindirir.
 * Sunucu söylemezse (`null`/alan yok) authStore'daki sabit tier tablosu
 * (premium/business reklamsız) geçerli kalır.
 *
 * Metin (görselsiz) reklam da döner: görsel YA DA başlık varsa çizilebilir.
 */
export function useAds(position: string) {
  const { limits } = useMembershipLimits();
  const isAdFree = limits?.isAdFree === true;

  const adsQuery = useQuery({
    queryKey: qk.ads.active,
    // Reklamsız üyede uca hiç gidilmez.
    enabled: !isAdFree,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await adsApi.getActive();
        const body = (res.data as any)?.data ?? res.data;
        return (Array.isArray(body) ? body : []) as ActiveAd[];
      } catch {
        // Reklam ikincil içerik — hata ekranı gösterme, sessizce boş geç.
        return [];
      }
    },
  });

  const ads = (adsQuery.data ?? []).filter(
    (ad) =>
      ad.position === position &&
      DEVICE_TARGETS.includes((ad.deviceType || 'all').toLowerCase()) &&
      hasCreative(ad),
  );

  return { ads, isAdFree, isLoading: adsQuery.isLoading };
}
