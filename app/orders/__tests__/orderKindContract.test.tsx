/**
 * Contract fixtures for the order kind (tarodan-ops `contracts/deltas/2026-10-23-order-kind.md`).
 *
 * The bodies below follow the delta (not measured: the field is not on staging yet). Three API
 * generations are pinned, each through the real query hook (envelope unwrap included) to the one
 * gating rule `isDigitalOrder`:
 *  - after the delta: `kind` on every order, `isMembership` widened to every digital order;
 *  - the live API (app-2026.10.17-1): no `kind`, `origin` set, `isMembership` true only for `MEM-`
 *    (so a boost order reads `isMembership: false`);
 *  - an API with neither `kind` nor `origin`: the deprecated `isMembership` alone.
 * Group views have their own top-level `kind` ("group" | "package" | "synthetic"); the gate reads
 * the per-order one. A body without `kind` leaves the `order.digital.fallback` breadcrumb.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'g1' }),
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  ordersApi: { getGroup: jest.fn(), cancelGroup: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ addBreadcrumb: jest.fn(), captureException: jest.fn() }));

import { api, ordersApi } from '@/lib/api';
import { addBreadcrumb } from '@/services/sentry';
import { FALLBACK_TIMING_POLICY } from '@/lib/shared/timingPolicy';
import { useOrder } from '../[id]/_hooks/useOrder';
import { deriveOrderView } from '../[id]/_lib/derive';
import { useOrderGroup } from '../group/[id]/_hooks/useOrderGroup';
import { canRateOrder, normalizeOrder } from '../_lib/ordersStatus';

const getMock = api.get as jest.Mock;
const getGroupMock = ordersApi.getGroup as jest.Mock;
const mockBreadcrumb = addBreadcrumb as jest.Mock;

/** The common part of a `formatOrderResponse` order (delivered, rated by nobody yet). */
const base = {
  status: 'completed',
  totalAmount: 59.9,
  shippingCost: 0,
  createdAt: '2026-10-20T09:00:00.000Z',
  paidAt: '2026-10-20T09:01:00.000Z',
  isBuyer: true,
  isSeller: false,
  hasProductRating: false,
  hasSellerRating: false,
  payment: { status: 'completed' },
  activeRefundRequest: null,
};

const boostProduct = { id: 'boost-b1', title: 'Öne çıkarma', price: 59.9, condition: 'new' };
const memberProduct = { id: 'membership-t1', title: 'Premium üyelik', price: 199, condition: 'new' };
const goods = { id: 'p1', title: 'Deri Ceket', price: 320, condition: 'used' };
const platform = { id: 'platform-1', displayName: 'Tarodan' };
const person = { id: 'seller-1', displayName: 'Mehmet' };

/** [label, body, digital, has kind] */
const BODIES: Array<[string, Record<string, unknown>, boolean, boolean]> = [
  [
    'after the delta: boost',
    { ...base, id: 'o1', orderNumber: 'BST-1', kind: 'boost', origin: 'platform_service', isMembership: true, product: boostProduct, seller: platform },
    true,
    true,
  ],
  [
    'after the delta: membership',
    { ...base, id: 'o2', orderNumber: 'MEM-1', kind: 'membership', origin: 'platform_service', isMembership: true, product: memberProduct, seller: platform },
    true,
    true,
  ],
  [
    'after the delta: listing',
    { ...base, id: 'o3', orderNumber: 'ORD-1', kind: 'listing', origin: 'direct_sale', isMembership: false, product: goods, seller: person },
    false,
    true,
  ],
  [
    'live API (no kind): boost, origin only, isMembership false',
    { ...base, id: 'o4', orderNumber: 'BST-2', origin: 'platform_service', isMembership: false, product: boostProduct, seller: platform },
    true,
    false,
  ],
  [
    'live API (no kind): membership',
    { ...base, id: 'o5', orderNumber: 'MEM-2', origin: 'platform_service', isMembership: true, product: memberProduct, seller: platform },
    true,
    false,
  ],
  [
    'live API (no kind): listing',
    { ...base, id: 'o6', orderNumber: 'ORD-2', origin: 'direct_sale', isMembership: false, product: goods, seller: person },
    false,
    false,
  ],
  [
    'no kind, no origin: isMembership only',
    { ...base, id: 'o7', orderNumber: 'MEM-3', isMembership: true, product: memberProduct, seller: platform },
    true,
    false,
  ],
];

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  getMock.mockReset();
  getGroupMock.mockReset();
  mockBreadcrumb.mockReset();
});

describe.each(BODIES)('%s', (_label, body, digital, hasKind) => {
  it(`GET /orders/:id -> the detail view is ${digital ? 'digital' : 'goods'}`, async () => {
    getMock.mockResolvedValue({ data: { success: true, data: body } });
    const { result } = renderHook(() => useOrder(String(body.id)), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const view = deriveOrderView(result.current.data!, FALLBACK_TIMING_POLICY);
    expect(view.isDigitalOrder).toBe(digital);
    // `completed` is rateable for goods only; the API refuses a digital order.
    expect(view.canRate).toBe(!digital);
  });

  it('GET /orders/groups: the list offers rating for goods only', () => {
    expect(canRateOrder(normalizeOrder(body))).toBe(!digital);
  });

  it(`${hasKind ? 'leaves no' : 'leaves the'} order.digital.fallback breadcrumb`, async () => {
    getMock.mockResolvedValue({ data: { success: true, data: body } });
    const { result } = renderHook(() => useOrder(String(body.id)), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    if (hasKind) {
      expect(mockBreadcrumb).not.toHaveBeenCalled();
    } else {
      expect(mockBreadcrumb).toHaveBeenCalledTimes(1);
      expect(mockBreadcrumb).toHaveBeenCalledWith({
        category: 'order',
        message: 'order.digital.fallback',
        level: 'info',
        data: { orderId: body.id, digital },
      });
    }
  });
});

describe('GET /orders/groups/:id: the per-order kind decides, not the group kind', () => {
  const groupBody = (orders: Array<Record<string, unknown>>) => ({
    id: 'g1',
    kind: 'synthetic',
    viewerRole: 'buyer',
    groupNumber: 'GRP-1',
    totalAmount: 59.9,
    status: 'paid',
    createdAt: '2026-10-20T09:00:00.000Z',
    orders: orders.map((o) => ({ ...o, status: 'paid' })),
    packages: [],
  });

  it.each(BODIES)('%s', async (_label, body, digital, hasKind) => {
    getGroupMock.mockResolvedValue({ data: { success: true, data: groupBody([body]) } });
    const { result } = renderHook(() => useOrderGroup(), { wrapper });
    await waitFor(() => expect(result.current.group).toBeTruthy());
    expect(result.current.group!.orders[0].kind).toBe(body.kind);
    expect(result.current.cancel.available).toBe(!digital);
    expect(mockBreadcrumb).toHaveBeenCalledTimes(hasKind ? 0 : 1);
    if (!hasKind) {
      expect(mockBreadcrumb.mock.calls[0][0].data).toEqual({ groupId: 'g1', digital });
    }
  });
});
