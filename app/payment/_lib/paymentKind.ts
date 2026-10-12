import type { PaymentPurpose } from '@/lib/payment/capabilities';

/** direct-form hedefi — ödeme durumundan türetilir. */
export type PaymentTarget = { orderId?: string; checkoutGroupId?: string; tradeId?: string };

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
  /**
   * Sanal "platform hizmeti" siparişi mi (`origin = platform_service`: üyelik,
   * öne çıkarma). Satın alma değildir; mesafeli satış kapısına girmez.
   */
  isPlatformService: boolean;
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
    isPlatformService: isMembership || isBoost,
    purpose: isMembership ? 'membership' : 'checkout',
  };
}

/** Hedef durum yanıtından; takas id'si yanıtta yoksa rota parametresinden (yedek). */
export function paymentTargetOf(status: PaymentStatusLight, tradeIdParam?: string): PaymentTarget {
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

/**
 * Bu ödeme ekranında mesafeli satış onay kutusu zorunlu mu?
 *
 * API kapısıyla aynı kapsam (`DistanceSalesConsentService.ensureForPayment`,
 * `payment-initiation.service.ts`): yalnız SATIN ALMA —
 *   - tekil sipariş, `origin ≠ platform_service` (teklif siparişi vb.),
 *   - sepet grubu.
 * Takas ücreti, üyelik ve öne çıkarma kapıya girmez → kutu yok.
 *
 * Sepet grubu checkout'tan YENİ geldiyse onay checkout'un 3. adımında verildi ve
 * sipariş gövdesiyle kaydedildi (`useCheckout`: buton onaysız kapalı) — ikinci
 * kez sorulmaz. Grup ödemesine sonradan dönülürse (başarısız ödeme / Ödemelerim)
 * kutu web ödeme sayfasındaki gibi yeniden istenir.
 *
 * Bilinen fazla gösterim: öne çıkarma ödemesine rota `type` olmadan dönülürse
 * (durum yanıtı öne çıkarmayı işaretlemiyor) kutu görünür — sunucu platform
 * hizmetinde onayı yok sayar, zararsız.
 */
export function needsDistanceSalesConsent(input: {
  target: PaymentTarget;
  kind: PaymentKind;
  /** Checkout ekranı bu ödemeye yeni yönlendirdi (onay orada alındı). */
  acceptedAtCheckout: boolean;
}): boolean {
  const { target, kind, acceptedAtCheckout } = input;
  if (target.checkoutGroupId) return !acceptedAtCheckout;
  if (target.orderId) return !kind.isPlatformService;
  return false;
}
