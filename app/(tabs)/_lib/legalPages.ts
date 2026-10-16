import type { TFunction } from 'i18next';
import type { LegalWebDoc } from '@/lib/legal/webDocs';

/**
 * Yan menünün "Bilgi & Yasal" grubu — uygulamada kalan altı yasal belge.
 * Her satır aynı adlı native rotayı açar (`/terms` …); ekran web'in uygulama
 * modu sayfasını WebView'de gösterir (`LegalWebPage`). Bilgi sayfaları
 * (hakkımızda, rehberler, alıcı koruması …) mobilden kaldırıldı; Yardım
 * (native SSS) "İletişim" grubunda.
 *
 * Etiketler çeviriden geldiği için liste bir FABRİKA (modül seviyesinde
 * kurulsaydı ilk dilde donardı). `slug` testID'nin parçası
 * (`profile-legal-<slug>-link`) — çerez satırınınki geriye uyumlu `cookie-policy`.
 */
export const buildLegalPages = (
  t: TFunction,
): ReadonlyArray<{ slug: string; route: `/${LegalWebDoc}`; label: string }> => [
  { slug: 'privacy', route: '/privacy', label: t('mobile.pagePrivacy') },
  { slug: 'terms', route: '/terms', label: t('mobile.pageTerms') },
  { slug: 'distance-sales', route: '/distance-sales', label: t('mobile.pageDistanceSales') },
  { slug: 'seller-agreement', route: '/seller-agreement', label: t('mobile.pageSellerAgreement') },
  { slug: 'refund-policy', route: '/refund-policy', label: t('mobile.pageRefundPolicy') },
  { slug: 'cookie-policy', route: '/cookies', label: t('mobile.pageCookies') },
];
