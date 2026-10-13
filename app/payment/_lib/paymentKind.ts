import type { PaymentPurpose } from '@/lib/payment/capabilities';
import type { DirectFormTarget } from '@/lib/payment/directFormBody';

/** `GET /payments/:id/status[-guest]` yanıtının bu ekranın okuduğu alanları. */
export type PaymentStatusLight = {
  status?: string;
  orderId?: string | null;
  checkoutGroupId?: string | null;
  tradeId?: string | null;
  amount?: number | string | null;
  /** Sunucu yalnız üyelik siparişinde `true` gönderir (sanal `membership-*` ürünü). */
  isMembershipOrder?: boolean;
};

export type PaymentKind = {
  isMembership: boolean;
  isBoost: boolean;
  /** Kayıtlı kartın aranacağı PayTR mağazası. Öne çıkarma pazaryerindedir. */
  purpose: PaymentPurpose;
};

/**
 * Ödemenin türü. Üyelik, rota parametresi OLMADAN da tanınır: başarısız ödeme
 * ekranından ya da "Ödemelerim"den yeniden denemede `type` taşınmıyor, ama
 * sunucu durum yanıtında `isMembershipOrder` gönderiyor.
 */
export function paymentKindOf(type: string | undefined, status?: PaymentStatusLight | null): PaymentKind {
  const isMembership = type === 'membership' || status?.isMembershipOrder === true;
  const isBoost = !isMembership && type === 'boost';
  return {
    isMembership,
    isBoost,
    purpose: isMembership ? 'membership' : 'checkout',
  };
}

/**
 * direct-form hedefi durum yanıtından; takas id'si yanıtta yoksa rota
 * parametresinden (yedek).
 */
export function paymentTargetOf(status: PaymentStatusLight, tradeIdParam?: string): DirectFormTarget {
  return {
    ...(status.orderId ? { orderId: String(status.orderId) } : {}),
    ...(status.checkoutGroupId ? { checkoutGroupId: String(status.checkoutGroupId) } : {}),
    ...(status.tradeId
      ? { tradeId: String(status.tradeId) }
      : tradeIdParam
        ? { tradeId: String(tradeIdParam) }
        : {}),
  };
}
