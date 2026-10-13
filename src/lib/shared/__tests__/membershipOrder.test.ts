/**
 * Parite A-3 inceleme #10 · Üyelik siparişi kuralı TEK yardımcıdan gelir
 * (sipariş detayı `deriveOrderView` + hazırlık notu aynı sonucu verir).
 */
import { isMembershipOrder } from '../membershipOrder';
import { preparingDeadlineNoticeOf } from '../preparingDeadline';
import { deriveOrderView } from '../../../../app/orders/[id]/_lib/derive';
import { FALLBACK_TIMING_POLICY } from '../timingPolicy';
import type { OrderDetail } from '../../../../app/orders/[id]/_lib/types';

const NOW = new Date('2026-10-08T09:00:00.000Z');

describe('isMembershipOrder', () => {
  it.each([
    [{ isMembership: true, orderNumber: 'ORD-1' }, true],
    [{ isMembership: false, orderNumber: 'MEM-1' }, false], // açık bayrak önce gelir
    [{ orderNumber: 'MEM-42' }, true],
    [{ orderNumber: 'ORD-42' }, false],
    [{}, false],
  ])('%j → %s', (order, expected) => {
    expect(isMembershipOrder(order)).toBe(expected);
  });

  it('sipariş detayı ve hazırlık notu aynı kuralı okur', () => {
    const order = {
      id: 'o1',
      orderNumber: 'MEM-7',
      status: 'processing',
      isBuyer: true,
      preparingDeadline: '2026-10-10T09:00:00.000Z',
    } as unknown as OrderDetail;
    const view = deriveOrderView(order, FALLBACK_TIMING_POLICY);
    expect(view.isMembershipOrder).toBe(true);
    expect(preparingDeadlineNoticeOf(order, NOW)).toBeNull();
  });
});
