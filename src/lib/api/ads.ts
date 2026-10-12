import { guestApi } from "./client";

/**
 * Yayındaki reklam bannerı — canlı yanıttan doğrulanan gövde.
 * `position` ("header") ve `deviceType` ("all") sunucuda tanımlıdır;
 * istemci hangi bannerı nerede göstereceğine bu iki alana bakarak karar verir.
 */
/**
 * Görselli reklamın tıklanabilir bölgesi. Koordinatlar görselin kesirleridir
 * (0–1, sol üst köşe + en/boy) — görsel hangi boyutta çizilirse çizilsin aynı
 * yere denk gelir. Sözleşme: ana repo `packages/types` `AdHotspotRect`.
 */
export interface AdHotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** İç rota, kendi sitemizin mutlak adresi ya da dış URL olabilir. */
  linkUrl: string;
  sortOrder: number;
}

export interface ActiveAd {
  id: string;
  title: string;
  imageUrl: string;
  /**
   * Yalnız eski/metin reklamlarda dolu. Görselli reklamda sunucu bunu `null`
   * gönderir; tıklama `hotspots`tan gelir.
   */
  linkUrl: string | null;
  /** Eski API yanıtlarında alan yok — yoksa `[]` say. */
  hotspots?: AdHotspot[];
  content: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  position: string;
  deviceType: string;
}

/**
 * Reklam uçları — üçü de public, bu yüzden auth interceptor'ı olmayan
 * `guestApi` kullanılır (misafire de reklam gösterilir).
 */
export const adsApi = {
  /** Yayındaki reklamlar. Parametreler opsiyoneldir; filtreyi istemci yapar. */
  getActive: (params?: { position?: string; device?: string }) =>
    guestApi.get<ActiveAd[]>("/ads/active", { params }),

  /** Gösterim ölçümü — banner ekrana gelince bir kez. */
  recordImpression: (id: string) => guestApi.post(`/ads/${id}/impression`),

  /**
   * Tıklama ölçümü — yönlendirmeden önce. Görselli reklamda sunucu tıklamayı
   * yalnız `?hotspot=` ile sayar; metin/eski reklamda parametresiz gönderilir.
   */
  recordClick: (id: string, hotspotId?: string) =>
    guestApi.post(`/ads/${id}/click`, undefined, {
      params: hotspotId ? { hotspot: hotspotId } : undefined,
    }),
};
