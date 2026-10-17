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
};

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
