import type { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

/**
 * CMS'te (`GET /pages`) yayınlanan hukuki sayfalar.
 *
 * Liste ucu yalnız `{ slug, updatedAt }` döndürür — başlık içermez — bu yüzden
 * etiketler burada tutulur; menü başlıkları için ayrıca istek atmaya gerek kalmaz.
 *
 * `about` ve `faq` bilinçli olarak DIŞARIDA: ikisinin de uygulamada sabit
 * ekranı var (`/about`, `/help`); CMS sürümlerini bağlamak aynı içeriği
 * kullanıcıya iki ayrı yerden gösterirdi.
 *
 * Etiketler çeviriden geldiği için liste bir FABRİKA — bkz. `infoPages.ts`
 * başındaki aynı gerekçe (modül seviyesinde kurulsaydı ilk dilde donardı).
 */
export const buildLegalPages = (
  t: TFunction,
): ReadonlyArray<{
  slug: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> => [
  { slug: 'privacy', label: t('mobile.pagePrivacy'), icon: 'lock-closed-outline' },
  { slug: 'terms', label: t('mobile.pageTerms'), icon: 'document-text-outline' },
  { slug: 'cookie-policy', label: t('mobile.pageCookies'), icon: 'shield-outline' },
];
