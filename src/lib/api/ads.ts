import { guestApi } from "./client";
import { apiPath } from "./path";

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

/** Reklama bağlı kampanya — sunucu yalnız yayındaki kampanyayı döndürür. */
export interface AdCampaign {
  id: string;
  name: string;
  code: string | null;
  target: string;
  isFlashSale?: boolean;
  endsAt?: string;
}

/** Reklamın yayınlandığı platform (yeni API). `app` = mobil uygulama. */
export type AdPlatform = 'web' | 'app' | 'all';

/**
 * Popup sıklığı (yeni API): `every_visit` her ana sayfa ziyaretinde yeniden gösterilir;
 * `until_dismissed` kullanıcı kapatana dek (reklam + `popupVersion` başına).
 */
export type PopupFrequency = 'every_visit' | 'until_dismissed';

export interface ActiveAd {
  id: string;
  title: string;
  /** Metin (görselsiz) reklamda `null`/boş. */
  imageUrl: string | null;
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
  /** Geriye uyum: yeni API bunu `platform`dan türetip göndermeye devam eder. */
  deviceType: string;
  /** Yeni API alanı; eski yanıtta yok → istemci `deviceType` filtresine düşer. */
  platform?: AdPlatform;
  /** Yeni API alanı; yoksa `until_dismissed` sayılır (`popupFrequency.ts`). */
  popupFrequency?: PopupFrequency;
  /** Popup içerik sürümü — artınca kapatılmış popup yeniden gösterilir. Yoksa `1`. */
  popupVersion?: number;
  /**
   * Duyurulan kampanya (kupon kodu, flaş geri sayım). Eski API yanıtlarında
   * alan yok ya da `null` — ikisi de "kampanya yok".
   */
  campaign?: AdCampaign | null;
}

/**
 * Reklam uçları — üçü de public, bu yüzden auth interceptor'ı olmayan
 * `guestApi` kullanılır (misafire de reklam gösterilir).
 */
export const adsApi = {
  /**
   * Yayındaki reklamlar. Mobil `platform=app` gönderir (sunucu web'e özel reklamları eler);
   * eski API parametreyi yok sayar, filtreyi istemci yine yapar (`useAds`).
   */
  getActive: (params?: { position?: string; device?: string; platform?: 'app' }) =>
    guestApi.get<ActiveAd[]>("/ads/active", { params }),

  /** Gösterim ölçümü — banner ekrana gelince bir kez. */
  recordImpression: (id: string) => guestApi.post(apiPath`/ads/${id}/impression`),

  /**
   * Tıklama ölçümü — yönlendirmeden önce. Görselli reklamda sunucu tıklamayı
   * yalnız `?hotspot=` ile sayar; metin/eski reklamda parametresiz gönderilir.
   */
  recordClick: (id: string, hotspotId?: string) =>
    guestApi.post(apiPath`/ads/${id}/click`, undefined, {
      params: hotspotId ? { hotspot: hotspotId } : undefined,
    }),
};
