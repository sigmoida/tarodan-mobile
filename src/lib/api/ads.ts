import { guestApi } from "./client";

/**
 * Yayındaki reklam bannerı — canlı yanıttan doğrulanan gövde.
 * `position` ("header") ve `deviceType` ("all") sunucuda tanımlıdır;
 * istemci hangi bannerı nerede göstereceğine bu iki alana bakarak karar verir.
 */
export interface ActiveAd {
  id: string;
  title: string;
  imageUrl: string;
  /** İç rota ("/listings?manufacturer=Hot+Wheels") veya dış URL olabilir. */
  linkUrl: string | null;
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

  /** Tıklama ölçümü — yönlendirmeden önce. */
  recordClick: (id: string) => guestApi.post(`/ads/${id}/click`),
};
