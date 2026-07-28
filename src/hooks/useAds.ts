import { useQuery } from '@tanstack/react-query';
import { adsApi, membershipApi, type ActiveAd } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

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
 * Premium/business üyeler reklamsızdır — `isAdFree` sunucudan gelir, istemcideki
 * sabit tier tablosundan değil (yönetici limitleri değiştirebilir).
 */
export function useAds(position: string) {
  const { isAuthenticated } = useAuthStore();

  const limitsQuery = useQuery({
    queryKey: qk.membershipLimits.mine,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await membershipApi.getLimits();
        return ((res.data as any)?.data ?? res.data ?? null) as { isAdFree?: boolean } | null;
      } catch {
        return null;
      }
    },
  });
  const isAdFree = limitsQuery.data?.isAdFree === true;

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
      !!ad.imageUrl,
  );

  return { ads, isAdFree, isLoading: adsQuery.isLoading };
}
