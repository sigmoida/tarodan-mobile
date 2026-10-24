import type { HeroCta, HeroSlide, LocalizedText } from '@/lib/api/hero';
import { isPurchaseLink, resolveAdLink } from '@/lib/ads/openAdLink';
import { parseStrictUrl } from '@/lib/security/url';

/**
 * Hero görünüm kuralları — saf fonksiyonlar (web `lib/heroView.ts`
 * + `@tarodan/types` `pickLocalized` karşılığı).
 */

/**
 * Uygulama dili `en` ve İngilizce metin doluysa o, aksi halde Türkçe. Değer
 * yoksa `''` — çağıran "metin yok" kararını boşluktan verir.
 */
export function pickLocalized(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) return '';
  const wantsEn = String(locale).toLowerCase().startsWith('en');
  const en = typeof text.en === 'string' ? text.en.trim() : '';
  if (wantsEn && en) return en;
  return typeof text.tr === 'string' ? text.tr.trim() : '';
}

/**
 * Image: `mobileImageUrl ?? imageUrl`. `wide` (tablet, side-by-side hero like web `md`): the
 * desktop `imageUrl`, which web also shows beside the text from `md` up (the mobile image when a
 * slide has no desktop image, so a slide `visibleSlides` admits is never blank).
 */
export function heroImageUrl(
  slide: Pick<HeroSlide, 'imageUrl' | 'mobileImageUrl'>,
  { wide = false }: { wide?: boolean } = {},
): string {
  if (wide) return slide.imageUrl?.trim() || slide.mobileImageUrl?.trim() || '';
  return slide.mobileImageUrl?.trim() || slide.imageUrl;
}

/**
 * Mağaza bağlantısı mı (App Store / Google Play) — web `@tarodan/types`
 * `heroStoreLinkKind` karşılığı (aynı kural). Web'de bu CTA'lar koyu mağaza
 * butonu olarak çizilir; uygulamada GİZLENİR: kullanıcı zaten uygulamada.
 */
export type HeroStoreLinkKind = 'appStore' | 'googlePlay';

export function heroStoreLinkKind(href: string | null | undefined): HeroStoreLinkKind | null {
  // RN'nin `URL`'i host/yol okumayı tam desteklemez: katı ayrıştırıcı (`@/lib/security/url`).
  const url = parseStrictUrl(href, { allowHttp: true });
  if (!url) return null;
  const host = url.host.replace(/^www\./, '');
  if (host === 'apps.apple.com' || host === 'itunes.apple.com') return 'appStore';
  if (host === 'play.google.com' && /^\/store\/apps(\/|$)/i.test(url.path)) return 'googlePlay';
  return null;
}

/**
 * Slaytın butonlarının HEPSİ mağaza bağlantısı mı (en az bir buton varsa) — web
 * `@tarodan/types` `heroHasOnlyStoreCtas` karşılığı. Böyle bir slayt "uygulamayı
 * indir" çağrısıdır; uygulamada slaytın kendisi gösterilmez (`visibleSlides`).
 */
export function hasOnlyStoreCtas(slide: Pick<HeroSlide, 'cta1' | 'cta2'>): boolean {
  const hrefs = [slide.cta1?.href, slide.cta2?.href].filter((h): h is string => !!h?.trim());
  return hrefs.length > 0 && hrefs.every((h) => heroStoreLinkKind(h) !== null);
}

export interface ResolvedHeroCta {
  label: string;
  href: string;
}

/**
 * CTA'yı çizilebilir hâle getirir. Bağlantıyı admin yazar: güvensiz şema,
 * satın alma hedefi, mağaza bağlantısı (App Store / Google Play — uygulamadaki
 * kullanıcıya "uygulamayı indir" anlamsız) ya da boş etiket varsa CTA HİÇ
 * çizilmez (`null`). Butonlarının hepsi mağaza bağlantısı olan slayt zaten hiç
 * gösterilmez (`visibleSlides`).
 */
export function resolveHeroCta(
  cta: HeroCta | null | undefined,
  locale: string,
): ResolvedHeroCta | null {
  if (!cta) return null;
  const label = pickLocalized(cta.label, locale);
  // Satın alma hedefi de güvensiz şema da `blocked`: ikisinde de buton çizilmez.
  if (!label || heroStoreLinkKind(cta.href) || resolveAdLink(cta.href).kind === 'blocked') return null;
  return { label, href: cta.href };
}

/**
 * Bu istemcide gösterilecek slaytlar. Sunucu sıralar ve süzer; istemci yeniden
 * sıralamaz. Yalnız şunlar elenir:
 * - `hideOnIos`: dijital satış İKİ platformda da kapalı olduğundan native
 *   uygulamada (iOS + Android) gizlenir — bayrak adı tarihsel.
 * - Satın almaya (üyelik/boost) giden CTA'sı olan slayt: buton gizlemek yetmez,
 *   slaytın kendisi satış çağrısı (Apple 3.1.1/3.1.3, Play ödeme politikası).
 * - Butonlarının hepsi mağaza bağlantısı (App Store / Google Play) olan slayt:
 *   "uygulamayı indir" tanıtımı uygulamanın içinde anlamsız (`hasOnlyStoreCtas`).
 *   Mağaza butonu + normal buton taşıyan slayt kalır, yalnız mağaza butonu düşer.
 * - Görseli ya da başlığı olmayan (çizilemeyen) slayt.
 * - `platform: 'web'` slayt: sunucu `platform=app` ile zaten süzer; eski/yanlış
 *   yanıta karşı ek güvenlik. Alan yoksa (eski sunucu) slayt gösterilir.
 */
export function visibleSlides(slides: readonly HeroSlide[] | null | undefined, locale: string): HeroSlide[] {
  if (!Array.isArray(slides)) return [];
  return slides.filter(
    (s) =>
      !!s &&
      !s.hideOnIos &&
      s.platform !== 'web' &&
      !hasOnlyStoreCtas(s) &&
      !!heroImageUrl(s) &&
      !!pickLocalized(s.title, locale) &&
      !isPurchaseLink(s.cta1?.href) &&
      !isPurchaseLink(s.cta2?.href),
  );
}
