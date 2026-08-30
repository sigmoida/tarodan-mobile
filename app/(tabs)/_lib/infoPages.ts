import type { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

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
 * `t` daha hazır olmadan çalışır ve etiketler ilk dilde donardı (bkz. `profileConstants`
 * başındaki aynı gerekçe). `route`/`icon` dilden bağımsız, testler bunları doğrudan okur.
 */
export const buildInfoPages = (t: TFunction): ReadonlyArray<MenuPage> => [
  { route: 'guides', label: t('mobile.pageGuides'), icon: 'library-outline' },
  { route: 'size-guide', label: t('mobile.pageSizeGuide'), icon: 'resize-outline' },
  { route: 'guvenli-takas', label: t('mobile.pageSafeTrade'), icon: 'swap-horizontal-outline' },
  { route: 'buyer-protection', label: t('mobile.pageBuyerProtection'), icon: 'shield-half-outline' },
  { route: 'returns-exchanges', label: t('mobile.pageReturns'), icon: 'refresh-outline' },
  { route: 'refund-policy', label: t('mobile.pageRefundPolicy'), icon: 'cash-outline' },
  { route: 'shipping-delivery', label: t('mobile.pageShipping'), icon: 'cube-outline' },
  { route: 'payment-options', label: t('mobile.pagePaymentOptions'), icon: 'card-outline' },
  { route: 'security-features', label: t('mobile.pageSecurityFeatures'), icon: 'lock-closed-outline' },
  { route: 'distance-sales', label: t('mobile.pageDistanceSales'), icon: 'document-outline' },
  { route: 'seller-agreement', label: t('mobile.pageSellerAgreement'), icon: 'briefcase-outline' },
  { route: 'intellectual-property', label: t('footer.intellectualProperty'), icon: 'ribbon-outline' },
];

/**
 * Bilgi metni değil, kullanıcının kendi hesabına ait ekranlar — bu yüzden
 * bilgi listesinden ayrı, hesap bölümünde gösterilirler.
 */
export const buildAccountPages = (t: TFunction): ReadonlyArray<MenuPage> => [
  { route: 'following', label: t('mobile.settingsFollowing'), icon: 'people-outline' },
  { route: 'newsletter', label: t('mobile.settingsNewsletter'), icon: 'mail-outline' },
];
