/**
 * Sepetin tamamını iptal — kapı kuralı.
 *
 * Uç staging'de doğrulandı (2026-08-26): uydurma bir kimlikle
 * `404 {"i18nKey":"server.order.groupNotFound"}` dönüyor, yani route VAR.
 * Web bunu 2026-08-12'den beri sunuyor; mobilde grup ekranı salt okunurdu.
 *
 * Kapı kargoya devirden ÖNCEyi arıyor. `status` burada UI durumu
 * (`apiStatusToUi`): sunucunun `paid` + `preparing` ikilisi tek bir
 * `processing`e iniyor — bu yüzden kural sunucu adlarıyla değil, UI adlarıyla
 * yazılmalı. (İlk yazımda `'preparing'` arandı ve tip bunu yakaladı.)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isGroupCancellable } from '../_lib/status';
import type { GroupOrder } from '../_lib/types';

const hookSource = readFileSync(
  resolve(__dirname, '../_hooks/useOrderGroup.ts'),
  'utf8',
);

const line = (overrides: Partial<GroupOrder> = {}): GroupOrder => ({
  id: 'o1',
  orderNumber: 'ORD-1',
  status: 'processing',
  totalAmount: 100,
  product: { id: 'p1', title: 'Item' },
  seller: { id: 's1', displayName: 'Seller' },
  ...overrides,
});

describe('grup iptali kapısı', () => {
  it('accepts only the pre-handover UI statuses (`pending`, `processing`)', () => {
    expect(isGroupCancellable([line({ status: 'pending' })])).toBe(true);
    expect(isGroupCancellable([line({ status: 'processing' })])).toBe(true);
    for (const status of ['shipped', 'delivered', 'awaiting_confirmation', 'completed', 'cancelled', 'refunded'] as const) {
      expect(isGroupCancellable([line({ status })])).toBe(false);
    }
  });

  it('never matches the server names (`paid`/`preparing`): `apiStatusToUi` folds them first', () => {
    // Searched for directly, the gate would never open and the button would never show.
    expect(isGroupCancellable([line({ status: 'paid' as GroupOrder['status'] })])).toBe(false);
    expect(isGroupCancellable([line({ status: 'preparing' as GroupOrder['status'] })])).toBe(false);
  });

  it('iptal edilmiş bir kalem varsa grup iptali sunulmaz', () => {
    expect(isGroupCancellable([line(), line({ id: 'o2', cancellationType: 'iptal' })])).toBe(false);
  });

  it('a line with an active refund request closes it (web `isGroupCancellable`)', () => {
    expect(isGroupCancellable([line(), line({ id: 'o2', activeRefundRequest: { id: 'r1', status: 'pending_review' } })])).toBe(false);
  });

  it('an empty group offers nothing', () => {
    expect(isGroupCancellable([])).toBe(false);
  });

  it.each([
    ['kind boost', { kind: 'boost' }],
    ['kind membership', { kind: 'membership' }],
    ['no kind, origin platform_service', { origin: 'platform_service', kind: undefined }],
    ['no kind, deprecated isMembership only', { isMembership: true, kind: undefined }],
  ] as const)('a digital line closes it (%s)', (_label, signals) => {
    expect(isGroupCancellable([line(signals as Partial<GroupOrder>)])).toBe(false);
    expect(isGroupCancellable([line(), line({ id: 'o2', ...(signals as Partial<GroupOrder>) })])).toBe(false);
  });

  it('a listing line stays cancellable even with the deprecated flag set (kind decides)', () => {
    expect(isGroupCancellable([line({ kind: 'listing', isMembership: true })])).toBe(true);
  });

  it('the screen reads the one rule', () => {
    expect(hookSource).toContain('isGroupCancellable(group.orders)');
  });

  it('gövde tekil iptalle aynı sözleşmeyi kullanır (reasonCode zorunlu)', () => {
    expect(hookSource).toContain('reasonCode: OrderCancellationReason');
  });
});
