import type { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

/**
 * Profil menüsündeki hukuki sayfalar — uygulamadaki STATİK ekranlara gider.
 *
 * Eskiden CMS'e (`/sayfa/:slug` → `GET /pages/:slug`) gidiyordu; production'da
 * bu sayfalar yayınlanmadığı için (2026-09-29 ölçümü: üçü de 404) menü
 * "Sayfa bulunamadı" gösteriyordu — Apple 5.1.1 gizlilik politikasının uygulama
 * içinden erişilebilir olmasını istiyor. Giriş/kayıt ekranları da aynı statik
 * ekranları açar; kullanıcı her yerden aynı metni görür.
 *
 * (Aşağıdaki not CMS dönemindendir.)
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
  /** Uygulamadaki statik ekran. */
  route: '/privacy' | '/terms' | '/cookies';
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> => [
  { slug: 'privacy', route: '/privacy', label: t('mobile.pagePrivacy'), icon: 'lock-closed-outline' },
  { slug: 'terms', route: '/terms', label: t('mobile.pageTerms'), icon: 'document-text-outline' },
  { slug: 'cookie-policy', route: '/cookies', label: t('mobile.pageCookies'), icon: 'shield-outline' },
];
