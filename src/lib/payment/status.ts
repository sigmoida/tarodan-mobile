/**
 * Ödeme durumları: tek kaynak (CLAUDE.md §5).
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
