import type { Ionicons } from '@expo/vector-icons';

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
 */
export const INFO_PAGES: ReadonlyArray<MenuPage> = [
  { route: 'guides', label: 'Rehberler', icon: 'library-outline' },
  { route: 'size-guide', label: 'Ölçek Rehberi', icon: 'resize-outline' },
  { route: 'guvenli-takas', label: 'Güvenli Takas Sistemi', icon: 'swap-horizontal-outline' },
  { route: 'buyer-protection', label: 'Alıcı Koruması', icon: 'shield-half-outline' },
  { route: 'returns-exchanges', label: 'İade ve Değişim', icon: 'refresh-outline' },
  { route: 'refund-policy', label: 'İade Politikası', icon: 'cash-outline' },
  { route: 'shipping-delivery', label: 'Kargo ve Teslimat', icon: 'cube-outline' },
  { route: 'payment-options', label: 'Ödeme Seçenekleri', icon: 'card-outline' },
  { route: 'security-features', label: 'Güvenlik', icon: 'lock-closed-outline' },
  { route: 'distance-sales', label: 'Mesafeli Satış Sözleşmesi', icon: 'document-outline' },
  { route: 'seller-agreement', label: 'Satıcı Sözleşmesi', icon: 'briefcase-outline' },
  { route: 'intellectual-property', label: 'Fikri Mülkiyet', icon: 'ribbon-outline' },
] as const;

/**
 * Bilgi metni değil, kullanıcının kendi hesabına ait ekranlar — bu yüzden
 * bilgi listesinden ayrı, hesap bölümünde gösterilirler.
 */
export const ACCOUNT_PAGES: ReadonlyArray<MenuPage> = [
  { route: 'following', label: 'Takip Ettiklerim', icon: 'people-outline' },
  { route: 'newsletter', label: 'Haber Bülteni', icon: 'mail-outline' },
] as const;
