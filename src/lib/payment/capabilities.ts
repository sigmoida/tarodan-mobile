import type { PaymentsInstallmentsConfig } from '@/types/installments';

/**
 * Ödeme amacı — PayTR mağazası seçimi (API delta 20).
 *
 * Kart token'ları mağazaya özeldir: sepet/sipariş/takas/öne çıkarma ödemeleri
 * pazaryeri mağazasında (`checkout`), üyelik ödemesi üyelik mağazasında
 * (`membership`). API'de başka amaç yok — öne çıkarma (boost) `checkout`'tur.
 */
export type PaymentPurpose = 'checkout' | 'membership';

export type PaymentPurposeCapabilities = {
  cardStorageEnabled: boolean;
  recurringEnabled: boolean;
};

/** `GET /payments/config` yanıtı. Eski API `purposes` alanını döndürmeyebilir. */
export type PaymentConfig = {
  bypassEnabled: boolean;
  /** Geriye uyum: sepet ödemesinin kart saklama yeteneği (= purposes.checkout). */
  cardStorageEnabled: boolean;
  /** Geriye uyum: oto-yenileme açık mı (= purposes.membership). */
  recurringEnabled: boolean;
  purposes?: Partial<Record<PaymentPurpose, Partial<PaymentPurposeCapabilities>>>;
  /** Installment switch and minimum goods total (ADR 0019). Absent on an older API: off. */
  installments?: Partial<PaymentsInstallmentsConfig>;
};

/**
 * The installment config of `GET /payments/config`, read fail-closed: only an explicit
 * `enabled: true` with a finite, non-negative `minAmount` turns the selector on. An older API
 * (no field), a malformed value or a failed config call means no selector, as before.
 */
export function installmentsConfigOf(cfg: Partial<PaymentConfig> | null | undefined): PaymentsInstallmentsConfig {
  const raw = cfg?.installments;
  const minAmount = typeof raw?.minAmount === 'number' ? raw.minAmount : Number.NaN;
  if (raw?.enabled !== true || !Number.isFinite(minAmount) || minAmount < 0) {
    return { enabled: false, minAmount: 0 };
  }
  return { enabled: true, minAmount };
}

/** Yapılandırma alınamazsa güvenli varsayılan: yalnız yeni kart, bypass kapalı. */
export const SAFE_PAYMENT_CONFIG: PaymentConfig = {
  bypassEnabled: false,
  cardStorageEnabled: false,
  recurringEnabled: false,
};

/**
 * Bu amaçta kart saklama / oto-yenileme açık mı (web `paymentCapabilities` aynası).
 *
 * Amaç bayrağı otoritedir; `purposes` yoksa (eski API) üst düzey alanlara düşer.
 * Kayıtlı kart listesi ve "kartımı sakla" kutusu `cardStorageEnabled`'a bağlıdır —
 * `recurringEnabled` (non-3D) değil: pazaryeri mağazasında recurring hep kapalı,
 * ama kart saklama açık olabilir (eskiden mobil buna bakıp sepette kayıtlı kartı
 * hiç göstermiyordu).
 */
export function paymentCapabilities(
  cfg: Partial<PaymentConfig> | null | undefined,
  purpose: PaymentPurpose,
): PaymentPurposeCapabilities {
  const scoped = cfg?.purposes?.[purpose];
  if (scoped) {
    return {
      cardStorageEnabled: scoped.cardStorageEnabled === true,
      recurringEnabled: scoped.recurringEnabled === true,
    };
  }
  return {
    cardStorageEnabled: cfg?.cardStorageEnabled === true,
    recurringEnabled: cfg?.recurringEnabled === true,
  };
}
