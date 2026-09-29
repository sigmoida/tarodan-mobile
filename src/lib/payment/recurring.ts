export type PaymentPurpose = 'checkout' | 'membership' | 'boost';

type PaymentConfig = {
  recurringEnabled?: boolean;
  purposes?: Partial<Record<string, { recurringEnabled?: boolean }>>;
} | null | undefined;

/**
 * `GET /payments/config` → bu ödeme amacında kayıtlı kart / oto-yenileme açık mı?
 *
 * Amaç bayrağı (`purposes.<amaç>.recurringEnabled`) otoritedir; genel bayrak
 * yalnız amaç tanımlı değilse (eski sunucu) kullanılır. Canlıda genel bayrak
 * `true` iken ürün ödemesi `false` — genel bayrağı okumak fiziksel ürün
 * ödemesinde "otomatik yenileme için kaydet" kutusunu gösteriyordu.
 */
export function isRecurringEnabledFor(cfg: PaymentConfig, purpose: PaymentPurpose): boolean {
  const scoped = cfg?.purposes?.[purpose]?.recurringEnabled;
  if (typeof scoped === 'boolean') return scoped;
  return !!cfg?.recurringEnabled;
}
