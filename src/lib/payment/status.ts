import type { TFunction } from 'i18next';
import {
  orderStatusConfig,
  paymentStatusConfig,
  resolveStatusConfig,
  type StatusConfig,
  type StatusConfigDefMap,
} from '@/lib/shared/status-configs';

/**
 * Ödeme durumları: tek kaynak (CLAUDE.md › Principles).
 *
 * Sunucu `PaymentStatus`: `pending`, `processing`, `completed`, `failed`,
 * `refunded` (iptal de `failed` yazar). İstemci eski/başka uçlardan gelen eş
 * adları da tanır: `paid`, `success`, `hold_payment` (ödendi), `cancelled`.
 *
 * Kullananlar: kart formu yoklaması (`CardPaymentForm`), başarı ekranı
 * (`app/payment/success.tsx`) ve yetki belirteci temizliği
 * (`paymentCapability.ts`). Listeyi burada değiştirin, kopyalamayın.
 */

/** Ödeme gerçekten alındı. */
export const PAID_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'paid',
  'success',
  'hold_payment',
]);

/**
 * Kesin sonuçlar: ödeme bir daha değişmeyecek, yetki belirteci artık gereksiz.
 * Ödendi + iade + iptal.
 *
 * `failed` KESİN DEĞİL: tek siparişli ödemede "Tekrar Dene" (`POST
 * /payments/:id/retry`, `payment-lifecycle.service.ts` → `retryPayment`) AYNI
 * ödeme satırını `failed → pending` yapar ve yeni belirteç vermez; ikinci
 * deneme aynı belirteçle gider. Grup ödemesinde de initiate satırı yeniden
 * kullanır.
 */
export const FINAL_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  ...PAID_PAYMENT_STATUSES,
  'refunded',
  'cancelled',
]);

export const isPaidPaymentStatus = (status: unknown): boolean =>
  typeof status === 'string' && PAID_PAYMENT_STATUSES.has(status);

export const isFinalPaymentStatus = (status: unknown): boolean =>
  typeof status === 'string' && FINAL_PAYMENT_STATUSES.has(status);

/** Ödeme başarısız (henüz kesin değil: retry aynı ödemeyi yeniden açabilir). */
export const isFailedPaymentStatus = (status: unknown): boolean => status === 'failed';

/**
 * Ödeme durumu → rozet varyantı + katalog anahtarı. Renk + etiket web
 * `paymentStatusConfig` ile AYNI; mobilin tanıdığı eş adlar (`paid`/`success`/
 * `hold_payment` = ödendi, `cancelled`) ve ödeme geçmişinde görünen sipariş
 * iade durumu (`refund_requested`) ek satırdır.
 */
export const paymentStatusMeta: StatusConfigDefMap = {
  ...paymentStatusConfig,
  paid: paymentStatusConfig.completed!,
  success: paymentStatusConfig.completed!,
  hold_payment: paymentStatusConfig.completed!,
  cancelled: orderStatusConfig.cancelled!,
  refund_requested: orderStatusConfig.refund_requested!,
};

/** `StatusBadge` için çevrilmiş ödeme durumu config'i. */
export const buildPaymentStatusConfig = (t: TFunction): Record<string, StatusConfig> =>
  resolveStatusConfig(paymentStatusMeta, (key) => t(key));
