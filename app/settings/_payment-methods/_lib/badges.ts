import type { TFunction } from 'i18next';
import type { SavedCard } from '@/lib/api';

export type CardBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info';
export type CardBadge = { key: string; label: string; tone: CardBadgeTone };

/**
 * Kayıtlı kart rozetleri — tek kaynak. Web `SavedCardCard` ile birebir:
 * şema, varsayılan, `autoRenewEligible ? "Oto-yenilemeye uygun" : "CVV gerektirir"`,
 * kurumsal. Amaç (mağaza) rozeti yok — web'de de yok.
 *
 * Web'in bu kuralı mağaza ayrımıyla tutarsız: `autoRenewEligible` yalnız üyelik
 * kartında `true` (`membership && !requireCvv`), bu yüzden CVV istemeyen sepet
 * kartı da "CVV gerektirir" görünür. Mobil yine de web'i kopyalar (kullanıcı
 * kuralı); düzeltme web/sunucu önerisi olarak handoff'ta.
 *
 * Tek mağaza sapması: "Oto-yenilemeye uygun" yalnız dijital satış açıkken
 * (Apple 2.1(b) / Play: satılmayan aboneliğe atıf yok). Kapalıyken uygun kartta
 * o rozet hiç çıkmaz; "CVV gerektirir" kuralı web'le aynı kalır.
 */
export function savedCardBadges(card: SavedCard, t: TFunction, canBuyDigital: boolean): CardBadge[] {
  const badges: CardBadge[] = [];
  if (card.cardScheme) {
    badges.push({ key: 'scheme', label: card.cardScheme.toUpperCase(), tone: 'neutral' });
  }
  if (card.isDefault) badges.push({ key: 'default', label: t('payment.defaultCard'), tone: 'primary' });
  if (card.autoRenewEligible) {
    if (canBuyDigital) {
      badges.push({ key: 'autoRenew', label: t('payment.autoRenewEligibleBadge'), tone: 'success' });
    }
  } else {
    badges.push({ key: 'cvv', label: t('payment.cvvRequiredBadge'), tone: 'warning' });
  }
  if (card.businessCard) badges.push({ key: 'business', label: t('footer.corporate'), tone: 'info' });
  return badges;
}
