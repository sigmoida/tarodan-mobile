import type { TFunction } from 'i18next';
import type { SavedCard } from '@/lib/api';

export type CardBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info';
export type CardBadge = { key: string; label: string; tone: CardBadgeTone };

/**
 * Kayıtlı kart rozetleri — tek kaynak.
 *
 * API delta 20 (P2): kartın mağazası (`purpose`: "Sepet" / "Üyelik") gösterilir —
 * sepet ödemesinde yalnız sepet kartları, üyelikte yalnız üyelik kartları çıkar;
 * rozet kullanıcıya hangi kartın nerede kullanılacağını söyler.
 *
 * `autoRenewEligible` artık yalnız üyelik kartında `true` (`membership && !requireCvv`).
 * Eskiden "uygun değilse CVV gerektirir" varsayılıyordu; mağaza ayrımıyla bu yanlış
 * (CVV istemeyen sepet kartı "CVV gerektirir" görünürdü) → CVV rozeti `requireCvv`'den.
 *
 * Oto-yenileme rozeti yalnız dijital satış açıkken (Apple 2.1(b) / Play: satılmayan
 * aboneliğe atıf yok). Amaç rozeti nötr bilgi — satın alma çağrısı değil.
 */
export function savedCardBadges(card: SavedCard, t: TFunction, canBuyDigital: boolean): CardBadge[] {
  const badges: CardBadge[] = [];
  if (card.cardScheme) {
    badges.push({ key: 'scheme', label: card.cardScheme.toUpperCase(), tone: 'neutral' });
  }
  if (card.isDefault) badges.push({ key: 'default', label: t('payment.defaultCard'), tone: 'primary' });
  if (card.purpose === 'checkout') {
    badges.push({ key: 'purpose', label: t('payment.cardPurposeCheckout'), tone: 'info' });
  } else if (card.purpose === 'membership') {
    badges.push({ key: 'purpose', label: t('payment.cardPurposeMembership'), tone: 'info' });
  }
  if (canBuyDigital && card.autoRenewEligible) {
    badges.push({ key: 'autoRenew', label: t('payment.autoRenewEligibleBadge'), tone: 'success' });
  }
  if (card.requireCvv) badges.push({ key: 'cvv', label: t('payment.cvvRequiredBadge'), tone: 'warning' });
  if (card.businessCard) badges.push({ key: 'business', label: t('footer.corporate'), tone: 'info' });
  return badges;
}
