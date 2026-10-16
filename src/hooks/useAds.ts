import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adsApi, type ActiveAd } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { hasAdCreative } from '@/lib/ads/creative';
import { useAuthStore } from '@/stores/authStore';
import { useMembershipLimits } from './useMembershipLimits';

/** Bu istemcide gösterilebilecek platformlar (yeni API `platform` alanı). */
const PLATFORM_TARGETS = ['app', 'all'];
/** Eski API (`platform` yok): gösterilebilecek cihaz hedefleri. */
const DEVICE_TARGETS = ['all', 'mobile'];

/**
 * Reklam bu istemcide (uygulama) gösterilebilir mi? Yeni API `platform` gönderir:
 * yalnız `app`/`all`. Alan yoksa (eski API) eski `deviceType` kuralı.
 */
export function isAppTargetedAd(ad: Pick<ActiveAd, 'platform' | 'deviceType'>): boolean {
  if (typeof ad.platform === 'string' && ad.platform.trim()) {
    return PLATFORM_TARGETS.includes(ad.platform.trim().toLowerCase());
  }
  return DEVICE_TARGETS.includes((ad.deviceType || 'all').toLowerCase());
}

/**
 * Belirli bir konumdaki reklam bannerları.
 *
 * Tüm konumlar tek sorguda (`platform=app`) çekilir, konum filtresi istemcide
 * yapılır (liste küçük, tek query tüm ekranlarda paylaşılır). Platform filtresi
 * sunucuda da yapılır; istemci yine `isAppTargetedAd` ile eler (eski API
 * parametreyi yok sayar).
 *
 * Reklamsızlık YALNIZ sunucu kararıdır: `GET /membership/me/limits` boolean
 * `isAdFree` döndürürse (admin kutusu) ONA uyulur; `null`/eksik ya da henüz
 * yüklenmemiş/misafir = reklam gösterilir (web ile aynı); `limitsReady` ise
 * kararın kesinleştiğini söyler (girişli üyede hak yüklenene dek false). authStore'daki sabit
 * tier tablosuna (`limits`) BAKILMAZ — ücretli üye sunucu söylemeden sessizce
 * reklamsız kalmasın. `mapServerLimits` null'ı `false`a çevirip `serverLimits`e yazar.
 *
 * Metin (görselsiz) reklam da döner: görsel YA DA başlık varsa çizilebilir.
 */
export function useAds(position: string) {
  // Sunucu hakkını çeker ve `serverLimits`e yazar.
  const { settledWithoutLimits } = useMembershipLimits();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const serverLimits = useAuthStore((s) => s.serverLimits);
  const isAdFree = serverLimits?.isAdFree === true;
  // Reklamsızlık kararı verilebilir mi? Misafirde sunucu hakkı yok → beklenmez.
  // Girişli üyede hak yazılana (ya da alınamadığı kesinleşene) dek karar belli
  // değildir: erken "reklam göster" diyen tüketici (popup) sonradan reklamsız
  // çıkan üyeye reklam gösterirdi.
  const limitsReady = !isAuthenticated || serverLimits != null || settledWithoutLimits === true;

  const adsQuery = useQuery({
    queryKey: qk.ads.active,
    // Reklamsız üyede uca hiç gidilmez.
    enabled: !isAdFree,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await adsApi.getActive({ platform: 'app' });
        return unwrapList<ActiveAd>(res.data);
      } catch {
        // Reklam ikincil içerik — hata ekranı gösterme, sessizce boş geç.
        return [];
      }
    },
  });

  // Veri + konum anahtarlı: aynı girdide AYNI dizi döner (AdBanner'ın seçimi ve
  // efektleri her render'da yeniden tetiklenmesin).
  const all = adsQuery.data;
  const ads = useMemo(
    () =>
      (all ?? []).filter(
        (ad) =>
          ad.position === position &&
          isAppTargetedAd(ad) &&
          hasAdCreative(ad),
      ),
    [all, position],
  );

  return { ads, isAdFree, limitsReady, isLoading: adsQuery.isLoading };
}
