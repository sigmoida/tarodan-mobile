// İade penceresi ve satıcı ödeme tarihi — SUNUCU değerinden okunur (web
// `orders/[id]/_lib/types.ts` → returnWindowEnd / computePayoutDate /
// isPastRefundWindow aynası).
//
// Eskiden ekran sabit 14 günle kendi hesabını yapıyordu: admin pencereyi 30
// güne çıkarınca API iadeyi kabul ederken mobil iade butonunu 15. günde
// gizliyordu; satıcı ödeme tarihi de payout grace'i atlayıp 1 gün erken
// görünüyordu. Artık sipariş `returnWindowEndsAt` / `escrowReleaseAt` taşır;
// yalnız bu alanlar olmayan (damgadan önce teslim edilmiş) siparişte
// politikayla (`GET /timing-rules`) hesaplanır.
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import { addCalendarDays, parseDate } from '@/lib/shared/timingPolicy';
import type { OrderDetail } from './types';

type TimedOrder = Pick<OrderDetail, 'deliveredAt' | 'returnWindowEndsAt' | 'escrowReleaseAt'>;

/**
 * İade penceresinin sonu: teslimde siparişe damgalanan `returnWindowEndsAt`
 * (admin pencereyi sonradan değiştirse de bu sipariş için değişmez). Damga
 * yoksa teslim + politika penceresi; teslim edilmemişse pencere başlamadı → null.
 */
export function returnWindowEnd(order: TimedOrder, policy: PublicTimingPolicy): Date | null {
  return (
    parseDate(order.returnWindowEndsAt) ??
    (order.deliveredAt ? addCalendarDays(order.deliveredAt, policy.returnWindowDays.value) : null)
  );
}

/**
 * Satıcıya escrow ödeme tarihi: sunucunun hold'a yazdığı `escrowReleaseAt`;
 * yoksa pencere sonu + payout grace.
 */
export function computePayoutDate(order: TimedOrder, policy: PublicTimingPolicy): Date | null {
  const stamped = parseDate(order.escrowReleaseAt);
  if (stamped) return stamped;
  const windowEnd = returnWindowEnd(order, policy);
  return windowEnd ? addCalendarDays(windowEnd, policy.payoutGraceDays.value) : null;
}

/**
 * Pencere sonu geçtiyse iade kapalıdır (backend de aynı damgayla reddeder).
 * Pencere sonu ANINDA hâlâ açık; teslim edilmemişse pencere henüz başlamadı.
 */
export function isPastRefundWindow(
  order: TimedOrder,
  policy: PublicTimingPolicy,
  now: number = Date.now(),
): boolean {
  const end = returnWindowEnd(order, policy);
  return end !== null && now > end.getTime();
}
