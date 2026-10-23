/**
 * Group cancel parity with web `isGroupCancellable` (tarodan-app
 * `apps/web/.../profile/(commerce)/orders/_lib/types.ts`), driven through the real query hook.
 *
 * `group-cancel.test.ts` pins the pure rule on the mapped `GroupOrder` shape. This file feeds the
 * server body of `GET /orders/groups/:id` (server status names, `shipment.shippedAt`,
 * `activeRefundRequest`, the group's own `kind`) through `useOrderGroup`, so a mapper that drops
 * one of those fields, or a status fold that drifts from web's `pending_payment | paid | preparing`
 * list, shows here. The cases mirror web `types.test.ts` (`isGroupCancellable`, and the
 * `hasShipped` / guest-track handover cases): open before handover with no shipment, a `pending` or
 * a `label_created` one; closed once the parcel is with the carrier (`shippedAt` stamp or a status
 * past the label stage, unknown codes included).
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
  ordersApi: { getGroup: jest.fn(), cancelGroup: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ addBreadcrumb: jest.fn(), captureException: jest.fn() }));

import { ordersApi } from '@/lib/api';
import { useOrderGroup } from '../_hooks/useOrderGroup';

const getGroupMock = ordersApi.getGroup as jest.Mock;

/** A listing line as `formatOrderResponse` sends it after the order-kind delta. */
const line = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  orderNumber: 'ORD-1',
  kind: 'listing',
  origin: 'direct_sale',
  isMembership: false,
  status: 'paid',
  totalAmount: 100,
  isBuyer: true,
  activeRefundRequest: null,
  product: { id: 'p1', title: 'Deri Ceket' },
  seller: { id: 's1', displayName: 'Mehmet' },
  ...overrides,
});

const body = (
  orders: Array<Record<string, unknown>>,
  groupKind = 'group',
  viewerRole: string | undefined = 'buyer',
) => ({
  id: 'g1',
  kind: groupKind,
  groupNumber: 'GRP-1',
  totalAmount: 100,
  status: 'paid',
  createdAt: '2026-10-20T09:00:00.000Z',
  viewerRole,
  payment: null,
  orders,
  packages: [],
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>;
}

async function cancelAvailable(
  orders: Array<Record<string, unknown>>,
  groupKind?: string,
  viewerRole?: string,
) {
  getGroupMock.mockResolvedValue({ data: { success: true, data: body(orders, groupKind, viewerRole) } });
  const { result } = renderHook(() => useOrderGroup(), { wrapper });
  await waitFor(() => expect(result.current.group).toBeTruthy());
  return result.current.cancel.available;
}

beforeEach(() => getGroupMock.mockReset());

describe('server order statuses (web CANCELLABLE_STATUSES)', () => {
  it.each(['pending_payment', 'paid', 'preparing'])('%s is cancellable', async (status) => {
    expect(await cancelAvailable([line({ status })])).toBe(true);
  });

  it.each([
    'shipped',
    'delivered',
    'awaiting_buyer_confirmation',
    'completed',
    'cancelled',
    'refund_requested',
    'refunded',
  ])('%s is not', async (status) => {
    expect(await cancelAvailable([line({ status })])).toBe(false);
  });
});

describe('carrier handover (web hasShipped)', () => {
  it.each([
    ['no shipment', null],
    ['pending shipment', { status: 'pending', trackingNumber: null }],
    ['label printed, parcel still with the seller', { status: 'label_created', trackingNumber: 'PKG-1' }],
    ['cancelled shipment', { status: 'cancelled' }],
    ['failed shipment', { status: 'failed' }],
  ])('stays open: %s', async (_label, shipment) => {
    expect(await cancelAvailable([line({ status: 'preparing', shipment })])).toBe(true);
  });

  it.each([
    ['in transit', { status: 'in_transit' }],
    ['picked up', { status: 'picked_up' }],
    ['label_created with the handover stamp', { status: 'label_created', shippedAt: '2026-10-21T09:00:00.000Z' }],
    ['an unknown carrier code (fail closed)', { status: 'at_transfer_center' }],
  ])('closes: %s', async (_label, shipment) => {
    expect(await cancelAvailable([line({ status: 'preparing', shipment })])).toBe(false);
  });

  it('one handed-over line closes the whole group (its other lines use the single cancel)', async () => {
    expect(
      await cancelAvailable([
        line(),
        line({ id: 'o2', status: 'preparing', shipment: { status: 'in_transit' } }),
      ]),
    ).toBe(false);
  });
});

it('an active refund request on any line closes it', async () => {
  expect(
    await cancelAvailable([
      line(),
      line({ id: 'o2', activeRefundRequest: { id: 'r1', status: 'pending_review' } }),
    ]),
  ).toBe(false);
});

describe.each(['group', 'package', 'synthetic'])('a listing cart in a %s view', (groupKind) => {
  it('is cancellable with or without a per-order kind (the group kind never decides)', async () => {
    expect(await cancelAvailable([line()], groupKind)).toBe(true);
    expect(
      await cancelAvailable([line({ kind: undefined, origin: undefined, isMembership: undefined })], groupKind),
    ).toBe(true);
  });
});

it.each([
  ['boost (kind)', { kind: 'boost', origin: 'platform_service', isMembership: true }],
  ['membership (kind)', { kind: 'membership', origin: 'platform_service', isMembership: true }],
  ['no kind, origin platform_service', { kind: undefined, origin: 'platform_service', isMembership: false }],
  ['no kind or origin, isMembership only', { kind: undefined, origin: undefined, isMembership: true }],
])('a mixed cart with a digital line offers no group cancel: %s', async (_label, signals) => {
  expect(await cancelAvailable([line(), line({ id: 'o2', ...signals })])).toBe(false);
});

describe('viewer role (web `group.viewerRole === "buyer"`)', () => {
  it('the buyer view of a listing cart stays cancellable', async () => {
    expect(await cancelAvailable([line()], 'group', 'buyer')).toBe(true);
  });

  it.each(['package', 'synthetic'])(
    'a seller %s view is never cancellable, even before handover',
    async (groupKind) => {
      expect(await cancelAvailable([line({ isBuyer: false })], groupKind, 'seller')).toBe(false);
      expect(await cancelAvailable([line({ isBuyer: false, status: 'pending_payment' })], groupKind, 'seller')).toBe(false);
    },
  );

  it('a body without a viewer role offers nothing (fail closed)', async () => {
    getGroupMock.mockResolvedValue({ data: { success: true, data: { ...body([line()]), viewerRole: undefined } } });
    const { result } = renderHook(() => useOrderGroup(), { wrapper });
    await waitFor(() => expect(result.current.group).toBeTruthy());
    expect(result.current.group!.viewerRole).toBeNull();
    expect(result.current.cancel.available).toBe(false);
  });
});
