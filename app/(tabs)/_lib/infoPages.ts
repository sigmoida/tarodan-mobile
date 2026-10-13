import type { IconName } from '@/ui';
import type { TFunction } from 'i18next';

export interface MenuPage {
  /** `app/` altındaki rota (ör. `size-guide` → `/size-guide`). */
  route: string;
  label: string;
  icon: IconName;
}

/**
 * Uygulamada yazılı olduğu hâlde HİÇBİR YERDEN erişilemeyen bilgi ekranları.
 *
 * Denetim (2026-08-03) bunları "menüsüz/ölü" diye işaretlemişti: ekranlar
 * duruyor, `router.push` eden tek bir satır yok. `returns-exchanges` ve
 * `refund-policy` de fiilen ölüydü — tek girişleri `buyer-protection`'dı ve o
 * da menüsüzdü.
 *
 * Bilerek DIŞARIDA bırakılanlar:
 * - `cookies` — CMS'teki `cookie-policy` ile aynı içerik; ikisini birden
 *   bağlamak kullanıcıya aynı metni iki yerden gösterirdi (bkz. `legalPages`).
 * - `faq` — sabit `/help` ekranı zaten "Yardım & SSS" olarak menüde.
 * - `pricing` — ekran değil, `/membership`'a bilinçli bir yönlendirme.
 *
 * Etiketler çeviriden geldiği için liste bir FABRİKA: modül seviyesinde kurulsaydı
 * `t` daha hazır olmadan çalışır ve etiketler ilk dilde donardı (bkz. `profileMenu`
 * başındaki aynı gerekçe). `route`/`icon` dilden bağımsız, testler bunları doğrudan okur.
 */
export const buildInfoPages = (t: TFunction): ReadonlyArray<MenuPage> => [
  { route: 'guides', label: t('mobile.pageGuides'), icon: 'building-library' },
  { route: 'size-guide', label: t('mobile.pageSizeGuide'), icon: 'arrows-pointing-out' },
  { route: 'guvenli-takas', label: t('mobile.pageSafeTrade'), icon: 'arrows-right-left' },
  { route: 'buyer-protection', label: t('mobile.pageBuyerProtection'), icon: 'shield-check' },
  { route: 'returns-exchanges', label: t('mobile.pageReturns'), icon: 'arrow-path' },
  { route: 'refund-policy', label: t('mobile.pageRefundPolicy'), icon: 'banknotes' },
  { route: 'shipping-delivery', label: t('mobile.pageShipping'), icon: 'cube' },
  { route: 'payment-options', label: t('mobile.pagePaymentOptions'), icon: 'credit-card' },
  { route: 'security-features', label: t('mobile.pageSecurityFeatures'), icon: 'lock-closed' },
  { route: 'distance-sales', label: t('mobile.pageDistanceSales'), icon: 'document-text' },
  { route: 'seller-agreement', label: t('mobile.pageSellerAgreement'), icon: 'briefcase' },
  { route: 'intellectual-property', label: t('footer.intellectualProperty'), icon: 'check-badge' },
];

/**
 * Bilgi metni değil, kullanıcının kendi hesabına ait ekranlar — bu yüzden
 * bilgi listesinden ayrı, hesap bölümünde gösterilirler.
 */
export const buildAccountPages = (t: TFunction): ReadonlyArray<MenuPage> => [
  { route: 'following', label: t('mobile.settingsFollowing'), icon: 'user-group' },
  { route: 'newsletter', label: t('mobile.settingsNewsletter'), icon: 'envelope' },
];
