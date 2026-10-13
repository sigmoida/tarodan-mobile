/**
 * Parite A-3.1 · İade penceresi ve satıcı ödeme tarihi SUNUCU değerinden okunur
 * (web `orders/[id]/_lib/order-timing.test.ts` aynası).
 *
 * Eskiden ekran sabit 14 günle hesaplıyordu: admin pencereyi 30 güne çıkarınca
 * API iadeyi kabul ederken mobil butonu gizliyordu; ödeme tarihi de payout
 * grace'i atlayıp 1 gün erken görünüyordu.
 */
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import { FALLBACK_TIMING_POLICY } from '@/lib/shared/timingPolicy';
import { computePayoutDate, isPastRefundWindow, returnWindowEnd } from '../_lib/timing';
import { deriveOrderView } from '../_lib/derive';
import type { OrderDetail } from '../_lib/types';

const DAY_MS = 86_400_000;
const DELIVERED = '2026-01-01T10:00:00.000Z';

const policy = (returnWindowDays: number, payoutGraceDays = 1): PublicTimingPolicy => ({
  ...FALLBACK_TIMING_POLICY,
  returnWindowDays: { value: returnWindowDays, unit: 'days' },
  payoutGraceDays: { value: payoutGraceDays, unit: 'days' },
});

const order = (overrides: Partial<OrderDetail> = {}): OrderDetail =>
  ({
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'delivered',
    isBuyer: true,
    deliveredAt: DELIVERED,
    returnWindowEndsAt: null,
    escrowReleaseAt: null,
    payment: { status: 'completed' },
    ...overrides,
  }) as unknown as OrderDetail;

describe('returnWindowEnd', () => {
  it('damgalı sunucu değerini kullanır, politikayı yok sayar', () => {
    const stamped = '2026-01-31T10:00:00.000Z';
    expect(returnWindowEnd(order({ returnWindowEndsAt: stamped }), policy(14))?.toISOString()).toBe(stamped);
  });

  it('damga null ise (eski sipariş) teslim + politika penceresi', () => {
    expect(returnWindowEnd(order(), policy(30))?.toISOString()).toBe('2026-01-31T10:00:00.000Z');
  });

  it('geri düşüşte 14 gün', () => {
    expect(returnWindowEnd(order(), FALLBACK_TIMING_POLICY)?.toISOString()).toBe('2026-01-15T10:00:00.000Z');
  });

  it('teslim edilmemiş ve damgasız → null; bozuk damga → hesaplanan', () => {
    expect(returnWindowEnd(order({ deliveredAt: undefined }), policy(14))).toBeNull();
    expect(returnWindowEnd(order({ returnWindowEndsAt: 'garbage' }), policy(14))?.toISOString()).toBe(
      '2026-01-15T10:00:00.000Z',
    );
  });
});

describe('isPastRefundWindow', () => {
  const deliveredMs = new Date(DELIVERED).getTime();

  it('30 günlük damgada 20. gün AÇIK (sabit 14 gün kapalı sayardı)', () => {
    const sut = order({ returnWindowEndsAt: '2026-01-31T10:00:00.000Z' });
    expect(isPastRefundWindow(sut, policy(14), deliveredMs + 20 * DAY_MS)).toBe(false);
    expect(isPastRefundWindow(sut, policy(14), deliveredMs + 31 * DAY_MS)).toBe(true);
  });

  it('damgasız siparişte politika penceresi', () => {
    expect(isPastRefundWindow(order(), policy(30), deliveredMs + 20 * DAY_MS)).toBe(false);
    expect(isPastRefundWindow(order(), policy(14), deliveredMs + 20 * DAY_MS)).toBe(true);
  });

  it('pencere sonu anında hâlâ açık (yalnız sonrası kapalı)', () => {
    const end = new Date('2026-01-15T10:00:00.000Z').getTime();
    expect(isPastRefundWindow(order(), policy(14), end)).toBe(false);
    expect(isPastRefundWindow(order(), policy(14), end + 1)).toBe(true);
  });

  it('teslim edilmemiş siparişte pencere başlamadı', () => {
    expect(isPastRefundWindow(order({ deliveredAt: undefined }), policy(14))).toBe(false);
  });
});

describe('computePayoutDate', () => {
  it("sunucunun hold'a yazdığı escrowReleaseAt'i olduğu gibi gösterir", () => {
    const release = '2026-01-20T00:00:00.000Z';
    expect(computePayoutDate(order({ escrowReleaseAt: release }), policy(14))?.toISOString()).toBe(release);
  });

  it('hold yoksa damgalı pencere sonu + payout grace', () => {
    const date = computePayoutDate(order({ returnWindowEndsAt: '2026-01-31T10:00:00.000Z' }), policy(14, 2));
    expect(date?.toISOString()).toBe('2026-02-02T10:00:00.000Z');
  });

  it('hiçbir sunucu değeri yoksa teslim + pencere + grace (eski hesap 1 gün erkendi)', () => {
    expect(computePayoutDate(order(), FALLBACK_TIMING_POLICY)?.toISOString()).toBe('2026-01-16T10:00:00.000Z');
  });

  it('teslim edilmemiş siparişte null', () => {
    expect(computePayoutDate(order({ deliveredAt: undefined }), policy(14))).toBeNull();
  });
});

describe('deriveOrderView sunucu damgasını kullanır', () => {
  it('damga açıkken (teslimden 20 gün sonra) iade penceresi kapanmış sayılmaz', () => {
    const view = deriveOrderView(
      order({
        deliveredAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
        returnWindowEndsAt: new Date(Date.now() + DAY_MS).toISOString(),
      }),
      policy(14),
    );
    expect(view.isPastRefundWindow).toBe(false);
  });

  it('payoutReleaseDate = escrowReleaseAt', () => {
    const view = deriveOrderView(order({ escrowReleaseAt: '2026-02-05T00:00:00.000Z' }), policy(14));
    expect(view.payoutReleaseDate?.toISOString()).toBe('2026-02-05T00:00:00.000Z');
  });
});
