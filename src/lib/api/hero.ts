import { guestApi } from "./client";

/**
 * Vitrin hero'su ve güven rozetleri — admin'den yönetilir, web ile aynı içerik.
 * Sözleşme: ana repo `packages/types/src/hero.ts` (+ docs/mobile-parity/24).
 * Tüm uçlar public → auth interceptor'ı olmayan `guestApi`.
 */

/** İki dilli metin: `tr` zorunlu, `en` boşsa Türkçeye düşülür (`pickLocalized`). */
export interface LocalizedText {
  tr: string;
  en?: string | null;
}

export type HeroPlacement = "home" | "auth_default" | "auth_register";

/** Slaytın gösterileceği platform (admin seçer). Mobil yalnız `app` ve `all` gösterir. */
export type HeroPlatform = "web" | "app" | "all";

/** Bu istemcinin platformu: sunucu `platform=app` ile `app`/`all` slaytlarını (ve uygulama için hero açık mı bayrağını) uygular. */
export const HERO_CLIENT_PLATFORM = "app" as const;

export interface HeroCta {
  label: LocalizedText;
  /** Mutlak http(s) URL ya da tek `/` ile başlayan site içi yol. */
  href: string;
}

export interface HeroSlide {
  id: string;
  placement: HeroPlacement;
  /** Opsiyonel (eski sunucu göndermeyebilir). `web` ise mobilde gösterilmez. */
  platform?: HeroPlatform;
  imageUrl: string;
  /** Mobil görsel; yoksa `imageUrl`. */
  mobileImageUrl: string | null;
  /** Geniş ekran (tablet yatay) içindir; telefonda görsel her zaman üstte. */
  imageSide: "left" | "right";
  title: LocalizedText;
  subtitle: LocalizedText | null;
  imageAlt: LocalizedText | null;
  cta1: HeroCta | null;
  cta2: HeroCta | null;
  /** Native uygulamada gösterilmez (iki platformda da — dijital satış kapalı). */
  hideOnIos: boolean;
}

export const heroApi = {
  /**
   * Yayındaki slaytlar (en çok 5, sunucu sırasıyla). Boş dönebilir: admin
   * uygulama için hero'yu kapattıysa ya da canlı slayt yoksa `[]` gelir.
   */
  getSlides: (placement: HeroPlacement) =>
    guestApi.get<HeroSlide[]>("/hero-slides", {
      params: { placement, platform: HERO_CLIENT_PLATFORM },
    }),

  /** Gösterim sayacı — slayt ilk göründüğünde; ateşle-unut, 204. */
  recordImpression: (id: string) =>
    guestApi.post(`/hero-slides/${encodeURIComponent(id)}/impression`),

  /**
   * Tık sayacı. `cta` verilmezse slayt görseline dokunuş, 1|2 ise butona
   * dokunuş (sunucu slayt toplamını ve buton sayacını BİRLİKTE artırır — iki
   * istek atılmaz).
   */
  recordClick: (id: string, cta?: 1 | 2) =>
    guestApi.post(`/hero-slides/${encodeURIComponent(id)}/click`, undefined, {
      params: cta ? { cta } : undefined,
    }),
};
