import type { HeroCta, HeroSlide, LocalizedText, TrustBadge } from '@/lib/api/hero';
import { isPurchaseLink, resolveAdLink } from '@/lib/ads/openAdLink';
import type { IconName } from '@/ui';

/**
 * Hero / güven rozeti görünüm kuralları — saf fonksiyonlar (web `lib/heroView.ts`
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

/** Görsel: `mobileImageUrl ?? imageUrl`. */
export function heroImageUrl(slide: Pick<HeroSlide, 'imageUrl' | 'mobileImageUrl'>): string {
  return slide.mobileImageUrl?.trim() || slide.imageUrl;
}

export interface ResolvedHeroCta {
  label: string;
  href: string;
}

/**
 * CTA'yı çizilebilir hâle getirir. Bağlantıyı admin yazar: güvensiz şema,
 * satın alma hedefi ya da boş etiket varsa CTA HİÇ çizilmez (`null`).
 */
export function resolveHeroCta(
  cta: HeroCta | null | undefined,
  locale: string,
): ResolvedHeroCta | null {
  if (!cta) return null;
  const label = pickLocalized(cta.label, locale);
  // Satın alma hedefi de güvensiz şema da `blocked`: ikisinde de buton çizilmez.
  if (!label || resolveAdLink(cta.href).kind === 'blocked') return null;
  return { label, href: cta.href };
}

/**
 * Bu istemcide gösterilecek slaytlar. Sunucu sıralar ve süzer; istemci yeniden
 * sıralamaz. Yalnız şunlar elenir:
 * - `hideOnIos`: dijital satış İKİ platformda da kapalı olduğundan native
 *   uygulamada (iOS + Android) gizlenir — bayrak adı tarihsel.
 * - Satın almaya (üyelik/boost) giden CTA'sı olan slayt: buton gizlemek yetmez,
 *   slaytın kendisi satış çağrısı (Apple 3.1.1/3.1.3, Play ödeme politikası).
 * - Görseli ya da başlığı olmayan (çizilemeyen) slayt.
 */
export function visibleSlides(slides: readonly HeroSlide[] | null | undefined, locale: string): HeroSlide[] {
  if (!Array.isArray(slides)) return [];
  return slides.filter(
    (s) =>
      !!s &&
      !s.hideOnIos &&
      !!heroImageUrl(s) &&
      !!pickLocalized(s.title, locale) &&
      !isPurchaseLink(s.cta1?.href) &&
      !isPurchaseLink(s.cta2?.href),
  );
}

/**
 * Rozet ikon anahtarı (API: `TRUST_BADGE_ICONS`, web Heroicons adları) → `Icon` adı. Anahtarlar
 * web ile birebir aynı olduğu için eşleme kimlik; bilinmeyen anahtar rozeti gizler.
 */
export const TRUST_BADGE_ICON_NAMES: Record<string, IconName> = {
  'shield-check': 'shield-check',
  truck: 'truck',
  'arrow-path': 'arrow-path',
  'credit-card': 'credit-card',
  'rectangle-stack': 'rectangle-stack',
  'arrows-right-left': 'arrows-right-left',
};

/** Telefonda en çok kaç rozet çizilir (3 sütun × 4 satır) — sunucuda üst sınır yok. */
export const MAX_TRUST_BADGES = 12;

export interface ResolvedTrustBadge {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

/**
 * Çizilecek rozetler: bilinmeyen ikon anahtarlı ya da başlıksız olan atlanır;
 * metin `pickLocalized` ile seçilir; liste `MAX_TRUST_BADGES` ile sınırlanır.
 */
export function resolveTrustBadges(
  badges: readonly TrustBadge[] | null | undefined,
  locale: string,
): ResolvedTrustBadge[] {
  if (!Array.isArray(badges)) return [];
  const out: ResolvedTrustBadge[] = [];
  for (const b of badges) {
    const icon = b ? TRUST_BADGE_ICON_NAMES[b.icon] : undefined;
    const title = b ? pickLocalized(b.title, locale) : '';
    if (!b || !icon || !title) continue;
    out.push({ id: b.id, icon, title, description: pickLocalized(b.description, locale) });
    if (out.length === MAX_TRUST_BADGES) break;
  }
  return out;
}
